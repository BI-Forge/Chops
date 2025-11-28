package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/handlers"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type stubQueryLogRepo struct {
	items         []models.QueryLogEntry
	total         int64
	err           error
	called        bool
	lastFilter    repository.QueryLogFilter
	stats         models.QueryLogStatsResponse
	statsErr      error
	statsCalled   bool
	loadEntries   []repository.QueryLoadEntry
	loadErr       error
	loadCalled    bool
	loadLastFilter repository.QueryLogFilter
}

func (s *stubQueryLogRepo) List(ctx context.Context, filter repository.QueryLogFilter) ([]models.QueryLogEntry, int64, error) {
	s.called = true
	s.lastFilter = filter
	return s.items, s.total, s.err
}

func (s *stubQueryLogRepo) GetStats(ctx context.Context, filter repository.QueryLogFilter) (models.QueryLogStatsResponse, error) {
	s.statsCalled = true
	s.lastFilter = filter
	return s.stats, s.statsErr
}

func (s *stubQueryLogRepo) GetLoadData(ctx context.Context, filter repository.QueryLogFilter) ([]repository.QueryLoadEntry, error) {
	s.loadCalled = true
	s.loadLastFilter = filter
	return s.loadEntries, s.loadErr
}

func TestQueryLogHandlerRejectsInvalidPreset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

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
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

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
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

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

func TestQueryLogHandlerGetStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		stats: models.QueryLogStatsResponse{
			Running:  5,
			Finished: 100,
			Error:    3,
		},
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/stats?last=10s&user=testuser&node=primary", nil)
	c.Request = req

	h.GetQueryLogStats(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.statsCalled)
	assert.Equal(t, "10s", repo.lastFilter.RangePreset)
	assert.Equal(t, "testuser", repo.lastFilter.User)
	assert.Equal(t, "primary", repo.lastFilter.Node)

	var resp models.QueryLogStatsResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, int64(5), resp.Running)
	assert.Equal(t, int64(100), resp.Finished)
	assert.Equal(t, int64(3), resp.Error)
}

func TestQueryLogHandlerGetStatsRejectsInvalidPreset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/stats?last=9s", nil)
	c.Request = req

	h.GetQueryLogStats(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.statsCalled, "repository should not be invoked on invalid input")
}

func TestQueryLogHandlerGetStatsHandlesError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		statsErr: assert.AnError,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/stats?last=10s", nil)
	c.Request = req

	h.GetQueryLogStats(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.True(t, repo.statsCalled)
}

func TestQueryLogHandlerParsesStatusParameter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		items: []models.QueryLogEntry{},
		total: 0,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=10s&status=failed", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "failed", repo.lastFilter.Status)
}

func TestQueryLogHandlerParsesCompletedStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		items: []models.QueryLogEntry{},
		total: 0,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=10s&status=completed", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "completed", repo.lastFilter.Status)
}

func TestQueryLogHandlerRejectsInvalidStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=10s&status=invalid", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.called, "repository should not be invoked on invalid status")
}

func TestQueryLogHandlerAllowsAllStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		items: []models.QueryLogEntry{},
		total: 0,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log?last=10s&status=all", nil)
	c.Request = req

	h.ListQueryLog(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "", repo.lastFilter.Status, "status should be empty when 'all' is passed")
}

func TestQueryLogHandlerStatusNotInStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		stats: models.QueryLogStatsResponse{
			Running:  5,
			Finished: 100,
			Error:    3,
		},
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/stats?last=10s&status=failed", nil)
	c.Request = req

	h.GetQueryLogStats(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.statsCalled)
	// Status should not be set in stats filter (stats should include all statuses)
	assert.Equal(t, "", repo.lastFilter.Status, "status should not be applied to stats")
}

func TestQueryLogHandlerGetLoadData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		loadEntries: []repository.QueryLoadEntry{
			{
				EventTime:   time.Now(),
				QueryID:     "query-123",
				User:        "testuser",
				DurationMs:  5000,
				MemoryUsage: 1024 * 1024 * 100, // 100 MB
				CPULoad:     0.75,
			},
		},
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/load?last=10s&user=testuser&node=primary&status=completed", nil)
	c.Request = req

	h.GetQueryLoadData(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.loadCalled)
	assert.Equal(t, "10s", repo.loadLastFilter.RangePreset)
	assert.Equal(t, "testuser", repo.loadLastFilter.User)
	assert.Equal(t, "primary", repo.loadLastFilter.Node)
	assert.Equal(t, "completed", repo.loadLastFilter.Status)

	var resp models.QueryLoadResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Entries, 1)
	assert.Equal(t, "query-123", resp.Entries[0].QueryID)
	assert.Equal(t, "testuser", resp.Entries[0].User)
	assert.Equal(t, uint64(5000), resp.Entries[0].DurationMs)
	assert.Equal(t, uint64(1024*1024*100), resp.Entries[0].MemoryUsage)
	assert.Equal(t, 0.75, resp.Entries[0].CPULoad)
}

func TestQueryLogHandlerGetLoadDataRejectsInvalidPreset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/load?last=9s", nil)
	c.Request = req

	h.GetQueryLoadData(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.loadCalled, "repository should not be invoked on invalid input")
}

func TestQueryLogHandlerGetLoadDataRejectsInvalidStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/load?last=10s&status=invalid", nil)
	c.Request = req

	h.GetQueryLoadData(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, repo.loadCalled, "repository should not be invoked on invalid status")
}

func TestQueryLogHandlerGetLoadDataHandlesError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		loadErr: assert.AnError,
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/load?last=10s", nil)
	c.Request = req

	h.GetQueryLoadData(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.True(t, repo.loadCalled)
}

func TestQueryLogHandlerGetLoadDataParsesFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubQueryLogRepo{
		loadEntries: []repository.QueryLoadEntry{},
	}
	h := handlers.NewQueryLogHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/query-log/load?last=15m&user=admin&search=SELECT&status=failed", nil)
	c.Request = req

	h.GetQueryLoadData(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.loadCalled)
	assert.Equal(t, "15m", repo.loadLastFilter.RangePreset)
	assert.Equal(t, "admin", repo.loadLastFilter.User)
	assert.Equal(t, "SELECT", repo.loadLastFilter.Search)
	assert.Equal(t, "failed", repo.loadLastFilter.Status)
}
