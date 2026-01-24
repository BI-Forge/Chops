package models

// SystemMetrics represents current system metrics
type SystemMetrics struct {
	NodeName      string  `json:"node_name" gorm:"column:node_name;->"`
	Timestamp     string  `json:"timestamp" gorm:"column:timestamp;->"`
	CPULoad       float64 `json:"cpu_load" gorm:"column:cpu_load;->"`               // Percentage (os_user_time_normalized + os_system_time_normalized + os_io_wait_time_normalized)
	MemoryUsage   float64 `json:"memory_usage" gorm:"column:memory_usage;->"`       // Percentage
	MemoryUsedGB  float64 `json:"memory_used_gb" gorm:"column:memory_used_gb;->"`   // Absolute value in GB
	MemoryTotalGB float64 `json:"memory_total_gb" gorm:"column:memory_total_gb;->"` // Total memory in GB
	DiskUsage     float64 `json:"disk_usage" gorm:"column:disk_usage;->"`           // Percentage
	DiskUsedGB    float64 `json:"disk_used_gb" gorm:"column:disk_used_gb;->"`       // Absolute value in GB
	DiskTotalGB   float64 `json:"disk_total_gb" gorm:"column:disk_total_gb;->"`     // Total disk space in GB
	ActiveConns   int64   `json:"active_conns" gorm:"column:active_conns;->"`       // Total active connections (tcp + mysql + http + interserver + postgresql)
	ActiveQueries int64   `json:"active_queries" gorm:"column:active_queries;->"`   // Active queries count
}

// ServerInfo represents server information including uptime and version
type ServerInfo struct {
	NodeName         string `json:"node_name" gorm:"column:node_name;->"`
	Uptime           int64  `json:"uptime" gorm:"column:uptime;->"`                   // Server uptime in seconds
	VersionInteger   int64  `json:"version_integer" gorm:"column:version_integer;->"` // ClickHouse version as integer
	TotalMemory      int64  `json:"total_memory"`                                     // Total memory in bytes
	TotalStorage     int64  `json:"total_storage"`                                    // Total storage in bytes
	AvailableStorage int64  `json:"available_storage"`                                // Available storage in bytes
	Host             string `json:"host"`                                             // Host from config
	Cluster          string `json:"cluster"`                                          // Cluster name from config
}

// MetricSeriesPoint represents a single aggregated metric point.
type MetricSeriesPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}
