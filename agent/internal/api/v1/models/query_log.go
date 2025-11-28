package models

// QueryLogEntry represents a single ClickHouse query log record returned to the client.
type QueryLogEntry struct {
	Node                  string   `json:"node"`
	EventTime             string   `json:"event_time"`
	EventTimeMicroseconds string   `json:"event_time_microseconds"`
	InitialUser           string   `json:"initial_user"`
	User                  string   `json:"user"`
	QueryID               string   `json:"query_id"`
	QueryKind             string   `json:"query_kind"`
	Type                  string   `json:"type"`
	Settings              string   `json:"settings,omitempty"`
	QueryText             string   `json:"query_text"`
	ReadRows              uint64   `json:"read_rows"`
	ReadBytes             uint64   `json:"read_bytes"`
	WrittenRows           uint64   `json:"written_rows"`
	WrittenBytes          uint64   `json:"written_bytes"`
	ResultRows            uint64   `json:"result_rows"`
	ResultBytes           uint64   `json:"result_bytes"`
	MemoryUsage           uint64   `json:"memory_usage"`
	DurationMs            uint64   `json:"duration_ms"`
	ExceptionCode         int32    `json:"exception_code"`
	Exception             string   `json:"exception,omitempty"`
	ClientHostname        string   `json:"client_hostname,omitempty"`
	Databases             []string `json:"databases,omitempty"`
	Tables                []string `json:"tables,omitempty"`
}

// QueryLogResponse wraps query log entries with pagination metadata.
type QueryLogResponse struct {
	Items      []QueryLogEntry    `json:"items"`
	Pagination QueryLogPagination `json:"pagination"`
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
