package system

import (
	"net/http"
	"strconv"
	"strings"

	"clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/db/repository"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

// RBACAdminHandler exposes HTTP endpoints for system roles and permissions.
type RBACAdminHandler struct {
	rbac *repository.RBACRepository
	log  *logger.Logger
}

// NewRBACAdminHandler builds an RBAC admin handler.
func NewRBACAdminHandler(rbac *repository.RBACRepository, log *logger.Logger) *RBACAdminHandler {
	if rbac == nil || log == nil {
		return nil
	}
	return &RBACAdminHandler{rbac: rbac, log: log}
}

// CreateRole handles POST /system/roles.
func (h *RBACAdminHandler) CreateRole(c *gin.Context) {
	var req system.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: err.Error()})
		return
	}

	role, err := h.rbac.CreateRole(req.Name, req.Description)
	if err != nil {
		if isPostgresUniqueViolation(err) {
			c.JSON(http.StatusConflict, system.ErrorResponse{Error: "Conflict", Message: "Role name already exists"})
			return
		}
		h.log.Errorf("CreateRole: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to create role"})
		return
	}

	c.JSON(http.StatusCreated, system.RoleResponse{
		ID:          role.ID,
		Name:        role.Name,
		Description: role.Description,
	})
}

// SetRolePermissions handles PUT /system/roles/:id/permissions.
func (h *RBACAdminHandler) SetRolePermissions(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil || roleID < 1 {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: "Invalid role id"})
		return
	}

	var req system.SetRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: err.Error()})
		return
	}

	if err := h.rbac.SetRolePermissions(roleID, uniqueIntSlice(req.PermissionIDs)); err != nil {
		switch err.Error() {
		case "role not found":
			c.JSON(http.StatusNotFound, system.ErrorResponse{Error: "Not found", Message: err.Error()})
			return
		case "one or more permission ids are invalid":
			c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Bad request", Message: err.Error()})
			return
		}
		h.log.Errorf("SetRolePermissions: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to update role permissions"})
		return
	}

	c.Status(http.StatusNoContent)
}

// AssignUserRole handles PUT /system/users/:id/role.
func (h *RBACAdminHandler) AssignUserRole(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil || userID < 1 {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: "Invalid user id"})
		return
	}

	var req system.AssignUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: err.Error()})
		return
	}

	if err := h.rbac.AssignUserRole(userID, req.RoleID); err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, system.ErrorResponse{Error: "Not found", Message: err.Error()})
			return
		case "role not found":
			c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Bad request", Message: err.Error()})
			return
		}
		h.log.Errorf("AssignUserRole: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to assign role"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ListRoles handles GET /system/roles.
func (h *RBACAdminHandler) ListRoles(c *gin.Context) {
	roles, err := h.rbac.ListRoles()
	if err != nil {
		h.log.Errorf("ListRoles: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to list roles"})
		return
	}

	out := make([]system.RoleResponse, 0, len(roles))
	for _, r := range roles {
		out = append(out, system.RoleResponse{ID: r.ID, Name: r.Name, Description: r.Description})
	}
	c.JSON(http.StatusOK, out)
}

// GetRole handles GET /system/roles/:id.
func (h *RBACAdminHandler) GetRole(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil || roleID < 1 {
		c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: "Invalid role id"})
		return
	}

	role, err := h.rbac.GetRoleByID(roleID)
	if err != nil {
		if err.Error() == "role not found" {
			c.JSON(http.StatusNotFound, system.ErrorResponse{Error: "Not found", Message: err.Error()})
			return
		}
		h.log.Errorf("GetRole: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to load role"})
		return
	}

	perms := make([]system.PermissionSummary, 0, len(role.Permissions))
	for _, p := range role.Permissions {
		perms = append(perms, system.PermissionSummary{ID: p.ID, Name: p.Name, Description: p.Description})
	}

	c.JSON(http.StatusOK, system.RoleDetailResponse{
		ID:          role.ID,
		Name:        role.Name,
		Description: role.Description,
		Permissions: perms,
	})
}

// ListPermissions handles GET /system/permissions with optional ?role_id=.
func (h *RBACAdminHandler) ListPermissions(c *gin.Context) {
	var roleID *int
	if raw := c.Query("role_id"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < 1 {
			c.JSON(http.StatusBadRequest, system.ErrorResponse{Error: "Invalid request", Message: "Invalid role_id"})
			return
		}
		roleID = &v
	}

	list, err := h.rbac.ListPermissions(roleID)
	if err != nil {
		h.log.Errorf("ListPermissions: %v", err)
		c.JSON(http.StatusInternalServerError, system.ErrorResponse{Error: "Internal server error", Message: "Failed to list permissions"})
		return
	}

	out := make([]system.PermissionSummary, 0, len(list))
	for _, p := range list {
		out = append(out, system.PermissionSummary{ID: p.ID, Name: p.Name, Description: p.Description})
	}
	c.JSON(http.StatusOK, out)
}

func isPostgresUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint")
}

func uniqueIntSlice(ids []int) []int {
	if len(ids) == 0 {
		return ids
	}
	seen := make(map[int]struct{}, len(ids))
	out := make([]int, 0, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
