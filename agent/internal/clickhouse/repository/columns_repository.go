package repository

import (
	"context"
	"fmt"
	"strings"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// ColumnsRepository executes queries to get ClickHouse columns list.
type ColumnsRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewColumnsRepository creates a repository backed by the shared ClickHouse manager.
func NewColumnsRepository(cfg *config.Config, log *logger.Logger) (*ColumnsRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	return &ColumnsRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetColumns returns list of available ClickHouse columns from a specific node.
// nameFilter is optional and filters columns by name (case-insensitive partial match).
// tableFilter is optional and filters columns by table name.
// schemaFilter is optional and filters columns by database/schema name (required if tableFilter is provided).
func (r *ColumnsRepository) GetColumns(ctx context.Context, nodeName, nameFilter, tableFilter, schemaFilter string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Check if system.columns exists
	if err := checkTableExists(ctx, conn, "system.columns"); err != nil {
		return nil, err
	}

	// Build query with optional filters
	var queryParts []string
	var args []interface{}

	queryParts = append(queryParts, "SELECT name FROM system.columns WHERE 1=1")

	if tableFilter != "" {
		if schemaFilter == "" {
			return nil, fmt.Errorf("schema filter is required when table filter is provided")
		}
		queryParts = append(queryParts, "AND database = ? AND table = ?")
		args = append(args, schemaFilter, tableFilter)
	} else if schemaFilter != "" {
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
		return nil, fmt.Errorf("failed to query columns: %w", err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		if err := rows.Scan(&columnName); err != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", err)
		}
		columns = append(columns, columnName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("columns query iteration failed: %w", err)
	}

	return columns, nil
}

