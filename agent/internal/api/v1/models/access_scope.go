package models

// AccessScope represents a single access scope with database, table, column and permissions.
type AccessScope struct {
	Database    string   `json:"database"`    // Empty string means "All"
	Table       string   `json:"table"`       // Empty string means "All"
	Column      string   `json:"column"`      // Empty string means "All"
	Permissions []string `json:"permissions"` // Array of access types (permissions)
}

// AccessScopeListResponse wraps list of access scopes for a user.
type AccessScopeListResponse struct {
	AccessScopes []AccessScope `json:"access_scopes"`
}
