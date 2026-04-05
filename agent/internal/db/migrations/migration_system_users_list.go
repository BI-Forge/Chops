package migrations

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/rbac"
)

func seedSystemUsersListPermission(tx *sql.Tx) error {
	desc := rbac.PermissionDescription(rbac.PermSystemUsersList)
	if _, err := tx.Exec(`
		INSERT INTO permissions (name, description) VALUES ($1, $2)
		ON CONFLICT (name) DO UPDATE SET
			description = EXCLUDED.description,
			updated_at = CURRENT_TIMESTAMP`, rbac.PermSystemUsersList, desc); err != nil {
		return fmt.Errorf("seed permission %q: %w", rbac.PermSystemUsersList, err)
	}
	if _, err := tx.Exec(`
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r, permissions p
		WHERE r.name = 'admin' AND p.name = $1
		ON CONFLICT DO NOTHING`, rbac.PermSystemUsersList); err != nil {
		return fmt.Errorf("grant %q to admin: %w", rbac.PermSystemUsersList, err)
	}
	return nil
}
