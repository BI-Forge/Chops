package migrations

import (
	"database/sql"
)

// GetMigrations returns all available migrations
func GetMigrations() []Migration {
	return []Migration{
		{
			Version: 1,
			Name:    "create_user_table",
			Up:      createUserTable,
			Down:    dropUserTable,
		},
		{
			Version: 2,
			Name:    "create_clickhouse_migrations_table",
			Up:      createClickHouseMigrationsTable,
			Down:    dropClickHouseMigrationsTable,
		},
		{
			Version: 3,
			Name:    "create_sync_status_table",
			Up:      createSyncStatusTable,
			Down:    dropSyncStatusTable,
		},
		{
			Version: 4,
			Name:    "create_ch_metrics_table",
			Up:      createChMetricsTable,
			Down:    dropChMetricsTable,
		},
		{
			Version: 5,
			Name:    "add_uptime_version_to_ch_metrics",
			Up:      addUptimeVersionToChMetrics,
			Down:    removeUptimeVersionFromChMetrics,
		},
	}
}

// Migration represents a database migration
type Migration struct {
	Version int
	Name    string
	Up      func(*sql.Tx) error
	Down    func(*sql.Tx) error
}

// createUserTable creates the user table
func createUserTable(tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(50) UNIQUE NOT NULL,
			email VARCHAR(100) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			first_name VARCHAR(50),
			last_name VARCHAR(50),
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`,
	}
	
	return executeStatements(tx, statements, "create user table")
}

// dropUserTable drops the user table
func dropUserTable(tx *sql.Tx) error {
	statements := []string{
		`DROP TABLE IF EXISTS users CASCADE`,
	}
	
	return executeStatements(tx, statements, "drop user table")
}

// createClickHouseMigrationsTable creates the clickhouse_migrations table for tracking ClickHouse migrations
func createClickHouseMigrationsTable(tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS clickhouse_migrations (
			id SERIAL PRIMARY KEY,
			version INTEGER NOT NULL,
			name VARCHAR(255) NOT NULL,
			node_name VARCHAR(255) NOT NULL,
			checksum VARCHAR(64),
			execution_time_ms INTEGER,
			status VARCHAR(20) DEFAULT 'success',
			error_message TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_clickhouse_migrations_version_node ON clickhouse_migrations(version, node_name)`,
		`CREATE INDEX IF NOT EXISTS idx_clickhouse_migrations_node_name ON clickhouse_migrations(node_name)`,
		`CREATE INDEX IF NOT EXISTS idx_clickhouse_migrations_created_at ON clickhouse_migrations(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_clickhouse_migrations_status ON clickhouse_migrations(status)`,
	}
	
	return executeStatements(tx, statements, "create clickhouse_migrations table")
}

// dropClickHouseMigrationsTable drops the clickhouse_migrations table
func dropClickHouseMigrationsTable(tx *sql.Tx) error {
	statements := []string{
		`DROP TABLE IF EXISTS clickhouse_migrations CASCADE`,
	}
	
	return executeStatements(tx, statements, "drop clickhouse_migrations table")
}

// createSyncStatusTable creates the sync_status table for tracking ClickHouse sync status
func createSyncStatusTable(tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS sync_status (
			id SERIAL PRIMARY KEY,
			table_name VARCHAR(255) NOT NULL,
			node_name VARCHAR(255) NOT NULL,
			status VARCHAR(20) NOT NULL,
			records_processed BIGINT DEFAULT 0,
			last_timestamp TIMESTAMP,
			duration_ms INTEGER,
			error_message TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_status_table_node ON sync_status(table_name, node_name)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_status_created_at ON sync_status(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_status_table_name ON sync_status(table_name)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_status_node_name ON sync_status(node_name)`,
	}
	
	return executeStatements(tx, statements, "create sync_status table")
}

// dropSyncStatusTable drops the sync_status table
func dropSyncStatusTable(tx *sql.Tx) error {
	statements := []string{
		`DROP TABLE IF EXISTS sync_status CASCADE`,
	}
	
	return executeStatements(tx, statements, "drop sync_status table")
}

// createChMetricsTable creates the ch_metrics table for storing ClickHouse metrics
func createChMetricsTable(tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS ch_metrics (
			id SERIAL PRIMARY KEY,
			timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			node_name VARCHAR(255) NOT NULL,
			os_user_time_normalized DOUBLE PRECISION,
			os_system_time_normalized DOUBLE PRECISION,
			os_io_wait_time_normalized DOUBLE PRECISION,
			os_irq_time_normalized DOUBLE PRECISION,
			os_guest_time_normalized DOUBLE PRECISION,
			os_nice_time_normalized DOUBLE PRECISION,
			os_steal_time_normalized DOUBLE PRECISION,
			os_soft_irq_time_normalized DOUBLE PRECISION,
			os_memory_available BIGINT,
			os_memory_cached BIGINT,
			os_memory_swap_cached BIGINT,
			os_memory_buffers BIGINT,
			os_memory_total BIGINT,
			os_memory_free_without_cached BIGINT,
			memory_virtual BIGINT,
			memory_resident BIGINT,
			queries_memory_usage BIGINT,
			queries_peak_memory_usage BIGINT,
			query BIGINT,
			merge BIGINT,
			merge_parts BIGINT,
			move BIGINT,
			part_mutation BIGINT,
			replicated_fetch BIGINT,
			replicated_send BIGINT,
			replicated_checks BIGINT,
			tcp_connection BIGINT,
			mysql_connection BIGINT,
			http_connection BIGINT,
			interserver_connection BIGINT,
			postgresql_connection BIGINT,
			io_prefetch_threads BIGINT,
			io_prefetch_threads_active BIGINT,
			io_prefetch_threads_scheduled BIGINT,
			io_writer_threads BIGINT,
			io_writer_threads_active BIGINT,
			io_writer_threads_scheduled BIGINT,
			io_threads BIGINT,
			io_threads_active BIGINT,
			io_threads_scheduled BIGINT,
			parts_active BIGINT,
			parts_committed BIGINT,
			parts_compact BIGINT,
			parts_delete_on_destroy BIGINT,
			parts_deleting BIGINT,
			parts_outdated BIGINT,
			parts_pre_active BIGINT,
			parts_pre_committed BIGINT,
			parts_temporary BIGINT,
			disk_free_space BIGINT,
			disk_total_space BIGINT,
			disk_unreserved_space BIGINT,
			disk_keep_free_space BIGINT,
			uptime BIGINT,
			version_integer BIGINT
		)`,
		`CREATE INDEX IF NOT EXISTS idx_ch_metrics_timestamp ON ch_metrics(timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_ch_metrics_node_name ON ch_metrics(node_name)`,
		`CREATE INDEX IF NOT EXISTS idx_ch_metrics_timestamp_node ON ch_metrics(timestamp, node_name)`,
		`COMMENT ON COLUMN ch_metrics.os_user_time_normalized IS 'Normalized user CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_system_time_normalized IS 'Normalized system CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_io_wait_time_normalized IS 'Normalized I/O wait CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_irq_time_normalized IS 'Normalized IRQ CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_guest_time_normalized IS 'Normalized guest CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_nice_time_normalized IS 'Normalized nice CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_steal_time_normalized IS 'Normalized steal CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_soft_irq_time_normalized IS 'Normalized soft IRQ CPU time from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_available IS 'Available OS memory in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_cached IS 'Cached OS memory in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_swap_cached IS 'Swap cached OS memory in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_buffers IS 'OS memory buffers in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_total IS 'Total OS memory in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.os_memory_free_without_cached IS 'Free OS memory without cached in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.memory_virtual IS 'Virtual memory usage in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.memory_resident IS 'Resident memory usage in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.queries_memory_usage IS 'Current memory usage by queries in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.queries_peak_memory_usage IS 'Peak memory usage by queries in bytes from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.query IS 'Number of executing queries from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.merge IS 'Number of executing merges from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.merge_parts IS 'Number of executing merge parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.move IS 'Number of executing moves from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.part_mutation IS 'Number of executing part mutations from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.replicated_fetch IS 'Number of executing replicated fetches from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.replicated_send IS 'Number of executing replicated sends from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.replicated_checks IS 'Number of executing replicated checks from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.tcp_connection IS 'Number of TCP connections from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.mysql_connection IS 'Number of MySQL connections from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.http_connection IS 'Number of HTTP connections from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.interserver_connection IS 'Number of interserver connections from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.postgresql_connection IS 'Number of PostgreSQL connections from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_prefetch_threads IS 'Number of IO prefetch threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_prefetch_threads_active IS 'Number of active IO prefetch threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_prefetch_threads_scheduled IS 'Number of scheduled IO prefetch threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_writer_threads IS 'Number of IO writer threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_writer_threads_active IS 'Number of active IO writer threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_writer_threads_scheduled IS 'Number of scheduled IO writer threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_threads IS 'Number of IO threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_threads_active IS 'Number of active IO threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.io_threads_scheduled IS 'Number of scheduled IO threads from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_active IS 'Number of active parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_committed IS 'Number of committed parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_compact IS 'Number of compact parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_delete_on_destroy IS 'Number of parts to delete on destroy from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_deleting IS 'Number of deleting parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_outdated IS 'Number of outdated parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_pre_active IS 'Number of pre-active parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_pre_committed IS 'Number of pre-committed parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.parts_temporary IS 'Number of temporary parts from system.metrics'`,
		`COMMENT ON COLUMN ch_metrics.disk_free_space IS 'Free disk space in bytes from system.disks'`,
		`COMMENT ON COLUMN ch_metrics.disk_total_space IS 'Total disk space in bytes from system.disks'`,
		`COMMENT ON COLUMN ch_metrics.disk_unreserved_space IS 'Unreserved disk space in bytes from system.disks'`,
		`COMMENT ON COLUMN ch_metrics.disk_keep_free_space IS 'Keep free disk space in bytes from system.disks'`,
		`COMMENT ON COLUMN ch_metrics.uptime IS 'Server uptime in seconds from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.version_integer IS 'ClickHouse version as integer from system.metrics'`,
	}
	
	return executeStatements(tx, statements, "create ch_metrics table")
}

// dropChMetricsTable drops the ch_metrics table
func dropChMetricsTable(tx *sql.Tx) error {
	statements := []string{
		`DROP TABLE IF EXISTS ch_metrics CASCADE`,
	}
	
	return executeStatements(tx, statements, "drop ch_metrics table")
}

// addUptimeVersionToChMetrics adds uptime and version_integer columns to ch_metrics table
func addUptimeVersionToChMetrics(tx *sql.Tx) error {
	statements := []string{
		`ALTER TABLE ch_metrics ADD COLUMN IF NOT EXISTS uptime BIGINT`,
		`ALTER TABLE ch_metrics ADD COLUMN IF NOT EXISTS version_integer BIGINT`,
		`COMMENT ON COLUMN ch_metrics.uptime IS 'Server uptime in seconds from system.asynchronous_metrics'`,
		`COMMENT ON COLUMN ch_metrics.version_integer IS 'ClickHouse version as integer from system.metrics'`,
	}
	
	return executeStatements(tx, statements, "add uptime and version_integer to ch_metrics")
}

// removeUptimeVersionFromChMetrics removes uptime and version_integer columns from ch_metrics table
func removeUptimeVersionFromChMetrics(tx *sql.Tx) error {
	statements := []string{
		`ALTER TABLE ch_metrics DROP COLUMN IF EXISTS uptime`,
		`ALTER TABLE ch_metrics DROP COLUMN IF EXISTS version_integer`,
	}
	
	return executeStatements(tx, statements, "remove uptime and version_integer from ch_metrics")
}

