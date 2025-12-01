package api_test

import (
	"bytes"
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
	username := "test_querylog_invalid_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_invalid@example.com",
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

	// Test with invalid preset
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=9s", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_timestamp_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_timestamp@example.com",
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

	// Test with invalid timestamp
	req, _ := http.NewRequest("GET", "/api/v1/query-log?from=not-a-date", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_data_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_data@example.com",
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

	// Test GET /api/v1/query-log with valid parameters
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=10s&limit=2", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_stats_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_stats@example.com",
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

	// Test GET /api/v1/query-log/stats
	req, _ := http.NewRequest("GET", "/api/v1/query-log/stats?last=10s&user=testuser&node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_stats_invalid_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_stats_invalid@example.com",
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

	// Test with invalid preset
	req, _ := http.NewRequest("GET", "/api/v1/query-log/stats?last=9s", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_status_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_status@example.com",
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

	// Test with status parameter
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=10s&status=failed", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_invalid_status_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_invalid_status@example.com",
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

	// Test with invalid status
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=10s&status=invalid", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_querylog_all_status_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_querylog_all_status@example.com",
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

	// Test with all status
	req, _ := http.NewRequest("GET", "/api/v1/query-log?last=10s&status=all", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
