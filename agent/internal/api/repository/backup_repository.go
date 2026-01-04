package repository

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// BackupRepository executes reads against ClickHouse system.backups table
type BackupRepository struct {
	manager     *clickhouse.Manager
	logger      *logger.Logger
	clusterName string
}

var backupsTableName = "ops.backups"

// NewBackupRepository creates a repository backed by the shared ClickHouse manager
func NewBackupRepository(cfg *config.Config, log *logger.Logger) (*BackupRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	cluster := ""
	if cfg != nil {
		cluster = cfg.Database.ClickHouse.ClusterName
	}

	return &BackupRepository{
		manager:     manager,
		logger:      log,
		clusterName: cluster,
	}, nil
}

// GetStats returns backup count statistics by status
func (r *BackupRepository) GetStats(ctx context.Context, node string) (models.BackupStatsResponse, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return models.BackupStatsResponse{}, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(node)
		if err != nil {
			return models.BackupStatsResponse{}, fmt.Errorf("failed to get connection for node %s: %w", node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return models.BackupStatsResponse{}, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	statsQuery := `
		SELECT 
			count() AS total,
			countIf(status = 'CREATING_BACKUP') AS in_progress,
			countIf(status = 'BACKUP_CREATED') AS completed,
			countIf(status = 'BACKUP_FAILED' OR status = 'BACKUP_CANCELLED') AS failed
		FROM ` + backupsTableName

	rows, err := conn.Query(ctx, statsQuery)
	if err != nil {
		return models.BackupStatsResponse{}, fmt.Errorf("failed to query backup stats: %w", err)
	}
	defer rows.Close()

	var stats models.BackupStatsResponse
	if rows.Next() {
		if err := rows.Scan(&stats.Total, &stats.InProgress, &stats.Completed, &stats.Failed); err != nil {
			return models.BackupStatsResponse{}, fmt.Errorf("failed to scan backup stats: %w", err)
		}
	}

	if err := rows.Err(); err != nil {
		return models.BackupStatsResponse{}, fmt.Errorf("backup stats iteration failed: %w", err)
	}

	return stats, nil
}

// GetInProgress returns list of backups in progress
func (r *BackupRepository) GetInProgress(ctx context.Context, node string) ([]models.Backup, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(node)
		if err != nil {
			return nil, fmt.Errorf("failed to get connection for node %s: %w", node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	query := `
		SELECT 
			id,
			name,
			base_backup_name,
			query_id,
			status,
			error,
			start_time,
			end_time,
			num_files,
			total_size,
			num_entries,
			uncompressed_size,
			compressed_size,
			files_read,
			bytes_read
		FROM ` + backupsTableName + ` 
		WHERE status = 'CREATING_BACKUP'
		ORDER BY start_time DESC
	`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query in-progress backups: %w", err)
	}
	defer rows.Close()

	backups := make([]models.Backup, 0)
	for rows.Next() {
		var backup models.Backup
		var startTime, endTime time.Time

		if err := rows.Scan(
			&backup.ID,
			&backup.Name,
			&backup.BaseBackupName,
			&backup.QueryID,
			&backup.Status,
			&backup.Error,
			&startTime,
			&endTime,
			&backup.NumFiles,
			&backup.TotalSize,
			&backup.NumEntries,
			&backup.UncompressedSize,
			&backup.CompressedSize,
			&backup.FilesRead,
			&backup.BytesRead,
		); err != nil {
			return nil, fmt.Errorf("failed to scan backup row: %w", err)
		}

		backup.StartTime = startTime.Format("2006-01-02 15:04:05")
		if !endTime.IsZero() {
			backup.EndTime = endTime.Format("2006-01-02 15:04:05")
		} else {
			backup.EndTime = ""
		}
		backup.SQLQuery = "" // SQL query is not stored in system.backups table

		backups = append(backups, backup)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("backup iteration failed: %w", err)
	}

	return backups, nil
}

// GetCompleted returns list of completed backups with pagination
func (r *BackupRepository) GetCompleted(ctx context.Context, node string, limit, offset int) ([]models.Backup, uint64, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, 0, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(node)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get connection for node %s: %w", node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	// Get total count
	countQuery := `
		SELECT count()
		FROM ` + backupsTableName + ` 
		WHERE status = 'BACKUP_CANCELLED' OR status = 'BACKUP_CREATED' OR status = 'BACKUP_FAILED'
	`

	var total uint64
	row := conn.QueryRow(ctx, countQuery)
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count completed backups: %w", err)
	}

	// Get paginated results
	query := `
		SELECT 
			id,
			name,
			base_backup_name,
			query_id,
			status,
			error,
			start_time,
			end_time,
			num_files,
			total_size,
			num_entries,
			uncompressed_size,
			compressed_size,
			files_read,
			bytes_read
		FROM ` + backupsTableName + ` 
		WHERE status = 'BACKUP_CANCELLED' OR status = 'BACKUP_CREATED' OR status = 'BACKUP_FAILED'
		ORDER BY start_time DESC
		LIMIT ? OFFSET ?
	`

	rows, err := conn.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query completed backups: %w", err)
	}
	defer rows.Close()

	backups := make([]models.Backup, 0)
	for rows.Next() {
		var backup models.Backup
		var startTime, endTime time.Time

		if err := rows.Scan(
			&backup.ID,
			&backup.Name,
			&backup.BaseBackupName,
			&backup.QueryID,
			&backup.Status,
			&backup.Error,
			&startTime,
			&endTime,
			&backup.NumFiles,
			&backup.TotalSize,
			&backup.NumEntries,
			&backup.UncompressedSize,
			&backup.CompressedSize,
			&backup.FilesRead,
			&backup.BytesRead,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan backup row: %w", err)
		}

		backup.StartTime = startTime.Format("2006-01-02 15:04:05")
		if !endTime.IsZero() {
			backup.EndTime = endTime.Format("2006-01-02 15:04:05")
		} else {
			backup.EndTime = ""
		}
		backup.SQLQuery = "" // SQL query is not stored in system.backups table

		backups = append(backups, backup)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("backup iteration failed: %w", err)
	}

	return backups, total, nil
}

// GetByID returns a single backup by ID
func (r *BackupRepository) GetByID(ctx context.Context, node, backupID string) (*models.Backup, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(node)
		if err != nil {
			return nil, fmt.Errorf("failed to get connection for node %s: %w", node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	query := `
		SELECT 
			t1.id,
			t1.name,
			t1.base_backup_name,
			t1.query_id,
			t1.status,
			t1.error,
			t1.start_time,
			t1.end_time,
			t1.num_files,
			t1.total_size,
			t1.num_entries,
			t1.uncompressed_size,
			t1.compressed_size,
			t1.files_read,
			t1.bytes_read,
			t2.query
		FROM ` + backupsTableName + ` AS t1
		LEFT JOIN system.query_log AS t2 ON t2.query_id = t1.query_id
		WHERE id = ?
		LIMIT 1
	`

	rows, err := conn.Query(ctx, query, backupID)
	if err != nil {
		return nil, fmt.Errorf("failed to query backup by ID: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("backup with ID %s not found", backupID)
	}

	var backup models.Backup
	var startTime, endTime time.Time

	if err := rows.Scan(
		&backup.ID,
		&backup.Name,
		&backup.BaseBackupName,
		&backup.QueryID,
		&backup.Status,
		&backup.Error,
		&startTime,
		&endTime,
		&backup.NumFiles,
		&backup.TotalSize,
		&backup.NumEntries,
		&backup.UncompressedSize,
		&backup.CompressedSize,
		&backup.FilesRead,
		&backup.BytesRead,
		&backup.SQLQuery,
	); err != nil {
		return nil, fmt.Errorf("failed to scan backup row: %w", err)
	}

	backup.StartTime = startTime.Format("2006-01-02 15:04:05")
	if !endTime.IsZero() {
		backup.EndTime = endTime.Format("2006-01-02 15:04:05")
	} else {
		backup.EndTime = ""
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("backup scan failed: %w", err)
	}

	return &backup, nil
}
