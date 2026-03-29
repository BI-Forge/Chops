package clickhouse

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/api/v1/validators"
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

// respondBadRequest sends 400 with "Invalid request" and message.
func (h *UsersHandler) respondBadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{Error: "Invalid request", Message: message})
}

// respondCyrillicBadRequest sends 400 when field contains Cyrillic characters.
func (h *UsersHandler) respondCyrillicBadRequest(c *gin.Context, fieldName string) {
	h.respondBadRequest(c, fieldName+" cannot contain Cyrillic characters")
}

// handleGetUserDetailsErr logs err and sends 404 if "not found", else 500. Returns true if response was sent.
func (h *UsersHandler) handleGetUserDetailsErr(c *gin.Context, err error, logContext string) bool {
	if err == nil {
		return false
	}
	if h.logger != nil {
		h.logger.Errorf("Failed to get user details for %s: %v", logContext, err)
	}
	if strings.Contains(err.Error(), "not found") {
		c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{Error: "User not found", Message: err.Error()})
		return true
	}
	c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: "Failed to load user", Message: err.Error()})
	return true
}

// handleUserRepoErr logs err and sends 404 if "not found", else 500. Returns true if response was sent.
func (h *UsersHandler) handleUserRepoErr(c *gin.Context, err error, logMsg, internalLabel string) bool {
	if err == nil {
		return false
	}
	if h.logger != nil {
		h.logger.Errorf("%s: %v", logMsg, err)
	}
	if strings.Contains(err.Error(), "not found") {
		c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{Error: "User not found", Message: err.Error()})
		return true
	}
	c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: internalLabel, Message: err.Error()})
	return true
}

// getUserDetailsWithReject loads user details; on error or users_xml sends response and returns (nil, true). Otherwise returns (details, false).
func (h *UsersHandler) getUserDetailsWithReject(c *gin.Context, ctx context.Context, nodeName, userName, logContext, rejectLabel string) (*chmodels.UserDetails, bool) {
	details, err := h.repo.GetUserDetails(ctx, nodeName, userName)
	if h.handleGetUserDetailsErr(c, err, logContext) {
		return nil, true
	}
	if validators.RejectUserFromUsersXml(c, details, rejectLabel) {
		return nil, true
	}
	return details, false
}

// logAndRespond500 logs err and sends 500 with the given error label.
func (h *UsersHandler) logAndRespond500(c *gin.Context, err error, logMsg, errLabel string) {
	if h.logger != nil && err != nil {
		h.logger.Errorf("%s: %v", logMsg, err)
	}
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: errLabel, Message: msg})
}

// UsersRepository defines the subset of repository methods required by the handler.
type UsersRepository interface {
	GetUsers(ctx context.Context, nodeName string) ([]string, error)
	GetUsersList(ctx context.Context, nodeName string) ([]chmodels.UserList, error)
	GetUserDetails(ctx context.Context, nodeName, userName string) (*chmodels.UserDetails, error)
	RenameUser(ctx context.Context, nodeName, oldName, newName string) error
	CreateUser(ctx context.Context, nodeName, userName, password string) error
	DropUser(ctx context.Context, nodeName, userName string) error
	UpdatePassword(ctx context.Context, nodeName, userName, password string) error
	UpdateProfile(ctx context.Context, nodeName, userName, profileName string) error
	UpdateRole(ctx context.Context, nodeName, userName, roleName string) error
}

// accessScopeRepository is used by UpdateUserAccessScopes (GetUserAccessScopes, UpdateUserAccessScopes).
type accessScopeRepository interface {
	GetUserAccessScopes(ctx context.Context, nodeName, userName string) ([]models.AccessScope, error)
	UpdateUserAccessScopes(ctx context.Context, nodeName, userName string, scopes []models.AccessScope) error
}

// settingsRepository is used by UpdateUserSettings (UpdateUserSettings, GetUserSettings, GetAllAvailableSettings).
type settingsRepository interface {
	UpdateUserSettings(ctx context.Context, nodeName, userName string, settings []repository.UserSettingPair) error
	GetUserSettings(ctx context.Context, nodeName, userName string) (userSettings map[string]string, profileSettings map[string]string, err error)
	GetAllAvailableSettings(ctx context.Context, nodeName string) ([]repository.AvailableSettingRow, error)
}

// UsersHandler handles ClickHouse users endpoints.
type UsersHandler struct {
	repo            UsersRepository
	accessScopeRepo accessScopeRepository
	settingsRepo    settingsRepository
	logger          *logger.Logger
}

// NewUsersHandler creates a production users handler.
func NewUsersHandler(log *logger.Logger, cfg *config.Config) (*UsersHandler, error) {
	repo, err := repository.NewUsersRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	accessScopeRepo, err := repository.NewAccessScopeRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	settingsRepo, err := repository.NewSettingsRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &UsersHandler{
		repo:            repo,
		accessScopeRepo: accessScopeRepo,
		settingsRepo:    settingsRepo,
		logger:          log,
	}, nil
}

// NewUsersHandlerWithRepository creates a users handler using custom repositories (testing helper).
// accessScopeRepo and settingsRepo can be nil for tests that do not use those endpoints.
func NewUsersHandlerWithRepository(log *logger.Logger, repo UsersRepository, accessScopeRepo accessScopeRepository, settingsRepo settingsRepository) *UsersHandler {
	return &UsersHandler{
		repo:            repo,
		accessScopeRepo: accessScopeRepo,
		settingsRepo:    settingsRepo,
		logger:          log,
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
		h.logAndRespond500(c, err, "Failed to get users", "Failed to load users")
		return
	}
	c.JSON(http.StatusOK, models.UsersResponse{Users: users})
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
		h.logAndRespond500(c, err, "Failed to get users list", "Failed to load users list")
		return
	}
	c.JSON(http.StatusOK, models.UsersListResponse{Users: users})
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
		h.respondBadRequest(c, "name parameter is required")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	user, err := h.repo.GetUserDetails(ctx, nodeName, userName)
	if h.handleGetUserDetailsErr(c, err, "basic info") {
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
		h.respondBadRequest(c, err.Error())
		return
	}
	req.OldName = strings.TrimSpace(req.OldName)
	req.NewName = strings.TrimSpace(req.NewName)
	if req.OldName == "" {
		h.respondBadRequest(c, "old_name parameter is required")
		return
	}
	if req.NewName == "" {
		h.respondBadRequest(c, "new_name parameter is required")
		return
	}
	if containsCyrillic(req.OldName) {
		h.respondCyrillicBadRequest(c, "old_name")
		return
	}
	if containsCyrillic(req.NewName) {
		h.respondCyrillicBadRequest(c, "new_name")
		return
	}
	if req.OldName == req.NewName {
		c.JSON(http.StatusOK, models.UpdateUserLoginResponse{
			Message: "User name unchanged",
			OldName: req.OldName,
			NewName: req.NewName,
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, req.OldName, "rename", "Cannot rename user"); ok {
		return
	}
	err := h.repo.RenameUser(ctx, nodeName, req.OldName, req.NewName)
	if h.handleUserRepoErr(c, err, "Failed to rename user", "Failed to rename user") {
		return
	}
	c.JSON(http.StatusOK, models.UpdateUserLoginResponse{
		Message: "User renamed successfully",
		OldName: req.OldName,
		NewName: req.NewName,
	})
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
		h.respondBadRequest(c, err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Password = strings.TrimSpace(req.Password)
	if req.Name == "" {
		h.respondBadRequest(c, "name parameter is required")
		return
	}
	if req.Password == "" {
		h.respondBadRequest(c, "password parameter is required")
		return
	}
	if containsCyrillic(req.Name) {
		h.respondCyrillicBadRequest(c, "name")
		return
	}
	if containsCyrillic(req.Password) {
		h.respondCyrillicBadRequest(c, "password")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	err := h.repo.CreateUser(ctx, nodeName, req.Name, req.Password)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to create user: %v", err)
		}
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, apiSystemModels.ErrorResponse{Error: "User already exists", Message: err.Error()})
			return
		}
		h.logAndRespond500(c, err, "Failed to create user", "Failed to create user")
		return
	}
	c.JSON(http.StatusCreated, models.CreateUserResponse{Message: "User created successfully", Name: req.Name})
}

// DeleteUser drops a ClickHouse user (DROP USER).
// @Summary      Delete ClickHouse user
// @Description  Drops a ClickHouse user from the specified node. User must not be defined in users.xml.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  true  "ClickHouse node hostname"
// @Param        name  query     string  true  "User name to delete"
// @Success      200   {object}  models.DeleteUserResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/users [delete]
func (h *UsersHandler) DeleteUser(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	userName := strings.TrimSpace(c.Query("name"))
	if userName == "" {
		h.respondBadRequest(c, "name parameter is required")
		return
	}
	if containsCyrillic(userName) {
		h.respondCyrillicBadRequest(c, "name")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, userName, "delete", "Cannot delete user"); ok {
		return
	}
	err := h.repo.DropUser(ctx, nodeName, userName)
	if h.handleUserRepoErr(c, err, "Failed to delete user", "Failed to delete user") {
		return
	}
	c.JSON(http.StatusOK, models.DeleteUserResponse{Message: "User deleted successfully", Name: userName})
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
		h.respondBadRequest(c, err.Error())
		return
	}
	req.UserName = strings.TrimSpace(req.UserName)
	req.Password = strings.TrimSpace(req.Password)
	if req.UserName == "" {
		h.respondBadRequest(c, "user_name parameter is required")
		return
	}
	if req.Password == "" {
		h.respondBadRequest(c, "password parameter is required")
		return
	}
	if containsCyrillic(req.UserName) {
		h.respondCyrillicBadRequest(c, "user_name")
		return
	}
	if containsCyrillic(req.Password) {
		h.respondCyrillicBadRequest(c, "password")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, req.UserName, "password update", "Cannot update password"); ok {
		return
	}
	err := h.repo.UpdatePassword(ctx, nodeName, req.UserName, req.Password)
	if h.handleUserRepoErr(c, err, "Failed to update password", "Failed to update password") {
		return
	}
	c.JSON(http.StatusOK, models.UpdateUserPasswordResponse{
		Message:  "User password updated successfully",
		UserName: req.UserName,
	})
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
		h.respondBadRequest(c, err.Error())
		return
	}
	req.UserName = strings.TrimSpace(req.UserName)
	req.ProfileName = strings.TrimSpace(req.ProfileName)
	if req.UserName == "" {
		h.respondBadRequest(c, "user_name parameter is required")
		return
	}
	if containsCyrillic(req.UserName) {
		h.respondCyrillicBadRequest(c, "user_name")
		return
	}
	if req.ProfileName != "" && containsCyrillic(req.ProfileName) {
		h.respondCyrillicBadRequest(c, "profile_name")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, req.UserName, "profile update", "Cannot update user profile"); ok {
		return
	}
	err := h.repo.UpdateProfile(ctx, nodeName, req.UserName, req.ProfileName)
	if h.handleUserRepoErr(c, err, "Failed to update user profile", "Failed to update user profile") {
		return
	}
	message := "User profile updated successfully"
	if req.ProfileName == "" {
		message = "User profile removed successfully"
	}
	c.JSON(http.StatusOK, models.UpdateUserProfileResponse{
		Message: message, UserName: req.UserName, ProfileName: req.ProfileName,
	})
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
		h.respondBadRequest(c, err.Error())
		return
	}
	req.UserName = strings.TrimSpace(req.UserName)
	req.RoleName = strings.TrimSpace(req.RoleName)
	if req.UserName == "" {
		h.respondBadRequest(c, "user_name parameter is required")
		return
	}
	if containsCyrillic(req.UserName) {
		h.respondCyrillicBadRequest(c, "user_name")
		return
	}
	if req.RoleName != "" && containsCyrillic(req.RoleName) {
		h.respondCyrillicBadRequest(c, "role_name")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, req.UserName, "role update", "Cannot update role"); ok {
		return
	}
	err := h.repo.UpdateRole(ctx, nodeName, req.UserName, req.RoleName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to update role: %v", err)
		}
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{Error: "User not found", Message: err.Error()})
			return
		}
		if strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "doesn't exist") {
			c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{Error: "Role not found", Message: err.Error()})
			return
		}
		h.logAndRespond500(c, err, "Failed to update role", "Failed to update role")
		return
	}
	message := "User role updated successfully"
	if req.RoleName == "" {
		message = "User role removed successfully"
	}
	c.JSON(http.StatusOK, models.UpdateUserRoleResponse{
		Message: message, UserName: req.UserName, RoleName: req.RoleName,
	})
}

// GetUserSettings returns settings (user-level and profile-level) for the specified user.
// @Summary      Get user settings
// @Description  Returns user-level setting names and profile-level settings (name->value) for the specified ClickHouse user
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        user_name  query     string  true   "ClickHouse user name"
// @Param        node       query     string  false  "ClickHouse node hostname"
// @Success      200        {object}  models.UserSettingsResponse
// @Failure      400        {object}  models.ErrorResponse
// @Failure      404        {object}  models.ErrorResponse
// @Failure      500        {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/settings [get]
func (h *UsersHandler) GetUserSettings(c *gin.Context) {
	userName := strings.TrimSpace(c.Query("user_name"))
	nodeName := strings.TrimSpace(c.Query("node"))
	if userName == "" {
		h.respondBadRequest(c, "user_name parameter is required")
		return
	}
	if h.settingsRepo == nil {
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: "Service error", Message: "settings repository not available"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	userSettings, profileSettings, err := h.settingsRepo.GetUserSettings(ctx, nodeName, userName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get user settings: %v", err)
		}
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{Error: "User not found", Message: err.Error()})
			return
		}
		h.logAndRespond500(c, err, "Failed to get user settings", "Failed to load user settings")
		return
	}
	if userSettings == nil {
		userSettings = map[string]string{}
	}
	if profileSettings == nil {
		profileSettings = map[string]string{}
	}
	c.JSON(http.StatusOK, models.UserSettingsResponse{
		UserName: userName, UserSettings: userSettings, ProfileSettings: profileSettings,
	})
}

// UpdateUserAccessScopes replaces all access scopes for a user (revoke all, then grant the provided scopes).
// User must not be defined in users.xml (same as other user update endpoints).
// @Summary      Update user access scopes
// @Description  Replaces all access scopes for the user: revokes all grants, then grants the provided list. User must not be in users.xml. Body format matches GET /clickhouse/access-scope response.
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Param        body  body      models.UpdateAccessScopeRequest  true  "user_name and access_scopes"
// @Success      200   {object}  models.AccessScopeListResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/access-scope [put]
func (h *UsersHandler) UpdateUserAccessScopes(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	var req models.UpdateAccessScopeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, "invalid JSON body: "+err.Error())
		return
	}
	userName := strings.TrimSpace(req.UserName)
	if userName == "" {
		h.respondBadRequest(c, "user_name is required")
		return
	}
	if req.AccessScopes == nil {
		req.AccessScopes = []models.AccessScope{}
	}
	if h.accessScopeRepo == nil {
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: "Service error", Message: "access scope repository not available"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, userName, "access scope update", "Cannot update access scopes"); ok {
		return
	}
	if err := h.accessScopeRepo.UpdateUserAccessScopes(ctx, nodeName, userName, req.AccessScopes); err != nil {
		h.logAndRespond500(c, err, "Failed to update user access scopes", "Failed to update access scopes")
		return
	}
	accessScopes, err := h.accessScopeRepo.GetUserAccessScopes(ctx, nodeName, userName)
	if err != nil {
		h.logAndRespond500(c, err, "Failed to get user access scopes after update", "Failed to load access scopes after update")
		return
	}
	if accessScopes == nil {
		accessScopes = []models.AccessScope{}
	}
	c.JSON(http.StatusOK, models.AccessScopeListResponse{AccessScopes: accessScopes})
}

// UpdateUserSettings replaces all user-level settings: drops all, then adds the ones from the request body.
// User must not be defined in users.xml.
// @Summary      Update user settings
// @Description  Replaces all user-level settings: drops all, then adds the provided list. User must not be in users.xml.
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Param        body  body      models.UpdateUserSettingsRequest  true  "user_name and settings (name/value list)"
// @Success      200   {object}  models.UserSettingsResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/settings [put]
func (h *UsersHandler) UpdateUserSettings(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	var req models.UpdateUserSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondBadRequest(c, "invalid JSON body: "+err.Error())
		return
	}
	userName := strings.TrimSpace(req.UserName)
	if userName == "" {
		h.respondBadRequest(c, "user_name is required")
		return
	}
	if req.Settings == nil {
		req.Settings = []models.UserSettingItem{}
	}
	if h.settingsRepo == nil {
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{Error: "Service error", Message: "settings repository not available"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()
	if _, ok := h.getUserDetailsWithReject(c, ctx, nodeName, userName, "settings update", "Cannot update settings"); ok {
		return
	}

	pairs := make([]repository.UserSettingPair, 0, len(req.Settings))
	for _, s := range req.Settings {
		pairs = append(pairs, repository.UserSettingPair{Name: strings.TrimSpace(s.Name), Value: s.Value})
	}
	_, profileSettings, err := h.settingsRepo.GetUserSettings(ctx, nodeName, userName)
	if err != nil {
		h.logAndRespond500(c, err, "Failed to get current settings for profile check", "Failed to load settings")
		return
	}
	if profileSettings == nil {
		profileSettings = map[string]string{}
	}
	var pairsToApply []repository.UserSettingPair
	for _, p := range pairs {
		if profileValue, isProfile := profileSettings[p.Name]; isProfile {
			if p.Value != profileValue {
				c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
					Error:   "Changing profile_settings is not allowed",
					Message: "Setting \"" + p.Name + "\" is defined by the user's profile. Only user-level settings can be changed or removed.",
				})
				return
			}
			continue
		}
		pairsToApply = append(pairsToApply, p)
	}

	typeBySetting := make(map[string]string)
	if available, err := h.settingsRepo.GetAllAvailableSettings(ctx, nodeName); err == nil {
		for _, row := range available {
			typeBySetting[row.Name] = row.Type
		}
	}
	if err := validators.ValidateUserSettingsInput(pairsToApply, typeBySetting); err != nil {
		var valErr *validators.ValidationError
		if errors.As(err, &valErr) {
			h.respondBadRequest(c, valErr.Message)
			return
		}
		h.respondBadRequest(c, err.Error())
		return
	}

	if err := h.settingsRepo.UpdateUserSettings(ctx, nodeName, userName, pairsToApply); err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to update user settings: %v", err)
		}
		if resp, ok := validators.ParseClickHouseSettingsError(err); ok {
			c.JSON(http.StatusBadRequest, *resp)
			return
		}
		h.logAndRespond500(c, err, "Failed to update user settings", "Failed to update settings")
		return
	}

	// Build user_settings from applied pairs (source of truth for what was just set).
	userSettings := make(map[string]string, len(pairsToApply))
	for _, p := range pairsToApply {
		userSettings[p.Name] = p.Value
	}
	// Refresh profile_settings from DB after update; if empty, use user_settings so response is consistent.
	_, profileSettingsFromDB, err := h.settingsRepo.GetUserSettings(ctx, nodeName, userName)
	if err == nil && profileSettingsFromDB != nil && len(profileSettingsFromDB) > 0 {
		profileSettings = profileSettingsFromDB
	} else {
		profileSettings = make(map[string]string, len(userSettings))
		for k, v := range userSettings {
			profileSettings[k] = v
		}
	}
	if profileSettings == nil {
		profileSettings = map[string]string{}
	}
	c.JSON(http.StatusOK, models.UserSettingsResponse{
		UserName: userName, UserSettings: userSettings, ProfileSettings: profileSettings,
	})
}
