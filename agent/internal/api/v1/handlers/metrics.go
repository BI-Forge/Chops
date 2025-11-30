package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

var (
	allowedMetricTypes = map[string]struct{}{
		"cpu_load":           {},
		"memory_load":        {},
		"memory_used_gb":     {},
		"storage_used":       {},
		"active_connections": {},
		"active_queries":     {},
	}

	periodConfigurations = map[string]struct {
		duration time.Duration
		step     time.Duration
	}{
		"10m": {duration: 10 * time.Minute, step: time.Second},
		"30m": {duration: 30 * time.Minute, step: 10 * time.Second},
		"1h":  {duration: time.Hour, step: time.Minute},
		"6h":  {duration: 6 * time.Hour, step: 5 * time.Minute},
		"12h": {duration: 12 * time.Hour, step: 5 * time.Minute},
		"1d":  {duration: 24 * time.Hour, step: 30 * time.Minute},
		"3d":  {duration: 72 * time.Hour, step: time.Hour},
		"7d":  {duration: 168 * time.Hour, step: time.Hour},
	}

	stepDurations = map[string]time.Duration{
		"1s":  time.Second,
		"5s":  5 * time.Second,
		"10s": 10 * time.Second,
		"30s": 30 * time.Second,
		"1m":  time.Minute,
		"5m":  5 * time.Minute,
		"30m": 30 * time.Minute,
		"1h":  time.Hour,
	}

	stepStrings = map[time.Duration]string{
		time.Second:      "1s",
		5 * time.Second:  "5s",
		10 * time.Second: "10s",
		30 * time.Second: "30s",
		time.Minute:      "1m",
		5 * time.Minute:  "5m",
		30 * time.Minute: "30m",
		time.Hour:        "1h",
	}
)

// MetricsHandler handles metrics endpoints
type MetricsHandler struct {
	metricsRepo      *repository.MetricsRepository
	broadcaster      *stream.Broadcaster
	metricsPublisher *stream.MetricsPublisher
	logger           *logger.Logger
	retentionDays    int
	config           *config.Config
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(logger *logger.Logger, cfg *config.Config) (*MetricsHandler, error) {
	metricsRepo, err := repository.NewMetricsRepository()
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics repository: %w", err)
	}

	retentionDays := 0
	if cfg != nil && cfg.Sync.RetentionDays > 0 {
		retentionDays = cfg.Sync.RetentionDays
	}

	broadcaster := stream.NewBroadcaster(logger)
	metricsPublisher := stream.NewMetricsPublisher(metricsRepo, broadcaster, logger, time.Second)

	return &MetricsHandler{
		metricsRepo:      metricsRepo,
		broadcaster:      broadcaster,
		metricsPublisher: metricsPublisher,
		logger:           logger,
		retentionDays:    retentionDays,
		config:           cfg,
	}, nil
}

// NodeInfo represents node information with host and cluster name
type NodeInfo struct {
	Name        string `json:"name"`
	Host        string `json:"host"`
	ClusterName string `json:"cluster_name"`
}

// GetAvailableNodes returns list of available nodes with host and cluster information
// @Summary      Get available nodes
// @Description  Returns list of node names that have metrics data, including host and cluster name
// @Tags         metrics
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Router       /api/v1/metrics/nodes [get]
func (h *MetricsHandler) GetAvailableNodes(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Get node names from database
	nodeNames, err := h.metricsRepo.GetAvailableNodes(ctx)
	if err != nil {
		h.logger.Errorf("Failed to get nodes: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get nodes"})
		return
	}

	// Create a map of node name to node config for quick lookup
	nodeConfigMap := make(map[string]config.ClickHouseNode)
	clusterName := ""
	if h.config != nil && h.config.Database.ClickHouse.Nodes != nil {
		clusterName = h.config.Database.ClickHouse.ClusterName
		for _, node := range h.config.Database.ClickHouse.Nodes {
			nodeConfigMap[node.Name] = node
		}
	}

	// Build response with node information
	nodes := make([]NodeInfo, 0, len(nodeNames))
	for _, nodeName := range nodeNames {
		nodeInfo := NodeInfo{
			Name:        nodeName,
			Host:        "",
			ClusterName: clusterName,
		}

		// Get host from config if available
		if nodeConfig, exists := nodeConfigMap[nodeName]; exists {
			nodeInfo.Host = nodeConfig.Host
		}

		nodes = append(nodes, nodeInfo)
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

// GetMetricSeries returns aggregated metrics for a period and step suitable for charting.
func (h *MetricsHandler) GetMetricSeries(c *gin.Context) {
	nodeName := c.Query("node")
	if nodeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "node parameter is required"})
		return
	}

	metricType := c.DefaultQuery("metric", "cpu_load")
	if _, ok := allowedMetricTypes[metricType]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("unsupported metric type: %s", metricType)})
		return
	}

	periodKey := c.DefaultQuery("period", "1h")
	periodCfg, ok := periodConfigurations[periodKey]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("unsupported period: %s", periodKey)})
		return
	}

	defaultStep, hasDefault := stepStrings[periodCfg.step]
	if !hasDefault {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("unsupported configured step duration: %s", periodCfg.step)})
		return
	}

	stepKey := c.DefaultQuery("step", defaultStep)
	stepDuration, effectiveStep, err := normalizeStep(stepKey, periodCfg.step)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.retentionDays > 0 {
		maxPeriod := time.Duration(h.retentionDays) * 24 * time.Hour
		if periodCfg.duration > maxPeriod {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("period %s exceeds retention window of %dd", periodKey, h.retentionDays)})
			return
		}
	}

	now := time.Now().UTC()
	from := now.Add(-periodCfg.duration)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	points, err := h.metricsRepo.GetMetricSeries(ctx, nodeName, metricType, from, now, stepDuration)
	if err != nil {
		h.logger.Errorf("Failed to load metric series: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load metric series"})
		return
	}

	response := models.MetricSeriesResponse{
		Node:   nodeName,
		Metric: metricType,
		Period: periodKey,
		Step:   effectiveStep,
		From:   from.Format(time.RFC3339),
		To:     now.Format(time.RFC3339),
		Points: points,
	}

	c.JSON(http.StatusOK, response)
}

func normalizeStep(stepKey string, expectedStep time.Duration) (time.Duration, string, error) {
	stepDuration, ok := stepDurations[stepKey]
	if !ok {
		return 0, "", fmt.Errorf("unsupported step: %s", stepKey)
	}

	if stepDuration != expectedStep {
		expectedKey, hasExpected := stepStrings[expectedStep]
		if !hasExpected {
			return 0, "", fmt.Errorf("unsupported configured step duration: %s", expectedStep)
		}
		return 0, "", fmt.Errorf("step %s is not allowed for the selected period; expected %s", stepKey, expectedKey)
	}

	effectiveStep, ok := stepStrings[stepDuration]
	if !ok {
		return 0, "", fmt.Errorf("unsupported effective step duration: %s", stepDuration)
	}

	return stepDuration, effectiveStep, nil
}
