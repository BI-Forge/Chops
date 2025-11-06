package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/db"
)

// MetricsRepository handles metrics data access
type MetricsRepository struct {
	db *sql.DB
}

// NewMetricsRepository creates a new metrics repository
func NewMetricsRepository() (*MetricsRepository, error) {
	dbManager := db.GetInstance()
	if dbManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	dbConn := dbManager.GetDBManager()
	if dbConn == nil {
		return nil, fmt.Errorf("database connection not available")
	}

	return &MetricsRepository{
		db: dbConn.GetConnection(),
	}, nil
}

// GetLatestMetrics retrieves the latest metrics for a specific node
func (r *MetricsRepository) GetLatestMetrics(ctx context.Context, nodeName string) (*models.SystemMetrics, error) {
	query := `
		SELECT 
			node_name,
			timestamp,
			COALESCE(os_user_time_normalized, 0) + 
			COALESCE(os_system_time_normalized, 0) + 
			COALESCE(os_io_wait_time_normalized, 0) as cpu_load,
			CASE 
				WHEN os_memory_total > 0 THEN 
					((os_memory_total - COALESCE(os_memory_available, 0))::float / os_memory_total::float) * 100
				ELSE 0
			END as memory_usage,
			(os_memory_total - COALESCE(os_memory_available, 0))::float / (1024.0 * 1024.0 * 1024.0) as memory_used_gb,
			os_memory_total::float / (1024.0 * 1024.0 * 1024.0) as memory_total_gb,
			CASE 
				WHEN disk_total_space > 0 THEN 
					((disk_total_space - COALESCE(disk_free_space, 0))::float / disk_total_space::float) * 100
				ELSE 0
			END as disk_usage,
			(disk_total_space - COALESCE(disk_free_space, 0))::float / (1024.0 * 1024.0 * 1024.0) as disk_used_gb,
			disk_total_space::float / (1024.0 * 1024.0 * 1024.0) as disk_total_gb,
			COALESCE(tcp_connection, 0) + 
			COALESCE(mysql_connection, 0) + 
			COALESCE(http_connection, 0) + 
			COALESCE(interserver_connection, 0) + 
			COALESCE(postgresql_connection, 0) as active_conns,
			COALESCE(query, 0) as active_queries
		FROM ch_metrics
		WHERE node_name = $1
		ORDER BY timestamp DESC
		LIMIT 1
	`

	var metrics models.SystemMetrics
	var timestamp time.Time

	err := r.db.QueryRowContext(ctx, query, nodeName).Scan(
		&metrics.NodeName,
		&timestamp,
		&metrics.CPULoad,
		&metrics.MemoryUsage,
		&metrics.MemoryUsedGB,
		&metrics.MemoryTotalGB,
		&metrics.DiskUsage,
		&metrics.DiskUsedGB,
		&metrics.DiskTotalGB,
		&metrics.ActiveConns,
		&metrics.ActiveQueries,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no metrics found for node: %s", nodeName)
		}
		return nil, fmt.Errorf("failed to get metrics: %w", err)
	}

	metrics.Timestamp = timestamp.Format(time.RFC3339)
	return &metrics, nil
}

// GetAvailableNodes returns list of available node names
func (r *MetricsRepository) GetAvailableNodes(ctx context.Context) ([]string, error) {
	query := `
		SELECT DISTINCT node_name
		FROM ch_metrics
		ORDER BY node_name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get nodes: %w", err)
	}
	defer rows.Close()

	var nodes []string
	for rows.Next() {
		var nodeName string
		if err := rows.Scan(&nodeName); err != nil {
			return nil, fmt.Errorf("failed to scan node: %w", err)
		}
		nodes = append(nodes, nodeName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating nodes: %w", err)
	}

	return nodes, nil
}

