package repository

import (
	"context"
	"database/sql"
	"fmt"
	"sort"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// UsersRepository executes queries to get ClickHouse users list.
// Uses SHOW USERS command, with fallback to query_log if privileges are insufficient.
type UsersRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewUsersRepository creates a repository backed by the shared ClickHouse manager.
func NewUsersRepository(cfg *config.Config, log *logger.Logger) (*UsersRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	return &UsersRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetUsers returns list of ClickHouse users from a specific node.
func (r *UsersRepository) GetUsers(ctx context.Context, nodeName string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Try SHOW USERS first - standard command
	query := `SHOW USERS`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		// If SHOW USERS fails due to privileges, fallback to getting users from query_log
		if r.logger != nil {
			r.logger.Warningf("SHOW USERS failed: %v, trying fallback method", err)
		}

		// Fallback: get distinct users from query_log (users who executed queries)
		return r.getUsersFromQueryLog(ctx, conn)
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("failed to scan user name: %w", err)
		}
		users = append(users, name)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("users query iteration failed: %w", err)
	}

	// Sort users alphabetically
	sort.Strings(users)

	return users, nil
}

// getUsersFromQueryLog returns distinct users from system.query_log as fallback
// when SHOW USERS command is not available due to privileges
func (r *UsersRepository) getUsersFromQueryLog(ctx context.Context, conn driver.Conn) ([]string, error) {
	// Get distinct users from query_log (only users who executed queries)
	query := `SELECT DISTINCT user FROM system.query_log WHERE user != '' ORDER BY user`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users from query_log: %w", err)
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("failed to scan user name: %w", err)
		}
		users = append(users, name)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("users query iteration failed: %w", err)
	}

	return users, nil
}

// GetUsersList returns detailed list of ClickHouse users with their profiles, roles, and grants.
func (r *UsersRepository) GetUsersList(ctx context.Context, nodeName string) ([]models.UserList, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	query := `SELECT
    users.name,
    users.id,
    ups.profile,
    users.storage,
    grants.role_name,
    groupArray(grants.access_type) as grants
FROM system.users
LEFT JOIN system.grants ON users.name = grants.user_name
LEFT JOIN (
    SELECT spe.user_name as user_name, spe.inherit_profile as profile
    FROM system.settings_profile_elements AS spe
    WHERE spe.user_name IS NOT NULL AND spe.inherit_profile IS NOT NULL
) AS ups ON ups.user_name = users.name
GROUP BY users.name,
         users.id,
         users.storage,
         grants.role_name,
         ups.profile,
         grants.database,
         grants.table,
         grants.column`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users list: %w", err)
	}
	defer rows.Close()

	// Map to aggregate grants per user
	userMap := make(map[string]*models.UserList)

	for rows.Next() {
		var name, id, profile, storage, roleName sql.NullString
		var grants []string

		if err := rows.Scan(&name, &id, &profile, &storage, &roleName, &grants); err != nil {
			return nil, fmt.Errorf("failed to scan user detail: %w", err)
		}

		userKey := name.String
		if userKey == "" {
			continue
		}

		// Check if user already exists in map
		if user, exists := userMap[userKey]; exists {
			// Merge grants
			existingGrants := make(map[string]bool)
			for _, g := range user.Grants {
				existingGrants[g] = true
			}
			for _, g := range grants {
				if !existingGrants[g] {
					user.Grants = append(user.Grants, g)
				}
			}
		} else {
			// Create new user list item
			userList := &models.UserList{
				Name:     name.String,
				ID:       id.String,
				Profile:  profile.String,
				Storage:  storage.String,
				RoleName: roleName.String,
				Grants:   grants,
			}
			userMap[userKey] = userList
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("users list query iteration failed: %w", err)
	}

	// Convert map to slice
	users := make([]models.UserList, 0, len(userMap))
	for _, user := range userMap {
		users = append(users, *user)
	}

	// Sort users by name
	sort.Slice(users, func(i, j int) bool {
		return users[i].Name < users[j].Name
	})

	return users, nil
}
