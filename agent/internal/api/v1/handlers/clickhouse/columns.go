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

const columnsQueryTimeout = 5 * time.Second

// ColumnsRepository defines the subset of repository methods required by the handler.
type ColumnsRepository interface {
	GetColumns(ctx context.Context, nodeName, nameFilter, tableFilter, schemaFilter string) ([]string, error)
}

// ColumnsHandler handles ClickHouse columns endpoints.
type ColumnsHandler struct {
	repo   ColumnsRepository
	logger *logger.Logger
}

// NewColumnsHandler creates a production columns handler.
func NewColumnsHandler(log *logger.Logger, cfg *config.Config) (*ColumnsHandler, error) {
	repo, err := repository.NewColumnsRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &ColumnsHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewColumnsHandlerWithRepository creates a columns handler using a custom repository (testing helper).
func NewColumnsHandlerWithRepository(repo ColumnsRepository, log *logger.Logger) *ColumnsHandler {
	return &ColumnsHandler{
		repo:   repo,
		logger: log,
	}
}

// GetColumnsList returns a list of available ClickHouse columns.
// @Summary      Get ClickHouse columns list
// @Description  Returns a list of available ClickHouse columns from the specified node with optional name, table, and schema filtering. Schema is required when table filter is provided.
// @Tags         columns
// @Security     BearerAuth
// @Produce      json
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        name    query     string  false  "Filter columns by name (case-insensitive partial match)"
// @Param        table   query     string  false  "Filter columns by table name (requires schema parameter)"
// @Param        schema  query     string  false  "Filter columns by schema (database) name (required when table is provided)"
// @Success      200     {object}  models.ColumnsListResponse
// @Failure      400     {object}  models.ErrorResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/columns/list [get]
func (h *ColumnsHandler) GetColumnsList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	nameFilter := strings.TrimSpace(c.Query("name"))
	tableFilter := strings.TrimSpace(c.Query("table"))
	schemaFilter := strings.TrimSpace(c.Query("schema"))

	// Validate: if table is provided, schema must also be provided
	if tableFilter != "" && schemaFilter == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "Schema parameter is required when table parameter is provided",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), columnsQueryTimeout)
	defer cancel()

	columns, err := h.repo.GetColumns(ctx, nodeName, nameFilter, tableFilter, schemaFilter)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get columns list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load columns list",
			Message: err.Error(),
		})
		return
	}

	response := models.ColumnsListResponse{
		Columns: columns,
	}

	c.JSON(http.StatusOK, response)
}

