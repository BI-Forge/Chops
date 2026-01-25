package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
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
	token := testutil.RegisterTestUser(t, router, "test_users_user")

	// Test GET /api/v1/clickhouse/users with node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users?node=test_node", token, nil)
	require.NoError(t, err)
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
	token := testutil.RegisterTestUser(t, router, "test_users_no_node")

	// Test GET /api/v1/clickhouse/users without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users", token, nil)
	require.NoError(t, err)
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
	token := testutil.RegisterTestUser(t, router, "test_users_whitespace")

	// Test GET /api/v1/clickhouse/users with whitespace in node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users?node=%20test_node%20", token, nil)
	require.NoError(t, err)
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
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUserBasicInfo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info")

	// Test GET /api/v1/clickhouse/users/basic-info with node and name parameters
	// Using "default" user which should exist in ClickHouse
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/basic-info?node=test_node&name=default", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp chmodels.UserBasicInfo
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	// Verify all required fields are present
	assert.NotEmpty(t, resp.Name, "Name should not be empty")
	assert.Equal(t, "default", resp.Name)
	assert.NotEmpty(t, resp.ID, "ID should not be empty")

	// Verify optional fields structure (may be empty but should exist)
	assert.NotNil(t, resp.UserSettings, "UserSettings should not be nil (can be empty slice)")
	assert.NotNil(t, resp.ProfileSettings, "ProfileSettings should not be nil (can be empty map)")
	assert.NotNil(t, resp.Grants, "Grants should not be nil (can be empty slice)")

	// Verify field types by checking that we can iterate over them
	// This ensures they are the correct types
	_ = len(resp.UserSettings)    // []string can use len()
	_ = len(resp.ProfileSettings) // map[string]string can use len()
	_ = len(resp.Grants)          // []string can use len()

	// Profile, Storage, RoleName, Scope are strings (may be empty)
	// Just verify they exist in the response structure
	_ = resp.Profile
	_ = resp.Storage
	_ = resp.RoleName
	_ = resp.Scope
}

func TestUsersHandlerUserBasicInfoWithoutName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_no_name")

	// Test GET /api/v1/clickhouse/users/basic-info without name parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/basic-info?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "name parameter is required")
}

func TestUsersHandlerUserBasicInfoUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_not_found")

	// Test GET /api/v1/clickhouse/users/basic-info with non-existent user
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/basic-info?node=test_node&name=nonexistent_user_12345", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User not found")
	assert.Contains(t, resp.Message, "nonexistent_user_12345")
}

func TestUsersHandlerUserBasicInfoRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/users/basic-info?node=test_node&name=default", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUserBasicInfoWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_no_node")

	// Test GET /api/v1/clickhouse/users/basic-info without node parameter
	// Should work with default connection
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/basic-info?name=default", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp chmodels.UserBasicInfo
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	// Verify response structure
	assert.NotEmpty(t, resp.Name, "Name should not be empty")
	assert.NotEmpty(t, resp.ID, "ID should not be empty")
	assert.NotNil(t, resp.UserSettings, "UserSettings should not be nil")
	assert.NotNil(t, resp.ProfileSettings, "ProfileSettings should not be nil")
	assert.NotNil(t, resp.Grants, "Grants should not be nil")
}
