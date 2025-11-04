package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// PartLogRawSyncer handles synchronization for ops.part_log_raw table
type PartLogRawSyncer struct {
	*BaseSyncer
}

// NewPartLogRawSyncer creates a new part_log_raw syncer
func NewPartLogRawSyncer(interval time.Duration) *PartLogRawSyncer {
	config := SyncConfig{
		TableName: "ops.part_log_raw",
		Interval:  interval,
	}

	return &PartLogRawSyncer{
		BaseSyncer: NewBaseSyncer(config),
	}
}

// Sync performs the synchronization for part_log_raw table
func (plrs *PartLogRawSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: plrs.config.TableName,
	}

	// Get last timestamp - use config timestamp if set, otherwise get from table
	var lastTs time.Time
	if !plrs.config.LastTimestamp.IsZero() {
		lastTs = plrs.config.LastTimestamp
	} else {
		var err error
		lastTs, err = plrs.GetLastTimestamp(ctx, conn)
		if err != nil {
			result.Error = fmt.Errorf("failed to get last timestamp: %w", err)
			return result, result.Error
		}
	}

	// Build the direct INSERT INTO ... SELECT query
	insertQuery := plrs.BuildInsertSelectQuery(lastTs)

	// Execute the direct insert-select query
	recordsProcessed, err := plrs.ExecuteInsertSelectQuery(ctx, conn, insertQuery)
	if err != nil {
		result.Error = fmt.Errorf("failed to execute sync query: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.Duration = time.Since(startTime)

	// Get max timestamp from inserted records to update last timestamp
	if recordsProcessed > 0 {
		// Get the maximum event_time from the target table
		maxTsQuery := fmt.Sprintf("SELECT max(event_time) FROM %s", plrs.config.TableName)
		row := conn.QueryRow(ctx, maxTsQuery)
		var maxTs time.Time
		if err := row.Scan(&maxTs); err == nil && !maxTs.IsZero() {
			result.LastTimestamp = maxTs
			plrs.config.LastTimestamp = maxTs
		} else {
			// Fallback to current time if we can't get max timestamp
			result.LastTimestamp = time.Now()
			plrs.config.LastTimestamp = time.Now()
		}
	} else {
		result.LastTimestamp = lastTs
	}

	return result, nil
}

// BuildInsertSelectQuery builds a direct INSERT INTO ... SELECT query for part_log_raw
func (plrs *PartLogRawSyncer) BuildInsertSelectQuery(lastTs time.Time) string {
	// Convert time to seconds timestamp for ClickHouse (part_log uses DateTime, not DateTime64)
	var lastTsSec int64
	if !lastTs.IsZero() {
		lastTsSec = lastTs.Unix()
	}

	// Build the complete INSERT INTO ... SELECT query
	query := fmt.Sprintf(`
		INSERT INTO ops.part_log_raw (
			event_time, host, database, table, event_type,
			rows, bytes, duration_s, source_part_names
		)
		SELECT
			event_time,
			hostname AS host,
			database,
			table,
			event_type,
			rows,
			size_in_bytes AS bytes,
			duration_ms/1000.0 AS duration_s,
			merged_from AS source_part_names
		FROM system.part_log
		WHERE event_time > toDateTime(%d)
		ORDER BY event_time
	`, lastTsSec)

	return query
}

// SetLastTimestamp sets the last processed timestamp for the syncer
func (plrs *PartLogRawSyncer) SetLastTimestamp(timestamp time.Time) {
	plrs.config.LastTimestamp = timestamp
}

// GetLastTimestampFromConfig returns the configured last timestamp
func (plrs *PartLogRawSyncer) GetLastTimestampFromConfig() time.Time {
	return plrs.config.LastTimestamp
}
