package models

// UsersResponse wraps list of ClickHouse users.
type UsersResponse struct {
	Users []string `json:"users"`
}
