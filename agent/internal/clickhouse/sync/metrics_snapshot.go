package sync

import (
	"context"
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/config"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// MetricsSnapshot handles synchronization for metrics table in ClickHouse
type MetricsSnapshot struct {
	*BaseSyncer
	clusterName string
}

// NewMetricsSnapshot creates a new metrics snapshot syncer
func NewMetricsSnapshot(interval time.Duration, clusterName string) *MetricsSnapshot {
	config := SyncConfig{
		TableName: "metrics",
		Interval:  interval,
	}

	return &MetricsSnapshot{
		BaseSyncer:  NewBaseSyncer(config),
		clusterName: clusterName,
	}
}

// Sync performs the synchronization for metrics using INSERT INTO ... SELECT ... FROM ...
func (ms *MetricsSnapshot) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: ms.config.TableName,
	}

	// Get node config from context
	var nodeConfig config.ClickHouseNode
	if node, ok := ctx.Value("node_config").(config.ClickHouseNode); ok {
		nodeConfig = node
	} else {
		result.Error = fmt.Errorf("node config not found in context")
		return result, result.Error
	}

	// Get schema and table from config
	schema := nodeConfig.MetricsSchema
	table := nodeConfig.MetricsTable

	if schema == "" {
		schema = "ops" // Default schema
	}
	if table == "" {
		table = "metrics_snapshot" // Default table
	}

	// Build INSERT INTO ... SELECT ... FROM ... query
	insertQuery := ms.buildInsertSelectQuery(schema, table)

	// Execute INSERT INTO ... SELECT ... FROM ...
	// If table doesn't exist, create it and retry
	if err := conn.Exec(ctx, insertQuery); err != nil {
		// Check if error is related to missing table or database
		if ms.isTableNotFoundError(err) {
			// Create schema and table, then retry
			if createErr := ms.createSchemaAndTable(ctx, conn, schema, table); createErr != nil {
				result.Error = fmt.Errorf("failed to create schema and table: %w", createErr)
				return result, result.Error
			}
			// Retry INSERT after creating table
			if retryErr := conn.Exec(ctx, insertQuery); retryErr != nil {
				result.Error = fmt.Errorf("failed to execute INSERT INTO ... SELECT after creating table: %w", retryErr)
				return result, result.Error
			}
		} else {
			result.Error = fmt.Errorf("failed to execute INSERT INTO ... SELECT: %w", err)
			return result, result.Error
		}
	}

	result.RecordsProcessed = 1 // We insert one row per sync
	result.Duration = time.Since(startTime)
	result.LastTimestamp = time.Now()

	return result, nil
}

// isTableNotFoundError checks if the error indicates that table or database doesn't exist
func (ms *MetricsSnapshot) isTableNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	// Check for common ClickHouse "not found" error patterns
	return strings.Contains(errStr, "doesn't exist") ||
		strings.Contains(errStr, "does not exist") ||
		strings.Contains(errStr, "Unknown database") ||
		strings.Contains(errStr, "Table") && strings.Contains(errStr, "not found")
}

// createSchemaAndTable creates schema and table
func (ms *MetricsSnapshot) createSchemaAndTable(ctx context.Context, conn driver.Conn, schema, table string) error {
	// Create schema if not exists
	createSchemaQuery := ms.buildCreateDBQuery(schema)
	if err := conn.Exec(ctx, createSchemaQuery); err != nil {
		return fmt.Errorf("failed to create schema %s: %w", schema, err)
	}

	// Create table
	createTableQuery := ms.buildCreateTableQuery(schema, table)
	if err := conn.Exec(ctx, createTableQuery); err != nil {
		return fmt.Errorf("failed to create table %s.%s: %w", schema, table, err)
	}

	return nil
}

// buildCreateTableQuery builds CREATE TABLE query for metrics
func (ms *MetricsSnapshot) buildCreateTableQuery(schema, table string) string {
	return fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s.%s
		(
			timestamp DateTime,
			profile Map(String, Float64)
		)
		ENGINE = MergeTree
		PARTITION BY toDate(timestamp)
		ORDER BY timestamp
		SETTINGS index_granularity = 8192
	`, schema, table)
}

// buildCreateTableQuery builds CREATE TABLE query for metrics
func (ms *MetricsSnapshot) buildCreateDBQuery(schema string) string {
	return fmt.Sprintf(`CREATE DATABASE IF NOT EXISTS %s`, schema)
}

// buildInsertSelectQuery builds INSERT INTO ... SELECT ... FROM ... query
func (ms *MetricsSnapshot) buildInsertSelectQuery(schema, table string) string {
	return fmt.Sprintf(`
		INSERT INTO %s.%s
		WITH now() AS ts
		SELECT
			ts AS timestamp,
			mapFromArrays(
				groupArray(metric),
				groupArray(value)
			) AS profile
		FROM
			(
				SELECT metric, toFloat64(value) AS value
				FROM system.asynchronous_metrics
				WHERE metric IN (
					'OSUserTimeNormalized',
					'OSSystemTimeNormalized',
					'OSIOWaitTimeNormalized',
					'OSIrqTimeNormalized',
					'OSGuestTimeNormalized',
					'OSNiceTimeNormalized',
					'OSStealTimeNormalized',
					'OSSoftIrqTimeNormalized',
					'OSMemoryAvailable',
					'OSMemoryCached',
					'OSMemorySwapCached',
					'OSMemoryBuffers',
					'OSMemoryTotal',
					'OSMemoryFreeWithoutCached',
					'MemoryVirtual',
					'MemoryResident',
					'QueriesMemoryUsage',
					'QueriesPeakMemoryUsage',
					'Uptime'
				)

				UNION ALL

				SELECT metric, toFloat64(value)
				FROM system.metrics
				WHERE metric IN (
					'Query',
					'Merge',
					'MergeParts',
					'Move',
					'PartMutation',
					'ReplicatedFetch',
					'ReplicatedSend',
					'ReplicatedChecks',
					'TCPConnection',
					'MySQLConnection',
					'HTTPConnection',
					'InterserverConnection',
					'PostgreSQLConnection',
					'IOPrefetchThreads',
					'IOPrefetchThreadsActive',
					'IOPrefetchThreadsScheduled',
					'IOWriterThreads',
					'IOWriterThreadsActive',
					'IOWriterThreadsScheduled',
					'IOThreads',
					'IOThreadsActive',
					'IOThreadsScheduled',
					'PartsActive',
					'PartsCommitted',
					'PartsCompact',
					'PartsDeleteOnDestroy',
					'PartsDeleting',
					'PartsOutdated',
					'PartsPreActive',
					'PartsPreCommitted',
					'PartsTemporary',
					'VersionInteger'
				)

				UNION ALL
				SELECT 'DiskFreeSpace', sum(toFloat64(free_space))
				FROM system.disks

				UNION ALL
				SELECT 'DiskTotalSpace', sum(toFloat64(total_space))
				FROM system.disks

				UNION ALL
				SELECT 'DiskUnreservedSpace', sum(toFloat64(unreserved_space))
				FROM system.disks

				UNION ALL
				SELECT 'DiskKeepFreeSpace', sum(toFloat64(keep_free_space))
				FROM system.disks
			)
	`, schema, table)
}

// GetLastTimestamp is not applicable for metrics sync (always inserts current data)
func (ms *MetricsSnapshot) GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error) {
	return time.Time{}, nil
}

// UpdateLastTimestamp is not applicable for metrics sync
func (ms *MetricsSnapshot) UpdateLastTimestamp(ctx context.Context, conn driver.Conn, timestamp time.Time) error {
	return nil
}
