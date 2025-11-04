package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// StorageMinSyncer handles synchronization for ops.storage_min table
type StorageMinSyncer struct {
	*BaseSyncer
	cluster string // Cluster name from config
}

// NewStorageMinSyncer creates a new storage_min syncer
func NewStorageMinSyncer(interval time.Duration, cluster string) *StorageMinSyncer {
	config := SyncConfig{
		TableName: "ops.storage_min",
		Interval:  interval,
	}

	return &StorageMinSyncer{
		BaseSyncer: NewBaseSyncer(config),
		cluster:    cluster,
	}
}

// Sync performs the synchronization for storage_min table
func (sms *StorageMinSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: sms.config.TableName,
	}

	// Build the direct INSERT INTO ... SELECT query
	// This query always inserts data for the current minute
	insertQuery := sms.BuildInsertSelectQuery()

	// Execute the direct insert-select query
	recordsProcessed, err := sms.ExecuteInsertSelectQuery(ctx, conn, insertQuery)
	if err != nil {
		result.Error = fmt.Errorf("failed to execute sync query: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.LastTimestamp = time.Now()
	result.Duration = time.Since(startTime)

	return result, nil
}

// BuildInsertSelectQuery builds a direct INSERT INTO ... SELECT query for storage_min
func (sms *StorageMinSyncer) BuildInsertSelectQuery() string {
	// Build the complete INSERT INTO ... SELECT query
	// This query always inserts data for the current minute (toStartOfMinute(now()))
	query := fmt.Sprintf(`
		INSERT INTO ops.storage_min (
			ts, cluster, host, database, table, parts_active, parts_inactive,
			merges_inflight, merges_bytes, mutations_queue, mutation_failed,
			replica_lag_sec, disk_used_bytes, disk_free_bytes
		)
		SELECT
			p.ts,
			'%s'                                AS cluster,
			p.host,
			p.database,
			p.table,
			p.parts_active,
			p.parts_inactive,
			ifNull(m.merges_inflight, 0)       AS merges_inflight,
			ifNull(m.merges_bytes, 0)          AS merges_bytes,
			ifNull(mu.mutations_queue, 0)      AS mutations_queue,
			ifNull(mu.mutation_failed, 0)      AS mutation_failed,
			ifNull(r.replica_lag_sec, 0)       AS replica_lag_sec,
			ifNull(d.disk_used_bytes, 0)       AS disk_used_bytes,
			ifNull(d.disk_free_bytes, 0)       AS disk_free_bytes
		FROM
		(
			SELECT
				toStartOfMinute(now())         AS ts,
				hostName()                     AS host,
				database,
				table,
				sumIf(1, active)               AS parts_active,
				sumIf(1, NOT active)           AS parts_inactive
			FROM system.parts
			GROUP BY database, table
		) AS p
		LEFT JOIN
		(
			SELECT
				hostName()                                        AS host,
				count()                                           AS merges_inflight,
				sum(total_size_bytes_uncompressed - bytes_read_uncompressed) AS merges_bytes
			FROM system.merges
			GROUP BY host
		) AS m USING host
		LEFT JOIN
		(
			SELECT
				database,
				table,
				sum(parts_to_do)               AS mutations_queue,
				sum(latest_failed_part != '')  AS mutation_failed
			FROM system.mutations
			GROUP BY database, table
		) AS mu USING database, table
		LEFT JOIN
		(
			SELECT
				database,
				table,
				maxOrNull(absolute_delay)      AS replica_lag_sec
			FROM system.replicas
			GROUP BY database, table
		) AS r USING database, table
		LEFT JOIN
		(
			SELECT
				hostName()                     AS host,
				sum(total_space - free_space)  AS disk_used_bytes,
				sum(free_space)                AS disk_free_bytes
			FROM system.disks
			GROUP BY host
		) AS d USING host
	`, sms.cluster)

	return query
}

// GetLastTimestamp retrieves the last processed timestamp from the target table
// Override the base method since storage_min uses 'ts' field instead of 'event_time'
func (sms *StorageMinSyncer) GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error) {
	query := fmt.Sprintf(`
		SELECT toDateTime(max(ts)) as last_ts 
		FROM %s 
		WHERE ts IS NOT NULL
	`, sms.config.TableName)

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

// SetLastTimestamp sets the last processed timestamp for the syncer
func (sms *StorageMinSyncer) SetLastTimestamp(timestamp time.Time) {
	sms.config.LastTimestamp = timestamp
}

// GetLastTimestampFromConfig returns the configured last timestamp
func (sms *StorageMinSyncer) GetLastTimestampFromConfig() time.Time {
	return sms.config.LastTimestamp
}
