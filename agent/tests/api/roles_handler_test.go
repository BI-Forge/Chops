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

func TestRolesHandlerGetRolesList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_roles_list")

	// Create test roles
	testRole1 := "test_role_list_1_" + time.Now().Format("20060102150405")
	testRole2 := "test_role_list_2_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseRole(t, testRole1, "test_node")
		_ = testutil.DeleteTestClickHouseRole(t, testRole2, "test_node")
	}()

	// Create test roles
	err := testutil.CreateTestClickHouseRole(t, testRole1, "test_node")
	require.NoError(t, err, "Failed to create test role 1")

	err = testutil.CreateTestClickHouseRole(t, testRole2, "test_node")
	require.NoError(t, err, "Failed to create test role 2")

	// Test GET /api/v1/clickhouse/roles/list
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/roles/list?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.RolesListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Roles)
	assert.GreaterOrEqual(t, len(resp.Roles), 2, "Should return at least 2 test roles")

	// Verify that our test roles are in the list
	roleMap := make(map[string]bool)
	for _, role := range resp.Roles {
		roleMap[role] = true
	}
	assert.True(t, roleMap[testRole1], "Test role 1 should be in the list")
	assert.True(t, roleMap[testRole2], "Test role 2 should be in the list")
}

func TestRolesHandlerGetRolesListWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_roles_list_no_node")

	// Create test role
	testRole := "test_role_list_no_node_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseRole(t, testRole, "")
	}()

	// Create test role
	err := testutil.CreateTestClickHouseRole(t, testRole, "")
	require.NoError(t, err, "Failed to create test role")

	// Test GET /api/v1/clickhouse/roles/list without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/roles/list", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.RolesListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Roles)

	// Verify that our test role is in the list
	roleMap := make(map[string]bool)
	for _, role := range resp.Roles {
		roleMap[role] = true
	}
	assert.True(t, roleMap[testRole], "Test role should be in the list")
}

func TestRolesHandlerGetRolesListRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/roles/list?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
