package handlers

import (
	"context"
	"net/http"
	"time"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/db"
	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check endpoints
type HealthHandler struct{}

// NewHealthHandler creates a new health handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Healthz handles health check request
// @Summary      Health check
// @Description  Check if the service is healthy
// @Tags         health
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Router       /healthz [get]
func (h *HealthHandler) Healthz(c *gin.Context) {
	health := gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
		"services":  gin.H{},
	}

	// Check PostgreSQL
	if dbManager := db.GetInstance(); dbManager != nil {
		if err := dbManager.GetDBManager().Ping(); err != nil {
			health["services"].(gin.H)["postgres"] = gin.H{"status": "error", "error": err.Error()}
		} else {
			health["services"].(gin.H)["postgres"] = gin.H{"status": "ok"}
		}
	}

	// Check ClickHouse
	if chManager := clickhouse.GetInstance(); chManager != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		if err := chManager.HealthCheck(ctx); err != nil {
			health["services"].(gin.H)["clickhouse"] = gin.H{"status": "error", "error": err.Error()}
		} else {
			health["services"].(gin.H)["clickhouse"] = gin.H{"status": "ok"}
		}
	}

	c.JSON(http.StatusOK, health)
}
