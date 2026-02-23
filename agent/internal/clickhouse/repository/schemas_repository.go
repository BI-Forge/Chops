package repository

import (
	"context"
	"fmt"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// SchemasRepository executes queries to get ClickHouse databases (schemas) list.
type SchemasRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewSchemasRepository creates a repository backed by the shared ClickHouse manager.
func NewSchemasRepository(cfg *config.Config, log *logger.Logger) (*SchemasRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	return &SchemasRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetSchemas returns list of available ClickHouse databases (schemas) from a specific node.
// nameFilter is optional and filters schemas by name (case-insensitive partial match).
func (r *SchemasRepository) GetSchemas(ctx context.Context, nodeName, nameFilter string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Check if system.databases exists
	if err := checkTableExists(ctx, conn, "system.databases"); err != nil {
		return nil, err
	}

	// Build query with optional name filter
	var query string
	var args []interface{}

	if nameFilter != "" {
		query = `SELECT name 
			FROM system.databases 
			WHERE lower(name) LIKE lower(?)
			ORDER BY name`
		args = []interface{}{"%" + nameFilter + "%"}
	} else {
		query = `SELECT name 
			FROM system.databases 
			ORDER BY name`
		args = []interface{}{}
	}

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query schemas: %w", err)
	}
	defer rows.Close()

	var schemas []string
	for rows.Next() {
		var schemaName string
		if err := rows.Scan(&schemaName); err != nil {
			return nil, fmt.Errorf("failed to scan schema name: %w", err)
		}
		schemas = append(schemas, schemaName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("schemas query iteration failed: %w", err)
	}

	return schemas, nil
}

