package system

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

// RoleResponse is a system role without embedded permissions.
type RoleResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// RoleDetailResponse is a role including permission ids and names.
type RoleDetailResponse struct {
	ID          int                 `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description,omitempty"`
	Permissions []PermissionSummary `json:"permissions"`
}

// PermissionSummary identifies one permission row.
type PermissionSummary struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}
