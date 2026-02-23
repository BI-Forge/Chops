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

func TestSchemasHandlerGetSchemasList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_schemas_list")

	// Create test databases
	testDatabase1 := "test_schema_list_1_" + time.Now().Format("20060102150405")
	testDatabase2 := "test_schema_list_2_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase1, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase2, "test_node")
	}()

	// Create test databases
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase1, "test_node")
	require.NoError(t, err, "Failed to create test database 1")

	err = testutil.CreateTestClickHouseDatabase(t, testDatabase2, "test_node")
	require.NoError(t, err, "Failed to create test database 2")

	// Test GET /api/v1/clickhouse/schemas/list
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/schemas/list?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.SchemasListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Schemas)
	assert.GreaterOrEqual(t, len(resp.Schemas), 2, "Should return at least 2 test databases")

	// Verify that our test databases are in the list
	schemaMap := make(map[string]bool)
	for _, schema := range resp.Schemas {
		schemaMap[schema] = true
	}
	assert.True(t, schemaMap[testDatabase1], "Test database 1 should be in the list")
	assert.True(t, schemaMap[testDatabase2], "Test database 2 should be in the list")
}

func TestSchemasHandlerGetSchemasListWithNameFilter(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_schemas_filter")

	// Create test databases
	testDatabase1 := "test_schema_filter_1_" + time.Now().Format("20060102150405")
	testDatabase2 := "test_schema_filter_2_" + time.Now().Format("20060102150405")
	testDatabase3 := "other_schema_filter_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase1, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase2, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase3, "test_node")
	}()

	// Create test databases
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase1, "test_node")
	require.NoError(t, err, "Failed to create test database 1")

	err = testutil.CreateTestClickHouseDatabase(t, testDatabase2, "test_node")
	require.NoError(t, err, "Failed to create test database 2")

	err = testutil.CreateTestClickHouseDatabase(t, testDatabase3, "test_node")
	require.NoError(t, err, "Failed to create test database 3")

	// Test GET /api/v1/clickhouse/schemas/list with name filter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/schemas/list?node=test_node&name=test_schema_filter", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.SchemasListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Schemas)

	// Verify that filtered results contain only matching databases
	schemaMap := make(map[string]bool)
	for _, schema := range resp.Schemas {
		schemaMap[schema] = true
	}
	assert.True(t, schemaMap[testDatabase1], "Test database 1 should be in filtered list")
	assert.True(t, schemaMap[testDatabase2], "Test database 2 should be in filtered list")
	assert.False(t, schemaMap[testDatabase3], "Test database 3 should not be in filtered list")
}

func TestSchemasHandlerGetSchemasListWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_schemas_no_node")

	// Create test database
	testDatabase := "test_schema_no_node_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase, "")
	}()

	// Create test database
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase, "")
	require.NoError(t, err, "Failed to create test database")

	// Test GET /api/v1/clickhouse/schemas/list without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/schemas/list", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.SchemasListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Schemas)

	// Verify that our test database is in the list
	schemaMap := make(map[string]bool)
	for _, schema := range resp.Schemas {
		schemaMap[schema] = true
	}
	assert.True(t, schemaMap[testDatabase], "Test database should be in the list")
}

func TestSchemasHandlerGetSchemasListRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/schemas/list?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

