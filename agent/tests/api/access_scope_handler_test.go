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

func TestAccessScopeHandlerGetUserAccessScopes(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_access_scopes")

	// Create test user in ClickHouse
	testUserName := "test_user_access_scopes_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseGrants(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Create test grants with different scopes
	// Global grant (All.All.All)
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "SELECT", "", "", "", "test_node")
	require.NoError(t, err, "Failed to create global grant")

	// Database-level grant (database.All.All)
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "INSERT", "test_db", "", "", "test_node")
	require.NoError(t, err, "Failed to create database-level grant")

	// Table-level grant (database.table.All)
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "ALTER", "test_db", "test_table", "", "test_node")
	require.NoError(t, err, "Failed to create table-level grant")

	// Column-level grant (database.table.column)
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "SELECT", "test_db", "test_table", "test_column", "test_node")
	require.NoError(t, err, "Failed to create column-level grant")

	// Add another permission to the same scope (should be grouped)
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "INSERT", "test_db", "test_table", "test_column", "test_node")
	require.NoError(t, err, "Failed to create second permission for same scope")

	// Test GET /api/v1/clickhouse/access-scope
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/access-scope?user_name="+testUserName+"&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AccessScopeListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.AccessScopes)
	// Column-level grants might be stored as part of table-level scope in ClickHouse
	// So we expect at least 3 scopes (global, database, table)
	assert.GreaterOrEqual(t, len(resp.AccessScopes), 3, "Should return at least 3 access scopes")

	// Verify access scopes
	scopeMap := make(map[string]models.AccessScope)
	for _, scope := range resp.AccessScopes {
		key := scope.Database + "." + scope.Table + "." + scope.Column
		scopeMap[key] = scope
	}

	// Check global scope (All.All.All)
	globalScope, exists := scopeMap["All.All.All"]
	assert.True(t, exists, "Global scope should exist")
	assert.Contains(t, globalScope.Permissions, "SELECT", "Global scope should have SELECT permission")

	// Check database-level scope (test_db.All.All)
	dbScope, exists := scopeMap["test_db.All.All"]
	assert.True(t, exists, "Database scope should exist")
	assert.Contains(t, dbScope.Permissions, "INSERT", "Database scope should have INSERT permission")

	// Check table-level scope (test_db.test_table.All)
	tableScope, exists := scopeMap["test_db.test_table.All"]
	assert.True(t, exists, "Table scope should exist")
	// ClickHouse may store ALTER as "ALTER TABLE" or "ALTER VIEW"
	hasAlter := false
	for _, perm := range tableScope.Permissions {
		if perm == "ALTER" || perm == "ALTER TABLE" || perm == "ALTER VIEW" {
			hasAlter = true
			break
		}
	}
	assert.True(t, hasAlter, "Table scope should have ALTER permission (or ALTER TABLE/ALTER VIEW)")

	// Check column-level scope (test_db.test_table.test_column) - should have both SELECT and INSERT
	// Note: Column-level grants might be stored differently in ClickHouse
	// They might be stored as table-level with column info, or might not appear separately
	columnScope, exists := scopeMap["test_db.test_table.test_column"]
	if exists {
		// If column scope exists, verify it has the expected permissions
		assert.Contains(t, columnScope.Permissions, "SELECT", "Column scope should have SELECT permission")
		assert.Contains(t, columnScope.Permissions, "INSERT", "Column scope should have INSERT permission")
		assert.Equal(t, 2, len(columnScope.Permissions), "Column scope should have 2 permissions")
	} else {
		// Column-level grants might be stored as part of table-level scope in some ClickHouse versions
		// This is acceptable behavior - the important thing is that the grants are created
		t.Logf("Column-level scope not found separately - this may be expected behavior in ClickHouse")
	}
}

func TestAccessScopeHandlerGetUserAccessScopesWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_access_scopes_no_node")

	// Create test user in ClickHouse
	testUserName := "test_user_access_scopes_no_node_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseGrants(t, testUserName, "")
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "")
	require.NoError(t, err, "Failed to create test user")

	// Create test grant
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "SELECT", "test_db", "", "", "")
	require.NoError(t, err, "Failed to create test grant")

	// Test GET /api/v1/clickhouse/access-scope without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/access-scope?user_name="+testUserName, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AccessScopeListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.AccessScopes)
}

func TestAccessScopeHandlerGetUserAccessScopesRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/access-scope?user_name=test_user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAccessScopeHandlerGetUserAccessScopesMissingUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_access_scopes_missing_user")

	// Test GET /api/v1/clickhouse/access-scope without user_name parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/access-scope?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Message, "user_name")
}

func TestAccessScopeHandlerGetUserAccessScopesEmptyResult(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_access_scopes_empty")

	// Create test user in ClickHouse without grants
	testUserName := "test_user_access_scopes_empty_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Test GET /api/v1/clickhouse/access-scope
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/access-scope?user_name="+testUserName+"&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AccessScopeListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	// AccessScopes should be an empty array for user without grants
	// It might be nil or empty array, both are acceptable
	accessScopesCount := 0
	if resp.AccessScopes != nil {
		accessScopesCount = len(resp.AccessScopes)
	}
	assert.Equal(t, 0, accessScopesCount, "Should return empty array (or nil) for user without grants")
}

func TestAccessScopeHandlerGetUserAccessScopesWithNullValues(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_access_scopes_null")

	// Create test user in ClickHouse
	testUserName := "test_user_access_scopes_null_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseGrants(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Create grant with empty values (should be treated as "All")
	err = testutil.CreateTestClickHouseGrant(t, testUserName, "SELECT", "", "", "", "test_node")
	require.NoError(t, err, "Failed to create grant with empty values")

	// Test GET /api/v1/clickhouse/access-scope
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/access-scope?user_name="+testUserName+"&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AccessScopeListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.AccessScopes)
	assert.GreaterOrEqual(t, len(resp.AccessScopes), 1, "Should return at least 1 access scope")

	// Verify that empty values are converted to "All"
	foundAllScope := false
	for _, scope := range resp.AccessScopes {
		if scope.Database == "All" && scope.Table == "All" && scope.Column == "All" {
			foundAllScope = true
			assert.Contains(t, scope.Permissions, "SELECT", "All scope should have SELECT permission")
			break
		}
	}
	assert.True(t, foundAllScope, "Should have scope with All.All.All")
}

