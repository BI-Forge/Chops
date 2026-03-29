package clickhouse

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const (
	tablesQueryTimeout = 5 * time.Second
	defaultTablesLimit = 50
	maxTablesLimit     = 500
)

// TablesRepository defines the subset of repository methods required by the handler.
type TablesRepository interface {
	GetTables(ctx context.Context, nodeName, nameFilter, schemaFilter, engineFilter, sortBy string, sortDesc bool, limit, offset int) ([]chmodels.TableList, int, error)
	GetTableDetails(ctx context.Context, nodeName, tableUUID string) (*chmodels.TableDetails, error)
	DropTableByUUID(ctx context.Context, nodeName, tableUUID string) error
	CopyTableByUUID(ctx context.Context, nodeName, tableUUID, newTableName string) (*chmodels.TableCopyResult, error)
	GetTablesTotals(ctx context.Context, nodeName string) (chmodels.TablesTotals, error)
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

// formatBytes returns human-readable size (KB, MB, GB).
func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// parseLimitOffset returns limit and offset from query params with defaults and bounds.
func parseLimitOffset(c *gin.Context) (limit, offset int) {
	limit = defaultTablesLimit
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
			if limit > maxTablesLimit {
				limit = maxTablesLimit
			}
		}
	}
	offset = 0
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return limit, offset
}

// GetTablesList returns a paginated list of available ClickHouse tables with metadata.
// @Summary      Get ClickHouse tables list
// @Description  Returns tables from the specified node with optional name/schema filter, sort, limit and offset
// @Tags         tables
// @Security     BearerAuth
// @Produce      json
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        name    query     string  false  "Filter tables by name (case-insensitive partial match)"
// @Param        schema  query     string  false  "Filter tables by schema (database) name"
// @Param        engine  query     string  false  "Filter tables by engine (exact match, case-insensitive)"
// @Param        sort    query     string  false  "Sort by: name, engine, rows, parts, active, bytes (omit for database, then table name)"
// @Param        order   query     string  false  "asc or desc (default asc)"
// @Param        limit   query     int     false  "Max items (default 50, max 500)"
// @Param        offset  query     int     false  "Skip items for pagination"
// @Success      200     {object}  models.TablesListResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/list [get]
func (h *TablesHandler) GetTablesList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	nameFilter := strings.TrimSpace(c.Query("name"))
	schemaFilter := strings.TrimSpace(c.Query("schema"))
	engineFilter := strings.TrimSpace(c.Query("engine"))
	sortBy := strings.TrimSpace(c.Query("sort"))
	sortDesc := strings.EqualFold(strings.TrimSpace(c.Query("order")), "desc")
	limit, offset := parseLimitOffset(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	rows, total, err := h.repo.GetTables(ctx, nodeName, nameFilter, schemaFilter, engineFilter, sortBy, sortDesc, limit, offset)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get tables list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load tables list",
			Message: err.Error(),
		})
		return
	}

	tables := make([]models.TablesList, 0, len(rows))
	for _, row := range rows {
		tables = append(tables, models.TablesList{
			UUID:        row.UUID,
			Name:        row.Name,
			Database:    row.Database,
			Engine:      row.Engine,
			Rows:        row.Rows,
			Parts:       row.Parts,
			ActiveParts: row.ActiveParts,
			BytesHuman:  formatBytes(row.Bytes),
			SizeBytes:   row.Bytes,
		})
	}

	c.JSON(http.StatusOK, models.TablesListResponse{
		Tables: tables,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// GetTableDetails returns full metadata for a table by UUID.
// @Summary      Get table details by UUID
// @Description  Returns all system.tables columns plus parts and active_parts counts from system.parts
// @Tags         tables
// @Security     BearerAuth
// @Produce      json
// @Param        uuid    path      string  true   "Table UUID"
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Success      200     {object}  chmodels.TableDetails
// @Failure      404     {object}  models.ErrorResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/details/{uuid} [get]
func (h *TablesHandler) GetTableDetails(c *gin.Context) {
	tableUUID := strings.TrimSpace(c.Param("uuid"))
	if tableUUID == "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "Table UUID is required",
		})
		return
	}

	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	details, err := h.repo.GetTableDetails(ctx, nodeName, tableUUID)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get table details: %v", err)
		}
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{
				Error:   "Not found",
				Message: "Table not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load table details",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, details)
}

// DeleteTableByUUID drops a table identified by its UUID (DROP TABLE).
// @Summary      Drop table by UUID
// @Description  Resolves database and name from system.tables and executes DROP TABLE
// @Tags         tables
// @Security     BearerAuth
// @Param        uuid    path      string  true   "Table UUID"
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Success      204     "Table dropped"
// @Failure      404     {object}  models.ErrorResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/{uuid} [delete]
func (h *TablesHandler) DeleteTableByUUID(c *gin.Context) {
	tableUUID := strings.TrimSpace(c.Param("uuid"))
	if tableUUID == "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "Table UUID is required",
		})
		return
	}

	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	if err := h.repo.DropTableByUUID(ctx, nodeName, tableUUID); err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to drop table: %v", err)
		}
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{
				Error:   "Not found",
				Message: "Table not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to drop table",
			Message: err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// CopyTableByUUID creates a new table from source DDL (system.tables.create_table_query) with a new name.
// @Summary      Copy table by UUID
// @Description  Reads DDL from system.tables, substitutes the new table name in the same database, runs CREATE
// @Tags         tables
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        uuid    path      string                   true  "Source table UUID"
// @Param        node    query     string                   false "ClickHouse node hostname"
// @Param        body    body      models.TableCopyRequest  true  "New table name"
// @Success      201     {object}  chmodels.TableCopyResult
// @Failure      400     {object}  models.ErrorResponse
// @Failure      404     {object}  models.ErrorResponse
// @Failure      409     {object}  models.ErrorResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/{uuid}/copy [post]
func (h *TablesHandler) CopyTableByUUID(c *gin.Context) {
	tableUUID := strings.TrimSpace(c.Param("uuid"))
	if tableUUID == "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "Table UUID is required",
		})
		return
	}

	var req models.TableCopyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "JSON body with \"name\" (new table name) is required",
		})
		return
	}

	newName := strings.TrimSpace(req.Name)
	if newName == "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "New table name must not be empty",
		})
		return
	}

	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	result, err := h.repo.CopyTableByUUID(ctx, nodeName, tableUUID, newName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to copy table: %v", err)
		}
		msg := err.Error()
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{
				Error:   "Not found",
				Message: "Table not found",
			})
			return
		}
		if strings.Contains(msg, "invalid") || strings.Contains(msg, "must differ") ||
			strings.Contains(msg, "required") || strings.Contains(msg, "too long") {
			c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
				Error:   "Bad request",
				Message: msg,
			})
			return
		}
		if strings.Contains(strings.ToLower(msg), "already exists") {
			c.JSON(http.StatusConflict, apiSystemModels.ErrorResponse{
				Error:   "Conflict",
				Message: msg,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to copy table",
			Message: msg,
		})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// GetTablesStats returns aggregated counters across all ClickHouse tables.
// @Summary      Get tables statistics
// @Description  Returns total tables, total rows, total size (human-readable) and total parts for all ClickHouse tables.
// @Tags         tables
// @Security     BearerAuth
// @Produce      json
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Success      200     {object}  models.TablesSummaryResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/tables/stats [get]
func (h *TablesHandler) GetTablesStats(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), tablesQueryTimeout)
	defer cancel()

	totals, err := h.repo.GetTablesTotals(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get tables stats: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load tables statistics",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.TablesSummaryResponse{
		TotalTables: totals.TotalTables,
		TotalRows:   totals.TotalRows,
		TotalSize:   formatBytes(totals.TotalBytes),
		TotalParts:  totals.TotalParts,
	})
}
