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

const settingsQueryTimeout = 5 * time.Second

// SettingsRepository defines the subset of repository methods required by the handler.
// GetUserSettings is used by UsersHandler in users.go.
type SettingsRepository interface {
	GetAllAvailableSettings(ctx context.Context, nodeName string) ([]repository.AvailableSettingRow, error)
}

// SettingsHandler handles the "get available settings list" endpoint only.
// Get user settings and update user settings are handled by UsersHandler in users.go.
type SettingsHandler struct {
	repo   SettingsRepository
	logger *logger.Logger
}

// NewSettingsHandler creates a production settings handler.
func NewSettingsHandler(log *logger.Logger, cfg *config.Config) (*SettingsHandler, error) {
	repo, err := repository.NewSettingsRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &SettingsHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewSettingsHandlerWithRepository creates a settings handler using a custom repository (testing helper).
func NewSettingsHandlerWithRepository(repo SettingsRepository, log *logger.Logger) *SettingsHandler {
	return &SettingsHandler{
		repo:   repo,
		logger: log,
	}
}

// GetAvailableSettings returns all session settings that can be assigned to a user (from system.settings).
// @Summary      Get available user settings
// @Description  Returns all ClickHouse session settings that can be assigned to users/roles (from system.settings, excluding obsolete)
// @Tags         settings
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.AvailableSettingsResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/settings/available [get]
func (h *SettingsHandler) GetAvailableSettings(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), settingsQueryTimeout)
	defer cancel()

	rows, err := h.repo.GetAllAvailableSettings(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get available settings: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load available settings",
			Message: err.Error(),
		})
		return
	}

	settings := make([]models.AvailableSetting, 0, len(rows))
	for _, row := range rows {
		minVal := ""
		if row.Min.Valid {
			minVal = row.Min.String
		}
		maxVal := ""
		if row.Max.Valid {
			maxVal = row.Max.String
		}
		settings = append(settings, models.AvailableSetting{
			Name:        row.Name,
			Type:        row.Type,
			Default:     row.Default,
			Description: row.Description,
			Min:         minVal,
			Max:         maxVal,
		})
	}

	c.JSON(http.StatusOK, models.AvailableSettingsResponse{
		Settings: settings,
	})
}
