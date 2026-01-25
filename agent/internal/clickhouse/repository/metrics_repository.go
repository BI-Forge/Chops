package repository

import (
	"context"
	"fmt"
	"sort"
	"time"

	"clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/config"
)

// MetricsRepository mediates metrics reads from ClickHouse metrics_snapshot table.
type MetricsRepository struct {
	config *config.Config
}

// NewMetricsRepository creates a new metrics repository.
func NewMetricsRepository() (*MetricsRepository, error) {
	// Config will be set via SetConfig method
	return &MetricsRepository{}, nil
}

// SetConfig sets the configuration for the repository.
func (r *MetricsRepository) SetConfig(cfg *config.Config) {
	r.config = cfg
}

// getNodeConfig returns the configuration for a specific node.
func (r *MetricsRepository) getNodeConfig(nodeName string) (config.ClickHouseNode, error) {
	if r.config == nil {
		return config.ClickHouseNode{}, fmt.Errorf("config not set")
	}

	for _, node := range r.config.Database.ClickHouse.Nodes {
		if node.Name == nodeName {
			return node, nil
		}
	}

	return config.ClickHouseNode{}, fmt.Errorf("node %s not found in config", nodeName)
}

// getSchemaAndTable returns schema and table name for metrics for a specific node.
func (r *MetricsRepository) getSchemaAndTable(nodeName string) (string, string, error) {
	node, err := r.getNodeConfig(nodeName)
	if err != nil {
		return "", "", err
	}

	schema := node.MetricsSchema
	table := node.MetricsTable

	if schema == "" {
		schema = "ops" // Default schema
	}
	if table == "" {
		table = "metrics_snapshot" // Default table
	}

	return schema, table, nil
}

// getMetricValue extracts a metric value from profile Map.
func getMetricValue(profile map[string]float64, metricName string) float64 {
	if val, ok := profile[metricName]; ok {
		return val
	}
	return 0
}

// calculateMetrics calculates all metrics from profile Map.
func calculateMetrics(profile map[string]float64) *models.SystemMetrics {
	// CPU load: sum of all normalized CPU time components
	cpuLoad := (getMetricValue(profile, "OSUserTimeNormalized") +
		getMetricValue(profile, "OSSystemTimeNormalized") +
		getMetricValue(profile, "OSIrqTimeNormalized") +
		getMetricValue(profile, "OSSoftIrqTimeNormalized") +
		getMetricValue(profile, "OSGuestTimeNormalized") +
		getMetricValue(profile, "OSStealTimeNormalized") +
		getMetricValue(profile, "OSNiceTimeNormalized")) * 100

	// Memory values
	memoryTotal := getMetricValue(profile, "OSMemoryTotal")
	memoryAvailable := getMetricValue(profile, "OSMemoryAvailable")
	memoryUsed := memoryTotal - memoryAvailable

	// Memory load: percentage of used memory
	var memoryLoad float64
	if memoryTotal > 0 {
		memoryLoad = (memoryUsed / memoryTotal) * 100
	}

	// Memory in GB
	memoryUsedGB := memoryUsed / (1024 * 1024 * 1024)
	memoryTotalGB := memoryTotal / (1024 * 1024 * 1024)

	// Disk values
	diskTotal := getMetricValue(profile, "DiskTotalSpace")
	diskFree := getMetricValue(profile, "DiskFreeSpace")
	diskKeepFree := getMetricValue(profile, "DiskKeepFreeSpace")
	diskUsed := diskTotal - diskFree - diskKeepFree

	// Disk usage: percentage of used disk space
	var diskUsage float64
	if diskTotal > 0 {
		diskUsage = (diskUsed / diskTotal) * 100
	}

	// Disk in GB
	diskUsedGB := diskUsed / (1024 * 1024 * 1024)
	diskTotalGB := diskTotal / (1024 * 1024 * 1024)

	// Active connections: sum of all connection types
	activeConns := int64(getMetricValue(profile, "TCPConnection") +
		getMetricValue(profile, "MySQLConnection") +
		getMetricValue(profile, "HTTPConnection") +
		getMetricValue(profile, "InterserverConnection") +
		getMetricValue(profile, "PostgreSQLConnection"))

	// Active queries
	activeQueries := int64(getMetricValue(profile, "Query"))

	return &models.SystemMetrics{
		CPULoad:       cpuLoad,
		MemoryUsage:   memoryLoad,
		MemoryUsedGB:  memoryUsedGB,
		MemoryTotalGB: memoryTotalGB,
		DiskUsage:     diskUsage,
		DiskUsedGB:    diskUsedGB,
		DiskTotalGB:   diskTotalGB,
		ActiveConns:   activeConns,
		ActiveQueries: activeQueries,
	}
}

// GetLatestMetrics returns the most recent metrics row for the node.
func (r *MetricsRepository) GetLatestMetrics(ctx context.Context, nodeName string) (*models.SystemMetrics, error) {
	schema, table, err := r.getSchemaAndTable(nodeName)
	if err != nil {
		return nil, err
	}

	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	tableName := fmt.Sprintf("%s.%s", schema, table)
	if err := checkTableExists(ctx, conn, tableName); err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT 
			timestamp,
			profile
		FROM %s.%s
		ORDER BY timestamp DESC
		LIMIT 1
	`, schema, table)

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query metrics: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("no metrics found for node: %s", nodeName)
	}

	var timestamp time.Time
	var profile map[string]float64

	if err := rows.Scan(&timestamp, &profile); err != nil {
		return nil, fmt.Errorf("failed to scan metrics: %w", err)
	}

	metrics := calculateMetrics(profile)
	metrics.NodeName = nodeName
	metrics.Timestamp = timestamp.UTC().Format(time.RFC3339)

	return metrics, nil
}

// GetAvailableNodes lists distinct node names from the metrics store.
func (r *MetricsRepository) GetAvailableNodes(ctx context.Context) ([]string, error) {
	if r.config == nil {
		return nil, fmt.Errorf("config not set")
	}

	var nodes []string
	for _, node := range r.config.Database.ClickHouse.Nodes {
		nodes = append(nodes, node.Name)
	}

	return nodes, nil
}

// GetMetricSeries returns aggregated metric values for the requested time range and step.
// This method loads all metrics data in a single query and then extracts the requested metric type.
func (r *MetricsRepository) GetMetricSeries(ctx context.Context, nodeName string, metricType string, from, to time.Time, step time.Duration) ([]models.MetricSeriesPoint, error) {
	schema, table, err := r.getSchemaAndTable(nodeName)
	if err != nil {
		return nil, err
	}

	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if step <= 0 {
		return nil, fmt.Errorf("step must be positive")
	}

	tableName := fmt.Sprintf("%s.%s", schema, table)
	if err := checkTableExists(ctx, conn, tableName); err != nil {
		return nil, err
	}

	// Load all data in a single query
	query := fmt.Sprintf(`
		SELECT 
			timestamp,
			profile
		FROM %s.%s
		WHERE timestamp >= ?
			AND timestamp <= ?
		ORDER BY timestamp
	`, schema, table)

	rows, err := conn.Query(ctx, query, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query metric series: %w", err)
	}
	defer rows.Close()

	// Process all rows and calculate metrics
	var samples []sampleData

	for rows.Next() {
		var s sampleData
		if err := rows.Scan(&s.timestamp, &s.profile); err != nil {
			return nil, fmt.Errorf("failed to scan metric point: %w", err)
		}
		samples = append(samples, s)
	}

	if len(samples) == 0 {
		return []models.MetricSeriesPoint{}, nil
	}

	// Aggregate samples by time buckets
	points := r.aggregateSamples(samples, metricType, step)

	return points, nil
}

// sampleData represents a single metrics sample
type sampleData struct {
	timestamp time.Time
	profile   map[string]float64
}

// aggregateSamples groups samples by time buckets and calculates metric values
func (r *MetricsRepository) aggregateSamples(samples []sampleData, metricType string, step time.Duration) []models.MetricSeriesPoint {
	if len(samples) == 0 {
		return []models.MetricSeriesPoint{}
	}

	// Group samples by bucket
	buckets := make(map[int64][]map[string]float64)
	for _, sample := range samples {
		bucketTime := sample.timestamp.Truncate(step).Unix()
		buckets[bucketTime] = append(buckets[bucketTime], sample.profile)
	}

	// Calculate metric value for each bucket (average of all samples in bucket)
	points := make([]models.MetricSeriesPoint, 0, len(buckets))
	for bucketTime, profiles := range buckets {
		var sum float64
		for _, profile := range profiles {
			value := r.calculateMetricValue(profile, metricType)
			sum += value
		}
		avgValue := sum / float64(len(profiles))

		bucketTimestamp := time.Unix(bucketTime, 0).UTC()
		points = append(points, models.MetricSeriesPoint{
			Timestamp: bucketTimestamp.Format(time.RFC3339),
			Value:     avgValue,
		})
	}

	// Sort by timestamp
	sort.Slice(points, func(i, j int) bool {
		return points[i].Timestamp < points[j].Timestamp
	})

	return points
}

// calculateMetricValue calculates a specific metric value from profile Map.
func (r *MetricsRepository) calculateMetricValue(profile map[string]float64, metricType string) float64 {
	switch metricType {
	case "cpu_load":
		return (getMetricValue(profile, "OSUserTimeNormalized") +
			getMetricValue(profile, "OSSystemTimeNormalized") +
			getMetricValue(profile, "OSIrqTimeNormalized") +
			getMetricValue(profile, "OSSoftIrqTimeNormalized") +
			getMetricValue(profile, "OSGuestTimeNormalized") +
			getMetricValue(profile, "OSStealTimeNormalized") +
			getMetricValue(profile, "OSNiceTimeNormalized")) * 100

	case "memory_load":
		memoryTotal := getMetricValue(profile, "OSMemoryTotal")
		if memoryTotal > 0 {
			memoryAvailable := getMetricValue(profile, "OSMemoryAvailable")
			return ((memoryTotal - memoryAvailable) / memoryTotal) * 100
		}
		return 0

	case "memory_used_gb":
		memoryTotal := getMetricValue(profile, "OSMemoryTotal")
		memoryAvailable := getMetricValue(profile, "OSMemoryAvailable")
		return (memoryTotal - memoryAvailable) / (1024 * 1024 * 1024)

	case "storage_used":
		diskTotal := getMetricValue(profile, "DiskTotalSpace")
		diskFree := getMetricValue(profile, "DiskFreeSpace")
		diskKeepFree := getMetricValue(profile, "DiskKeepFreeSpace")
		return (diskTotal - diskFree - diskKeepFree) / (1024 * 1024 * 1024)

	case "active_connections":
		return getMetricValue(profile, "TCPConnection") +
			getMetricValue(profile, "MySQLConnection") +
			getMetricValue(profile, "HTTPConnection") +
			getMetricValue(profile, "InterserverConnection") +
			getMetricValue(profile, "PostgreSQLConnection")

	case "active_queries":
		return getMetricValue(profile, "Query")

	default:
		return 0
	}
}

// GetServerInfo returns server information including uptime, version, memory and storage for a specific node.
func (r *MetricsRepository) GetServerInfo(ctx context.Context, nodeName string) (*models.ServerInfo, error) {
	schema, table, err := r.getSchemaAndTable(nodeName)
	if err != nil {
		return nil, err
	}

	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	tableName := fmt.Sprintf("%s.%s", schema, table)
	if err := checkTableExists(ctx, conn, tableName); err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT 
			timestamp,
			profile
		FROM %s.%s
		ORDER BY timestamp DESC
		LIMIT 1
	`, schema, table)

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query server info: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("no metrics found for node: %s", nodeName)
	}

	var timestamp time.Time
	var profile map[string]float64

	if err := rows.Scan(&timestamp, &profile); err != nil {
		return nil, fmt.Errorf("failed to scan server info: %w", err)
	}

	info := &models.ServerInfo{
		NodeName:         nodeName,
		Uptime:           int64(getMetricValue(profile, "Uptime")),
		VersionInteger:   int64(getMetricValue(profile, "VersionInteger")),
		TotalMemory:      int64(getMetricValue(profile, "OSMemoryTotal")),
		TotalStorage:     int64(getMetricValue(profile, "DiskTotalSpace")),
		AvailableStorage: int64(getMetricValue(profile, "DiskFreeSpace")),
	}

	return info, nil
}
