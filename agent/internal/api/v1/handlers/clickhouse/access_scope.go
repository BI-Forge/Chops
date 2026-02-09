package clickhouse

import (
	"context"
	"net/http"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const accessScopeQueryTimeout = 5 * time.Second

// AccessScopeRepository defines the subset of repository methods required by the handler.
type AccessScopeRepository interface {
	GetUserAccessScopes(ctx context.Context, nodeName, userName string) ([]models.AccessScope, error)
}

// AccessScopeHandler handles ClickHouse access scope endpoints.
type AccessScopeHandler struct {
	repo   AccessScopeRepository
	logger *logger.Logger
}

// NewAccessScopeHandler creates a production access scope handler.
func NewAccessScopeHandler(log *logger.Logger, cfg *config.Config) (*AccessScopeHandler, error) {
	repo, err := repository.NewAccessScopeRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &AccessScopeHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewAccessScopeHandlerWithRepository creates an access scope handler using a custom repository (testing helper).
func NewAccessScopeHandlerWithRepository(repo AccessScopeRepository, log *logger.Logger) *AccessScopeHandler {
	return &AccessScopeHandler{
		repo:   repo,
		logger: log,
	}
}

// GetUserAccessScopes returns list of access scopes for a specific user.
// @Summary      Get user access scopes
// @Description  Returns list of access scopes (database, table, column with permissions) for the specified user
// @Tags         access_scope
// @Security   BearerAuth
// @Produce      json
// @Param        user_name  query     string  true   "ClickHouse user name"
// @Param        node       query     string  false  "ClickHouse node hostname"
// @Success      200        {object}  models.AccessScopeListResponse
// @Failure      400        {object}  models.ErrorResponse
// @Failure      500        {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/access-scope [get]
func (h *AccessScopeHandler) GetUserAccessScopes(c *gin.Context) {
	userName := strings.TrimSpace(c.Query("user_name"))
	nodeName := strings.TrimSpace(c.Query("node"))

	if userName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "user_name parameter is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), accessScopeQueryTimeout)
	defer cancel()

	accessScopes, err := h.repo.GetUserAccessScopes(ctx, nodeName, userName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get user access scopes: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load access scopes",
			Message: err.Error(),
		})
		return
	}

	// Ensure AccessScopes is never nil
	if accessScopes == nil {
		accessScopes = []models.AccessScope{}
	}

	response := models.AccessScopeListResponse{
		AccessScopes: accessScopes,
	}

	c.JSON(http.StatusOK, response)
}
