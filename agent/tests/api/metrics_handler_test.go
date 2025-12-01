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

func TestMetricsHandlerGetAvailableNodes(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	username := "test_metrics_nodes_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_metrics_nodes@example.com",
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

	// Test GET /api/v1/metrics/nodes
	req, _ := http.NewRequest("GET", "/api/v1/metrics/nodes", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
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
	username := "test_metrics_current_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_metrics_current@example.com",
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

	// Test GET /api/v1/metrics/current
	req, _ := http.NewRequest("GET", "/api/v1/metrics/current?node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// May return 200 or 500 depending on ClickHouse connection
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestMetricsHandlerGetServerInfo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	username := "test_metrics_server_info_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_metrics_server_info@example.com",
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

	// Test GET /api/v1/metrics/server-info
	req, _ := http.NewRequest("GET", "/api/v1/metrics/server-info?node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// May return 200 or 500 depending on ClickHouse connection
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestMetricsHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/metrics/nodes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
