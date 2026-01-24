package models

import chmodels "clickhouse-ops/internal/clickhouse/models"

// ProcessListResponse wraps a list of processes
type ProcessListResponse struct {
	Processes []chmodels.Process `json:"processes"`
	Node      string             `json:"node,omitempty"`
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
