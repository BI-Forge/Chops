package clickhouse

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const (
	defaultBackupLimit = 10
	maxBackupLimit     = 1000
	backupQueryTimeout = 10 * time.Second
)

// BackupRepository defines the subset of repository methods required by the handler
type BackupRepository interface {
	GetStats(ctx context.Context, node string) (models.BackupStatsResponse, error)
	GetInProgress(ctx context.Context, node string) ([]chmodels.Backup, error)
	GetCompleted(ctx context.Context, node string, limit, offset int) ([]chmodels.Backup, uint64, error)
	GetByID(ctx context.Context, node, backupID string) (*chmodels.Backup, error)
}

// BackupHandler handles ClickHouse backup endpoints
type BackupHandler struct {
	repo   BackupRepository
	logger *logger.Logger
}

// NewBackupHandler creates a production backup handler
func NewBackupHandler(log *logger.Logger, cfg *config.Config) (*BackupHandler, error) {
	repo, err := repository.NewBackupRepository(cfg, log)
	if err != nil {
		return nil, err
	}

	return &BackupHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// GetStats returns backup count statistics
// GET /api/v1/backups/stats?node=node_name
func (h *BackupHandler) GetStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), backupQueryTimeout)
	defer cancel()

	node := c.Query("node")

	stats, err := h.repo.GetStats(ctx, node)
	if err != nil {
		h.logger.Errorf("Failed to get backup stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get backup statistics"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetInProgress returns list of backups in progress
// GET /api/v1/backups/in-progress?node=node_name
func (h *BackupHandler) GetInProgress(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), backupQueryTimeout)
	defer cancel()

	node := c.Query("node")

	backups, err := h.repo.GetInProgress(ctx, node)
	if err != nil {
		h.logger.Errorf("Failed to get in-progress backups: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get in-progress backups"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": backups})
}

// GetCompleted returns list of completed backups with pagination
// GET /api/v1/backups/completed?node=node_name&limit=10&offset=0
func (h *BackupHandler) GetCompleted(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), backupQueryTimeout)
	defer cancel()

	node := c.Query("node")

	// Parse limit
	limit := defaultBackupLimit
	if limitStr := c.Query("limit"); limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
			return
		}
		if parsedLimit > maxBackupLimit {
			parsedLimit = maxBackupLimit
		}
		limit = parsedLimit
	}

	// Parse offset
	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		parsedOffset, err := strconv.Atoi(offsetStr)
		if err != nil || parsedOffset < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offset parameter"})
			return
		}
		offset = parsedOffset
	}

	backups, total, err := h.repo.GetCompleted(ctx, node, limit, offset)
	if err != nil {
		h.logger.Errorf("Failed to get completed backups: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get completed backups"})
		return
	}

	response := models.BackupListResponse{
		Items: backups,
		Pagination: models.BackupPagination{
			Limit:  limit,
			Offset: offset,
			Total:  total,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetByID returns a single backup by ID
// GET /api/v1/backups/:id?node=node_name
func (h *BackupHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), backupQueryTimeout)
	defer cancel()

	backupID := c.Param("id")
	if backupID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Backup ID is required"})
		return
	}

	node := c.Query("node")

	backup, err := h.repo.GetByID(ctx, node, backupID)
	if err != nil {
		h.logger.Errorf("Failed to get backup by ID: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup not found"})
		return
	}

	c.JSON(http.StatusOK, backup)
}

