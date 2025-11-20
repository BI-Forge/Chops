package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const (
	defaultQueryLogLimit = 50
	maxQueryLogLimit     = 500
	queryLogTimeout      = 10 * time.Second
	defaultRangePreset   = "1m"
	isoNoTZLayout        = "2006-01-02 15:04:05"
	isoNoTZCompactLayout = "2006-01-02T15:04:05"
)

var presetDurations = map[string]time.Duration{
	"10s": 10 * time.Second,
	"30s": 30 * time.Second,
	"1m":  time.Minute,
	"5m":  5 * time.Minute,
	"15m": 15 * time.Minute,
}

var acceptedTimeFormats = []string{
	time.RFC3339,
	isoNoTZLayout,
	isoNoTZCompactLayout,
}

// QueryLogRepository defines the subset of repository methods required by the handler.
type QueryLogRepository interface {
	List(ctx context.Context, filter repository.QueryLogFilter) ([]models.QueryLogEntry, int64, error)
}

// QueryLogHandler handles ClickHouse query log endpoints.
type QueryLogHandler struct {
	repo   QueryLogRepository
	logger *logger.Logger
}

// NewQueryLogHandler creates a production query log handler.
func NewQueryLogHandler(log *logger.Logger, cfg *config.Config) (*QueryLogHandler, error) {
	repo, err := repository.NewQueryLogRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &QueryLogHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewQueryLogHandlerWithRepository creates a query log handler using a custom repository (testing helper).
func NewQueryLogHandlerWithRepository(log *logger.Logger, repo QueryLogRepository) *QueryLogHandler {
	return &QueryLogHandler{
		repo:   repo,
		logger: log,
	}
}

// ListQueryLog returns filtered ClickHouse query log entries.
// @Summary      List query log entries
// @Description  Returns ClickHouse system.query_log entries filtered by time range, user, and node
// @Tags         query-log
// @Security     BearerAuth
// @Produce      json
// @Param        last    query     string  false  "Relative window (10s|30s|1m|5m|15m)"
// @Param        from    query     string  false  "Start timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        to      query     string  false  "End timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        user    query     string  false  "Initial or effective ClickHouse user"
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        limit   query     int     false  "Items per page (max 500)"
// @Param        offset  query     int     false  "Offset for pagination"
// @Success      200     {object}  models.QueryLogResponse
// @Failure      400     {object}  models.ErrorResponse
// @Failure      500     {object}  models.ErrorResponse
// @Router       /api/v1/query-log [get]
func (h *QueryLogHandler) ListQueryLog(c *gin.Context) {
	filter, err := h.parseFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid filter",
			Message: err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), queryLogTimeout)
	defer cancel()

	entries, total, err := h.repo.List(ctx, filter)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to list query logs: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load query logs",
			Message: "ClickHouse query failed",
		})
		return
	}

	response := models.QueryLogResponse{
		Items: entries,
		Pagination: models.QueryLogPagination{
			Limit:  filter.Limit,
			Offset: filter.Offset,
			Total:  total,
			Range: models.QueryLogRange{
				From:   filter.From.Format(time.RFC3339),
				To:     filter.To.Format(time.RFC3339),
				Preset: filter.RangePreset,
			},
		},
	}

	c.JSON(http.StatusOK, response)
}

func (h *QueryLogHandler) parseFilter(c *gin.Context) (repository.QueryLogFilter, error) {
	user := strings.TrimSpace(c.Query("user"))
	node := strings.TrimSpace(c.Query("node"))

	limit := defaultQueryLogLimit
	if limitParam := strings.TrimSpace(c.Query("limit")); limitParam != "" {
		value, err := strconv.Atoi(limitParam)
		if err != nil || value <= 0 {
			return repository.QueryLogFilter{}, fmt.Errorf("limit must be a positive integer")
		}
		if value > maxQueryLogLimit {
			value = maxQueryLogLimit
		}
		limit = value
	}

	offset := 0
	if offsetParam := strings.TrimSpace(c.Query("offset")); offsetParam != "" {
		value, err := strconv.Atoi(offsetParam)
		if err != nil || value < 0 {
			return repository.QueryLogFilter{}, fmt.Errorf("offset must be a non-negative integer")
		}
		offset = value
	}

	from, to, preset, err := parseTimeRange(c.Query("last"), c.Query("from"), c.Query("to"))
	if err != nil {
		return repository.QueryLogFilter{}, err
	}

	return repository.QueryLogFilter{
		From:        from,
		To:          to,
		User:        user,
		Node:        node,
		Limit:       limit,
		Offset:      offset,
		RangePreset: preset,
	}, nil
}

func parseTimeRange(lastParam, fromParam, toParam string) (time.Time, time.Time, string, error) {
	now := time.Now().UTC().Truncate(time.Second)
	lastParam = strings.TrimSpace(lastParam)

	if lastParam != "" {
		duration, ok := presetDurations[lastParam]
		if !ok {
			return time.Time{}, time.Time{}, "", fmt.Errorf("unsupported last value: %s", lastParam)
		}
		return now.Add(-duration), now, lastParam, nil
	}

	var (
		from time.Time
		to   time.Time
		err  error
	)

	fromParam = strings.TrimSpace(fromParam)
	if fromParam != "" {
		from, err = parseTimestamp(fromParam)
		if err != nil {
			return time.Time{}, time.Time{}, "", fmt.Errorf("invalid from timestamp: %w", err)
		}
		from = from.UTC().Truncate(time.Second)
	}

	toParam = strings.TrimSpace(toParam)
	if toParam != "" {
		to, err = parseTimestamp(toParam)
		if err != nil {
			return time.Time{}, time.Time{}, "", fmt.Errorf("invalid to timestamp: %w", err)
		}
		to = to.UTC().Truncate(time.Second)
	} else {
		to = now
	}

	preset := ""
	if from.IsZero() {
		duration := presetDurations[defaultRangePreset]
		from = to.Add(-duration)
		preset = defaultRangePreset
	}

	if to.Before(from) {
		return time.Time{}, time.Time{}, "", fmt.Errorf("from must be before to")
	}

	return from, to, preset, nil
}

func parseTimestamp(value string) (time.Time, error) {
	for _, layout := range acceptedTimeFormats {
		if ts, err := time.Parse(layout, value); err == nil {
			return ts, nil
		}
	}
	return time.Time{}, fmt.Errorf("expected RFC3339 or %s format", isoNoTZLayout)
}
