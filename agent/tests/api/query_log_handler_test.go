package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryLogHandlerRejectsInvalidPreset(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_invalid")

	// Test with invalid preset
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=9s", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryLogHandlerRejectsInvalidTimestamps(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_timestamp")

	// Test with invalid timestamp
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?from=not-a-date", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryLogHandlerReturnsData(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_data")

	// Test GET /api/v1/clickhouse/query-log with valid parameters
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&limit=2", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	bodyBytes := w.Body.Bytes()
	require.NotEmpty(t, bodyBytes, "response must include JSON (empty body often means JSON marshal failed after 200). status=%d", w.Code)

	// Try to unmarshal as JSON to check if it's valid JSON
	var resp models.QueryLogResponse
	err = json.Unmarshal(bodyBytes, &resp)
	require.NoError(t, err, "Failed to unmarshal response as JSON. Body: %s", string(bodyBytes))

	// Items can be empty (no queries in the time range), but should not be nil
	assert.NotNil(t, resp.Items, "Items should not be nil")
	assert.NotNil(t, resp.Pagination, "Pagination should not be nil")

	// Verify pagination structure
	assert.GreaterOrEqual(t, resp.Pagination.Total, int64(0), "Total should be non-negative")
	assert.GreaterOrEqual(t, resp.Pagination.Limit, 0, "Limit should be non-negative")
	assert.GreaterOrEqual(t, resp.Pagination.Offset, 0, "Offset should be non-negative")
}

func TestQueryLogHandlerGetStats(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_stats")

	// Test GET /api/v1/clickhouse/query-log/stats
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log/stats?last=10s&user=testuser&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.QueryLogStatsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
}

func TestQueryLogHandlerGetStatsRejectsInvalidPreset(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_stats_invalid")

	// Test with invalid preset
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log/stats?last=9s", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryLogHandlerParsesStatusParameter(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_status")

	// Test with status parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&status=failed", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQueryLogHandlerRejectsInvalidStatus(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_invalid_status")

	// Test with invalid status
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&status=invalid", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryLogHandlerAllowsAllStatus(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_all_status")

	// Test with all status
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&status=all", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQueryLogHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/query-log?last=10s", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestQueryLogChartSeriesRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/query-log/chart-series?last=10s", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestQueryLogHandlerWithDifferentPresets(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_presets")

	// Test different preset values
	presets := []string{"10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "12h"}

	for _, preset := range presets {
		t.Run(preset, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last="+preset, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 for valid presets
			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}

func TestQueryLogHandlerWithLimitBoundaries(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_limit")

	tests := []struct {
		name           string
		limit          string
		expectedStatus int
	}{
		{"zero limit", "0", http.StatusBadRequest},
		{"negative limit", "-1", http.StatusBadRequest},
		{"max limit", "10000", http.StatusOK},
		{"over max limit", "10001", http.StatusBadRequest},
		{"valid limit", "10", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&limit="+tt.limit, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestQueryLogHandlerWithDifferentDateFormats(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_date_formats")

	now := time.Now().UTC()
	formats := []struct {
		name   string
		format string
		value  string
	}{
		{"RFC3339", time.RFC3339, now.Format(time.RFC3339)},
		{"RFC3339Nano", time.RFC3339Nano, now.Format(time.RFC3339Nano)},
		{"ISO no TZ", "2006-01-02 15:04:05", now.Format("2006-01-02 15:04:05")},
		{"ISO compact", "2006-01-02T15:04:05", now.Format("2006-01-02T15:04:05")},
		{"ISO date only", "2006-01-02", now.Format("2006-01-02")},
	}

	for _, fmt := range formats {
		t.Run(fmt.name, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?from="+fmt.value, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 or 400 depending on format validity
			assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest)
		})
	}
}

func TestQueryLogHandlerWithFromAndTo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_from_to")

	now := time.Now().UTC()
	from := now.Add(-1 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?from="+from+"&to="+to, token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 for valid date range
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQueryLogHandlerWithInvalidDateRange(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_invalid_range")

	now := time.Now().UTC()
	from := now.Format(time.RFC3339)
	to := now.Add(-1 * time.Hour).Format(time.RFC3339) // to is before from

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?from="+from+"&to="+to, token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid date range
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestQueryLogHandlerWithCombinedFilters(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_combined")

	// Test with multiple filter parameters
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?last=10s&status=failed&user=testuser&node=test_node&limit=20", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 for valid combined filters
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQueryLogHandlerStatsWithDifferentPresets(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_stats_presets")

	presets := []string{"10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "12h"}

	for _, preset := range presets {
		t.Run(preset, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log/stats?last="+preset, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 for valid presets
			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}

func TestQueryLogHandlerStatsWithFilters(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_querylog_stats_filters")

	// Test stats with user and node filters
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log/stats?last=10s&user=testuser&node=test_node", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200
	assert.Equal(t, http.StatusOK, w.Code)
}

func fetchQueryLogOK(t *testing.T, router http.Handler, token, query string) models.QueryLogResponse {
	t.Helper()
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/query-log?"+query, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var resp models.QueryLogResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.NotNil(t, resp.Items)
	return resp
}

func queryLogWindowQuery() string {
	now := time.Now().UTC()
	from := now.Add(-12 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)
	return "from=" + from + "&to=" + to
}

func queryLogRowKey(item chmodels.QueryLogEntry) string {
	return item.QueryID + "\t" + item.Type + "\t" + item.EventTimeMicroseconds
}

func queryLogItemIDs(items []chmodels.QueryLogEntry) []string {
	ids := make([]string, len(items))
	for i, item := range items {
		ids[i] = queryLogRowKey(item)
	}
	return ids
}

func hasDistinctUint64(vals []uint64) bool {
	if len(vals) < 2 {
		return false
	}
	first := vals[0]
	for _, v := range vals[1:] {
		if v != first {
			return true
		}
	}
	return false
}

func hasDistinctFloat64(vals []float64) bool {
	if len(vals) < 2 {
		return false
	}
	first := vals[0]
	for _, v := range vals[1:] {
		if v != first {
			return true
		}
	}
	return false
}

func TestParseQueryLogSort(t *testing.T) {
	tests := []struct {
		sort     string
		order    string
		wantSort string
		wantDesc bool
	}{
		{"", "", repository.QueryLogSortTime, true},
		{"memory", "desc", repository.QueryLogSortMemory, true},
		{"duration", "asc", repository.QueryLogSortDuration, false},
		{"cpu", "ASC", repository.QueryLogSortCPU, false},
		{"bogus", "desc", repository.QueryLogSortTime, true},
		{"memory", "nope", repository.QueryLogSortMemory, true},
		{" TIME ", " DESC ", repository.QueryLogSortTime, true},
	}
	for _, tt := range tests {
		gotSort, gotDesc := repository.ParseQueryLogSort(tt.sort, tt.order)
		assert.Equal(t, tt.wantSort, gotSort, "sort=%q order=%q", tt.sort, tt.order)
		assert.Equal(t, tt.wantDesc, gotDesc, "sort=%q order=%q", tt.sort, tt.order)
	}
}

func TestQueryLogHandlerDefaultSortWithoutParams(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_default")
	window := queryLogWindowQuery()

	resp := fetchQueryLogOK(t, router, token, window+"&limit=20")
	assert.Equal(t, 20, resp.Pagination.Limit)
	assert.Equal(t, 0, resp.Pagination.Offset)
	if len(resp.Items) < 2 {
		t.Skip("need at least 2 query log rows for default time sort")
	}
	for i := 1; i < len(resp.Items); i++ {
		assert.GreaterOrEqual(t, resp.Items[i-1].EventTime, resp.Items[i].EventTime)
	}
}

func TestQueryLogHandlerSortUnknownFallsBackToTimeDesc(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_unknown")
	window := queryLogWindowQuery()

	def := fetchQueryLogOK(t, router, token, window+"&limit=10")
	unknown := fetchQueryLogOK(t, router, token, window+"&sort=bogus&order=sideways&limit=10")
	if len(def.Items) < 1 {
		t.Skip("need query log rows to compare unknown sort fallback")
	}
	assert.Equal(t, queryLogItemIDs(def.Items), queryLogItemIDs(unknown.Items))
}

func TestQueryLogHandlerSortKeysDoNotError(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_keys")
	window := queryLogWindowQuery()

	keys := []string{"time", "memory", "duration", "cpu"}
	for _, key := range keys {
		t.Run(key, func(t *testing.T) {
			fetchQueryLogOK(t, router, token, window+"&sort="+key+"&order=desc&limit=10")
		})
	}
}

func TestQueryLogHandlerSortByMemoryDesc(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_memory")

	resp := fetchQueryLogOK(t, router, token, queryLogWindowQuery()+"&sort=memory&order=desc&limit=50")
	if len(resp.Items) < 2 {
		t.Skip("need at least 2 query log rows for memory sort")
	}
	vals := make([]uint64, len(resp.Items))
	for i, item := range resp.Items {
		vals[i] = item.MemoryUsage
	}
	if !hasDistinctUint64(vals) {
		t.Skip("need distinct memory_usage values to assert sort")
	}
	for i := 1; i < len(resp.Items); i++ {
		assert.GreaterOrEqual(t, resp.Items[i-1].MemoryUsage, resp.Items[i].MemoryUsage)
	}
}

func TestQueryLogHandlerSortByDurationAsc(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_duration")

	resp := fetchQueryLogOK(t, router, token, queryLogWindowQuery()+"&sort=duration&order=asc&limit=50")
	if len(resp.Items) < 2 {
		t.Skip("need at least 2 query log rows for duration sort")
	}
	vals := make([]uint64, len(resp.Items))
	for i, item := range resp.Items {
		vals[i] = item.DurationMs
	}
	if !hasDistinctUint64(vals) {
		t.Skip("need distinct duration_ms values to assert sort")
	}
	for i := 1; i < len(resp.Items); i++ {
		assert.LessOrEqual(t, resp.Items[i-1].DurationMs, resp.Items[i].DurationMs)
	}
}

func TestQueryLogHandlerSortByCPUDesc(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_cpu")

	resp := fetchQueryLogOK(t, router, token, queryLogWindowQuery()+"&sort=cpu&order=desc&limit=50")
	if len(resp.Items) < 2 {
		t.Skip("need at least 2 query log rows for cpu sort")
	}
	vals := make([]float64, len(resp.Items))
	for i, item := range resp.Items {
		vals[i] = item.CPULoad
	}
	if !hasDistinctFloat64(vals) {
		t.Skip("need distinct cpu_load values to assert sort")
	}
	for i := 1; i < len(resp.Items); i++ {
		assert.GreaterOrEqual(t, resp.Items[i-1].CPULoad, resp.Items[i].CPULoad)
	}
}

func TestQueryLogHandlerSortWithPagination(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_querylog_sort_page")
	window := queryLogWindowQuery()

	base := fetchQueryLogOK(t, router, token, window+"&sort=memory&order=desc&limit=50")
	if base.Pagination.Total < 4 {
		t.Skip("need at least 4 query log rows for pagination")
	}

	page1 := fetchQueryLogOK(t, router, token, window+"&sort=memory&order=desc&limit=2&offset=0")
	page2 := fetchQueryLogOK(t, router, token, window+"&sort=memory&order=desc&limit=2&offset=2")

	assert.Equal(t, base.Pagination.Total, page1.Pagination.Total)
	assert.Equal(t, base.Pagination.Total, page2.Pagination.Total)
	assert.Len(t, page1.Items, 2)
	assert.Len(t, page2.Items, 2)
	assert.Equal(t, 2, page1.Pagination.Limit)
	assert.Equal(t, 0, page1.Pagination.Offset)
	assert.Equal(t, 2, page2.Pagination.Offset)

	seen := make(map[string]struct{})
	for _, item := range page1.Items {
		seen[queryLogRowKey(item)] = struct{}{}
	}
	for _, item := range page2.Items {
		key := queryLogRowKey(item)
		_, dup := seen[key]
		assert.False(t, dup, "page2 must not repeat row from page1: %s", key)
	}
	assert.GreaterOrEqual(t, page1.Items[1].MemoryUsage, page2.Items[0].MemoryUsage)
}
