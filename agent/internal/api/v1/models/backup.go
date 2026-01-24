package models

import chmodels "clickhouse-ops/internal/clickhouse/models"

// BackupStatsResponse provides backup count statistics
type BackupStatsResponse struct {
	Total      uint64 `json:"total"`
	InProgress uint64 `json:"in_progress"`
	Completed  uint64 `json:"completed"`
	Failed     uint64 `json:"failed"`
}

// BackupListResponse wraps backup entries with pagination metadata
type BackupListResponse struct {
	Items      []chmodels.Backup `json:"items"`
	Pagination BackupPagination  `json:"pagination"`
}

// BackupPagination provides pagination info for backup responses
type BackupPagination struct {
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
	Total  uint64 `json:"total"`
}
