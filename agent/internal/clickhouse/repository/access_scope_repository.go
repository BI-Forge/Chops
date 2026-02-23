package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

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

// isAll returns true if the value represents "all" scope (empty or literal "all").
func isAll(s string) bool {
	return s == "" || strings.EqualFold(s, "all")
}

// UpdateUserAccessScopes replaces all access scopes for a user: revokes all grants, then grants the given scopes.
// Scope format matches GetUserAccessScopes (database/table/column empty or "all" = wildcard).
func (r *AccessScopeRepository) UpdateUserAccessScopes(ctx context.Context, nodeName, userName string, scopes []models.AccessScope) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	if userName == "" {
		return fmt.Errorf("user name cannot be empty")
	}

	if err := checkTableExists(ctx, conn, "system.grants"); err != nil {
		return err
	}

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Revoke all privileges from user (ClickHouse: REVOKE ALL ON *.* FROM user)
	revokeQuery := fmt.Sprintf("REVOKE ALL ON *.* FROM `%s`", escapeIdentifier(userName))
	if err := conn.Exec(ctx, revokeQuery); err != nil {
		// Ignore "no grants" or similar; proceed to grant
		if r.logger != nil {
			r.logger.Warningf("Revoke all grants for user %s (may have had none): %v", userName, err)
		}
	}

	// Grant each scope
	for _, scope := range scopes {
		if len(scope.Permissions) == 0 {
			continue
		}

		db := strings.TrimSpace(scope.Database)
		tbl := strings.TrimSpace(scope.Table)
		col := strings.TrimSpace(scope.Column)

		// Normalize "all" to empty for scope logic
		if strings.EqualFold(db, "all") {
			db = ""
		}
		if strings.EqualFold(tbl, "all") {
			tbl = ""
		}
		if strings.EqualFold(col, "all") {
			col = ""
		}

		// Build privilege list for GRANT (filter empty, dedupe)
		perms := make([]string, 0, len(scope.Permissions))
		seen := make(map[string]bool)
		for _, p := range scope.Permissions {
			p = strings.TrimSpace(p)
			if p == "" || seen[p] {
				continue
			}
			seen[p] = true
			perms = append(perms, p)
		}
		if len(perms) == 0 {
			continue
		}

		var grantQuery string
		if isAll(db) {
			// Global: GRANT perm1, perm2 ON *.* TO user
			grantQuery = fmt.Sprintf("GRANT %s ON *.* TO `%s`", strings.Join(perms, ", "), escapeIdentifier(userName))
		} else if isAll(tbl) {
			// Database-level: GRANT perm1, perm2 ON db.* TO user
			grantQuery = fmt.Sprintf("GRANT %s ON `%s`.* TO `%s`", strings.Join(perms, ", "), escapeIdentifier(db), escapeIdentifier(userName))
		} else if isAll(col) {
			// Table-level: GRANT perm1, perm2 ON db.table TO user
			grantQuery = fmt.Sprintf("GRANT %s ON `%s`.`%s` TO `%s`", strings.Join(perms, ", "), escapeIdentifier(db), escapeIdentifier(tbl), escapeIdentifier(userName))
		} else {
			// Column-level: GRANT perm1(col), perm2(col) ON db.table TO user
			colPart := make([]string, len(perms))
			for i, p := range perms {
				colPart[i] = fmt.Sprintf("%s(`%s`)", p, escapeIdentifier(col))
			}
			grantQuery = fmt.Sprintf("GRANT %s ON `%s`.`%s` TO `%s`", strings.Join(colPart, ", "), escapeIdentifier(db), escapeIdentifier(tbl), escapeIdentifier(userName))
		}

		if err := conn.Exec(ctx, grantQuery); err != nil {
			return fmt.Errorf("failed to grant access scope (db=%q table=%q column=%q): %w", db, tbl, col, err)
		}
	}

	return nil
}
