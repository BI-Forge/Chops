package db

import (
	"database/sql"
	"fmt"
	"sort"

	"clickhouse-ops/internal/db/migrations"
	"clickhouse-ops/internal/logger"
)

// Migrator handles database migrations
type Migrator struct {
	db         *sql.DB
	migrations []migrations.Migration
	logger     *logger.Logger
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *sql.DB, log *logger.Logger) *Migrator {
	return &Migrator{
		db:         db,
		migrations: migrations.GetMigrations(),
		logger:     log,
	}
}

// CreateMigrationsTable creates the migrations tracking table
func (m *Migrator) CreateMigrationsTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS system_migrations (
			version INTEGER PRIMARY KEY,
			name varchar(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
	_, err := m.db.Exec(query)
	if err != nil && m.logger != nil {
		m.logger.Errorf("Failed to create migrations table: %v", err)
	}
	return err
}

// GetAppliedMigrations returns list of applied migration versions
func (m *Migrator) GetAppliedMigrations() (map[int]bool, error) {
	applied := make(map[int]bool)

	rows, err := m.db.Query("SELECT version FROM system_migrations ORDER BY version")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

// MigrateUp applies all pending migrations
func (m *Migrator) MigrateUp() error {
	if m.logger != nil {
		m.logger.Info("Starting database migrations")
	}

	if err := m.CreateMigrationsTable(); err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to create migrations table: %v", err)
		}
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	applied, err := m.GetAppliedMigrations()
	if err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to get applied migrations: %v", err)
		}
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Sort migrations by version
	sort.Slice(m.migrations, func(i, j int) bool {
		return m.migrations[i].Version < m.migrations[j].Version
	})

	for _, migration := range m.migrations {
		if !applied[migration.Version] {
			if m.logger != nil {
				m.logger.Infof("Applying migration %d: %s", migration.Version, migration.Name)
			}
			if err := m.applyMigration(migration); err != nil {
				if m.logger != nil {
					m.logger.Errorf("Failed to apply migration %d: %v", migration.Version, err)
				}
				return fmt.Errorf("failed to apply migration %d: %w", migration.Version, err)
			}
		}
	}

	if m.logger != nil {
		m.logger.Info("Database migrations completed successfully")
	}

	return nil
}

// MigrateDown rolls back the last migration
func (m *Migrator) MigrateDown() error {
	if m.logger != nil {
		m.logger.Info("Starting migration rollback")
	}

	applied, err := m.GetAppliedMigrations()
	if err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to get applied migrations: %v", err)
		}
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Find the last applied migration
	var lastMigration *migrations.Migration
	for _, migration := range m.migrations {
		if applied[migration.Version] {
			lastMigration = &migration
		}
	}

	if lastMigration == nil {
		if m.logger != nil {
			m.logger.Warning("No migrations to rollback")
		}
		return fmt.Errorf("no migrations to rollback")
	}

	if m.logger != nil {
		m.logger.Infof("Rolling back migration %d: %s", lastMigration.Version, lastMigration.Name)
	}

	// Rollback the migration
	if err := m.rollbackMigration(*lastMigration); err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to rollback migration %d: %v", lastMigration.Version, err)
		}
		return fmt.Errorf("failed to rollback migration %d: %w", lastMigration.Version, err)
	}

	if m.logger != nil {
		m.logger.Info("Migration rollback completed successfully")
	}

	return nil
}

// applyMigration applies a single migration
func (m *Migrator) applyMigration(migration migrations.Migration) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Execute the migration
	if err := migration.Up(tx); err != nil {
		return fmt.Errorf("migration up failed: %w", err)
	}

	// Record the migration
	_, err = tx.Exec("INSERT INTO system_migrations (version,name) VALUES ($1,$2)", migration.Version, migration.Name)
	if err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	return tx.Commit()
}

// rollbackMigration rolls back a single migration
func (m *Migrator) rollbackMigration(migration migrations.Migration) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Execute the rollback
	if err := migration.Down(tx); err != nil {
		return fmt.Errorf("migration down failed: %w", err)
	}

	// Remove the migration record
	_, err = tx.Exec("DELETE FROM system_migrations WHERE version = $1", migration.Version)
	if err != nil {
		return fmt.Errorf("failed to remove migration record: %w", err)
	}

	return tx.Commit()
}
