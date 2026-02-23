package repository

import (
	"context"
	"fmt"
	"strings"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// TablesRepository executes queries to get ClickHouse tables list.
type TablesRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewTablesRepository creates a repository backed by the shared ClickHouse manager.
func NewTablesRepository(cfg *config.Config, log *logger.Logger) (*TablesRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	return &TablesRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetTables returns list of available ClickHouse tables from a specific node.
// nameFilter is optional and filters tables by name (case-insensitive partial match).
// schemaFilter is optional and filters tables by database/schema name.
func (r *TablesRepository) GetTables(ctx context.Context, nodeName, nameFilter, schemaFilter string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Check if system.tables exists
	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return nil, err
	}

	// Build query with optional filters
	var queryParts []string
	var args []interface{}

	queryParts = append(queryParts, "SELECT name FROM system.tables WHERE 1=1")

	if schemaFilter != "" {
		queryParts = append(queryParts, "AND database = ?")
		args = append(args, schemaFilter)
	}

	if nameFilter != "" {
		queryParts = append(queryParts, "AND lower(name) LIKE lower(?)")
		args = append(args, "%"+nameFilter+"%")
	}

	queryParts = append(queryParts, "ORDER BY name")

	query := strings.Join(queryParts, " ")

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("failed to scan table name: %w", err)
		}
		tables = append(tables, tableName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("tables query iteration failed: %w", err)
	}

	return tables, nil
}

