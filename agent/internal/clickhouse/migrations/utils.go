package migrations

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// executeTableCreation executes a table creation query with error handling
func executeTableCreation(ctx context.Context, conn driver.Conn, query, tableName string) error {
	err := conn.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to create %s table: %w", tableName, err)
	}
	return nil
}

// executeTableDrop executes a table drop query with error handling
func executeTableDrop(ctx context.Context, conn driver.Conn, query, tableName string) error {
	err := conn.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to drop %s table: %w", tableName, err)
	}
	return nil
}
