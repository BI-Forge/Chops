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

const profilesQueryTimeout = 5 * time.Second

// ProfilesRepository defines the subset of repository methods required by the handler.
type ProfilesRepository interface {
	GetProfiles(ctx context.Context, nodeName string) ([]string, error)
}

// ProfilesHandler handles ClickHouse profiles endpoints.
type ProfilesHandler struct {
	repo   ProfilesRepository
	logger *logger.Logger
}

// NewProfilesHandler creates a production profiles handler.
func NewProfilesHandler(log *logger.Logger, cfg *config.Config) (*ProfilesHandler, error) {
	repo, err := repository.NewProfilesRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &ProfilesHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewProfilesHandlerWithRepository creates a profiles handler using a custom repository (testing helper).
func NewProfilesHandlerWithRepository(repo ProfilesRepository, log *logger.Logger) *ProfilesHandler {
	return &ProfilesHandler{
		repo:   repo,
		logger: log,
	}
}

// GetProfilesList returns list of available ClickHouse profiles.
// @Summary      Get ClickHouse profiles list
// @Description  Returns list of available ClickHouse profiles from the specified node
// @Tags         profiles
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.ProfilesListResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/profiles/list [get]
func (h *ProfilesHandler) GetProfilesList(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), profilesQueryTimeout)
	defer cancel()

	profiles, err := h.repo.GetProfiles(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get profiles list: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load profiles list",
			Message: err.Error(),
		})
		return
	}

	response := models.ProfilesListResponse{
		Profiles: profiles,
	}

	c.JSON(http.StatusOK, response)
}

