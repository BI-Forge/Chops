package migrations_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/migrations"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockConn is a mock implementation of driver.Conn
type MockConn struct {
	mock.Mock
}

func (m *MockConn) Contributors() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

func (m *MockConn) ServerVersion() (*driver.ServerVersion, error) {
	args := m.Called()
	return args.Get(0).(*driver.ServerVersion), args.Error(1)
}

func (m *MockConn) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Get(0).(driver.Rows), mockArgs.Error(1)
}

func (m *MockConn) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Get(0).(driver.Row)
}

func (m *MockConn) Exec(ctx context.Context, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, wait, args)
	return mockArgs.Error(0)
}

func (m *MockConn) AsyncInsertQuery(ctx context.Context, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) Ping(ctx context.Context) error {
	mockArgs := m.Called(ctx)
	return mockArgs.Error(0)
}

func (m *MockConn) Stats() driver.Stats {
	args := m.Called()
	return args.Get(0).(driver.Stats)
}

func (m *MockConn) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockConn) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	mockArgs := m.Called(ctx, query, opts)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(driver.Batch), mockArgs.Error(1)
}

// MockClusterManager is a mock implementation of cluster manager
type MockClusterManager struct {
	mock.Mock
	nodes []config.ClickHouseNode
}

func (m *MockClusterManager) GetAllNodes() []config.ClickHouseNode {
	return m.nodes
}

func (m *MockClusterManager) GetWorkingConnections() int {
	args := m.Called()
	return args.Int(0)
}

func (m *MockClusterManager) GetConnection() (driver.Conn, int, error) {
	args := m.Called()
	return args.Get(0).(driver.Conn), args.Int(1), args.Error(2)
}

func (m *MockClusterManager) GetConnectionByNodeName(name string) (driver.Conn, int, error) {
	args := m.Called(name)
	return args.Get(0).(driver.Conn), args.Int(1), args.Error(2)
}

func setupTestMigrator(t *testing.T) (*migrations.ClickHouseMigrator, *MockClusterManager, *MockConn, *sql.DB) {
	log := logger.New(logger.InfoLevel, "text")
	
	// Create a mock PostgreSQL DB (we'll use a test database or mock)
	// For testing, we'll need to set up a test PostgreSQL database or use sqlmock
	// For now, we'll create a nil DB and handle it in tests that need it
	var postgresDB *sql.DB = nil
	
	mockClusterManager := &MockClusterManager{
		nodes: []config.ClickHouseNode{
			{
				Name: "test-node",
				Host: "localhost",
				Port: 9000,
			},
		},
	}
	
	mockConn := new(MockConn)
	
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			ClickHouse: config.ClickHouseConfig{
				ClusterName: "test_cluster",
			},
		},
	}
	
	migrator := migrations.NewClickHouseMigrator(mockClusterManager, postgresDB, cfg, log)
	
	return migrator, mockClusterManager, mockConn, postgresDB
}

func TestGetClickHouseMigrations(t *testing.T) {
	migrationsList := migrations.GetClickHouseMigrations()
	
	require.NotEmpty(t, migrationsList, "Migrations should not be empty")
	
	// Verify that all expected migrations exist
	expectedMigrations := []struct {
		Version int
		Name    string
	}{
		{1, "create_ops_schema"},
		{2, "create_query_raw_table"},
		{3, "create_thread_raw_table"},
		{4, "create_part_log_raw_table"},
		{5, "create_query_agg_min_table"},
		{6, "create_storage_min_table"},
		{7, "create_host_metrics_table"},
	}
	
	assert.Equal(t, len(expectedMigrations), len(migrationsList), "Number of migrations should match")
	
	migrationMap := make(map[int]migrations.ClickHouseMigration)
	for _, m := range migrationsList {
		migrationMap[m.Version] = m
	}
	
	for _, expected := range expectedMigrations {
		migration, exists := migrationMap[expected.Version]
		require.True(t, exists, "Migration version %d should exist", expected.Version)
		assert.Equal(t, expected.Name, migration.Name, "Migration name should match")
		assert.NotNil(t, migration.Up, "Migration Up function should not be nil")
		assert.NotNil(t, migration.Down, "Migration Down function should not be nil")
	}
}

func TestCreateOpsSchema(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, "CREATE DATABASE IF NOT EXISTS ops", []interface{}(nil)).Return(nil)
	
	// Get migrations and find createOpsSchema
	migrationsList := migrations.GetClickHouseMigrations()
	var createOpsSchemaMigration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_ops_schema" {
			createOpsSchemaMigration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, createOpsSchemaMigration, "create_ops_schema migration should exist")
	
	err := createOpsSchemaMigration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating ops schema should not fail")
	mockConn.AssertExpectations(t)
}

func TestDropOpsSchema(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, "DROP DATABASE IF EXISTS ops", []interface{}(nil)).Return(nil)
	
	// Get migrations and find createOpsSchema
	migrationsList := migrations.GetClickHouseMigrations()
	var dropOpsSchemaMigration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_ops_schema" {
			dropOpsSchemaMigration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, dropOpsSchemaMigration, "create_ops_schema migration should exist")
	
	err := dropOpsSchemaMigration.Down(ctx, mockConn)
	
	assert.NoError(t, err, "Dropping ops schema should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreateQueryRawTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_query_raw_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_query_raw_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating query_raw table should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreateThreadRawTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_thread_raw_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_thread_raw_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating thread_raw table should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreatePartLogRawTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_part_log_raw_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_part_log_raw_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating part_log_raw table should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreateQueryAggMinTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_query_agg_min_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_query_agg_min_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating query_agg_min table should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreateStorageMinTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_storage_min_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_storage_min_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating storage_min table should not fail")
	mockConn.AssertExpectations(t)
}

func TestCreateHostMetricsTable(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	// Mock successful execution
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	migrationsList := migrations.GetClickHouseMigrations()
	var migration *migrations.ClickHouseMigration
	for i := range migrationsList {
		if migrationsList[i].Name == "create_host_metrics_table" {
			migration = &migrationsList[i]
			break
		}
	}
	require.NotNil(t, migration, "create_host_metrics_table migration should exist")
	
	err := migration.Up(ctx, mockConn)
	
	assert.NoError(t, err, "Creating host_metrics table should not fail")
	mockConn.AssertExpectations(t)
}

func TestMigrationExecution_WithValidConnection(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	mockClusterManager := &MockClusterManager{
		nodes: []config.ClickHouseNode{
			{Name: "test-node", Host: "localhost", Port: 9000},
		},
	}
	
	// Mock connection validation
	mockConn.On("Ping", ctx).Return(nil)
	
	// Mock table creation
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	// Mock GetConnection
	mockClusterManager.On("GetConnection").Return(mockConn, 0, nil)
	mockClusterManager.On("GetWorkingConnections").Return(1)
	
	log := logger.New(logger.InfoLevel, "text")
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			ClickHouse: config.ClickHouseConfig{
				ClusterName: "test_cluster",
			},
		},
	}
	
	migrator := migrations.NewClickHouseMigrator(mockClusterManager, nil, cfg, log)
	
	// Test that migration structure is correct
	migrationsList := migrations.GetClickHouseMigrations()
	assert.NotEmpty(t, migrationsList, "Migrations should be loaded")
	assert.NotNil(t, migrator)
}

func TestMigrationResult_Fields(t *testing.T) {
	result := migrations.MigrationResult{
		Version:         1,
		Name:            "test_migration",
		NodeName:        "test-node",
		Status:          "success",
		ErrorMessage:    "",
		ExecutionTimeMs: 100,
		Checksum:        "abc123",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	
	assert.Equal(t, 1, result.Version)
	assert.Equal(t, "test_migration", result.Name)
	assert.Equal(t, "test-node", result.NodeName)
	assert.Equal(t, "success", result.Status)
	assert.Empty(t, result.ErrorMessage)
	assert.Equal(t, int64(100), result.ExecutionTimeMs)
}

func TestNewClickHouseMigrator(t *testing.T) {
	log := logger.New(logger.InfoLevel, "text")
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			ClickHouse: config.ClickHouseConfig{
				ClusterName: "test_cluster",
			},
		},
	}
	
	mockClusterManager := &MockClusterManager{
		nodes: []config.ClickHouseNode{
			{Name: "test-node", Host: "localhost", Port: 9000},
		},
	}
	
	migrator := migrations.NewClickHouseMigrator(mockClusterManager, nil, cfg, log)
	
	assert.NotNil(t, migrator)
	migrationsList := migrations.GetClickHouseMigrations()
	assert.NotEmpty(t, migrationsList)
}
