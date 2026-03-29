package clickhouse

import (
	"context"
	"net/http"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const rolesQueryTimeout = 5 * time.Second

// RolesRepository defines the subset of repository methods required by the handler.
type RolesRepository interface {
	GetRoles(ctx context.Context, nodeName string) ([]string, error)
}

// RolesHandler handles ClickHouse roles endpoints.
type RolesHandler struct {
	repo   RolesRepository
	logger *logger.Logger
}

// NewRolesHandler creates a production roles handler.
func NewRolesHandler(log *logger.Logger, cfg *config.Config) (*RolesHandler, error) {
	repo, err := repository.NewRolesRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &RolesHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewRolesHandlerWithRepository creates a roles handler using a custom repository (testing helper).
func NewRolesHandlerWithRepository(repo RolesRepository, log *logger.Logger) *RolesHandler {
	return &RolesHandler{
		repo:   repo,
		logger: log,
	}
}

// GetRolesList returns list of available ClickHouse roles.
// @Summary      Get ClickHouse roles list
// @Description  Returns list of available ClickHouse roles from the specified node
// @Tags         roles
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.RolesListResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/roles/list [get]
func (h *RolesHandler) GetRolesList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), rolesQueryTimeout)
	defer cancel()

	roles, err := h.repo.GetRoles(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get roles list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load roles list",
			Message: err.Error(),
		})
		return
	}

	response := models.RolesListResponse{
		Roles: roles,
	}

	c.JSON(http.StatusOK, response)
}
