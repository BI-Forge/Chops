package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestColumnsHandlerGetColumnsList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_columns_list")

	// Create test database and table
	testDatabase := "test_db_columns_" + time.Now().Format("20060102150405")
	testTable := "test_table_columns_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseTable(t, testDatabase, testTable, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase, "test_node")
	}()

	// Create test database and table
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase, "test_node")
	require.NoError(t, err, "Failed to create test database")

	err = testutil.CreateTestClickHouseTable(t, testDatabase, testTable, "test_node")
	require.NoError(t, err, "Failed to create test table")

	// Test GET /api/v1/clickhouse/columns/list
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/columns/list?node=test_node&schema="+testDatabase+"&table="+testTable, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ColumnsListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Columns)
	assert.GreaterOrEqual(t, len(resp.Columns), 4, "Should return at least 4 columns (id, name, value, created_at)")

	// Verify that expected columns are in the list
	columnMap := make(map[string]bool)
	for _, column := range resp.Columns {
		columnMap[column] = true
	}
	assert.True(t, columnMap["id"], "Column 'id' should be in the list")
	assert.True(t, columnMap["name"], "Column 'name' should be in the list")
	assert.True(t, columnMap["value"], "Column 'value' should be in the list")
	assert.True(t, columnMap["created_at"], "Column 'created_at' should be in the list")
}

func TestColumnsHandlerGetColumnsListWithNameFilter(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_columns_filter")

	// Create test database and table
	testDatabase := "test_db_columns_filter_" + time.Now().Format("20060102150405")
	testTable := "test_table_columns_filter_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseTable(t, testDatabase, testTable, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase, "test_node")
	}()

	// Create test database and table
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase, "test_node")
	require.NoError(t, err, "Failed to create test database")

	err = testutil.CreateTestClickHouseTable(t, testDatabase, testTable, "test_node")
	require.NoError(t, err, "Failed to create test table")

	// Test GET /api/v1/clickhouse/columns/list with name filter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/columns/list?node=test_node&schema="+testDatabase+"&table="+testTable+"&name=name", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ColumnsListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Columns)

	// Verify that filtered results contain only matching columns
	columnMap := make(map[string]bool)
	for _, column := range resp.Columns {
		columnMap[column] = true
	}
	assert.True(t, columnMap["name"], "Column 'name' should be in filtered list")
	assert.False(t, columnMap["id"], "Column 'id' should not be in filtered list")
	assert.False(t, columnMap["value"], "Column 'value' should not be in filtered list")
}

func TestColumnsHandlerGetColumnsListWithTableFilter(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_columns_table_filter")

	// Create test database and tables
	testDatabase := "test_db_columns_table_" + time.Now().Format("20060102150405")
	testTable1 := "test_table_columns_1_" + time.Now().Format("20060102150405")
	testTable2 := "test_table_columns_2_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseTable(t, testDatabase, testTable1, "test_node")
		_ = testutil.DeleteTestClickHouseTable(t, testDatabase, testTable2, "test_node")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase, "test_node")
	}()

	// Create test database and tables
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase, "test_node")
	require.NoError(t, err, "Failed to create test database")

	err = testutil.CreateTestClickHouseTable(t, testDatabase, testTable1, "test_node")
	require.NoError(t, err, "Failed to create test table 1")

	err = testutil.CreateTestClickHouseTable(t, testDatabase, testTable2, "test_node")
	require.NoError(t, err, "Failed to create test table 2")

	// Test GET /api/v1/clickhouse/columns/list with table filter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/columns/list?node=test_node&schema="+testDatabase+"&table="+testTable1, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ColumnsListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Columns)

	// Verify that results contain columns from the specified table only
	// Both tables have the same columns, but we're filtering by table
	assert.GreaterOrEqual(t, len(resp.Columns), 4, "Should return at least 4 columns")
}

func TestColumnsHandlerGetColumnsListRequiresSchemaWhenTableProvided(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_columns_validation")

	// Test GET /api/v1/clickhouse/columns/list with table but without schema
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/columns/list?node=test_node&table=test_table", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp apiSystemModels.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Message, "Schema parameter is required")
}

func TestColumnsHandlerGetColumnsListWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_columns_no_node")

	// Create test database and table
	testDatabase := "test_db_columns_no_node_" + time.Now().Format("20060102150405")
	testTable := "test_table_columns_no_node_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseTable(t, testDatabase, testTable, "")
		_ = testutil.DeleteTestClickHouseDatabase(t, testDatabase, "")
	}()

	// Create test database and table
	err := testutil.CreateTestClickHouseDatabase(t, testDatabase, "")
	require.NoError(t, err, "Failed to create test database")

	err = testutil.CreateTestClickHouseTable(t, testDatabase, testTable, "")
	require.NoError(t, err, "Failed to create test table")

	// Test GET /api/v1/clickhouse/columns/list without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/columns/list?schema="+testDatabase+"&table="+testTable, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ColumnsListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Columns)
	assert.GreaterOrEqual(t, len(resp.Columns), 4, "Should return at least 4 columns")
}

func TestColumnsHandlerGetColumnsListRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/columns/list?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
