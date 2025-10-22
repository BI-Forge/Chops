package migrations

import (
	"database/sql"
	"fmt"
)

// executeStatements executes multiple SQL statements in a transaction
func executeStatements(tx *sql.Tx, statements []string, operation string) error {
	for i, stmt := range statements {
		_, err := tx.Exec(stmt)
		if err != nil {
			return fmt.Errorf("failed to %s (statement %d): %w", operation, i+1, err)
		}
	}
	return nil
}
