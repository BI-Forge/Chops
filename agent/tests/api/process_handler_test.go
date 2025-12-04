package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProcessHandlerGetCurrentProcesses(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_process_get")

	// Test GET /api/v1/processes with node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/processes?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ProcessListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Processes)
}

func TestProcessHandlerGetCurrentProcessesWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_process_no_node")

	// Test GET /api/v1/processes without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/processes", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ProcessListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Processes)
}

func TestProcessHandlerKillProcess(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_process_kill")

	// Test POST /api/v1/processes/kill
	killReq := models.KillProcessRequest{
		QueryID: "test-query-123",
		Node:    "test_node",
	}
	reqBody, _ := json.Marshal(killReq)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// May return 200 or 500 depending on whether query exists
	assert.Contains(t, []int{http.StatusOK}, w.Code)
}

func TestProcessHandlerKillProcessInvalidRequest(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_process_kill_invalid")

	// Test with empty request body
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, nil)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid JSON or missing query_id
	assert.True(t, w.Code == http.StatusBadRequest)
}

func TestProcessHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/processes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestProcessHandlerKillProcessWithMissingQueryID(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_process_kill_no_queryid")

	// Test with missing query_id
	killReq := models.KillProcessRequest{
		Node: "test_node",
	}
	reqBody, _ := json.Marshal(killReq)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for missing query_id
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestProcessHandlerKillProcessWithMissingNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_process_kill_no_node")

	// Test with missing node
	killReq := models.KillProcessRequest{
		QueryID: "test-query-123",
	}
	reqBody, _ := json.Marshal(killReq)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for missing node
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestProcessHandlerKillProcessWithInvalidJSON(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_process_kill_invalid_json")

	// Test with invalid JSON
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, []byte("{invalid json}"))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid JSON
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestProcessHandlerKillProcessWithEmptyQueryID(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_process_kill_empty_queryid")

	// Test with empty query_id
	killReq := models.KillProcessRequest{
		QueryID: "",
		Node:    "test_node",
	}
	reqBody, _ := json.Marshal(killReq)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for empty query_id
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
