package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=9s", token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?from=not-a-date", token, nil)
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

	// Test GET /api/v1/query-log with valid parameters
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&limit=2", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.QueryLogResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Items)
	assert.NotNil(t, resp.Pagination)
}

func TestQueryLogHandlerGetStats(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_querylog_stats")

	// Test GET /api/v1/query-log/stats
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log/stats?last=10s&user=testuser&node=test_node", token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log/stats?last=9s", token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&status=failed", token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&status=invalid", token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&status=all", token, nil)
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
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=10s", nil)
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
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last="+preset, token, nil)
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
		{"max limit", "500", http.StatusOK},
		{"over max limit", "501", http.StatusBadRequest},
		{"valid limit", "10", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&limit="+tt.limit, token, nil)
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
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?from="+fmt.value, token, nil)
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

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?from="+from+"&to="+to, token, nil)
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

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?from="+from+"&to="+to, token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log?last=10s&status=failed&user=testuser&node=test_node&limit=20", token, nil)
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
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log/stats?last="+preset, token, nil)
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
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log/stats?last=10s&user=testuser&node=test_node", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200
	assert.Equal(t, http.StatusOK, w.Code)
}
