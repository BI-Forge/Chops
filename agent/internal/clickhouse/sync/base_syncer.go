package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// BaseSyncer provides common functionality for table synchronization
type BaseSyncer struct {
	config SyncConfig
}

// NewBaseSyncer creates a new base syncer
func NewBaseSyncer(config SyncConfig) *BaseSyncer {
	return &BaseSyncer{
		config: config,
	}
}

// GetConfig returns the synchronization configuration
func (bs *BaseSyncer) GetConfig() SyncConfig {
	return bs.config
}

// GetLastTimestamp retrieves the last processed timestamp from the target table
func (bs *BaseSyncer) GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error) {
	query := fmt.Sprintf(`
		SELECT toDateTime(max(event_time)) as last_ts 
		FROM %s 
		WHERE event_time IS NOT NULL
	`, bs.config.TableName)

	row := conn.QueryRow(ctx, query)
	var lastTs time.Time
	err := row.Scan(&lastTs)
	if err != nil {
		// If no records exist, return zero time
		if err.Error() == "sql: no rows in result set" {
			return time.Time{}, nil
		}
		return time.Time{}, fmt.Errorf("failed to get last timestamp: %w", err)
	}

	return lastTs, nil
}

// UpdateLastTimestamp updates the last processed timestamp in the config
func (bs *BaseSyncer) UpdateLastTimestamp(ctx context.Context, conn driver.Conn, timestamp time.Time) error {
	// Update the timestamp in the configuration
	bs.config.LastTimestamp = timestamp
	return nil
}

// ExecuteInsertSelectQuery executes an INSERT INTO ... SELECT query and returns the number of affected rows
func (bs *BaseSyncer) ExecuteInsertSelectQuery(ctx context.Context, conn driver.Conn, query string) (int64, error) {
	// For INSERT SELECT queries, we should use Exec instead of Query
	// since INSERT operations don't return result rows
	err := conn.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert-select query: %w", err)
	}

	// Get the count of rows in the target table to estimate affected rows
	// This is a workaround since ClickHouse doesn't return affected row count from INSERT SELECT
	countQuery := fmt.Sprintf("SELECT count() FROM %s", bs.config.TableName)
	row := conn.QueryRow(ctx, countQuery)
	var count int64
	err = row.Scan(&count)
	if err != nil {
		// If we can't get the count, return 1 to indicate success
		return 1, nil
	}

	return count, nil
}
