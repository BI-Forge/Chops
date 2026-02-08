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

// UpdateUserLoginRequest represents request to rename ClickHouse user.
type UpdateUserLoginRequest struct {
	OldName string `json:"old_name" binding:"required" example:"old_user"`
	NewName string `json:"new_name" binding:"required" example:"new_user"`
}

// UpdateUserLoginResponse represents response after renaming user.
type UpdateUserLoginResponse struct {
	Message string `json:"message" example:"User renamed successfully"`
	OldName string `json:"old_name" example:"old_user"`
	NewName string `json:"new_name" example:"new_user"`
}

// CreateUserRequest represents request to create ClickHouse user.
type CreateUserRequest struct {
	Name     string `json:"name" binding:"required" example:"new_user"`
	Password string `json:"password" binding:"required" example:"secure_password_123"`
}

// CreateUserResponse represents response after creating user.
type CreateUserResponse struct {
	Message string `json:"message" example:"User created successfully"`
	Name    string `json:"name" example:"new_user"`
}

// UpdateUserPasswordRequest represents request to update ClickHouse user password.
type UpdateUserPasswordRequest struct {
	UserName string `json:"user_name" binding:"required" example:"existing_user"`
	Password string `json:"password" binding:"required" example:"new_secure_password_123"`
}

// UpdateUserPasswordResponse represents response after updating user password.
type UpdateUserPasswordResponse struct {
	Message  string `json:"message" example:"User password updated successfully"`
	UserName string `json:"user_name" example:"existing_user"`
}

// UpdateUserProfileRequest represents request to update ClickHouse user profile.
// ProfileName can be empty to remove profile from user.
type UpdateUserProfileRequest struct {
	UserName    string `json:"user_name" binding:"required" example:"existing_user"`
	ProfileName string `json:"profile_name" example:"default"`
}

// UpdateUserProfileResponse represents response after updating user profile.
type UpdateUserProfileResponse struct {
	Message     string `json:"message" example:"User profile updated successfully"`
	UserName    string `json:"user_name" example:"existing_user"`
	ProfileName string `json:"profile_name" example:"default"`
}

// UpdateUserRoleRequest represents request to update ClickHouse user role.
// RoleName can be empty to remove role from user.
type UpdateUserRoleRequest struct {
	UserName string `json:"user_name" binding:"required" example:"existing_user"`
	RoleName string `json:"role_name" example:"analyst_role"`
}

// UpdateUserRoleResponse represents response after updating user role.
type UpdateUserRoleResponse struct {
	Message  string `json:"message" example:"User role updated successfully"`
	UserName string `json:"user_name" example:"existing_user"`
	RoleName string `json:"role_name" example:"analyst_role"`
}
