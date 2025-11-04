package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// QueryAggMinSyncer handles synchronization for ops.query_agg_min table
type QueryAggMinSyncer struct {
	*BaseSyncer
	cluster string // Cluster name from config
}

// NewQueryAggMinSyncer creates a new query_agg_min syncer
func NewQueryAggMinSyncer(interval time.Duration, cluster string) *QueryAggMinSyncer {
	config := SyncConfig{
		TableName: "ops.query_agg_min",
		Interval:  interval,
	}

	return &QueryAggMinSyncer{
		BaseSyncer: NewBaseSyncer(config),
		cluster:    cluster,
	}
}

// Sync performs the synchronization for query_agg_min table
func (qams *QueryAggMinSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: qams.config.TableName,
	}

	// Get last timestamp - use config timestamp if set, otherwise get from table
	var lastTs time.Time
	if !qams.config.LastTimestamp.IsZero() {
		lastTs = qams.config.LastTimestamp
	} else {
		var err error
		lastTs, err = qams.GetLastTimestamp(ctx, conn)
		if err != nil {
			result.Error = fmt.Errorf("failed to get last timestamp: %w", err)
			return result, result.Error
		}
	}

	// Calculate window start and end times
	windowStart := lastTs
	windowEnd := time.Now()

	// Build the direct INSERT INTO ... SELECT query
	insertQuery := qams.BuildInsertSelectQuery(windowStart, windowEnd)

	// Execute the direct insert-select query
	recordsProcessed, err := qams.ExecuteInsertSelectQuery(ctx, conn, insertQuery)
	if err != nil {
		result.Error = fmt.Errorf("failed to execute sync query: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.LastTimestamp = windowEnd
	result.Duration = time.Since(startTime)

	// Update the last timestamp in config for next sync
	if recordsProcessed > 0 {
		// Update to window end time for next sync
		qams.config.LastTimestamp = windowEnd
	}

	return result, nil
}

// BuildInsertSelectQuery builds a direct INSERT INTO ... SELECT query for query_agg_min
func (qams *QueryAggMinSyncer) BuildInsertSelectQuery(windowStart, windowEnd time.Time) string {
	// Convert times to ClickHouse format
	windowStartStr := windowStart.Format("2006-01-02 15:04:05")
	windowEndStr := windowEnd.Format("2006-01-02 15:04:05")

	// Build the complete INSERT INTO ... SELECT query
	query := fmt.Sprintf(`
		INSERT INTO ops.query_agg_min (
			ts, cluster, host, user, query_fingerprint, query_kind, is_distributed,
			rows_read, bytes_read, rows_written, bytes_written,
			duration_ms_p50, duration_ms_p95, duration_ms_p99,
			cpu_ms_sum, mem_peak_mb_p95, errors_count, rc_class
		)
		SELECT
			toStartOfMinute(event_time)      AS ts,
			'%s'                             AS cluster,
			host,
			user,
			toString(cityHash64(query_text)) AS query_fingerprint,
			anyLast(query_kind)              AS query_kind,
			max(is_distributed)              AS is_distributed,
			sum(read_rows)                   AS rows_read,
			sum(read_bytes)                  AS bytes_read,
			sum(written_rows)                AS rows_written,
			sum(written_bytes)               AS bytes_written,
			quantileExact(0.50)(duration_ms) AS duration_ms_p50,
			quantileExact(0.95)(duration_ms) AS duration_ms_p95,
			quantileExact(0.99)(duration_ms) AS duration_ms_p99,
			0                                AS cpu_ms_sum,
			quantileExact(0.95)(memory_usage)/1048576 AS mem_peak_mb_p95,
			sum(exception_code != 0)          AS errors_count,
			anyLast('')                       AS rc_class
		FROM ops.query_raw
		WHERE event_time >= toDateTime('%s') AND event_time < toDateTime('%s')
		GROUP BY ts, cluster, host, user, query_fingerprint
	`, qams.cluster, windowStartStr, windowEndStr)

	return query
}

// SetLastTimestamp sets the last processed timestamp for the syncer
func (qams *QueryAggMinSyncer) SetLastTimestamp(timestamp time.Time) {
	qams.config.LastTimestamp = timestamp
}

// GetLastTimestamp retrieves the last processed timestamp from the target table
// Override the base method since query_agg_min uses 'ts' field instead of 'event_time'
func (qams *QueryAggMinSyncer) GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error) {
	query := fmt.Sprintf(`
		SELECT toDateTime(max(ts)) as last_ts 
		FROM %s 
		WHERE ts IS NOT NULL
	`, qams.config.TableName)

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

// GetLastTimestampFromConfig returns the configured last timestamp
func (qams *QueryAggMinSyncer) GetLastTimestampFromConfig() time.Time {
	return qams.config.LastTimestamp
}
