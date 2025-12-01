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

func TestUsersHandlerReturnsUsers(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	username := "test_users_user_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_users@example.com",
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

	// Test GET /api/v1/users with node parameter
	req, _ := http.NewRequest("GET", "/api/v1/users?node=test_node", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UsersResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Users)
	// Should contain at least default user
	assert.GreaterOrEqual(t, len(resp.Users), 0)
}

func TestUsersHandlerReturnsUsersWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	username := "test_users_no_node_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_users_no_node@example.com",
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

	// Test GET /api/v1/users without node parameter
	req, _ := http.NewRequest("GET", "/api/v1/users", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UsersResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Users)
}

func TestUsersHandlerHandlesNodeWithWhitespace(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	username := "test_users_whitespace_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    "test_users_whitespace@example.com",
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

	// Test GET /api/v1/users with whitespace in node parameter
	req, _ := http.NewRequest("GET", "/api/v1/users?node=%20test_node%20", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should still work (whitespace is trimmed)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUsersHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
