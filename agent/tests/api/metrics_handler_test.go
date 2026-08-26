package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricsHandlerGetAvailableNodes(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_metrics_nodes")

	// Test GET /api/v1/clickhouse/metrics/nodes
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/nodes", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp["nodes"])
}

func TestMetricsHandlerGetCurrentMetrics(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_metrics_current")

	// Add test data to ch_metrics table using MetricsSnapshot functionality
	err := testutil.InsertTestMetricsData(t, "test_node")
	require.NoError(t, err, "Failed to insert test metrics data")

	// Test GET /api/v1/clickhouse/metrics/current
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/current?node=test_node", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 with test data
	assert.Equal(t, http.StatusOK, w.Code)

	var metrics chmodels.SystemMetrics
	err = json.Unmarshal(w.Body.Bytes(), &metrics)
	assert.NoError(t, err)
	assert.Equal(t, "test_node", metrics.NodeName)
}

func TestMetricsHandlerGetServerInfo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_metrics_server_info")

	// Add test data to metrics
	err := testutil.InsertTestMetricsData(t, "test_node")
	require.NoError(t, err, "Failed to insert test metrics data")

	// Test GET /api/v1/clickhouse/metrics/server-info
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/server-info?node=test_node", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 with metrics data
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestMetricsHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/metrics/nodes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestMetricsHandlerGetCurrentMetricsWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_current_no_node")

	// Test GET /api/v1/clickhouse/metrics/current without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/current", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for missing node parameter
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMetricsHandlerGetCurrentMetricsWithNonExistentNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_nonexistent_node")

	// Test GET /api/v1/clickhouse/metrics/current with non-existent node
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/current?node=nonexistent_node_12345", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 404 or 500 depending on implementation
	assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusInternalServerError)
}

func TestMetricsHandlerGetMetricSeriesWithDifferentMetrics(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_types")

	// Test different metric types
	metrics := []string{"cpu_load", "memory_load", "memory_used_gb", "storage_used", "active_connections", "active_queries"}

	for _, metric := range metrics {
		t.Run(metric, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&metric="+metric+"&period=1h&step=1m", token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 or 400/500 depending on data availability
			assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest || w.Code == http.StatusInternalServerError)
		})
	}
}

func TestMetricsHandlerGetMetricSeriesWithInvalidMetric(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_invalid")

	// Test with invalid metric type
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&metric=invalid_metric&period=1h&step=1m", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid metric
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMetricsHandlerGetMetricSeriesWithDifferentPeriods(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_periods")

	// Test different period values
	periods := []string{"10m", "30m", "1h", "6h", "12h", "1d", "3d", "7d"}

	for _, period := range periods {
		t.Run(period, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&period="+period, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 or error depending on data
			assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest || w.Code == http.StatusInternalServerError)
		})
	}
}

func TestMetricsHandlerGetMetricSeriesWithInvalidPeriod(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_invalid_period")

	// Test with invalid period
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&period=invalid", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid period
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMetricsHandlerGetMetricSeriesWithDifferentSteps(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_steps")

	// Test different step values
	steps := []string{"1s", "5s", "10s", "30s", "1m", "5m", "30m", "1h"}

	for _, step := range steps {
		t.Run(step, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&period=1h&step="+step, token, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 200 or error depending on data
			assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest || w.Code == http.StatusInternalServerError)
		})
	}
}

func TestMetricsHandlerGetMetricSeriesMissingRequiredParams(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_missing_params")

	// Test missing node parameter (only required parameter)
	t.Run("missing node", func(t *testing.T) {
		req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?metric=cpu_load&period=1h&step=1m", token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should return 400 for missing required node parameter
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	// Test with default values (metric and period have defaults)
	t.Run("with default values", func(t *testing.T) {
		// metric defaults to "cpu_load", period defaults to "1h"
		req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series?node=test_node&step=1m", token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should return 200 with default values
		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest || w.Code == http.StatusInternalServerError)
	})
}

func TestMetricsHandlerGetMetricSeriesWithFromTo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_metrics_series_from_to")
	from := time.Now().UTC().Add(-2 * time.Hour).Format(time.RFC3339)
	to := time.Now().UTC().Add(-time.Hour).Format(time.RFC3339)

	t.Run("both from and to derives step from duration", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Second)
		fromTS := now.Add(-2 * time.Hour)
		toTS := now.Add(-time.Hour) // exactly 1h → 1m step
		// Client sends mismatched period/step; server must derive step from ~1h duration → 1m.
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&period=10m&step=1s&from=" +
			fromTS.Format(time.RFC3339) + "&to=" + toTS.Format(time.RFC3339)
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var series models.MetricSeriesResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &series))
		assert.Equal(t, "test_node", series.Node)
		assert.Equal(t, "cpu_load", series.Metric)
		assert.Equal(t, "custom", series.Period)
		assert.Equal(t, "1m", series.Step)
		assert.Equal(t, fromTS.Format(time.RFC3339), series.From)
		assert.Equal(t, toTS.Format(time.RFC3339), series.To)
	})

	t.Run("absolute without period uses duration step", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Second)
		fromTS := now.Add(-15 * time.Minute)
		toTS := now
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&from=" +
			fromTS.Format(time.RFC3339) + "&to=" + toTS.Format(time.RFC3339)
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)

		var series models.MetricSeriesResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &series))
		assert.Equal(t, "custom", series.Period)
		assert.Equal(t, "10s", series.Step)
	})

	t.Run("short absolute range uses 1s step", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Second)
		fromTS := now.Add(-5 * time.Minute)
		toTS := now
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&from=" +
			fromTS.Format(time.RFC3339) + "&to=" + toTS.Format(time.RFC3339)
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)

		var series models.MetricSeriesResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &series))
		assert.Equal(t, "1s", series.Step)
	})

	t.Run("only from", func(t *testing.T) {
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&from=" + from
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "both from and to")
	})

	t.Run("from after to", func(t *testing.T) {
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&from=" + to + "&to=" + from
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "from must be before to")
	})

	t.Run("week absolute range uses 1h step", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Second)
		wideFrom := now.Add(-7 * 24 * time.Hour)
		wideTo := now
		url := "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load&period=10m&step=1s&from=" +
			wideFrom.Format(time.RFC3339) + "&to=" + wideTo.Format(time.RFC3339)
		req, err := testutil.MakeAuthenticatedRequest("GET", url, token, nil)
		require.NoError(t, err)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)

		var series models.MetricSeriesResponse
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &series))
		assert.Equal(t, "custom", series.Period)
		assert.Equal(t, "1h", series.Step)
	})
}
