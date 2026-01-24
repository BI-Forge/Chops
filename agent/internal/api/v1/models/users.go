package models

import chmodels "clickhouse-ops/internal/clickhouse/models"

// UsersResponse wraps list of ClickHouse users.
type UsersResponse struct {
	Users []string `json:"users"`
}

// UsersListResponse wraps list of ClickHouse users.
type UsersListResponse struct {
	Users []chmodels.UserList `json:"users"`
}
