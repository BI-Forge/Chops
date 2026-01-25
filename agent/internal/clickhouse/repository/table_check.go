package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// checkTableExists checks if a table exists in ClickHouse.
// tableName can be in format "schema.table" or just "table" (defaults to "default" database).
// Returns error if table doesn't exist.
func checkTableExists(ctx context.Context, conn driver.Conn, tableName string) error {
	// Parse table name to extract database and table
	database, table := parseTableName(tableName)

	query := "SELECT count() FROM system.tables WHERE database = ? AND name = ?"
	row := conn.QueryRow(ctx, query, database, table)
	
	var count uint64
	if err := row.Scan(&count); err != nil {
		return fmt.Errorf("failed to check table existence: %w", err)
	}

	if count == 0 {
		return fmt.Errorf("table %s.%s does not exist", database, table)
	}

	return nil
}

// parseTableName parses table name to extract database and table name.
// Supports formats: "schema.table", "table" (defaults to "default" database).
func parseTableName(tableName string) (database, table string) {
	parts := strings.Split(tableName, ".")
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	// Default to "default" database if no schema specified
	return "default", tableName
}

