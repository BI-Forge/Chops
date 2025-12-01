package api_test

import (
	"bytes"
	"context"
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

func TestMetricsHandlerStreamMetrics(t *testing.T) {
	_, _, router, handlers := testutil.SetupTestEnvironmentWithHandlers(t)
	if router == nil {
		return
	}
	defer testutil.StopAllPublishers(handlers)

	// Register user and get token
	username := "test_stream_metrics_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_stream_metrics@example.com",
		Password: "securepass123",
	})

	registerReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)
	require.Equal(t, http.StatusCreated, registerW.Code)

	var registerResponse models.TokenResponse
	err := json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token)

	// Test GET /api/v1/metrics/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", "/api/v1/metrics/stream?node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_stream_querylog_stats_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_stream_querylog_stats@example.com",
		Password: "securepass123",
	})

	registerReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)
	require.Equal(t, http.StatusCreated, registerW.Code)

	var registerResponse models.TokenResponse
	err := json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token)

	// Test GET /api/v1/query-log/stats/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", "/api/v1/query-log/stats/stream?last=10s", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_stream_processes_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_stream_processes@example.com",
		Password: "securepass123",
	})

	registerReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)
	require.Equal(t, http.StatusCreated, registerW.Code)

	var registerResponse models.TokenResponse
	err := json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token)

	// Test GET /api/v1/processes/stream
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", "/api/v1/processes/stream?node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
