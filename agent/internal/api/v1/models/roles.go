package models

// RolesListResponse wraps list of ClickHouse roles.
type RolesListResponse struct {
	Roles []string `json:"roles"`
}
