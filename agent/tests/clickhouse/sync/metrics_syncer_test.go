package sync_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMetricsSyncer_New(t *testing.T) {
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "ch_metrics", config.TableName)
	assert.Equal(t, 1*time.Second, config.Interval)
}

func TestMetricsSyncer_Sync_QueryError(t *testing.T) {
	ctx := context.WithValue(context.Background(), "node_name", "test_node")
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// Mock ClickHouse query to return error
	mockConn.On("Query", ctx, mock.AnythingOfType("string"), []interface{}(nil)).
		Return(nil, errors.New("ClickHouse connection error"))
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ClickHouse connection error")
	assert.NotNil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestMetricsSyncer_Sync_TableNotFoundError(t *testing.T) {
	ctx := context.WithValue(context.Background(), "node_name", "test_node")
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// Mock ClickHouse query to return table not found error
	mockConn.On("Query", ctx, mock.AnythingOfType("string"), []interface{}(nil)).
		Return(nil, errors.New("Table system.asynchronous_metrics does not exist"))
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "table not found")
	assert.NotNil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestMetricsSyncer_Sync_ScanError(t *testing.T) {
	ctx := context.WithValue(context.Background(), "node_name", "test_node")
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// Mock ClickHouse query - return rows with scan error
	// Use NewMockRows with invalid data that will cause scan error
	mockRows := NewMockRows([][]interface{}{
		{"OSUserTimeNormalized", "invalid", "User CPU time"}, // Invalid type for value
	})
	mockRows.On("Close").Return(nil)
	mockRows.On("Err").Return(nil)
	
	mockConn.On("Query", ctx, mock.AnythingOfType("string"), []interface{}(nil)).
		Return(mockRows, nil)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	// Scan will fail due to type mismatch
	assert.Error(t, err)
	assert.NotNil(t, result)
	mockConn.AssertExpectations(t)
	mockRows.AssertExpectations(t)
}

func TestMetricsSyncer_Sync_Success_WithSampleData(t *testing.T) {
	ctx := context.WithValue(context.Background(), "node_name", "test_node")
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// Mock ClickHouse query - return sample metrics data
	// Note: All values are converted to float64 in the query
	mockRows := NewMockRows([][]interface{}{
		{"OSUserTimeNormalized", 0.5, "User CPU time"},
		{"OSSystemTimeNormalized", 0.3, "System CPU time"},
		{"OSMemoryAvailable", 1000000.0, "Available memory"},
		{"Query", 5.0, "Number of queries"},
		{"Merge", 2.0, "Number of merges"},
		{"DiskFreeSpace", 5000000.0, "Free disk space"},
		{"DiskTotalSpace", 10000000.0, "Total disk space"},
	})
	mockRows.On("Close").Return(nil)
	mockRows.On("Err").Return(nil)
	
	mockConn.On("Query", ctx, mock.AnythingOfType("string"), []interface{}(nil)).
		Return(mockRows, nil)
	
	// The sync will fail because db.GetInstance() returns nil in test
	// But we can verify the ClickHouse query was executed and data was processed
	result, err := syncer.Sync(ctx, mockConn)
	
	// Expect error because PostgreSQL connection is not available in test
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database manager not initialized")
	assert.NotNil(t, result)
	mockConn.AssertExpectations(t)
	mockRows.AssertExpectations(t)
}

func TestMetricsSyncer_GetLastTimestamp(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// GetLastTimestamp should always return zero time for metrics syncer
	timestamp, err := syncer.GetLastTimestamp(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.True(t, timestamp.IsZero())
}

func TestMetricsSyncer_UpdateLastTimestamp(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewMetricsSyncer(1*time.Second, "test_cluster")
	
	// UpdateLastTimestamp should always succeed for metrics syncer
	timestamp := time.Now()
	err := syncer.UpdateLastTimestamp(ctx, mockConn, timestamp)
	
	assert.NoError(t, err)
}

