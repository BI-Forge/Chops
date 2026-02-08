package repository

import (
	"context"
	"fmt"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// RolesRepository executes queries to get ClickHouse roles list.
type RolesRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewRolesRepository creates a repository backed by the shared ClickHouse manager.
func NewRolesRepository(cfg *config.Config, log *logger.Logger) (*RolesRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	return &RolesRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetRoles returns list of available ClickHouse roles from a specific node.
func (r *RolesRepository) GetRoles(ctx context.Context, nodeName string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Try to query from system.roles first (preferred method)
	// If table doesn't exist, fall back to system.grants
	var query string

	if err := checkTableExists(ctx, conn, "system.roles"); err == nil {
		query = `SELECT name FROM system.roles ORDER BY name`
	} else {
		// Fallback to system.grants if system.roles doesn't exist
		if err := checkTableExists(ctx, conn, "system.grants"); err != nil {
			return nil, err
		}
		// Query distinct role names from system.grants
		// where role_name IS NOT NULL (roles are assigned via role_name)
		query = `SELECT DISTINCT role_name 
			FROM system.grants 
			WHERE role_name IS NOT NULL AND role_name != ''
			ORDER BY role_name`
	}

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			return nil, fmt.Errorf("failed to scan role name: %w", err)
		}
		roles = append(roles, roleName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("roles query iteration failed: %w", err)
	}

	// Roles are already sorted by ORDER BY in query
	return roles, nil
}

