package middleware

import (
	"net/http"
	"strconv"

	"clickhouse-ops/internal/db/repository"

	"github.com/gin-gonic/gin"
)

const ctxKeyUserPermissionSet = "user_permission_set"

// LoadUserPermissions loads the caller's permission codes (via their role) into the Gin context.
func LoadUserPermissions(rbac *repository.RBACRepository) gin.HandlerFunc {
	if rbac == nil {
		return func(c *gin.Context) {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Authorization store is not configured",
			})
			c.Abort()
		}
	}

	return func(c *gin.Context) {
		userIDStr, ok := c.Get("user_id")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		userID, err := strconv.Atoi(userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user id"})
			c.Abort()
			return
		}

		names, err := rbac.ListPermissionNamesForUser(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to resolve permissions",
				"message": err.Error(),
			})
			c.Abort()
			return
		}

		set := make(map[string]struct{}, len(names))
		for _, n := range names {
			set[n] = struct{}{}
		}
		c.Set(ctxKeyUserPermissionSet, set)
		c.Next()
	}
}

// RequirePermission aborts with 403 unless the loaded permission set contains code.
func RequirePermission(code string) gin.HandlerFunc {
	return func(c *gin.Context) {
		v, ok := c.Get(ctxKeyUserPermissionSet)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "Permissions were not loaded for this request",
			})
			c.Abort()
			return
		}

		set, ok := v.(map[string]struct{})
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid permission context"})
			c.Abort()
			return
		}

		if _, allowed := set[code]; !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "Missing required permission: " + code,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
