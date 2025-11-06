package sync

import (
	"context"
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/db"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// MetricsSyncer handles synchronization for ch_metrics table
type MetricsSyncer struct {
	*BaseSyncer
	clusterName string
}

// NewMetricsSyncer creates a new metrics syncer
func NewMetricsSyncer(interval time.Duration, clusterName string) *MetricsSyncer {
	config := SyncConfig{
		TableName: "ch_metrics",
		Interval:  interval,
	}

	return &MetricsSyncer{
		BaseSyncer:  NewBaseSyncer(config),
		clusterName: clusterName,
	}
}

// Sync performs the synchronization for metrics
func (ms *MetricsSyncer) Sync(ctx context.Context, conn driver.Conn) (SyncResult, error) {
	startTime := time.Now()
	result := SyncResult{
		TableName: ms.config.TableName,
	}

	// Get node name from connection context or use default
	nodeName := "unknown"
	if node, ok := ctx.Value("node_name").(string); ok {
		nodeName = node
	}

	// Query ClickHouse for metrics
	chQuery := `
		SELECT metric, toFloat64(value) as value, description 
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
			'QueriesPeakMemoryUsage'
		)
		UNION ALL
		SELECT metric, toFloat64(value) as value, description 
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
			'PartMutation',
			'PartsActive',
			'PartsCommitted',
			'PartsCompact',
			'PartsDeleteOnDestroy',
			'PartsDeleting',
			'PartsOutdated',
			'PartsPreActive',
			'PartsPreCommitted',
			'PartsTemporary'
		)
		UNION ALL
		SELECT 'DiskFreeSpace' as metric, sum(toFloat64(free_space)) as value, '' as description
		FROM system.disks  GROUP BY metric
		UNION ALL
		SELECT 'DiskTotalSpace' as metric, sum(toFloat64(total_space)) as value, '' as description
		FROM system.disks GROUP BY metric
		UNION ALL
		SELECT 'DiskUnreservedSpace' as metric, sum(toFloat64(unreserved_space)) as value, '' as description
		FROM system.disks GROUP BY metric
		UNION ALL
		SELECT 'DiskKeepFreeSpace' as metric, sum(toFloat64(keep_free_space)) as value, '' as description
		FROM system.disks GROUP BY metric
	`

	rows, err := conn.Query(ctx, chQuery)
	if err != nil {
		// Check for specific error types to provide better error messages
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "does not exist") || 
		   (strings.Contains(errStr, "table") && strings.Contains(errStr, "not found")) ||
		   strings.Contains(errStr, "unknown table") {
			result.Error = fmt.Errorf("ClickHouse table not found (system tables may not be available): %w", err)
		} else if strings.Contains(errStr, "connection") || 
		          strings.Contains(errStr, "timeout") || 
		          strings.Contains(errStr, "network") ||
		          strings.Contains(errStr, "connection refused") ||
		          strings.Contains(errStr, "no such host") {
			result.Error = fmt.Errorf("ClickHouse connection error: %w", err)
		} else {
			result.Error = fmt.Errorf("failed to query ClickHouse metrics: %w", err)
		}
		return result, result.Error
	}
	defer rows.Close()

	// Map to store metric values
	metricsMap := make(map[string]interface{})
	metricsMap["node_name"] = nodeName
	metricsMap["timestamp"] = time.Now()

	// Process rows and convert to map
	for rows.Next() {
		var metric, description string
		var value float64

		if err := rows.Scan(&metric, &value, &description); err != nil {
			result.Error = fmt.Errorf("failed to scan metric row: %w", err)
			return result, result.Error
		}

		// Convert metric name to column name (snake_case)
		columnName := metricToColumnName(metric)
		
		// Store value (all values are now Float64 from query)
		metricsMap[columnName] = value
	}

	if err := rows.Err(); err != nil {
		result.Error = fmt.Errorf("error iterating metrics rows: %w", err)
		return result, result.Error
	}

	// Insert into PostgreSQL
	recordsProcessed, err := ms.insertIntoPostgres(ctx, metricsMap)
	if err != nil {
		result.Error = fmt.Errorf("failed to insert into PostgreSQL: %w", err)
		return result, result.Error
	}

	result.RecordsProcessed = recordsProcessed
	result.Duration = time.Since(startTime)
	result.LastTimestamp = time.Now()

	return result, nil
}

// metricToColumnName converts metric name to PostgreSQL column name (snake_case)
func metricToColumnName(metric string) string {
	// Map of metric names to column names
	metricMap := map[string]string{
		// Asynchronous metrics
		"OSUserTimeNormalized":        "os_user_time_normalized",
		"OSSystemTimeNormalized":      "os_system_time_normalized",
		"OSIOWaitTimeNormalized":      "os_io_wait_time_normalized",
		"OSIrqTimeNormalized":         "os_irq_time_normalized",
		"OSGuestTimeNormalized":       "os_guest_time_normalized",
		"OSNiceTimeNormalized":        "os_nice_time_normalized",
		"OSStealTimeNormalized":       "os_steal_time_normalized",
		"OSSoftIrqTimeNormalized":     "os_soft_irq_time_normalized",
		"OSMemoryAvailable":           "os_memory_available",
		"OSMemoryCached":              "os_memory_cached",
		"OSMemorySwapCached":          "os_memory_swap_cached",
		"OSMemoryBuffers":            "os_memory_buffers",
		"OSMemoryTotal":              "os_memory_total",
		"OSMemoryFreeWithoutCached":   "os_memory_free_without_cached",
		"MemoryVirtual":              "memory_virtual",
		"MemoryResident":             "memory_resident",
		"QueriesMemoryUsage":         "queries_memory_usage",
		"QueriesPeakMemoryUsage":      "queries_peak_memory_usage",
		// Metrics
		"Query":                      "query",
		"Merge":                       "merge",
		"MergeParts":                  "merge_parts",
		"Move":                        "move",
		"PartMutation":                "part_mutation",
		"ReplicatedFetch":             "replicated_fetch",
		"ReplicatedSend":              "replicated_send",
		"ReplicatedChecks":             "replicated_checks",
		"TCPConnection":               "tcp_connection",
		"MySQLConnection":             "mysql_connection",
		"HTTPConnection":              "http_connection",
		"InterserverConnection":       "interserver_connection",
		"PostgreSQLConnection":        "postgresql_connection",
		"IOPrefetchThreads":           "io_prefetch_threads",
		"IOPrefetchThreadsActive":     "io_prefetch_threads_active",
		"IOPrefetchThreadsScheduled":  "io_prefetch_threads_scheduled",
		"IOWriterThreads":             "io_writer_threads",
		"IOWriterThreadsActive":       "io_writer_threads_active",
		"IOWriterThreadsScheduled":    "io_writer_threads_scheduled",
		"IOThreads":                   "io_threads",
		"IOThreadsActive":             "io_threads_active",
		"IOThreadsScheduled":          "io_threads_scheduled",
		"PartsActive":                 "parts_active",
		"PartsCommitted":              "parts_committed",
		"PartsCompact":                "parts_compact",
		"PartsDeleteOnDestroy":        "parts_delete_on_destroy",
		"PartsDeleting":               "parts_deleting",
		"PartsOutdated":               "parts_outdated",
		"PartsPreActive":              "parts_pre_active",
		"PartsPreCommitted":           "parts_pre_committed",
		"PartsTemporary":              "parts_temporary",
		// Disk metrics
		"DiskFreeSpace":               "disk_free_space",
		"DiskTotalSpace":              "disk_total_space",
		"DiskUnreservedSpace":         "disk_unreserved_space",
		"DiskKeepFreeSpace":           "disk_keep_free_space",
	}
	
	if colName, ok := metricMap[metric]; ok {
		return colName
	}
	
	// Fallback: convert to snake_case
	columnName := strings.ToLower(metric)
	// Insert underscore before capital letters (except first)
	var result strings.Builder
	for i, r := range columnName {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteByte('_')
		}
		result.WriteRune(r)
	}
	return result.String()
}

// insertIntoPostgres inserts metrics data into PostgreSQL
func (ms *MetricsSyncer) insertIntoPostgres(ctx context.Context, metricsMap map[string]interface{}) (int64, error) {
	// Build INSERT query with all columns
	columns := []string{
		"timestamp", "node_name",
		"os_user_time_normalized", "os_system_time_normalized", "os_io_wait_time_normalized",
		"os_irq_time_normalized", "os_guest_time_normalized", "os_nice_time_normalized",
		"os_steal_time_normalized", "os_soft_irq_time_normalized",
		"os_memory_available", "os_memory_cached", "os_memory_swap_cached",
		"os_memory_buffers", "os_memory_total", "os_memory_free_without_cached",
		"memory_virtual", "memory_resident", "queries_memory_usage", "queries_peak_memory_usage",
		"query", "merge", "merge_parts", "move", "part_mutation",
		"replicated_fetch", "replicated_send", "replicated_checks",
		"tcp_connection", "mysql_connection", "http_connection",
		"interserver_connection", "postgresql_connection",
		"io_prefetch_threads", "io_prefetch_threads_active", "io_prefetch_threads_scheduled",
		"io_writer_threads", "io_writer_threads_active", "io_writer_threads_scheduled",
		"io_threads", "io_threads_active", "io_threads_scheduled",
		"parts_active", "parts_committed", "parts_compact",
		"parts_delete_on_destroy", "parts_deleting", "parts_outdated",
		"parts_pre_active", "parts_pre_committed", "parts_temporary",
		"disk_free_space", "disk_total_space", "disk_unreserved_space", "disk_keep_free_space",
	}

	placeholders := make([]string, len(columns))
	values := make([]interface{}, len(columns))
	
	for i, col := range columns {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		if val, ok := metricsMap[col]; ok {
			values[i] = val
		} else {
			values[i] = nil
		}
	}

	query := fmt.Sprintf(
		"INSERT INTO ch_metrics (%s) VALUES (%s)",
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)

	dbManager := db.GetInstance()
	if dbManager == nil {
		return 0, fmt.Errorf("database manager not initialized")
	}

	dbConn := dbManager.GetDBManager()
	if dbConn == nil {
		return 0, fmt.Errorf("database connection not available")
	}

	res, err := dbConn.GetConnection().ExecContext(ctx, query, values...)
	if err != nil {
		// Check for specific PostgreSQL errors to provide better error messages
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "does not exist") || 
		   (strings.Contains(errStr, "relation") && strings.Contains(errStr, "does not exist")) ||
		   strings.Contains(errStr, "table") && strings.Contains(errStr, "does not exist") {
			return 0, fmt.Errorf("PostgreSQL table ch_metrics does not exist (migration may not have run): %w", err)
		} else if strings.Contains(errStr, "connection") || 
		          strings.Contains(errStr, "timeout") || 
		          strings.Contains(errStr, "network") ||
		          strings.Contains(errStr, "connection refused") ||
		          strings.Contains(errStr, "no connection") {
			return 0, fmt.Errorf("PostgreSQL connection error: %w", err)
		} else {
			return 0, fmt.Errorf("failed to execute INSERT: %w", err)
		}
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 1, nil // Assume success if we can't get row count
	}

	return rowsAffected, nil
}

// GetLastTimestamp is not applicable for metrics sync (always inserts current data)
func (ms *MetricsSyncer) GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error) {
	return time.Time{}, nil
}

// UpdateLastTimestamp is not applicable for metrics sync
func (ms *MetricsSyncer) UpdateLastTimestamp(ctx context.Context, conn driver.Conn, timestamp time.Time) error {
	return nil
}

