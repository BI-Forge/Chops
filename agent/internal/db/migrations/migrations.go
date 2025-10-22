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

