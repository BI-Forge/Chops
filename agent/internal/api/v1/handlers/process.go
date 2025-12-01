package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const processQueryTimeout = 5 * time.Second

// killQueryLocks prevents concurrent kill requests for the same query
var killQueryLocks = sync.Map{} // map[string]*sync.Mutex

// ProcessRepository defines the subset of repository methods required by the handler
type ProcessRepository interface {
	GetCurrentProcesses(ctx context.Context, nodeName string) ([]models.Process, error)
	KillQuery(ctx context.Context, queryID string, nodeName string) error
}

// ProcessHandler handles process monitoring endpoints
type ProcessHandler struct {
	repo             ProcessRepository
	broadcaster      *stream.Broadcaster
	processPublisher *stream.ProcessPublisher
	logger           *logger.Logger
}

// NewProcessHandler creates a production process handler
func NewProcessHandler(log *logger.Logger, cfg *config.Config) (*ProcessHandler, error) {
	processRepo, err := repository.NewProcessRepository(cfg, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create process repository: %w", err)
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

	processPublisher := stream.NewProcessPublisher(processRepo, broadcaster, log, pollInterval)

	return &ProcessHandler{
		repo:             processRepo,
		broadcaster:      broadcaster,
		processPublisher: processPublisher,
		logger:           log,
	}, nil
}

// Stop stops all publishers (useful for tests)
func (h *ProcessHandler) Stop() {
	if h.processPublisher != nil {
		h.processPublisher.Stop()
	}
}

// NewProcessHandlerWithRepository creates a process handler using a custom repository (testing helper)
func NewProcessHandlerWithRepository(log *logger.Logger, repo ProcessRepository, broadcaster *stream.Broadcaster, publisher *stream.ProcessPublisher) *ProcessHandler {
	return &ProcessHandler{
		repo:             repo,
		broadcaster:      broadcaster,
		processPublisher: publisher,
		logger:           log,
	}
}

// GetCurrentProcesses returns current running queries from system.processes
// @Summary      Get current processes
// @Description  Returns currently running queries from system.processes for a specific node
// @Tags         processes
// @Security     BearerAuth
// @Produce      json
// @Param        node  query  string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.ProcessListResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/processes [get]
func (h *ProcessHandler) GetCurrentProcesses(c *gin.Context) {
	nodeName := c.Query("node")

	ctx, cancel := context.WithTimeout(c.Request.Context(), processQueryTimeout)
	defer cancel()

	processes, err := h.repo.GetCurrentProcesses(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get processes for node %s: %v", nodeName, err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to load processes",
			Message: "ClickHouse query failed",
		})
		return
	}

	response := models.ProcessListResponse{
		Processes: processes,
		Node:      nodeName,
	}

	c.JSON(http.StatusOK, response)
}

// StreamProcesses streams processes via Server-Sent Events (SSE)
// @Summary      Stream processes via SSE
// @Description  Streams current running queries from system.processes for a specific node
// @Tags         processes
// @Param        node  query  string  true  "Node name"
// @Param        token  query  string  false  "JWT token (alternative to Authorization header for SSE)"
// @Produce      text/event-stream
// @Success      200  {string}  text/event-stream
// @Router       /api/v1/processes/stream [get]
func (h *ProcessHandler) StreamProcesses(c *gin.Context) {
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

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	h.processPublisher.EnsureNodePublisher(nodeName)
	updates, unsubscribe := h.broadcaster.Subscribe(ctx, stream.ProcessTopic(nodeName), userID)
	defer unsubscribe()

	// Send initial connection message
	c.SSEvent("message", gin.H{"status": "connected", "node": nodeName})
	c.Writer.Flush()

	for {
		select {
		case <-ctx.Done():
			if h.logger != nil {
				h.logger.Infof("SSE connection closed for processes on node: %s", nodeName)
			}
			return
		case event, ok := <-updates:
			if !ok {
				if h.logger != nil {
					h.logger.Infof("Process stream closed for node: %s", nodeName)
				}
				return
			}
			if event.Err != nil {
				c.SSEvent("error", gin.H{"error": fmt.Sprintf("Failed to get processes: %v", event.Err)})
				c.Writer.Flush()
				continue
			}
			processList, ok := stream.DecodeProcessPayload(event)
			if !ok || processList == nil {
				continue
			}

			processJSON, err := json.Marshal(processList)
			if err != nil {
				if h.logger != nil {
					h.logger.Errorf("Failed to marshal processes: %v", err)
				}
				continue
			}

			c.SSEvent("processes", string(processJSON))
			c.Writer.Flush()
		}
	}
}

// KillProcess kills a running query by query_id
// @Summary      Kill a process
// @Description  Kills a running query by query_id
// @Tags         processes
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      models.KillProcessRequest  true  "Kill process request"
// @Success      200      {object}  models.KillProcessResponse
// @Failure      400      {object}  models.ErrorResponse
// @Failure      500      {object}  models.ErrorResponse
// @Router       /api/v1/processes/kill [post]
func (h *ProcessHandler) KillProcess(c *gin.Context) {
	var req models.KillProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	if req.QueryID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request",
			Message: "query_id is required",
		})
		return
	}

	// Create unique key for this kill request (queryId + node)
	killKey := fmt.Sprintf("%s:%s", req.QueryID, req.Node)
	
	// Get or create mutex for this kill request
	mu, _ := killQueryLocks.LoadOrStore(killKey, &sync.Mutex{})
	lock := mu.(*sync.Mutex)
	
	// Lock to prevent concurrent execution
	lock.Lock()
	defer lock.Unlock()
	
	// Clean up the lock after a delay to prevent memory leak
	defer func() {
		go func() {
			time.Sleep(10 * time.Second)
			killQueryLocks.Delete(killKey)
		}()
	}()

	ctx, cancel := context.WithTimeout(c.Request.Context(), processQueryTimeout)
	defer cancel()

	err := h.repo.KillQuery(ctx, req.QueryID, req.Node)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to kill query %s on node %s: %v", req.QueryID, req.Node, err)
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to kill query",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.KillProcessResponse{
		Success: true,
		Message: "Query killed successfully",
	})
}
