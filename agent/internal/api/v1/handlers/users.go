package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const usersQueryTimeout = 5 * time.Second

// UsersRepository defines the subset of repository methods required by the handler.
type UsersRepository interface {
	GetUsers(ctx context.Context, nodeName string) ([]string, error)
}

// UsersHandler handles ClickHouse users endpoints.
type UsersHandler struct {
	repo   UsersRepository
	logger *logger.Logger
}

// NewUsersHandler creates a production users handler.
func NewUsersHandler(log *logger.Logger, cfg *config.Config) (*UsersHandler, error) {
	repo, err := repository.NewUsersRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &UsersHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewUsersHandlerWithRepository creates a users handler using a custom repository (testing helper).
func NewUsersHandlerWithRepository(log *logger.Logger, repo UsersRepository) *UsersHandler {
	return &UsersHandler{
		repo:   repo,
		logger: log,
	}
}

// GetUsers returns list of ClickHouse users from a specific node.
// @Summary      Get ClickHouse users
// @Description  Returns list of available ClickHouse users from the specified node
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.UsersResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/users [get]
func (h *UsersHandler) GetUsers(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), usersQueryTimeout)
	defer cancel()

	users, err := h.repo.GetUsers(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get users: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load users",
			Message: err.Error(),
		})
		return
	}

	response := models.UsersResponse{
		Users: users,
	}

	c.JSON(http.StatusOK, response)
}
