package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// QueryRawSyncer handles synchronization for ops.query_raw table
type QueryRawSyncer struct {
	*BaseSyncer
}

// NewQueryRawSyncer creates a new query_raw syncer
func NewQueryRawSyncer(interval time.Duration, batchSize int) *QueryRawSyncer {
	config := SyncConfig{
		TableName: "ops.query_raw",
		Interval:  interval,
		BatchSize: batchSize,
	}

	return &QueryRawSyncer{
		BaseSyncer: NewBaseSyncer(config),
	}
}

// Sync performs the synchronization for query_raw table
func (qrs *QueryRawSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: qrs.config.TableName,
	}

	// Get last timestamp - use config timestamp if set, otherwise get from table
	var lastTs time.Time
	if !qrs.config.LastTimestamp.IsZero() {
		lastTs = qrs.config.LastTimestamp
	} else {
		var err error
		lastTs, err = qrs.GetLastTimestamp(ctx, conn)
		if err != nil {
			result.Error = fmt.Errorf("failed to get last timestamp: %w", err)
			return result, result.Error
		}
	}

	// Build the direct INSERT INTO ... SELECT query
	insertQuery := qrs.BuildInsertSelectQuery(lastTs)

	// Execute the direct insert-select query
	recordsProcessed, err := qrs.ExecuteInsertSelectQuery(ctx, conn, insertQuery)
	if err != nil {
		result.Error = fmt.Errorf("failed to execute sync query: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.LastTimestamp = lastTs
	result.Duration = time.Since(startTime)

	// Update the last timestamp in config for next sync
	if recordsProcessed > 0 {
		// Update to current time for next sync
		qrs.config.LastTimestamp = time.Now()
	}

	return result, nil
}

// BuildInsertSelectQuery builds a direct INSERT INTO ... SELECT query
func (qrs *QueryRawSyncer) BuildInsertSelectQuery(lastTs time.Time) string {
	// Convert time to microseconds timestamp for ClickHouse
	var lastTsMicro int64
	if !lastTs.IsZero() {
		lastTsMicro = lastTs.UnixMicro()
	}

	// Build the complete INSERT INTO ... SELECT query
	query := fmt.Sprintf(`
		INSERT INTO ops.query_raw (
			event_time, host, user, query_id, query_kind, is_distributed,
			read_rows, read_bytes, written_rows, written_bytes, duration_ms,
			memory_usage, exception_code, query_text
		)
		SELECT
			event_time_microseconds AS event_time,
			hostName()              AS host,
			initial_user            AS user,
			query_id,
			query_kind,
			is_initial_query AS is_distributed,
			read_rows,
			read_bytes,
			written_rows,
			written_bytes,
			query_duration_ms       AS duration_ms,
			memory_usage,
			exception_code,
			query                   AS query_text
		FROM system.query_log
		WHERE type = 'QueryFinish'
		  AND event_time_microseconds > toDateTime64(%d, 6)
		ORDER BY event_time_microseconds
		LIMIT %d
	`, lastTsMicro, qrs.config.BatchSize)

	return query
}

// SetLastTimestamp sets the last processed timestamp for the syncer
func (qrs *QueryRawSyncer) SetLastTimestamp(timestamp time.Time) {
	qrs.config.LastTimestamp = timestamp
}

// GetLastTimestampFromConfig returns the configured last timestamp
func (qrs *QueryRawSyncer) GetLastTimestampFromConfig() time.Time {
	return qrs.config.LastTimestamp
}
