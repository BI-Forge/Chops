package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/handlers"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type stubQueryLogRepo struct {
	items      []models.QueryLogEntry
	total      int64
	err        error
	called     bool
	lastFilter repository.QueryLogFilter
}

func (s *stubQueryLogRepo) List(ctx context.Context, filter repository.QueryLogFilter) ([]models.QueryLogEntry, int64, error) {
	s.called = true
	s.lastFilter = filter
	return s.items, s.total, s.err
}

func TestQueryLogHandlerRejectsInvalidPreset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=9s", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.called, "repository should not be invoked on invalid input")
}

func TestQueryLogHandlerRejectsInvalidTimestamps(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?from=not-a-date", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.called)
}

func TestQueryLogHandlerReturnsData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		items: []models.QueryLogEntry{
			{
				QueryID:   "abc",
				QueryText: "SELECT 1",
				Node:      "node-1",
			},
		},
		total: 1,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=10s&limit=2", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, 2, repo.lastFilter.Limit)
	assert.Equal(t, "10s", repo.lastFilter.RangePreset)

	var resp models.QueryLogResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Items, 1)
	assert.Equal(t, "abc", resp.Items[0].QueryID)
	assert.Equal(t, int64(1), resp.Pagination.Total)
}
