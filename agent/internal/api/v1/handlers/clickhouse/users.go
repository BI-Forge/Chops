package clickhouse

import (
	"context"
	"net/http"
	"strings"
	"time"
	"unicode"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const usersQueryTimeout = 5 * time.Second

// containsCyrillic checks if string contains Cyrillic characters.
func containsCyrillic(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Cyrillic, r) {
			return true
		}
	}
	return false
}

// UsersRepository defines the subset of repository methods required by the handler.
type UsersRepository interface {
	GetUsers(ctx context.Context, nodeName string) ([]string, error)
	GetUsersList(ctx context.Context, nodeName string) ([]chmodels.UserList, error)
	GetUserDetails(ctx context.Context, nodeName, userName string) (*chmodels.UserDetails, error)
	RenameUser(ctx context.Context, nodeName, oldName, newName string) error
	CreateUser(ctx context.Context, nodeName, userName, password string) error
	UpdatePassword(ctx context.Context, nodeName, userName, password string) error
	UpdateProfile(ctx context.Context, nodeName, userName, profileName string) error
	UpdateRole(ctx context.Context, nodeName, userName, roleName string) error
}

// UsersHandler handles ClickHouse users endpoints.
type UsersHandler struct {
	repo   UsersRepository
	logger *logger.Logger
}

// NewUsersHandler creates a production users handler.
func NewUsersHandler(log *logger.Logger, cfg *config.Config) (*UsersHandler, error) {
	repo, err := repository.NewUsersRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &UsersHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewUsersHandlerWithRepository creates a users handler using a custom repository (testing helper).
func NewUsersHandlerWithRepository(log *logger.Logger, repo UsersRepository) *UsersHandler {
	return &UsersHandler{
		repo:   repo,
		logger: log,
	}
}

// GetUsers returns list of ClickHouse users from a specific node.
// @Summary      Get ClickHouse users
// @Description  Returns list of available ClickHouse users from the specified node
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.UsersResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users [get]
func (h *UsersHandler) GetUsers(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	users, err := h.repo.GetUsers(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get users: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load users",
			Message: err.Error(),
		})
		return
	}

	response := models.UsersResponse{
		Users: users,
	}

	c.JSON(http.StatusOK, response)
}

// GetUsersList returns detailed list of ClickHouse users with profiles, roles, and grants.
// @Summary      Get detailed ClickHouse users list
// @Description  Returns detailed list of ClickHouse users with their profiles, roles, and grants from the specified node
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.UsersListResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/list [get]
func (h *UsersHandler) GetUsersList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	users, err := h.repo.GetUsersList(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get users list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load users list",
			Message: err.Error(),
		})
		return
	}

	response := models.UsersListResponse{
		Users: users,
	}

	c.JSON(http.StatusOK, response)
}

// UserDetails returns basic information about a specific user by name.
// @Summary      Get user basic information
// @Description  Returns basic information about a specific ClickHouse user by name from the specified node
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  true   "ClickHouse node hostname"
// @Param        name  query     string  true   "User name"
// @Success      200   {object}  chmodels.UserDetails
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/details [get]
func (h *UsersHandler) UserDetails(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	userName := strings.TrimSpace(c.Query("name"))

	if userName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "name parameter is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	user, err := h.repo.GetUserDetails(ctx, nodeName, userName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get user basic info: %v", err)
		}
		// Check if user not found
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "User not found",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load user basic info",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateUserLogin renames a ClickHouse user.
// @Summary      Rename ClickHouse user
// @Description  Renames a ClickHouse user from old_name to new_name on the specified node
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node         query     string                      true   "ClickHouse node hostname"
// @Param        request      body      models.UpdateUserLoginRequest  true  "User rename request"
// @Success      200          {object}  models.UpdateUserLoginResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      404          {object}  models.ErrorResponse
// @Failure      500          {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/rename [put]
func (h *UsersHandler) UpdateUserLogin(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	var req models.UpdateUserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Validate request
	req.OldName = strings.TrimSpace(req.OldName)
	req.NewName = strings.TrimSpace(req.NewName)

	if req.OldName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "old_name parameter is required",
		})
		return
	}

	if req.NewName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "new_name parameter is required",
		})
		return
	}

	// Validate Cyrillic characters
	if containsCyrillic(req.OldName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "old_name cannot contain Cyrillic characters",
		})
		return
	}

	if containsCyrillic(req.NewName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "new_name cannot contain Cyrillic characters",
		})
		return
	}

	// If names are the same, return success without updating
	if req.OldName == req.NewName {
		response := models.UpdateUserLoginResponse{
			Message: "User name unchanged",
			OldName: req.OldName,
			NewName: req.NewName,
		}
		c.JSON(http.StatusOK, response)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	err := h.repo.RenameUser(ctx, nodeName, req.OldName, req.NewName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to rename user: %v", err)
		}
		// Check if user not found
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "User not found",
				Message: err.Error(),
			})
			return
		}
		// Check if user is in users.xml file
		if strings.Contains(err.Error(), "users.xml file") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Cannot rename user",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to rename user",
			Message: err.Error(),
		})
		return
	}

	response := models.UpdateUserLoginResponse{
		Message: "User renamed successfully",
		OldName: req.OldName,
		NewName: req.NewName,
	}

	c.JSON(http.StatusOK, response)
}

// CreateUser creates a new ClickHouse user.
// @Summary      Create ClickHouse user
// @Description  Creates a new ClickHouse user with specified name and password on the specified node
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node         query     string                  true   "ClickHouse node hostname"
// @Param        request      body      models.CreateUserRequest true  "User creation request"
// @Success      201          {object}  models.CreateUserResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      409          {object}  models.ErrorResponse
// @Failure      500          {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users [post]
func (h *UsersHandler) CreateUser(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Validate request
	req.Name = strings.TrimSpace(req.Name)
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "name parameter is required",
		})
		return
	}

	if req.Password == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "password parameter is required",
		})
		return
	}

	// Validate Cyrillic characters
	if containsCyrillic(req.Name) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "name cannot contain Cyrillic characters",
		})
		return
	}

	if containsCyrillic(req.Password) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "password cannot contain Cyrillic characters",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	err := h.repo.CreateUser(ctx, nodeName, req.Name, req.Password)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to create user: %v", err)
		}
		// Check if user already exists
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error:   "User already exists",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to create user",
			Message: err.Error(),
		})
		return
	}

	response := models.CreateUserResponse{
		Message: "User created successfully",
		Name:    req.Name,
	}

	c.JSON(http.StatusCreated, response)
}

// UpdatePassword updates password for an existing ClickHouse user.
// @Summary      Update ClickHouse user password
// @Description  Updates password for an existing ClickHouse user on the specified node
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node         query     string                      true   "ClickHouse node hostname"
// @Param        request      body      models.UpdateUserPasswordRequest true  "Password update request"
// @Success      200          {object}  models.UpdateUserPasswordResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      404          {object}  models.ErrorResponse
// @Failure      500          {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/password [put]
func (h *UsersHandler) UpdatePassword(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	var req models.UpdateUserPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Validate request
	req.UserName = strings.TrimSpace(req.UserName)
	req.Password = strings.TrimSpace(req.Password)

	if req.UserName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name parameter is required",
		})
		return
	}

	if req.Password == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "password parameter is required",
		})
		return
	}

	// Validate Cyrillic characters
	if containsCyrillic(req.UserName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name cannot contain Cyrillic characters",
		})
		return
	}

	if containsCyrillic(req.Password) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "password cannot contain Cyrillic characters",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	err := h.repo.UpdatePassword(ctx, nodeName, req.UserName, req.Password)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to update password: %v", err)
		}
		// Check if user not found
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "User not found",
				Message: err.Error(),
			})
			return
		}
		// Check if user is in users.xml file
		if strings.Contains(err.Error(), "users.xml file") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Cannot update password",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update password",
			Message: err.Error(),
		})
		return
	}

	response := models.UpdateUserPasswordResponse{
		Message:  "User password updated successfully",
		UserName: req.UserName,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfile updates profile for an existing ClickHouse user.
// @Summary      Update ClickHouse user profile
// @Description  Updates the profile for an existing ClickHouse user on the specified node
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node         query     string                      true   "ClickHouse node hostname"
// @Param        request      body      models.UpdateUserProfileRequest  true  "User profile update request"
// @Success      200          {object}  models.UpdateUserProfileResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      404          {object}  models.ErrorResponse
// @Failure      500          {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/profile [put]
func (h *UsersHandler) UpdateProfile(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	var req models.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Validate request
	req.UserName = strings.TrimSpace(req.UserName)
	req.ProfileName = strings.TrimSpace(req.ProfileName)

	if req.UserName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name parameter is required",
		})
		return
	}

	// ProfileName can be empty to remove profile from user
	// Empty profile name is allowed, validation will be done in repository if needed

	// Validate Cyrillic characters
	if containsCyrillic(req.UserName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name cannot contain Cyrillic characters",
		})
		return
	}

	// Validate Cyrillic characters only if profile name is not empty
	if req.ProfileName != "" && containsCyrillic(req.ProfileName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "profile_name cannot contain Cyrillic characters",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	err := h.repo.UpdateProfile(ctx, nodeName, req.UserName, req.ProfileName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to update user profile: %v", err)
		}
		// Check if user not found
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "User not found",
				Message: err.Error(),
			})
			return
		}
		// Check for users.xml storage error
		if strings.Contains(err.Error(), "users.xml file on the server") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Cannot update user profile",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update user profile",
			Message: err.Error(),
		})
		return
	}

	// Determine success message based on whether profile was set or removed
	message := "User profile updated successfully"
	if req.ProfileName == "" {
		message = "User profile removed successfully"
	}

	response := models.UpdateUserProfileResponse{
		Message:     message,
		UserName:    req.UserName,
		ProfileName: req.ProfileName,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateRole updates role for an existing ClickHouse user.
// @Summary      Update ClickHouse user role
// @Description  Updates the role for an existing ClickHouse user on the specified node
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node         query     string                      true   "ClickHouse node hostname"
// @Param        request      body      models.UpdateUserRoleRequest  true  "User role update request"
// @Success      200          {object}  models.UpdateUserRoleResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      404          {object}  models.ErrorResponse
// @Failure      500          {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users/role [put]
func (h *UsersHandler) UpdateRole(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	var req models.UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Validate request
	req.UserName = strings.TrimSpace(req.UserName)
	req.RoleName = strings.TrimSpace(req.RoleName)

	if req.UserName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name parameter is required",
		})
		return
	}

	// RoleName can be empty to remove role from user
	// Empty role name is allowed, validation will be done in repository if needed

	// Validate Cyrillic characters
	if containsCyrillic(req.UserName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name cannot contain Cyrillic characters",
		})
		return
	}

	// Validate Cyrillic characters only if role name is not empty
	if req.RoleName != "" && containsCyrillic(req.RoleName) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "role_name cannot contain Cyrillic characters",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	err := h.repo.UpdateRole(ctx, nodeName, req.UserName, req.RoleName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to update role: %v", err)
		}
		// Check if user not found
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "User not found",
				Message: err.Error(),
			})
			return
		}
		// Check if role not found
		if strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "doesn't exist") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Role not found",
				Message: err.Error(),
			})
			return
		}
		// Check if user is in users.xml file
		if strings.Contains(err.Error(), "users.xml file") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Cannot update role",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update role",
			Message: err.Error(),
		})
		return
	}

	// Determine success message based on whether role was set or removed
	message := "User role updated successfully"
	if req.RoleName == "" {
		message = "User role removed successfully"
	}

	response := models.UpdateUserRoleResponse{
		Message:  message,
		UserName: req.UserName,
		RoleName: req.RoleName,
	}

	c.JSON(http.StatusOK, response)
}
