package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/logger"
	"github.com/gin-gonic/gin"
)

// MetricsHandler handles metrics endpoints
type MetricsHandler struct {
	metricsRepo *repository.MetricsRepository
	logger      *logger.Logger
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(logger *logger.Logger) (*MetricsHandler, error) {
	metricsRepo, err := repository.NewMetricsRepository()
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics repository: %w", err)
	}

	return &MetricsHandler{
		metricsRepo: metricsRepo,
		logger:      logger,
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
	nodes, err := h.metricsRepo.GetAvailableNodes(c.Request.Context())
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

	// Note: SSE doesn't support custom headers, so token can be passed via query parameter
	// The middleware will check Authorization header first, then fall back to token query param

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// Create a context that can be cancelled
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Create a ticker for 1 second intervals
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Send initial connection message
	c.SSEvent("message", gin.H{"status": "connected", "node": nodeName})
	c.Writer.Flush()

	// Stream metrics every second
	for {
		select {
		case <-ctx.Done():
			// Client disconnected
			h.logger.Infof("SSE connection closed for node: %s", nodeName)
			return
		case <-ticker.C:
			// Get latest metrics
			metrics, err := h.metricsRepo.GetLatestMetrics(ctx, nodeName)
			if err != nil {
				h.logger.Errorf("Failed to get metrics for node %s: %v", nodeName, err)
				// Send error event
				c.SSEvent("error", gin.H{"error": fmt.Sprintf("Failed to get metrics: %v", err)})
				c.Writer.Flush()
				continue
			}

			// Send metrics as JSON
			metricsJSON, err := json.Marshal(metrics)
			if err != nil {
				h.logger.Errorf("Failed to marshal metrics: %v", err)
				continue
			}

			// Send SSE event
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

	metrics, err := h.metricsRepo.GetLatestMetrics(c.Request.Context(), nodeName)
	if err != nil {
		h.logger.Errorf("Failed to get metrics for node %s: %v", nodeName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get metrics: %v", err)})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

