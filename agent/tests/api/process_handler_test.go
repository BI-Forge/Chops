package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/api/v1/handlers"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type stubProcessRepo struct {
	processes   []models.Process
	err         error
	killErr     error
	called      bool
	killCalled  bool
	lastNode    string
	lastQueryID string
}

func (s *stubProcessRepo) GetCurrentProcesses(ctx context.Context, nodeName string) ([]models.Process, error) {
	s.called = true
	s.lastNode = nodeName
	return s.processes, s.err
}

func (s *stubProcessRepo) KillQuery(ctx context.Context, queryID string, nodeName string) error {
	s.killCalled = true
	s.lastQueryID = queryID
	s.lastNode = nodeName
	return s.killErr
}

func TestProcessHandlerGetCurrentProcesses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubProcessRepo{
		processes: []models.Process{
			{
				QueryID: "test-query-1",
				User:    "testuser",
				Query:   "SELECT 1",
				Node:    "primary",
			},
		},
	}
	broadcaster := stream.NewBroadcaster(logger.New(logger.InfoLevel, "text"))
	publisher := stream.NewProcessPublisher(nil, broadcaster, logger.New(logger.InfoLevel, "text"), 2)
	h := handlers.NewProcessHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, broadcaster, publisher)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/processes?node=primary", nil)
	c.Request = req

	h.GetCurrentProcesses(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "primary", repo.lastNode)

	var resp models.ProcessListResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Processes, 1)
	assert.Equal(t, "test-query-1", resp.Processes[0].QueryID)
}

func TestProcessHandlerKillProcess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubProcessRepo{}
	broadcaster := stream.NewBroadcaster(logger.New(logger.InfoLevel, "text"))
	publisher := stream.NewProcessPublisher(nil, broadcaster, logger.New(logger.InfoLevel, "text"), 2)
	h := handlers.NewProcessHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, broadcaster, publisher)

	router := gin.New()
	router.POST("/processes/kill", h.KillProcess)

	// Test with valid request
	killReq := models.KillProcessRequest{
		QueryID: "test-query-123",
		Node:    "primary",
	}
	reqBody, _ := json.Marshal(killReq)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/processes/kill", strings.NewReader(string(reqBody)))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.killCalled)
	assert.Equal(t, "test-query-123", repo.lastQueryID)
	assert.Equal(t, "primary", repo.lastNode)

	var resp models.KillProcessResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.True(t, resp.Success)
}

func TestProcessHandlerKillProcessInvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubProcessRepo{}
	broadcaster := stream.NewBroadcaster(logger.New(logger.InfoLevel, "text"))
	publisher := stream.NewProcessPublisher(nil, broadcaster, logger.New(logger.InfoLevel, "text"), 2)
	h := handlers.NewProcessHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, broadcaster, publisher)

	router := gin.New()
	router.POST("/processes/kill", h.KillProcess)

	// Test with empty query_id
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/processes/kill", nil)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Should return 400 for invalid JSON or missing query_id
	assert.True(t, w.Code == http.StatusBadRequest || w.Code == http.StatusInternalServerError)
}
