package models

// TablesListResponse wraps a list of ClickHouse tables.
type TablesListResponse struct {
	Tables []string `json:"tables"`
}

