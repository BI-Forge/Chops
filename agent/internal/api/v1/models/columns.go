package models

// ColumnsListResponse wraps a list of ClickHouse columns.
type ColumnsListResponse struct {
	Columns []string `json:"columns"`
}

