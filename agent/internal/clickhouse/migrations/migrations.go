package migrations

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClickhouseMigrations contains ClickHouse migrations
var ClickhouseMigrations = []ClickHouseMigration{
	{
		Version:     1,
		Name:        "create_ops_schema",
		Description: "Create ops schema for operations monitoring",
		Up:          createOpsSchema,
		Down:        dropOpsSchema,
	},
	{
		Version:     2,
		Name:        "create_query_raw_table",
		Description: "Create ops.query_raw table for query monitoring",
		Up:          createQueryRawTable,
		Down:        dropQueryRawTable,
	},
	{
		Version:     3,
		Name:        "create_thread_raw_table",
		Description: "Create ops.thread_raw table for thread monitoring",
		Up:          createThreadRawTable,
		Down:        dropThreadRawTable,
	},
	{
		Version:     4,
		Name:        "create_part_log_raw_table",
		Description: "Create ops.part_log_raw table for part operations monitoring",
		Up:          createPartLogRawTable,
		Down:        dropPartLogRawTable,
	},
	{
		Version:     5,
		Name:        "create_query_agg_min_table",
		Description: "Create ops.query_agg_min table for aggregated query metrics",
		Up:          createQueryAggMinTable,
		Down:        dropQueryAggMinTable,
	},
	{
		Version:     6,
		Name:        "create_storage_min_table",
		Description: "Create ops.storage_min table for storage metrics",
		Up:          createStorageMinTable,
		Down:        dropStorageMinTable,
	},
	{
		Version:     7,
		Name:        "create_host_metrics_table",
		Description: "Create ops.host_metrics table for host metrics",
		Up:          createHostMetricsTable,
		Down:        dropHostMetricsTable,
	},
}

// createOpsSchema creates the ops schema for operations monitoring
func createOpsSchema(ctx context.Context, conn driver.Conn) error {
	query := `CREATE DATABASE IF NOT EXISTS ops`
	return executeTableCreation(ctx, conn, query, "ops")
}

// dropOpsSchema drops the ops schema
func dropOpsSchema(ctx context.Context, conn driver.Conn) error {
	query := `DROP DATABASE IF EXISTS ops`
	return executeTableDrop(ctx, conn, query, "ops")
}

// createQueryRawTable creates the ops.query_raw table for query monitoring
func createQueryRawTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.query_raw
		(
		  event_time      DateTime64(6),
		  host            String,
		  user            String,
		  query_id        String,
		  query_kind      LowCardinality(String),
		  is_distributed  UInt8,
		  read_rows       UInt64,
		  read_bytes      UInt64,
		  written_rows    UInt64,
		  written_bytes   UInt64,
		  duration_ms     UInt32,
		  memory_usage    UInt64,
		  exception_code  Int32,
		  query_text      String
		)
		ENGINE MergeTree
		PARTITION BY toDate(event_time)
		ORDER BY (host, event_time, query_id)
		TTL event_time + INTERVAL 7 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.query_raw")
}

// dropQueryRawTable drops the ops.query_raw table
func dropQueryRawTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.query_raw`
	return executeTableDrop(ctx, conn, query, "ops.query_raw")
}

// createThreadRawTable creates the ops.thread_raw table for thread monitoring
func createThreadRawTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.thread_raw
		(
		  event_time      DateTime64(6),
		  host            String,
		  query_id        String,
		  thread_id       UInt64,
		  os_thread_id    UInt64,
		  read_rows       UInt64,
		  read_bytes      UInt64,
		  written_rows    UInt64,
		  written_bytes   UInt64,
		  cpu_time_ns     UInt64
		)
		ENGINE MergeTree
		PARTITION BY toDate(event_time)
		ORDER BY (host, event_time, query_id, thread_id)
		TTL event_time + INTERVAL 3 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.thread_raw")
}

// dropThreadRawTable drops the ops.thread_raw table
func dropThreadRawTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.thread_raw`
	return executeTableDrop(ctx, conn, query, "ops.thread_raw")
}

// createPartLogRawTable creates the ops.part_log_raw table for part operations monitoring
func createPartLogRawTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.part_log_raw
		(
		  event_time DateTime,
		  host       String,
		  database   String,
		  table      String,
		  event_type LowCardinality(String),
		  rows       UInt64,
		  bytes      UInt64,
		  duration_s Float32,
		  source_part_names Array(String)
		)
		ENGINE MergeTree
		PARTITION BY toDate(event_time)
		ORDER BY (host, database, table, event_time)
		TTL event_time + INTERVAL 14 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.part_log_raw")
}

// dropPartLogRawTable drops the ops.part_log_raw table
func dropPartLogRawTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.part_log_raw`
	return executeTableDrop(ctx, conn, query, "ops.part_log_raw")
}

// createQueryAggMinTable creates the ops.query_agg_min table for aggregated query metrics
func createQueryAggMinTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.query_agg_min
		(
		  ts                 DateTime,
		  cluster            String,
		  host               String,
		  user               String,
		  query_fingerprint  String,
		  query_kind         LowCardinality(String),
		  is_distributed     UInt8,
		  rows_read          UInt64,
		  bytes_read         UInt64,
		  rows_written       UInt64,
		  bytes_written      UInt64,
		  duration_ms_p50    UInt32,
		  duration_ms_p95    UInt32,
		  duration_ms_p99    UInt32,
		  cpu_ms_sum         UInt64,
		  mem_peak_mb_p95    UInt32,
		  errors_count       UInt32,
		  rc_class           LowCardinality(String)
		)
		ENGINE MergeTree
		PARTITION BY toDate(ts)
		ORDER BY (cluster, host, ts, query_fingerprint)
		TTL ts + INTERVAL 14 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.query_agg_min")
}

// dropQueryAggMinTable drops the ops.query_agg_min table
func dropQueryAggMinTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.query_agg_min`
	return executeTableDrop(ctx, conn, query, "ops.query_agg_min")
}

// createStorageMinTable creates the ops.storage_min table for storage metrics
func createStorageMinTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.storage_min
		(
		  ts               DateTime,
		  cluster          String,
		  host             String,
		  database         String,
		  table            String,
		  parts_active     UInt32,
		  parts_inactive   UInt32,
		  merges_inflight  UInt16,
		  merges_bytes     UInt64,
		  mutations_queue  UInt16,
		  mutation_failed  UInt16,
		  replica_lag_sec  UInt32,
		  disk_used_bytes  UInt64,
		  disk_free_bytes  UInt64
		)
		ENGINE MergeTree
		PARTITION BY toDate(ts)
		ORDER BY (cluster, host, database, table, ts)
		TTL ts + INTERVAL 30 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.storage_min")
}

// dropStorageMinTable drops the ops.storage_min table
func dropStorageMinTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.storage_min`
	return executeTableDrop(ctx, conn, query, "ops.storage_min")
}

// createHostMetricsTable creates the ops.host_metrics table for host metrics
func createHostMetricsTable(ctx context.Context, conn driver.Conn) error {
	query := `
		CREATE TABLE IF NOT EXISTS ops.host_metrics
		(
		  ts     DateTime,
		  host   String,
		  metric LowCardinality(String),
		  value  Float64
		)
		ENGINE MergeTree
		PARTITION BY toDate(ts)
		ORDER BY (host, metric, ts)
		TTL ts + INTERVAL 14 DAY
	`

	return executeTableCreation(ctx, conn, query, "ops.host_metrics")
}

// dropHostMetricsTable drops the ops.host_metrics table
func dropHostMetricsTable(ctx context.Context, conn driver.Conn) error {
	query := `DROP TABLE IF EXISTS ops.host_metrics`
	return executeTableDrop(ctx, conn, query, "ops.host_metrics")
}

