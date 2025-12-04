package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const (
	defaultQueryLogLimit  = 50
	maxQueryLogLimit      = 500
	queryLogTimeout       = 10 * time.Second
	defaultRangePreset    = "1m"
	isoNoTZLayout         = "2006-01-02 15:04:05"
	isoNoTZCompactLayout  = "2006-01-02T15:04:05"
	isoDateOnlyLayout     = "2006-01-02"
	isoTimeNoSecLayout    = "2006-01-02 15:04"
	isoCompactNoSecLayout = "2006-01-02T15:04"
)

var presetDurations = map[string]time.Duration{
	"10s": 10 * time.Second,
	"30s": 30 * time.Second,
	"1m":  time.Minute,
	"5m":  5 * time.Minute,
	"15m": 15 * time.Minute,
	"30m": 30 * time.Minute,
	"1h":  1 * time.Hour,
	"2h":  2 * time.Hour,
	"12h": 12 * time.Hour,
}

var acceptedTimeFormats = []string{
	time.RFC3339,
	time.RFC3339Nano,
	isoNoTZLayout,
	isoNoTZCompactLayout,
	isoTimeNoSecLayout,
	isoCompactNoSecLayout,
	isoDateOnlyLayout,
}

// QueryLogRepository defines the subset of repository methods required by the handler.
type QueryLogRepository interface {
	List(ctx context.Context, filter repository.QueryLogFilter) ([]models.QueryLogEntry, int64, error)
	GetStats(ctx context.Context, filter repository.QueryLogFilter) (models.QueryLogStatsResponse, error)
}

// QueryLogHandler handles ClickHouse query log endpoints.
type QueryLogHandler struct {
	repo           QueryLogRepository
	broadcaster    *stream.Broadcaster
	statsPublisher *stream.QueryLogStatsPublisher
	logger         *logger.Logger
}

// NewQueryLogHandler creates a production query log handler.
func NewQueryLogHandler(log *logger.Logger, cfg *config.Config) (*QueryLogHandler, error) {
	repo, err := repository.NewQueryLogRepository(cfg, log)
	if err != nil {
		return nil, err
	}

	broadcaster := stream.NewBroadcaster(log)

	// Parse poll interval from config
	pollInterval := 2 * time.Second
	if cfg != nil && cfg.Sync.ProcessesPollInterval != "" {
		parsed, err := time.ParseDuration(cfg.Sync.ProcessesPollInterval)
		if err == nil && parsed > 0 {
			pollInterval = parsed
		}
	}

	statsPublisher := stream.NewQueryLogStatsPublisher(repo, broadcaster, log, pollInterval)

	return &QueryLogHandler{
		repo:           repo,
		broadcaster:    broadcaster,
		statsPublisher: statsPublisher,
		logger:         log,
	}, nil
}

// Stop stops all publishers (useful for tests)
func (h *QueryLogHandler) Stop() {
	if h.statsPublisher != nil {
		h.statsPublisher.Stop()
	}
}

// NewQueryLogHandlerWithRepository creates a query log handler using a custom repository (testing helper).
func NewQueryLogHandlerWithRepository(log *logger.Logger, repo QueryLogRepository, broadcaster *stream.Broadcaster, publisher *stream.QueryLogStatsPublisher) *QueryLogHandler {
	return &QueryLogHandler{
		repo:           repo,
		broadcaster:    broadcaster,
		statsPublisher: publisher,
		logger:         log,
	}
}

// ListQueryLog returns filtered ClickHouse query log entries.
// @Summary      List query log entries
// @Description  Returns ClickHouse system.query_log entries filtered by time range, user, node, and search query
// @Tags         query-log
// @Security     BearerAuth
// @Produce      json
// @Param        last    query     string  false  "Relative window (10s|30s|1m|5m|15m)"
// @Param        from    query     string  false  "Start timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        to      query     string  false  "End timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        user    query     string  false  "Initial or effective ClickHouse user"
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        search  query     string  false  "Search query text (LIKE pattern in query column)"
// @Param        status  query     string  false  "Filter by status: 'completed' (exception_code = 0) or 'failed' (exception_code != 0)"
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

// GetQueryLogStats returns query count statistics by status (running, finished, error).
// @Summary      Get query log statistics
// @Description  Returns count of running, finished, and error queries filtered by time range, user, node, and search query
// @Tags         query-log
// @Security     BearerAuth
// @Produce      json
// @Param        last   query     string  false  "Relative window (10s|30s|1m|5m|15m)"
// @Param        from   query     string  false  "Start timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        to     query     string  false  "End timestamp (RFC3339 or 2006-01-02 15:04:05)"
// @Param        user   query     string  false  "Initial or effective ClickHouse user"
// @Param        node   query     string  false  "ClickHouse node hostname"
// @Param        search query     string  false  "Search query text (LIKE pattern in query column)"
// @Success      200    {object}  models.QueryLogStatsResponse
// @Failure      400    {object}  models.ErrorResponse
// @Failure      500    {object}  models.ErrorResponse
// @Router       /api/v1/query-log/stats [get]
func (h *QueryLogHandler) GetQueryLogStats(c *gin.Context) {
	// Parse filter without pagination (limit/offset are ignored)
	filter, err := h.parseFilterForStats(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid filter",
			Message: err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), queryLogTimeout)
	defer cancel()

	stats, err := h.repo.GetStats(ctx, filter)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get query log stats: %v", err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load query log statistics",
			Message: "ClickHouse query failed",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// StreamQueryLogStats streams query log statistics via Server-Sent Events (SSE)
// @Summary      Stream query log stats via SSE
// @Description  Streams query log statistics (running, finished, error counts) personalized per user and filter combination
// @Tags         query-log
// @Param        node   query  string  false  "ClickHouse node hostname"
// @Param        user   query  string  false  "Initial or effective ClickHouse user"
// @Param        search query  string  false  "Search query text"
// @Param        last   query  string  false  "Relative window (10s|30s|1m|5m|15m)"
// @Param        from   query  string  false  "Start timestamp (RFC3339)"
// @Param        to     query  string  false  "End timestamp (RFC3339)"
// @Param        token  query  string  false  "JWT token (alternative to Authorization header for SSE)"
// @Produce      text/event-stream
// @Success      200  {string}  text/event-stream
// @Router       /api/v1/query-log/stats/stream [get]
func (h *QueryLogHandler) StreamQueryLogStats(c *gin.Context) {
	// Parse filter for stats
	filter, err := h.parseFilterForStats(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid filter",
			Message: err.Error(),
		})
		return
	}

	var userID string
	if v, exists := c.Get("user_id"); exists {
		if s, ok := v.(string); ok {
			userID = s
		} else if v != nil {
			userID = fmt.Sprint(v)
		}
	}

	if userID == "" {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Create filter key for topic
	filterKey := stream.FilterKey{
		Node:        filter.Node,
		User:        filter.User,
		Search:      filter.Search,
		Last:        filter.RangePreset,
		From:        filter.From.Format(time.RFC3339),
		To:          filter.To.Format(time.RFC3339),
		RangePreset: filter.RangePreset,
	}

	// Ensure publisher is running for this user+filter combination
	h.statsPublisher.EnsurePublisher(userID, filter)

	topic := stream.QueryLogStatsTopic(userID, filterKey)
	updates, unsubscribe := h.broadcaster.Subscribe(ctx, topic, userID)
	defer unsubscribe()

	// Send initial connection message
	c.SSEvent("message", gin.H{"status": "connected", "user_id": userID, "filter": filterKey})
	c.Writer.Flush()

	for {
		select {
		case <-ctx.Done():
			if h.logger != nil {
				h.logger.Infof("SSE connection closed for query log stats, user: %s", userID)
			}
			return
		case event, ok := <-updates:
			if !ok {
				if h.logger != nil {
					h.logger.Infof("Query log stats stream closed for user: %s", userID)
				}
				return
			}
			if event.Err != nil {
				c.SSEvent("error", gin.H{"error": fmt.Sprintf("Failed to get stats: %v", event.Err)})
				c.Writer.Flush()
				continue
			}
			stats, ok := stream.DecodeQueryLogStatsPayload(event)
			if !ok || stats == nil {
				continue
			}

			statsJSON, err := json.Marshal(stats)
			if err != nil {
				if h.logger != nil {
					h.logger.Errorf("Failed to marshal stats: %v", err)
				}
				continue
			}

			c.SSEvent("stats", string(statsJSON))
			c.Writer.Flush()
		}
	}
}

func (h *QueryLogHandler) parseFilter(c *gin.Context) (repository.QueryLogFilter, error) {
	user := strings.TrimSpace(c.Query("user"))
	node := strings.TrimSpace(c.Query("node"))
	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))

	// Validate status parameter
	if status != "" && status != "completed" && status != "failed" && status != "all" {
		return repository.QueryLogFilter{}, fmt.Errorf("invalid status value: %s (must be 'completed', 'failed', or 'all')", status)
	}

	// Convert "all" to empty string for consistency
	if status == "all" {
		status = ""
	}

	limit := defaultQueryLogLimit
	if limitParam := strings.TrimSpace(c.Query("limit")); limitParam != "" {
		value, err := strconv.Atoi(limitParam)
		if err != nil || value <= 0 {
			return repository.QueryLogFilter{}, fmt.Errorf("limit must be a positive integer")
		}
		if value > maxQueryLogLimit {
			return repository.QueryLogFilter{}, fmt.Errorf("limit cannot exceed %d", maxQueryLogLimit)
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
		Search:      search,
		Status:      status,
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
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty timestamp")
	}

	// Try all accepted formats
	for _, layout := range acceptedTimeFormats {
		if ts, err := time.Parse(layout, value); err == nil {
			// If date-only format, set time to start of day (00:00:00)
			if layout == isoDateOnlyLayout {
				ts = time.Date(ts.Year(), ts.Month(), ts.Day(), 0, 0, 0, 0, ts.Location())
			}
			return ts, nil
		}
	}

	// Try parsing with common timezone formats (variations of RFC3339)
	timezoneFormats := []string{
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05+07:00",
		"2006-01-02 15:04:05Z",
		"2006-01-02 15:04:05Z07:00",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05+07:00",
		"2006-01-02T15:04Z",
		"2006-01-02T15:04-07:00",
		"2006-01-02T15:04+07:00",
	}
	for _, layout := range timezoneFormats {
		if ts, err := time.Parse(layout, value); err == nil {
			return ts, nil
		}
	}

	return time.Time{}, fmt.Errorf("expected RFC3339, %s, %s, %s, %s, or %s format", isoNoTZLayout, isoNoTZCompactLayout, isoTimeNoSecLayout, isoCompactNoSecLayout, isoDateOnlyLayout)
}

// parseFilterForStats parses filter parameters for stats endpoint (without pagination).
func (h *QueryLogHandler) parseFilterForStats(c *gin.Context) (repository.QueryLogFilter, error) {
	user := strings.TrimSpace(c.Query("user"))
	node := strings.TrimSpace(c.Query("node"))
	search := strings.TrimSpace(c.Query("search"))

	from, to, preset, err := parseTimeRange(c.Query("last"), c.Query("from"), c.Query("to"))
	if err != nil {
		return repository.QueryLogFilter{}, err
	}

	return repository.QueryLogFilter{
		From:        from,
		To:          to,
		User:        user,
		Node:        node,
		Search:      search,
		Limit:       0, // Not used for stats
		Offset:      0, // Not used for stats
		RangePreset: preset,
	}, nil
}
