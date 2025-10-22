package db

import (
	"sync"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

var (
	instance *Manager
	once     sync.Once
)

// Manager manages database connection and migrations
type Manager struct {
	db     *DB
	config *config.Config
	logger *logger.Logger
}

// GetInstance returns the singleton database manager
func GetInstance() *Manager {
	return instance
}

// Connect initializes the database manager (should be called once at startup)
func Connect(cfg *config.Config, log *logger.Logger) error {
	var err error
	once.Do(func() {
		instance = &Manager{
			config: cfg,
			logger: log,
		}

		// Create database connection
		instance.db, err = New(cfg, log)
		if err != nil {
			return
		}

		// Run migrations
		if err = instance.runMigrations(); err != nil {
			instance.db.Close()
			return
		}
	})

	return err
}

// GetDBManager returns the database manager wrapper
func (m *Manager) GetDBManager() *DB {
	return m.db
}

// Close closes the database connection
func (m *Manager) Close() error {
	if m.db != nil {
		return m.db.Close()
	}
	return nil
}

// runMigrations runs database migrations
func (m *Manager) runMigrations() error {
	if m.logger != nil {
		m.logger.Info("Starting database migrations")
	}

	migrator := NewMigrator(m.db.GetConnection(), m.logger)

	if err := migrator.MigrateUp(); err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to run migrations: %v", err)
		}
		return err
	}

	if m.logger != nil {
		m.logger.Info("Database migrations completed successfully")
	}

	return nil
}

