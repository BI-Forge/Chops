package db

import (
	"fmt"
	"time"
)

// SyncStatus represents a sync status record
type SyncStatus struct {
	ID               int64      `json:"id"`
	TableName        string     `json:"table_name"`
	NodeName         string     `json:"node_name"`
	Status           string     `json:"status"`
	RecordsProcessed int64      `json:"records_processed"`
	LastTimestamp    *time.Time `json:"last_timestamp"`
	DurationMs       *int       `json:"duration_ms"`
	ErrorMessage     *string    `json:"error_message"`
	CreatedAt        time.Time  `json:"created_at"`
}

// LogSyncStatus logs a sync status to PostgreSQL
func LogSyncStatus(tableName, nodeName, status string, recordsProcessed int64, lastTimestamp *time.Time, durationMs *int, errorMessage *string) error {
	dbManager := GetInstance()
	if dbManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	db := dbManager.GetDBManager()
	if db == nil {
		return fmt.Errorf("database connection not available")
	}

	query := `
		INSERT INTO sync_status (
			table_name, node_name, status, records_processed, 
			last_timestamp, duration_ms, error_message
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := db.GetConnection().Exec(query, tableName, nodeName, status, recordsProcessed, lastTimestamp, durationMs, errorMessage)
	if err != nil {
		return fmt.Errorf("failed to log sync status: %w", err)
	}

	return nil
}

// GetSyncStatus retrieves sync status records
func GetSyncStatus(tableName, nodeName string, limit int) ([]SyncStatus, error) {
	dbManager := GetInstance()
	if dbManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	db := dbManager.GetDBManager()
	if db == nil {
		return nil, fmt.Errorf("database connection not available")
	}

	var query string
	var args []interface{}

	if tableName != "" && nodeName != "" {
		query = `
			SELECT id, table_name, node_name, status, records_processed, 
			       last_timestamp, duration_ms, error_message, created_at
			FROM sync_status 
			WHERE table_name = $1 AND node_name = $2
			ORDER BY created_at DESC
			LIMIT $3
		`
		args = []interface{}{tableName, nodeName, limit}
	} else if tableName != "" {
		query = `
			SELECT id, table_name, node_name, status, records_processed, 
			       last_timestamp, duration_ms, error_message, created_at
			FROM sync_status 
			WHERE table_name = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		args = []interface{}{tableName, limit}
	} else if nodeName != "" {
		query = `
			SELECT id, table_name, node_name, status, records_processed, 
			       last_timestamp, duration_ms, error_message, created_at
			FROM sync_status 
			WHERE node_name = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		args = []interface{}{nodeName, limit}
	} else {
		query = `
			SELECT id, table_name, node_name, status, records_processed, 
			       last_timestamp, duration_ms, error_message, created_at
			FROM sync_status 
			ORDER BY created_at DESC
			LIMIT $1
		`
		args = []interface{}{limit}
	}

	rows, err := db.GetConnection().Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query sync status: %w", err)
	}
	defer rows.Close()

	var statuses []SyncStatus
	for rows.Next() {
		var status SyncStatus
		err := rows.Scan(
			&status.ID,
			&status.TableName,
			&status.NodeName,
			&status.Status,
			&status.RecordsProcessed,
			&status.LastTimestamp,
			&status.DurationMs,
			&status.ErrorMessage,
			&status.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sync status: %w", err)
		}
		statuses = append(statuses, status)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sync status rows: %w", err)
	}

	return statuses, nil
}

// CleanupOldSyncStatus removes sync status records older than 10 days
func CleanupOldSyncStatus() error {
	dbManager := GetInstance()
	if dbManager == nil {
		return fmt.Errorf("database manager not initialized")
	}

	db := dbManager.GetDBManager()
	if db == nil {
		return fmt.Errorf("database connection not available")
	}

	query := `DELETE FROM sync_status WHERE created_at < NOW() - INTERVAL '10 days'`

	result, err := db.GetConnection().Exec(query)
	if err != nil {
		return fmt.Errorf("failed to cleanup old sync status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	fmt.Printf("Cleaned up %d old sync status records\n", rowsAffected)
	return nil
}
