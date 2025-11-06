package db

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
	_ "github.com/lib/pq"
)

// DB holds the database connection
type DB struct {
	conn   *sql.DB
	logger *logger.Logger
}

// New creates a new database connection
func New(cfg *config.Config, log *logger.Logger) (*DB, error) {
	if cfg.Database.Postgres.DSN == "" {
		if log != nil {
			log.Error("PostgreSQL DSN is not configured")
		}
		return nil, fmt.Errorf("postgres DSN is not configured")
	}

	conn, err := sql.Open("postgres", cfg.Database.Postgres.DSN)
	if err != nil {
		if log != nil {
			log.Errorf("Failed to open database connection: %v", err)
		}
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	conn.SetMaxOpenConns(25)                 // Maximum number of open connections
	conn.SetMaxIdleConns(5)                  // Maximum number of idle connections
	conn.SetConnMaxLifetime(0)               // Connection lifetime (0 = unlimited)
	conn.SetConnMaxIdleTime(0)               // Idle connection timeout (0 = unlimited)

	// Test the connection
	if err := conn.Ping(); err != nil {
		conn.Close()
		if log != nil {
			log.Errorf("Failed to ping database: %v", err)
		}
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if log != nil {
		log.Info("Database connection established successfully")
	}

	return &DB{conn: conn, logger: log}, nil
}

// GetConnection returns the underlying database connection
func (db *DB) GetConnection() *sql.DB {
	return db.conn
}

// Close closes the database connection
func (db *DB) Close() error {
	if db.conn != nil {
		if db.logger != nil {
			db.logger.Info("Closing database connection")
		}
		return db.conn.Close()
	}
	return nil
}

// Ping tests the database connection
func (db *DB) Ping() error {
	err := db.conn.Ping()
	if err != nil && db.logger != nil {
		db.logger.Errorf("Database ping failed: %v", err)
	}
	return err
}
