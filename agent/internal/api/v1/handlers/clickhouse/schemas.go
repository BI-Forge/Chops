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

const schemasQueryTimeout = 5 * time.Second

// SchemasRepository defines the subset of repository methods required by the handler.
type SchemasRepository interface {
	GetSchemas(ctx context.Context, nodeName, nameFilter string) ([]string, error)
}

// SchemasHandler handles ClickHouse schemas (databases) endpoints.
type SchemasHandler struct {
	repo   SchemasRepository
	logger *logger.Logger
}

// NewSchemasHandler creates a production schemas handler.
func NewSchemasHandler(log *logger.Logger, cfg *config.Config) (*SchemasHandler, error) {
	repo, err := repository.NewSchemasRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &SchemasHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewSchemasHandlerWithRepository creates a schemas handler using a custom repository (testing helper).
func NewSchemasHandlerWithRepository(repo SchemasRepository, log *logger.Logger) *SchemasHandler {
	return &SchemasHandler{
		repo:   repo,
		logger: log,
	}
}

// GetSchemasList returns a list of available ClickHouse databases (schemas).
// @Summary      Get ClickHouse schemas list
// @Description  Returns a list of available ClickHouse databases (schemas) from the specified node with optional name filtering
// @Tags         schemas
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Param        name  query     string  false  "Filter schemas by name (case-insensitive partial match)"
// @Success      200   {object}  models.SchemasListResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/schemas/list [get]
func (h *SchemasHandler) GetSchemasList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	nameFilter := strings.TrimSpace(c.Query("name"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), schemasQueryTimeout)
	defer cancel()

	schemas, err := h.repo.GetSchemas(ctx, nodeName, nameFilter)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get schemas list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load schemas list",
			Message: err.Error(),
		})
		return
	}

	response := models.SchemasListResponse{
		Schemas: schemas,
	}

	c.JSON(http.StatusOK, response)
}

