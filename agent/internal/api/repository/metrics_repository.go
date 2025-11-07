package repository

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/db"
	"gorm.io/gorm"
)

var metricSeriesExpressions = map[string]string{
	"cpu_load":           `(COALESCE(os_user_time_normalized, 0) + COALESCE(os_system_time_normalized, 0) + COALESCE(os_io_wait_time_normalized, 0))::float8`,
	"memory_load":        `(CASE WHEN os_memory_total > 0 THEN ((os_memory_total - COALESCE(os_memory_available, 0))::float / os_memory_total::float) * 100 ELSE 0 END)::float8`,
	"memory_used_gb":     `((COALESCE(os_memory_total, 0) - COALESCE(os_memory_available, 0))::float / (1024.0 * 1024.0 * 1024.0))::float8`,
	"storage_used":       `((COALESCE(disk_total_space, 0) - COALESCE(disk_free_space, 0))::float / (1024.0 * 1024.0 * 1024.0))::float8`,
	"active_connections": `(COALESCE(tcp_connection, 0) + COALESCE(mysql_connection, 0) + COALESCE(http_connection, 0) + COALESCE(interserver_connection, 0) + COALESCE(postgresql_connection, 0))::float8`,
	"active_queries":     `COALESCE(query, 0)::float8`,
}

// MetricsRepository mediates metrics reads through the application database.
type MetricsRepository struct {
	db *gorm.DB
}

// NewMetricsRepository attaches to the shared GORM connection and errors when it is unavailable.
func NewMetricsRepository() (*MetricsRepository, error) {
	gormDB, err := db.GetPostgresConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain postgres connection: %w", err)
	}

	return &MetricsRepository{db: gormDB}, nil
}

// GetLatestMetrics returns the most recent metrics row for the node or reports when no data exists.
func (r *MetricsRepository) GetLatestMetrics(ctx context.Context, nodeName string) (*models.SystemMetrics, error) {
	query := `
		SELECT 
			node_name,
			TO_CHAR(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SSZ') AS timestamp,
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
		WHERE node_name = ?
		ORDER BY timestamp DESC
		LIMIT 1
	`

	metrics := &models.SystemMetrics{}

	result := r.db.WithContext(ctx).Raw(query, nodeName).Scan(metrics)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get metrics: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("no metrics found for node: %s", nodeName)
	}

	return metrics, nil
}

// GetAvailableNodes lists distinct node names collected in the metrics store.
func (r *MetricsRepository) GetAvailableNodes(ctx context.Context) ([]string, error) {
	var nodes []string
	result := r.db.WithContext(ctx).
		Table("ch_metrics").
		Distinct("node_name").
		Order("node_name").
		Pluck("node_name", &nodes)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get nodes: %w", result.Error)
	}

	return nodes, nil
}

// GetMetricSeries returns aggregated metric values for the requested time range and step.
func (r *MetricsRepository) GetMetricSeries(ctx context.Context, nodeName string, metricType string, from, to time.Time, step time.Duration) ([]models.MetricSeriesPoint, error) {
	expr, ok := metricSeriesExpressions[metricType]
	if !ok {
		return nil, fmt.Errorf("unsupported metric type: %s", metricType)
	}

	if step <= 0 {
		return nil, fmt.Errorf("step must be positive")
	}

	stepSeconds := step.Seconds()

	query := fmt.Sprintf(`
WITH samples AS (
    SELECT timestamp, %s AS metric_value
    FROM ch_metrics
    WHERE node_name = ?
      AND timestamp BETWEEN ? AND ?
),
 bucketed AS (
    SELECT to_timestamp(floor(extract(epoch FROM timestamp)::numeric / ?) * ?) AT TIME ZONE 'UTC' AS bucket,
           metric_value
    FROM samples
 )
SELECT
    to_char(bucket, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS timestamp,
    AVG(metric_value)::float8 AS value
FROM bucketed
GROUP BY bucket
ORDER BY bucket
`, expr)

	var points []models.MetricSeriesPoint
	result := r.db.WithContext(ctx).Raw(query, nodeName, from, to, stepSeconds, stepSeconds).Scan(&points)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to load metric series: %w", result.Error)
	}

	return points, nil
}
