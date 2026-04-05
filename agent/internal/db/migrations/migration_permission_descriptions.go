package migrations

import (
	"database/sql"
	"fmt"

	"clickhouse-ops/internal/rbac"
)

// backfillPermissionDescriptions upserts description text for all seeded permissions (for DBs that ran RBAC migration before descriptions existed).
func backfillPermissionDescriptions(tx *sql.Tx) error {
	for _, seed := range rbac.AllPermissionSeeds() {
		if _, err := tx.Exec(`
			INSERT INTO permissions (name, description) VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE SET
				description = EXCLUDED.description,
				updated_at = CURRENT_TIMESTAMP`, seed.Name, seed.Description); err != nil {
			return fmt.Errorf("permission description %q: %w", seed.Name, err)
		}
	}
	return nil
}
