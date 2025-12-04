package fixtures

import (
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/db"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// MetricsData represents test metrics data for ch_metrics table
type MetricsData struct {
	NodeName    string
	Timestamp   time.Time
	CPULoad     float64 // CPU load percentage (0-100), will be distributed across CPU fields
	MemoryTotal int64   // Total memory in bytes
	MemoryAvail int64   // Available memory in bytes
	DiskTotal   int64   // Total disk space in bytes
	DiskFree    int64   // Free disk space in bytes
	Connections struct {
		TCP         int64
		MySQL       int64
		HTTP        int64
		Interserver int64
		PostgreSQL  int64
	}
	QueryCount int64
}

// DefaultMetricsData returns default test metrics data
func DefaultMetricsData(nodeName string) MetricsData {
	return MetricsData{
		NodeName:    nodeName,
		Timestamp:   time.Now().UTC().Truncate(time.Second),
		CPULoad:     25.0,                     // 25% CPU load
		MemoryTotal: 16 * 1024 * 1024 * 1024,  // 16 GB
		MemoryAvail: 8 * 1024 * 1024 * 1024,   // 8 GB
		DiskTotal:   500 * 1024 * 1024 * 1024, // 500 GB
		DiskFree:    100 * 1024 * 1024 * 1024, // 100 GB
		Connections: struct {
			TCP         int64
			MySQL       int64
			HTTP        int64
			Interserver int64
			PostgreSQL  int64
		}{
			TCP:         5,
			MySQL:       0,
			HTTP:        3,
			Interserver: 1,
			PostgreSQL:  0,
		},
		QueryCount: 10,
	}
}

// InsertMetricsData inserts metrics data into ch_metrics table
func InsertMetricsData(t require.TestingT, gormDB *gorm.DB, data MetricsData) {
	if gormDB == nil {
		require.FailNow(t, "GORM DB is nil")
		return
	}

	// Calculate CPU normalized values (distribute CPULoad across CPU fields used in formula)
	// Formula: (sum of 7 normalized CPU times) * 100 = CPULoad
	// Fields used: user, system, irq, soft_irq, guest, steal, nice (NOT io_wait)
	// So: sum = CPULoad / 100
	// Distribute evenly across 7 CPU time fields
	cpuNormalized := data.CPULoad / 100.0 / 7.0

	// Build INSERT query
	// Note: os_io_wait_time_normalized is included in table but NOT used in cpu_load calculation
	columns := []string{
		"timestamp", "node_name",
		"os_user_time_normalized", "os_system_time_normalized", "os_io_wait_time_normalized",
		"os_irq_time_normalized", "os_soft_irq_time_normalized", "os_guest_time_normalized",
		"os_steal_time_normalized", "os_nice_time_normalized",
		"os_memory_total", "os_memory_available",
		"disk_total_space", "disk_free_space",
		"tcp_connection", "mysql_connection", "http_connection",
		"interserver_connection", "postgresql_connection",
		"query",
	}

	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf(
		"INSERT INTO ch_metrics (%s) VALUES (%s)",
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)

	values := []interface{}{
		data.Timestamp, data.NodeName,
		cpuNormalized, cpuNormalized, 0.0, // user, system, io_wait (io_wait not used in cpu_load formula)
		cpuNormalized, cpuNormalized, cpuNormalized, // irq, soft_irq, guest
		cpuNormalized, cpuNormalized, // steal, nice
		data.MemoryTotal, data.MemoryAvail,
		data.DiskTotal, data.DiskFree,
		data.Connections.TCP, data.Connections.MySQL, data.Connections.HTTP,
		data.Connections.Interserver, data.Connections.PostgreSQL,
		data.QueryCount,
	}

	err := gormDB.Exec(query, values...).Error
	require.NoError(t, err, "Failed to insert metrics data")
}

// InsertMetricsSeries inserts multiple metrics data points for time series testing
func InsertMetricsSeries(t require.TestingT, gormDB *gorm.DB, nodeName string, points []MetricsSeriesPoint) {
	for _, point := range points {
		data := DefaultMetricsData(nodeName)
		data.Timestamp = point.Timestamp
		data.CPULoad = point.CPULoad
		InsertMetricsData(t, gormDB, data)
	}
}

// MetricsSeriesPoint represents a single point in a metrics time series
type MetricsSeriesPoint struct {
	Timestamp time.Time
	CPULoad   float64
}

// CleanupMetricsData removes test metrics data from ch_metrics table
func CleanupMetricsData(t require.TestingT, gormDB *gorm.DB, nodeNamePattern string) {
	if gormDB == nil {
		return
	}

	query := "DELETE FROM ch_metrics WHERE node_name LIKE ?"
	err := gormDB.Exec(query, nodeNamePattern).Error
	require.NoError(t, err, "Failed to cleanup metrics data")
}

// GetDBConnection returns database connection from manager
func GetDBConnection() (*gorm.DB, error) {
	dbManager := db.GetInstance()
	if dbManager == nil {
		return nil, fmt.Errorf("database manager not initialized")
	}

	gormDB := dbManager.GetGormDB()
	if gormDB == nil {
		return nil, fmt.Errorf("GORM DB not initialized")
	}

	return gormDB, nil
}
