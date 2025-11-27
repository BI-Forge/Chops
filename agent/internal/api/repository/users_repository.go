package repository

import (
	"context"
	"fmt"
	"sort"

	"clickhouse-ops/internal/clickhouse"
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
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if nodeName != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(nodeName)
		if err != nil {
			return nil, fmt.Errorf("failed to get connection for node %s: %w", nodeName, err)
		}
	} else {
		// Use default connection if no node specified
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("failed to get connection: %w", err)
		}
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
