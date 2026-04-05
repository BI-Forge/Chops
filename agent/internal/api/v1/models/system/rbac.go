package system

import "time"

// CreateRoleRequest is the body for creating a system role.
type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100" example:"operator"`
	Description string `json:"description" example:"Read-only operations"`
}

// SetRolePermissionsRequest replaces permissions linked to a role.
type SetRolePermissionsRequest struct {
	PermissionIDs []int `json:"permission_ids"`
}

// AssignUserRoleRequest assigns a single system role to a user.
type AssignUserRoleRequest struct {
	RoleID int `json:"role_id" binding:"required" example:"1"`
}

// SetUserActiveRequest toggles application user activation (requires system.users.set_active).
type SetUserActiveRequest struct {
	IsActive bool `json:"is_active"`
}

// RoleResponse is a system role without embedded permissions.
type RoleResponse struct {
	ID               int       `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description,omitempty"`
	IsSystem         bool      `json:"is_system"`
	UsersCount       int       `json:"users_count"`
	PermissionsCount int       `json:"permissions_count"`
	CreatedAt        time.Time `json:"created_at"`
}

// SystemUserResponse is an application user with role and effective permission codes.
type SystemUserResponse struct {
	ID          int       `json:"id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	FullName    string    `json:"full_name"`
	RoleID      int       `json:"role_id"`
	RoleName    string    `json:"role_name"`
	Permissions []string  `json:"permissions"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// RoleDetailResponse is a role including permission ids and names.
type RoleDetailResponse struct {
	ID          int                 `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description,omitempty"`
	IsSystem    bool                `json:"is_system"`
	Permissions []PermissionSummary `json:"permissions"`
}

// PermissionSummary identifies one permission row.
type PermissionSummary struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}
