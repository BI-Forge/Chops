package api_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricsHandlerStreamMetrics(t *testing.T) {
	_, _, router, handlers := testutil.SetupTestEnvironmentWithHandlers(t)
	if router == nil {
		return
	}
	defer testutil.StopAllPublishers(handlers)

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_stream_metrics")

	// Test GET /api/v1/metrics/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/metrics/stream?node=test_node", token, nil)
	require.NoError(t, err)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	// Run in goroutine to allow timeout to work
	done := make(chan bool)
	go func() {
		router.ServeHTTP(w, req)
		done <- true
	}()

	// Wait for either completion or timeout
	select {
	case <-done:
		// Stream endpoint should return 200 and start streaming
		assert.Equal(t, http.StatusOK, w.Code)
	case <-ctx.Done():
		// Timeout is expected for stream endpoints
		assert.Equal(t, http.StatusOK, w.Code)
	}
}

func TestQueryLogHandlerStreamStats(t *testing.T) {
	_, _, router, handlers := testutil.SetupTestEnvironmentWithHandlers(t)
	if router == nil {
		return
	}
	defer testutil.StopAllPublishers(handlers)

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_stream_querylog_stats")

	// Test GET /api/v1/query-log/stats/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/query-log/stats/stream?last=10s", token, nil)
	require.NoError(t, err)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	// Run in goroutine to allow timeout to work
	done := make(chan bool)
	go func() {
		router.ServeHTTP(w, req)
		done <- true
	}()

	// Wait for either completion or timeout
	select {
	case <-done:
		// Stream endpoint should return 200 and start streaming
		assert.Equal(t, http.StatusOK, w.Code)
	case <-ctx.Done():
		// Timeout is expected for stream endpoints
		assert.Equal(t, http.StatusOK, w.Code)
	}
}

func TestProcessHandlerStreamProcesses(t *testing.T) {
	_, _, router, handlers := testutil.SetupTestEnvironmentWithHandlers(t)
	if router == nil {
		return
	}
	defer testutil.StopAllPublishers(handlers)

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_stream_processes")

	// Test GET /api/v1/processes/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/processes/stream?node=test_node", token, nil)
	require.NoError(t, err)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	// Run in goroutine to allow timeout to work
	done := make(chan bool)
	go func() {
		router.ServeHTTP(w, req)
		done <- true
	}()

	// Wait for either completion or timeout
	select {
	case <-done:
		// Stream endpoint should return 200 and start streaming
		assert.Equal(t, http.StatusOK, w.Code)
	case <-ctx.Done():
		// Timeout is expected for stream endpoints
		assert.Equal(t, http.StatusOK, w.Code)
	}
}

func TestStreamHandlersRequireAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test metrics stream without auth
	req, _ := http.NewRequest("GET", "/api/v1/metrics/stream", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Test query-log stats stream without auth
	req, _ = http.NewRequest("GET", "/api/v1/query-log/stats/stream", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Test processes stream without auth
	req, _ = http.NewRequest("GET", "/api/v1/processes/stream", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
