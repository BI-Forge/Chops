package migrations

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/rbac"
)

func rbacUp(tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS roles (
			id SERIAL PRIMARY KEY,
			name VARCHAR(100) UNIQUE NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS permissions (
			id SERIAL PRIMARY KEY,
			name VARCHAR(200) UNIQUE NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS role_permissions (
			role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			PRIMARY KEY (role_id, permission_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)`,
	}

	if err := executeStatements(tx, statements, "create rbac tables"); err != nil {
		return err
	}

	if _, err := tx.Exec(`INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
		rbac.RoleNameAdmin, "Full access; default role for existing and new users"); err != nil {
		return fmt.Errorf("seed admin role: %w", err)
	}

	for _, seed := range rbac.AllPermissionSeeds() {
		if _, err := tx.Exec(`
			INSERT INTO permissions (name, description) VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE SET
				description = EXCLUDED.description,
				updated_at = CURRENT_TIMESTAMP`, seed.Name, seed.Description); err != nil {
			return fmt.Errorf("seed permission %q: %w", seed.Name, err)
		}
	}

	// Grant admin role all permissions
	if _, err := tx.Exec(`
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
		WHERE r.name = $1
		ON CONFLICT DO NOTHING`, rbac.RoleNameAdmin); err != nil {
		return fmt.Errorf("link admin to permissions: %w", err)
	}

	if _, err := tx.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)`); err != nil {
		return fmt.Errorf("add users.role_id: %w", err)
	}

	if _, err := tx.Exec(`UPDATE users SET role_id = (SELECT id FROM roles WHERE name = $1 LIMIT 1) WHERE role_id IS NULL`, rbac.RoleNameAdmin); err != nil {
		return fmt.Errorf("backfill users.role_id: %w", err)
	}

	if _, err := tx.Exec(`ALTER TABLE users ALTER COLUMN role_id SET NOT NULL`); err != nil {
		return fmt.Errorf("set users.role_id not null: %w", err)
	}

	// Admin is the first seeded role (id 1) on a fresh database.
	if _, err := tx.Exec(`ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 1`); err != nil {
		return fmt.Errorf("set users.role_id default: %w", err)
	}

	return nil
}

func rbacDown(tx *sql.Tx) error {
	statements := []string{
		`ALTER TABLE users DROP COLUMN IF EXISTS role_id`,
		`DROP TABLE IF EXISTS role_permissions`,
		`DROP TABLE IF EXISTS permissions`,
		`DROP TABLE IF EXISTS roles`,
	}
	return executeStatements(tx, statements, "drop rbac")
}
