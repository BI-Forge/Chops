package db

import (
	"fmt"
)

// CleanupOldMetrics removes metrics records older than specified days
func CleanupOldMetrics(retentionDays int) error {
	dbManager := GetInstance()
	if dbManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	dbConn := dbManager.GetDBManager()
	if dbConn == nil {
		return fmt.Errorf("database connection not available")
	}

	query := fmt.Sprintf(`DELETE FROM ch_metrics WHERE timestamp < NOW() - INTERVAL '%d days'`, retentionDays)

	result, err := dbConn.GetConnection().Exec(query)
	if err != nil {
		return fmt.Errorf("failed to cleanup old metrics: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected > 0 {
		fmt.Printf("Cleaned up %d old metrics records (older than %d days)\n", rowsAffected, retentionDays)
	}
	return nil
}

