package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/logger"
	"github.com/gin-gonic/gin"
)

// MetricsHandler handles metrics endpoints
type MetricsHandler struct {
	metricsRepo      *repository.MetricsRepository
	broadcaster      *stream.Broadcaster
	metricsPublisher *stream.MetricsPublisher
	logger           *logger.Logger
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(logger *logger.Logger) (*MetricsHandler, error) {
	metricsRepo, err := repository.NewMetricsRepository()
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics repository: %w", err)
	}

	broadcaster := stream.NewBroadcaster(logger)
	metricsPublisher := stream.NewMetricsPublisher(metricsRepo, broadcaster, logger, time.Second)

	return &MetricsHandler{
		metricsRepo:      metricsRepo,
		broadcaster:      broadcaster,
		metricsPublisher: metricsPublisher,
		logger:           logger,
	}, nil
}

// GetAvailableNodes returns list of available nodes
// @Summary      Get available nodes
// @Description  Returns list of node names that have metrics data
// @Tags         metrics
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Router       /api/v1/metrics/nodes [get]
func (h *MetricsHandler) GetAvailableNodes(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	nodes, err := h.metricsRepo.GetAvailableNodes(ctx)
	if err != nil {
		h.logger.Errorf("Failed to get nodes: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get nodes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"nodes": nodes})
}

// StreamMetrics streams metrics via Server-Sent Events (SSE)
// @Summary      Stream metrics via SSE
// @Description  Streams current system metrics for a specific node every second
// @Tags         metrics
// @Param        node  query  string  true  "Node name"
// @Param        token  query  string  false  "JWT token (alternative to Authorization header for SSE)"
// @Produce      text/event-stream
// @Success      200  {string}  text/event-stream
// @Router       /api/v1/metrics/stream [get]
func (h *MetricsHandler) StreamMetrics(c *gin.Context) {
	nodeName := c.Query("node")
	if nodeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "node parameter is required"})
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

	// Note: SSE doesn't support custom headers, so token can be passed via query parameter
	// The middleware will check Authorization header first, then fall back to token query param

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	h.metricsPublisher.EnsureNodePublisher(nodeName)
	updates, unsubscribe := h.broadcaster.Subscribe(ctx, stream.MetricsTopic(nodeName), userID)
	defer unsubscribe()

	// Send initial connection message
	c.SSEvent("message", gin.H{"status": "connected", "node": nodeName})
	c.Writer.Flush()

	for {
		select {
		case <-ctx.Done():
			h.logger.Infof("SSE connection closed for node: %s", nodeName)
			return
		case event, ok := <-updates:
			if !ok {
				h.logger.Infof("Metrics stream closed for node: %s", nodeName)
				return
			}
			if event.Err != nil {
				c.SSEvent("error", gin.H{"error": fmt.Sprintf("Failed to get metrics: %v", event.Err)})
				c.Writer.Flush()
				continue
			}
			metrics, ok := stream.DecodeMetricsPayload(event)
			if !ok || metrics == nil {
				continue
			}

			metricsJSON, err := json.Marshal(metrics)
			if err != nil {
				h.logger.Errorf("Failed to marshal metrics: %v", err)
				continue
			}

			c.SSEvent("metrics", string(metricsJSON))
			c.Writer.Flush()
		}
	}
}

// GetCurrentMetrics returns current metrics (one-time request)
// @Summary      Get current metrics
// @Description  Returns current system metrics for a specific node
// @Tags         metrics
// @Param        node  query  string  true  "Node name"
// @Produce      json
// @Success      200  {object}  models.SystemMetrics
// @Router       /api/v1/metrics/current [get]
func (h *MetricsHandler) GetCurrentMetrics(c *gin.Context) {
	nodeName := c.Query("node")
	if nodeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "node parameter is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	metrics, err := h.metricsRepo.GetLatestMetrics(ctx, nodeName)
	if err != nil {
		h.logger.Errorf("Failed to get metrics for node %s: %v", nodeName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get metrics: %v", err)})
		return
	}

	c.JSON(http.StatusOK, metrics)
}
