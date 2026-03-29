package models

// TablesList holds table metadata with parts and size info.
type TablesList struct {
	UUID        string `json:"uuid"`
	Name        string `json:"name"`
	Database    string `json:"database"`
	Engine      string `json:"engine"`
	Rows        uint64 `json:"rows"`
	Parts       uint64 `json:"parts"`
	ActiveParts uint64 `json:"active_parts"`
	BytesHuman  string `json:"bytes"` // Human-readable size (e.g. "1.5 GB")
	SizeBytes   uint64 `json:"size_bytes"`
}

// TablesListResponse wraps a list of ClickHouse tables with metadata and pagination.
type TablesListResponse struct {
	Tables []TablesList `json:"tables"`
	Total  int          `json:"total"`  // Total count for pagination
	Limit  int          `json:"limit"`  // Applied limit
	Offset int          `json:"offset"` // Applied offset
}

// TableCopyRequest is the body for copy-table-by-UUID (new table name only).
type TableCopyRequest struct {
	Name string `json:"name" binding:"required"`
}

// TablesSummaryResponse provides total counters across ClickHouse system tables.
type TablesSummaryResponse struct {
	TotalTables uint64 `json:"total_tables"`
	TotalRows   uint64 `json:"total_rows"`
	TotalSize   string `json:"total_size"` // Human-readable size.
	TotalParts  uint64 `json:"total_parts"`
}
