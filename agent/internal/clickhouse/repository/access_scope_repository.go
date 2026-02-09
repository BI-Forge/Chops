package repository

import (
	"context"
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// AccessScopeRepository executes queries to get ClickHouse access scopes.
type AccessScopeRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewAccessScopeRepository creates a repository backed by the shared ClickHouse manager.
func NewAccessScopeRepository(cfg *config.Config, log *logger.Logger) (*AccessScopeRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	return &AccessScopeRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetUserAccessScopes returns list of access scopes for a specific user from system.grants.
// Empty values for database, table, or column are treated as "All".
func (r *AccessScopeRepository) GetUserAccessScopes(ctx context.Context, nodeName, userName string) ([]models.AccessScope, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Check if system.grants exists
	if err := checkTableExists(ctx, conn, "system.grants"); err != nil {
		return nil, err
	}

	// Query grants grouped by database, table, column
	// Empty values (NULL or '') are treated as "All"
	// Group access_type into an array for each scope combination
	// Use subquery to handle COALESCE properly in GROUP BY
	query := `SELECT
		database,
		table,
		column,
		groupArray(access_type) as permissions
	FROM (
		SELECT
			COALESCE(NULLIF(database, ''), 'all') as database,
			COALESCE(NULLIF(table, ''), 'all') as table,
			COALESCE(NULLIF(column, ''), 'all') as column,
			access_type
		FROM system.grants
		WHERE user_name = ?
			AND access_type IS NOT NULL
	)
	GROUP BY database, table, column
	ORDER BY database, table, column`

	rows, err := conn.Query(ctx, query, userName)
	if err != nil {
		return nil, fmt.Errorf("failed to query access scopes: %w", err)
	}
	defer rows.Close()

	var accessScopes []models.AccessScope
	for rows.Next() {
		var database, table, column sql.NullString
		var permissions []string

		if err := rows.Scan(&database, &table, &column, &permissions); err != nil {
			return nil, fmt.Errorf("failed to scan access scope: %w", err)
		}

		accessScope := models.AccessScope{
			Database:    database.String,
			Table:       table.String,
			Column:      column.String,
			Permissions: permissions,
		}

		accessScopes = append(accessScopes, accessScope)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("access scopes query iteration failed: %w", err)
	}

	// If no access scopes found, return empty array (not an error)
	return accessScopes, nil
}
