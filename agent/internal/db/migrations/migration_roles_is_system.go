package migrations

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/rbac"
)

// roleIsSystemFlag adds roles.is_system and marks built-in admin and guest roles.
func roleIsSystemFlag(tx *sql.Tx) error {
	if _, err := tx.Exec(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false`); err != nil {
		return fmt.Errorf("add roles.is_system: %w", err)
	}
	if _, err := tx.Exec(`UPDATE roles SET is_system = true WHERE name IN ($1, $2)`,
		rbac.RoleNameAdmin, rbac.RoleNameGuest); err != nil {
		return fmt.Errorf("mark system roles: %w", err)
	}
	return nil
}
