package models

// SchemasListResponse wraps a list of ClickHouse databases (schemas).
type SchemasListResponse struct {
	Schemas []string `json:"schemas"`
}

