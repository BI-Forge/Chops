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

