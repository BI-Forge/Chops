package models

// Process represents a running query from system.processes
type Process struct {
	QueryID         string            `json:"query_id"`
	User            string            `json:"user"`
	Address         string            `json:"address"`
	Elapsed         float64           `json:"elapsed"` // seconds
	ReadRows        uint64            `json:"read_rows"`
	ReadBytes       uint64            `json:"read_bytes"`
	TotalRowsApprox uint64            `json:"total_rows_approx"`
	WrittenRows     uint64            `json:"written_rows"`
	WrittenBytes    uint64            `json:"written_bytes"`
	MemoryUsage     uint64            `json:"memory_usage"`
	Query           string            `json:"query"`
	QueryStartTime  string            `json:"query_start_time"` // RFC3339
	QueryDurationMs uint64            `json:"query_duration_ms"`
	CurrentDatabase string            `json:"current_database"`
	Node            string            `json:"node"`
	ClientName      string            `json:"client_name,omitempty"`
	ClientVersion   string            `json:"client_version,omitempty"`
	OSUser          string            `json:"os_user,omitempty"`
	ThreadIDs       []uint64          `json:"thread_ids,omitempty"`
	ProfileEvents   map[string]uint64 `json:"profile_events,omitempty"`
	Settings        map[string]string `json:"settings,omitempty"`
}

// ProcessListResponse wraps a list of processes
type ProcessListResponse struct {
	Processes []Process `json:"processes"`
	Node      string    `json:"node,omitempty"`
}

// KillProcessRequest represents a request to kill a query
type KillProcessRequest struct {
	QueryID string `json:"query_id" binding:"required" example:"abc-123-def"`
	Node    string `json:"node,omitempty" example:"primary"`
}

// KillProcessResponse represents the result of killing a query
type KillProcessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message,omitempty" example:"Query killed successfully"`
}
