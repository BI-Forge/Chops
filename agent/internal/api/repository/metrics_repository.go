package repository

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/db"

	"gorm.io/gorm"
)

// MetricExpressions contains SQL expressions for calculating metrics.
// These expressions are used consistently across GetLatestMetrics and GetMetricSeries
// to ensure calculations are synchronized.
var MetricExpressions = struct {
	CPULoad           string
	MemoryLoad        string
	MemoryUsedGB      string
	MemoryTotalGB     string
	DiskUsage         string
	DiskUsedGB        string
	DiskTotalGB       string
	ActiveConnections string
	ActiveQueries     string
}{
	// CPU load: sum of all normalized CPU time components
	CPULoad: `COALESCE(os_user_time_normalized, 0) + COALESCE(os_system_time_normalized, 0) + COALESCE(os_irq_time_normalized, 0) + COALESCE(os_soft_irq_time_normalized, 0) + COALESCE(os_guest_time_normalized, 0) + COALESCE(os_steal_time_normalized, 0) + COALESCE(os_nice_time_normalized, 0)`,

	// Memory load: percentage of used memory
	MemoryLoad: `CASE WHEN os_memory_total > 0 THEN ((os_memory_total - COALESCE(os_memory_available, 0))::float / os_memory_total::float) * 100 ELSE 0 END`,

	// Memory used in GB
	MemoryUsedGB: `(COALESCE(os_memory_total, 0) - COALESCE(os_memory_available, 0))::float / (1024.0 * 1024.0 * 1024.0)`,

	// Memory total in GB
	MemoryTotalGB: `os_memory_total::float / (1024.0 * 1024.0 * 1024.0)`,

	// Disk usage: percentage of used disk space
	DiskUsage: `CASE WHEN disk_total_space > 0 THEN ((disk_total_space - COALESCE(disk_free_space, 0) - COALESCE(disk_keep_free_space, 0))::float / disk_total_space::float) * 100 ELSE 0 END`,

	// Disk used in GB
	DiskUsedGB: `(COALESCE(disk_total_space, 0) - COALESCE(disk_free_space, 0) - COALESCE(disk_keep_free_space, 0))::float / (1024.0 * 1024.0 * 1024.0)`,

	// Disk total in GB
	DiskTotalGB: `disk_total_space::float / (1024.0 * 1024.0 * 1024.0)`,

	// Active connections: sum of all connection types
	ActiveConnections: `COALESCE(tcp_connection, 0) + COALESCE(mysql_connection, 0) + COALESCE(http_connection, 0) + COALESCE(interserver_connection, 0) + COALESCE(postgresql_connection, 0)`,

	// Active queries
	ActiveQueries: `COALESCE(query, 0)`,
}

// metricSeriesExpressions maps metric type names to SQL expressions for series queries.
// These expressions use the same base calculations as MetricExpressions but cast to float8.
var metricSeriesExpressions = map[string]string{
	"cpu_load":           fmt.Sprintf("(%s)::float8", MetricExpressions.CPULoad),
	"memory_load":        fmt.Sprintf("(%s)::float8", MetricExpressions.MemoryLoad),
	"memory_used_gb":     fmt.Sprintf("(%s)::float8", MetricExpressions.MemoryUsedGB),
	"storage_used":       fmt.Sprintf("(%s)::float8", MetricExpressions.DiskUsedGB),
	"active_connections": fmt.Sprintf("(%s)::float8", MetricExpressions.ActiveConnections),
	"active_queries":     fmt.Sprintf("(%s)::float8", MetricExpressions.ActiveQueries),
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
// Uses MetricExpressions to ensure calculations are consistent with GetMetricSeries.
func (r *MetricsRepository) GetLatestMetrics(ctx context.Context, nodeName string) (*models.SystemMetrics, error) {
	query := fmt.Sprintf(`
		SELECT 
			node_name,
			TO_CHAR(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SSZ') AS timestamp,
			%s as cpu_load,
			%s as memory_usage,
			%s as memory_used_gb,
			%s as memory_total_gb,
			%s as disk_usage,
			%s as disk_used_gb,
			%s as disk_total_gb,
			%s as active_conns,
			%s as active_queries
		FROM ch_metrics
		WHERE node_name = ?
		ORDER BY timestamp DESC
		LIMIT 1
	`,
		MetricExpressions.CPULoad,
		MetricExpressions.MemoryLoad,
		MetricExpressions.MemoryUsedGB,
		MetricExpressions.MemoryTotalGB,
		MetricExpressions.DiskUsage,
		MetricExpressions.DiskUsedGB,
		MetricExpressions.DiskTotalGB,
		MetricExpressions.ActiveConnections,
		MetricExpressions.ActiveQueries,
	)

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
