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

const tablesQueryTimeout = 5 * time.Second

// TablesRepository defines the subset of repository methods required by the handler.
type TablesRepository interface {
	GetTables(ctx context.Context, nodeName, nameFilter, schemaFilter string) ([]string, error)
}

// TablesHandler handles ClickHouse tables endpoints.
type TablesHandler struct {
	repo   TablesRepository
	logger *logger.Logger
}

// NewTablesHandler creates a production tables handler.
func NewTablesHandler(log *logger.Logger, cfg *config.Config) (*TablesHandler, error) {
	repo, err := repository.NewTablesRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &TablesHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewTablesHandlerWithRepository creates a tables handler using a custom repository (testing helper).
func NewTablesHandlerWithRepository(repo TablesRepository, log *logger.Logger) *TablesHandler {
	return &TablesHandler{
		repo:   repo,
		logger: log,
	}
}

// GetTablesList returns a list of available ClickHouse tables.
// @Summary      Get ClickHouse tables list
// @Description  Returns a list of available ClickHouse tables from the specified node with optional name and schema filtering
// @Tags         tables
// @Security     BearerAuth
// @Produce      json
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        name    query     string  false  "Filter tables by name (case-insensitive partial match)"
// @Param        schema  query     string  false  "Filter tables by schema (database) name"
// @Success      200     {object}  models.TablesListResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/list [get]
func (h *TablesHandler) GetTablesList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	nameFilter := strings.TrimSpace(c.Query("name"))
	schemaFilter := strings.TrimSpace(c.Query("schema"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	tables, err := h.repo.GetTables(ctx, nodeName, nameFilter, schemaFilter)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get tables list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load tables list",
			Message: err.Error(),
		})
		return
	}

	response := models.TablesListResponse{
		Tables: tables,
	}

	c.JSON(http.StatusOK, response)
}
