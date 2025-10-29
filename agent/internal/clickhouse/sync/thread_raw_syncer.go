package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ThreadRawSyncer handles synchronization for ops.thread_raw table
type ThreadRawSyncer struct {
	*BaseSyncer
}

// NewThreadRawSyncer creates a new thread_raw syncer
func NewThreadRawSyncer(interval time.Duration, batchSize int) *ThreadRawSyncer {
	config := SyncConfig{
		TableName: "ops.thread_raw",
		Interval:  interval,
		BatchSize: batchSize,
	}

	return &ThreadRawSyncer{
		BaseSyncer: NewBaseSyncer(config),
	}
}

// Sync performs the synchronization for thread_raw table
func (trs *ThreadRawSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: trs.config.TableName,
	}

	// Get last timestamp - use config timestamp if set, otherwise get from table
	var lastTs time.Time
	if !trs.config.LastTimestamp.IsZero() {
		lastTs = trs.config.LastTimestamp
	} else {
		var err error
		lastTs, err = trs.GetLastTimestamp(ctx, conn)
		if err != nil {
			result.Error = fmt.Errorf("failed to get last timestamp: %w", err)
			return result, result.Error
		}
	}

	// Build the direct INSERT INTO ... SELECT query
	insertQuery := trs.BuildInsertSelectQuery(lastTs)

	// Execute the direct insert-select query
	recordsProcessed, err := trs.ExecuteInsertSelectQuery(ctx, conn, insertQuery)
	if err != nil {
		result.Error = fmt.Errorf("failed to execute sync query: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.Duration = time.Since(startTime)

	// Get max timestamp from inserted records to update last timestamp
	if recordsProcessed > 0 {
		// Get the maximum event_time from the target table
		maxTsQuery := fmt.Sprintf("SELECT max(event_time) FROM %s", trs.config.TableName)
		row := conn.QueryRow(ctx, maxTsQuery)
		var maxTs time.Time
		if err := row.Scan(&maxTs); err == nil && !maxTs.IsZero() {
			result.LastTimestamp = maxTs
			trs.config.LastTimestamp = maxTs
		} else {
			// Fallback to current time if we can't get max timestamp
			result.LastTimestamp = time.Now()
			trs.config.LastTimestamp = time.Now()
		}
	} else {
		result.LastTimestamp = lastTs
	}

	return result, nil
}

// BuildInsertSelectQuery builds a direct INSERT INTO ... SELECT query for thread_raw
func (trs *ThreadRawSyncer) BuildInsertSelectQuery(lastTs time.Time) string {
	// Format time as string for ClickHouse datetime function
	var lastTsStr string
	if !lastTs.IsZero() {
		lastTsStr = lastTs.Format("2006-01-02 15:04:05")
	} else {
		lastTsStr = "1970-01-01 00:00:00"
	}

	// Build the complete INSERT INTO ... SELECT query
	query := fmt.Sprintf(`
		INSERT INTO ops.thread_raw (
			event_time, host, query_id, thread_id, os_thread_id,
			read_rows, read_bytes, written_rows, written_bytes, cpu_time_ns
		)
		SELECT
			event_time_microseconds AS event_time,
			hostName()              AS host,
			query_id,
			thread_id,
			os_thread_id,
			read_rows,
			read_bytes,
			written_rows,
			written_bytes,
			ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS cpu_time_ns
		FROM system.query_thread_log
		WHERE event_time_microseconds > toDateTime64('%s', 6)
		ORDER BY event_time_microseconds
	`, lastTsStr)

	return query
}

// SetLastTimestamp sets the last processed timestamp for the syncer
func (trs *ThreadRawSyncer) SetLastTimestamp(timestamp time.Time) {
	trs.config.LastTimestamp = timestamp
}

// GetLastTimestampFromConfig returns the configured last timestamp
func (trs *ThreadRawSyncer) GetLastTimestampFromConfig() time.Time {
	return trs.config.LastTimestamp
}
