package models

import chmodels "clickhouse-ops/internal/clickhouse/models"

// QueryLogResponse wraps query log entries with pagination metadata.
type QueryLogResponse struct {
	Items      []chmodels.QueryLogEntry `json:"items"`
	Pagination QueryLogPagination        `json:"pagination"`
}

// QueryLogPagination provides pagination info for query log responses.
type QueryLogPagination struct {
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
	Total  int64         `json:"total"`
	Range  QueryLogRange `json:"range"`
}

// QueryLogRange describes the applied time window.
type QueryLogRange struct {
	From   string `json:"from"`
	To     string `json:"to"`
	Preset string `json:"preset,omitempty"`
}

// QueryLogStatsResponse provides query count statistics by status.
type QueryLogStatsResponse struct {
	Running  int64 `json:"running"`  // Count of running queries (QueryStart without QueryFinish)
	Finished int64 `json:"finished"` // Count of finished queries (QueryFinish)
	Error    int64 `json:"error"`    // Count of queries with errors (QueryFinish with exception_code != 0)
}

// QueryLoadEntry represents CPU and memory load data for a single query.
type QueryLoadEntry struct {
	EventTime      string  `json:"event_time"`
	QueryStartTime string  `json:"query_start_time"`
	QueryID        string  `json:"query_id"`
	User           string  `json:"user"`
	DurationMs     uint64  `json:"duration_ms"`
	MemoryUsage    uint64  `json:"memory_usage"`
	CPULoad        float64 `json:"cpu_load"`
}

// QueryLoadResponse wraps query load entries.
type QueryLoadResponse struct {
	Entries []QueryLoadEntry `json:"entries"`
}
