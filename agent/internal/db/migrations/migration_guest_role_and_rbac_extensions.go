package migrations

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/rbac"
)

// guestRoleAndRBACExtensions seeds the guest role, grants auth.me, upserts new permission rows, grants them to admin, and sets default role_id to guest for new rows.
func guestRoleAndRBACExtensions(tx *sql.Tx) error {
	if _, err := tx.Exec(`INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
		rbac.RoleNameGuest, "Minimal access for newly registered users."); err != nil {
		return fmt.Errorf("seed guest role: %w", err)
	}

	if _, err := tx.Exec(`
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r, permissions p
		WHERE r.name = $1 AND p.name = $2
		ON CONFLICT DO NOTHING`, rbac.RoleNameGuest, rbac.PermAuthMe); err != nil {
		return fmt.Errorf("link guest to auth.me: %w", err)
	}

	for _, code := range []string{rbac.PermSystemRolesDelete, rbac.PermSystemUsersSetActive} {
		desc := rbac.PermissionDescription(code)
		if _, err := tx.Exec(`
			INSERT INTO permissions (name, description) VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE SET
				description = EXCLUDED.description,
				updated_at = CURRENT_TIMESTAMP`, code, desc); err != nil {
			return fmt.Errorf("seed permission %q: %w", code, err)
		}
	}

	if _, err := tx.Exec(`
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
		WHERE r.name = $1 AND p.name IN ($2, $3)
		ON CONFLICT DO NOTHING`,
		rbac.RoleNameAdmin, rbac.PermSystemRolesDelete, rbac.PermSystemUsersSetActive); err != nil {
		return fmt.Errorf("grant new permissions to admin: %w", err)
	}

	var guestID int
	if err := tx.QueryRow(`SELECT id FROM roles WHERE name = $1`, rbac.RoleNameGuest).Scan(&guestID); err != nil {
		return fmt.Errorf("resolve guest role id: %w", err)
	}

	if _, err := tx.Exec(fmt.Sprintf(`ALTER TABLE users ALTER COLUMN role_id SET DEFAULT %d`, guestID)); err != nil {
		return fmt.Errorf("set users.role_id default to guest: %w", err)
	}

	return nil
}
