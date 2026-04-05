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
			Name:    "rbac_roles_permissions",
			Up:      rbacUp,
			Down:    rbacDown,
		},
		{
			Version: 3,
			Name:    "seed_system_users_list_permission",
			Up:      seedSystemUsersListPermission,
			Down:    func(*sql.Tx) error { return nil },
		},
		{
			Version: 4,
			Name:    "backfill_permission_descriptions",
			Up:      backfillPermissionDescriptions,
			Down:    func(*sql.Tx) error { return nil },
		},
		{
			Version: 5,
			Name:    "guest_role_and_rbac_extensions",
			Up:      guestRoleAndRBACExtensions,
			Down:    func(*sql.Tx) error { return nil },
		},
		{
			Version: 6,
			Name:    "roles_is_system_flag",
			Up:      roleIsSystemFlag,
			Down:    func(*sql.Tx) error { return nil },
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
