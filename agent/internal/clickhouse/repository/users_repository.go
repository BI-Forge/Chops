package repository

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"

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

	// Check if system.query_log exists (used as fallback)
	if err := checkTableExists(ctx, conn, "system.query_log"); err != nil {
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

	if err := checkTableExists(ctx, conn, "system.users"); err != nil {
		return nil, err
	}
	if err := checkTableExists(ctx, conn, "system.grants"); err != nil {
		return nil, err
	}
	if err := checkTableExists(ctx, conn, "system.settings_profile_elements"); err != nil {
		return nil, err
	}

	query := `SELECT
    users.name,
    users.id,
    ups.profile,
    users.storage,
    role_grants.granted_role_name as role_name,
    groupArray(grants.access_type) as grants
FROM system.users
LEFT JOIN system.grants ON users.name = grants.user_name
LEFT JOIN system.role_grants ON users.name = role_grants.user_name
LEFT JOIN (
    SELECT spe.user_name as user_name, spe.inherit_profile as profile
    FROM system.settings_profile_elements AS spe
    WHERE spe.user_name IS NOT NULL AND spe.inherit_profile IS NOT NULL
) AS ups ON ups.user_name = users.name
GROUP BY users.name,
         users.id,
         users.storage,
         role_grants.granted_role_name,
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

// GetUserDetails returns basic information about a specific user by name.
func (r *UsersRepository) GetUserDetails(ctx context.Context, nodeName, userName string) (*models.UserDetails, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.users"); err != nil {
		return nil, err
	}
	if err := checkTableExists(ctx, conn, "system.grants"); err != nil {
		return nil, err
	}
	if err := checkTableExists(ctx, conn, "system.settings_profile_elements"); err != nil {
		return nil, err
	}

	query := `SELECT
    users.name,
    users.id,
    ups.profile,
    ups.user_settings,
    ups.profile_settings,
    users.storage,
    role_grants.granted_role_name as role_name,
    arrayStringConcat([grants.database, grants.table, grants.column], '.'),
    groupArray(grants.access_type) as grants
FROM system.users
LEFT JOIN system.grants ON users.name = grants.user_name
LEFT JOIN system.role_grants ON users.name = role_grants.user_name
LEFT JOIN (
    SELECT spe.user_name as user_name, spe.inherit_profile as profile, user_setting.settings as user_settings, profile_setting.settings as profile_settings
    FROM system.settings_profile_elements AS spe
    LEFT JOIN (
        SELECT user_name, groupArray(setting_name) as settings
        FROM system.settings_profile_elements
        WHERE setting_name IS NOT NULL AND user_name IS NOT NULL
        GROUP BY user_name
    ) as user_setting ON spe.user_name = user_setting.user_name
    LEFT JOIN (
        SELECT profile_name, mapFromArrays(groupArray(setting_name), groupArray(value)) as settings
        FROM system.settings_profile_elements
        WHERE setting_name IS NOT NULL AND profile_name IS NOT NULL AND value IS NOT NULL
        GROUP BY profile_name
    ) as profile_setting ON spe.inherit_profile = profile_setting.profile_name
    WHERE spe.user_name IS NOT NULL AND spe.inherit_profile IS NOT NULL
) AS ups ON ups.user_name = users.name
WHERE users.name = ?
GROUP BY users.name,
         users.id,
         users.storage,
         role_grants.granted_role_name,
         ups.profile,
         ups.user_settings,
         ups.profile_settings,
         grants.database,
         grants.table,
         grants.column`

	rows, err := conn.Query(ctx, query, userName)
	if err != nil {
		return nil, fmt.Errorf("failed to query user basic info: %w", err)
	}
	defer rows.Close()

	// Map to aggregate grants per user
	userMap := make(map[string]*models.UserDetails)

	for rows.Next() {
		var name, id, profile, storage, roleName, scope sql.NullString
		var userSettings []string
		var profileSettings map[string]string
		var grants []string

		if err := rows.Scan(&name, &id, &profile, &userSettings, &profileSettings, &storage, &roleName, &scope, &grants); err != nil {
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
			// Create new user basic info item
			userBasicInfo := &models.UserDetails{
				Name:            name.String,
				ID:              id.String,
				Profile:         profile.String,
				UserSettings:    userSettings,
				ProfileSettings: profileSettings,
				Storage:         storage.String,
				RoleName:        roleName.String,
				Scope:           scope.String,
				Grants:          grants,
			}
			userMap[userKey] = userBasicInfo
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("user basic info query iteration failed: %w", err)
	}

	// Check if user was found
	if len(userMap) == 0 {
		return nil, fmt.Errorf("user %s not found", userName)
	}

	// Return the first (and should be only) user
	for _, user := range userMap {
		return user, nil
	}

	return nil, fmt.Errorf("user %s not found", userName)
}

// RenameUser renames a ClickHouse user from oldName to newName.
func (r *UsersRepository) RenameUser(ctx context.Context, nodeName, oldName, newName string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Validate input
	if oldName == "" {
		return fmt.Errorf("old user name cannot be empty")
	}
	if newName == "" {
		return fmt.Errorf("new user name cannot be empty")
	}

	// If names are the same, no update needed
	if oldName == newName {
		return nil
	}

	// Check if user exists before renaming and get user details
	userDetails, err := r.GetUserDetails(ctx, nodeName, oldName)
	if err != nil {
		return fmt.Errorf("user %s not found: %w", oldName, err)
	}

	// Check if user is stored in users.xml file (cannot be renamed)
	if userDetails.Storage == "users_xml" {
		return fmt.Errorf("cannot rename user %s: user is defined in users.xml file on the server", oldName)
	}

	// Escape backticks in user names for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Execute ALTER USER RENAME TO command
	query := fmt.Sprintf("ALTER USER `%s` RENAME TO `%s`", escapeIdentifier(oldName), escapeIdentifier(newName))

	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to rename user from %s to %s: %w", oldName, newName, err)
	}

	if r.logger != nil {
		r.logger.Infof("Successfully renamed user from %s to %s on node %s", oldName, newName, nodeName)
	}

	return nil
}

// CreateUser creates a new ClickHouse user with specified name and password.
func (r *UsersRepository) CreateUser(ctx context.Context, nodeName, userName, password string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Validate input
	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	// Check if user already exists
	_, err = r.GetUserDetails(ctx, nodeName, userName)
	if err == nil {
		return fmt.Errorf("user %s already exists", userName)
	}
	// If error is not "not found", return it
	if !strings.Contains(err.Error(), "not found") {
		return fmt.Errorf("failed to check if user exists: %w", err)
	}

	// Escape backticks and single quotes in user name and password for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	escapePassword := func(pwd string) string {
		// Escape single quotes in password by doubling them
		return strings.ReplaceAll(pwd, "'", "''")
	}

	// Execute CREATE USER command
	query := fmt.Sprintf("CREATE USER IF NOT EXISTS `%s` IDENTIFIED BY '%s'", escapeIdentifier(userName), escapePassword(password))

	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to create user %s: %w", userName, err)
	}

	if r.logger != nil {
		r.logger.Infof("Successfully created user %s on node %s", userName, nodeName)
	}

	return nil
}

// UpdatePassword updates password for an existing ClickHouse user.
func (r *UsersRepository) UpdatePassword(ctx context.Context, nodeName, userName, password string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Validate input
	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	// Check if user exists before updating password
	userDetails, err := r.GetUserDetails(ctx, nodeName, userName)
	if err != nil {
		return fmt.Errorf("user %s not found: %w", userName, err)
	}

	// Check if user is defined in users.xml
	if userDetails.Storage == "users_xml" {
		return fmt.Errorf("cannot update password for user %s: user is defined in users.xml file on the server", userName)
	}

	// Escape backticks and single quotes in user name and password for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	escapePassword := func(pwd string) string {
		// Escape single quotes in password by doubling them
		return strings.ReplaceAll(pwd, "'", "''")
	}

	// Execute ALTER USER command to change password
	query := fmt.Sprintf("ALTER USER `%s` IDENTIFIED BY '%s'", escapeIdentifier(userName), escapePassword(password))

	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to update password for user %s: %w", userName, err)
	}

	if r.logger != nil {
		r.logger.Infof("Successfully updated password for user %s on node %s", userName, nodeName)
	}

	return nil
}

// UpdateProfile updates profile for an existing ClickHouse user.
func (r *UsersRepository) UpdateProfile(ctx context.Context, nodeName, userName, profileName string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Validate input
	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}
	// Profile name can be empty to remove profile from user

	// Check if user exists before updating profile
	userDetails, err := r.GetUserDetails(ctx, nodeName, userName)
	if err != nil {
		return fmt.Errorf("user %s not found: %w", userName, err)
	}

	// Check if user is defined in users.xml
	if userDetails.Storage == "users_xml" {
		return fmt.Errorf("cannot update profile for user %s: user is defined in users.xml file on the server", userName)
	}

	// Escape backticks in user name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	var query string
	if profileName == "" {
		// Remove profile from user by setting it to NONE
		// ClickHouse uses NONE keyword to remove profile assignment
		query = fmt.Sprintf("ALTER USER `%s` SETTINGS PROFILE NONE", escapeIdentifier(userName))
	} else {
		// Set specific profile
		escapeProfileName := func(profile string) string {
			// Escape single quotes in profile name by doubling them
			return strings.ReplaceAll(profile, "'", "''")
		}
		query = fmt.Sprintf("ALTER USER `%s` SETTINGS PROFILE '%s'", escapeIdentifier(userName), escapeProfileName(profileName))
	}

	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to update profile for user %s: %w", userName, err)
	}

	if r.logger != nil {
		if profileName == "" {
			r.logger.Infof("Successfully removed profile for user %s on node %s", userName, nodeName)
		} else {
			r.logger.Infof("Successfully updated profile for user %s on node %s", userName, nodeName)
		}
	}

	return nil
}

// UpdateRole updates role for an existing ClickHouse user.
func (r *UsersRepository) UpdateRole(ctx context.Context, nodeName, userName, roleName string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Validate input
	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}
	// Role name can be empty to remove role from user

	// Check if user exists before updating role
	userDetails, err := r.GetUserDetails(ctx, nodeName, userName)
	if err != nil {
		return fmt.Errorf("user %s not found: %w", userName, err)
	}

	// Check if user is defined in users.xml
	if userDetails.Storage == "users_xml" {
		return fmt.Errorf("cannot update role for user %s: user is defined in users.xml file on the server", userName)
	}

	// Escape backticks in user name and role name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	var query string
	if roleName == "" {
		// To remove role from user, we need to:
		// 1. Get current role(s) assigned to user
		// 2. Revoke the role(s) from user
		// 3. Set default role to NONE
		
		// First, get current role from user details
		currentRole := userDetails.RoleName
		if currentRole != "" {
			// Revoke the role from user
			escapeRoleName := func(role string) string {
				return escapeIdentifier(role)
			}
			revokeQuery := fmt.Sprintf("REVOKE `%s` FROM `%s`", escapeRoleName(currentRole), escapeIdentifier(userName))
			if err := conn.Exec(ctx, revokeQuery); err != nil {
				// Log error but continue - role might not be granted or already revoked
				// This is not critical, as the role might already be revoked
				if r.logger != nil {
					r.logger.Errorf("Failed to revoke role %s from user %s (may already be revoked): %v", currentRole, userName, err)
				}
			}
		}
		
		// Remove default role from user by setting it to NONE
		// ClickHouse uses NONE keyword to remove default role assignment
		query = fmt.Sprintf("ALTER USER `%s` DEFAULT ROLE NONE", escapeIdentifier(userName))
	} else {
		// First, grant the role to user (if not already granted)
		// Then set it as default role
		escapeRoleName := func(role string) string {
			return escapeIdentifier(role)
		}

		// Grant role to user first (if not already granted, this will be a no-op)
		grantQuery := fmt.Sprintf("GRANT `%s` TO `%s`", escapeRoleName(roleName), escapeIdentifier(userName))
		if err := conn.Exec(ctx, grantQuery); err != nil {
			// If role doesn't exist, return error
			errLower := strings.ToLower(err.Error())
			if strings.Contains(errLower, "doesn't exist") ||
				strings.Contains(errLower, "does not exist") ||
				strings.Contains(errLower, "not found") ||
				strings.Contains(errLower, "unknown role") ||
				strings.Contains(errLower, "no role") ||
				strings.Contains(errLower, "there is no role") {
				return fmt.Errorf("role %s does not exist: %w", roleName, err)
			}
			return fmt.Errorf("failed to grant role %s to user %s: %w", roleName, userName, err)
		}

		// Set role as default role
		query = fmt.Sprintf("ALTER USER `%s` DEFAULT ROLE `%s`", escapeIdentifier(userName), escapeRoleName(roleName))
	}

	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to update role for user %s: %w", userName, err)
	}

	if r.logger != nil {
		if roleName == "" {
			r.logger.Infof("Successfully removed role for user %s on node %s", userName, nodeName)
		} else {
			r.logger.Infof("Successfully updated role for user %s on node %s", userName, nodeName)
		}
	}

	return nil
}

// DropUser removes a ClickHouse user (DROP USER). User must not be defined in users.xml.
func (r *UsersRepository) DropUser(ctx context.Context, nodeName, userName string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}

	userDetails, err := r.GetUserDetails(ctx, nodeName, userName)
	if err != nil {
		return fmt.Errorf("user %s not found: %w", userName, err)
	}

	if userDetails.Storage == "users_xml" {
		return fmt.Errorf("cannot drop user %s: user is defined in users.xml file on the server", userName)
	}

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	query := fmt.Sprintf("DROP USER IF EXISTS `%s`", escapeIdentifier(userName))
	if err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("failed to drop user %s: %w", userName, err)
	}

	if r.logger != nil {
		r.logger.Infof("Successfully dropped user %s on node %s", userName, nodeName)
	}

	return nil
}
