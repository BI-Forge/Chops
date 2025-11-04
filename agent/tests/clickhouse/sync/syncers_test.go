package sync_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestQueryRawSyncer_New(t *testing.T) {
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	
	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "ops.query_raw", config.TableName)
	assert.Equal(t, 1*time.Minute, config.Interval)
}

func TestQueryRawSyncer_Sync_Success(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	
	// Mock GetLastTimestamp - return zero time (no previous data)
	mockRowTimestamp := NewMockRow(time.Time{})
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRowTimestamp).Once()
	
	// Mock count queries for ExecuteInsertSelectQuery
	countBeforeRow := NewMockRow(int64(0))
	countAfterRow := NewMockRow(int64(5))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.query_raw", []interface{}(nil)).Return(countBeforeRow).Once()
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.query_raw", []interface{}(nil)).Return(countAfterRow).Once()
	
	// Mock Exec for INSERT query
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	// Mock max timestamp query
	maxTsRow := NewMockRow(time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC))
	mockConn.On("QueryRow", ctx, "SELECT max(event_time) FROM ops.query_raw", []interface{}(nil)).Return(maxTsRow)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.Equal(t, "ops.query_raw", result.TableName)
	assert.Equal(t, int64(5), result.RecordsProcessed)
	assert.NotZero(t, result.Duration)
	mockConn.AssertExpectations(t)
}

func TestQueryRawSyncer_BuildInsertSelectQuery(t *testing.T) {
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	
	lastTs := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	query := syncer.BuildInsertSelectQuery(lastTs)
	
	assert.Contains(t, query, "INSERT INTO ops.query_raw")
	assert.Contains(t, query, "FROM system.query_log")
	assert.Contains(t, query, "WHERE type = 'QueryFinish'")
	assert.Contains(t, query, "event_time_microseconds >")
}

func TestPartLogRawSyncer_New(t *testing.T) {
	syncer := sync.NewPartLogRawSyncer(1 * time.Minute)
	
	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "ops.part_log_raw", config.TableName)
	assert.Equal(t, 1*time.Minute, config.Interval)
}

func TestPartLogRawSyncer_Sync_Success(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewPartLogRawSyncer(1 * time.Minute)
	
	// Mock GetLastTimestamp - return zero time
	mockRowTimestamp := NewMockRow(time.Time{})
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRowTimestamp).Once()
	
	// Mock count queries
	countBeforeRow := NewMockRow(int64(0))
	countAfterRow := NewMockRow(int64(3))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.part_log_raw", []interface{}(nil)).Return(countBeforeRow).Once()
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.part_log_raw", []interface{}(nil)).Return(countAfterRow).Once()
	
	// Mock Exec for INSERT query
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	// Mock max timestamp query
	maxTsRow := NewMockRow(time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC))
	mockConn.On("QueryRow", ctx, "SELECT max(event_time) FROM ops.part_log_raw", []interface{}(nil)).Return(maxTsRow)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.Equal(t, "ops.part_log_raw", result.TableName)
	assert.Equal(t, int64(3), result.RecordsProcessed)
	assert.NotZero(t, result.Duration)
	mockConn.AssertExpectations(t)
}

func TestPartLogRawSyncer_BuildInsertSelectQuery(t *testing.T) {
	syncer := sync.NewPartLogRawSyncer(1 * time.Minute)
	
	lastTs := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	query := syncer.BuildInsertSelectQuery(lastTs)
	
	assert.Contains(t, query, "INSERT INTO ops.part_log_raw")
	assert.Contains(t, query, "FROM system.part_log")
	assert.Contains(t, query, "WHERE event_time >")
}

func TestQueryAggMinSyncer_New(t *testing.T) {
	syncer := sync.NewQueryAggMinSyncer(5*time.Minute, "test_cluster")
	
	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "ops.query_agg_min", config.TableName)
	assert.Equal(t, 5*time.Minute, config.Interval)
}

func TestQueryAggMinSyncer_Sync_Success(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewQueryAggMinSyncer(5*time.Minute, "test_cluster")
	
	// Mock GetLastTimestamp - return zero time
	mockRowTimestamp := NewMockRow(time.Time{})
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRowTimestamp).Once()
	
	// Mock count queries
	countBeforeRow := NewMockRow(int64(0))
	countAfterRow := NewMockRow(int64(10))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.query_agg_min", []interface{}(nil)).Return(countBeforeRow).Once()
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.query_agg_min", []interface{}(nil)).Return(countAfterRow).Once()
	
	// Mock Exec for INSERT query
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.Equal(t, "ops.query_agg_min", result.TableName)
	assert.Equal(t, int64(10), result.RecordsProcessed)
	assert.NotZero(t, result.Duration)
	mockConn.AssertExpectations(t)
}

func TestQueryAggMinSyncer_BuildInsertSelectQuery(t *testing.T) {
	syncer := sync.NewQueryAggMinSyncer(5*time.Minute, "test_cluster")
	
	windowStart := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	windowEnd := time.Date(2024, 1, 1, 12, 5, 0, 0, time.UTC)
	query := syncer.BuildInsertSelectQuery(windowStart, windowEnd)
	
	assert.Contains(t, query, "INSERT INTO ops.query_agg_min")
	// QueryAggMinSyncer reads from ops.query_raw (not system.query_log)
	assert.Contains(t, query, "FROM ops.query_raw")
	assert.Contains(t, query, "test_cluster")
	assert.Contains(t, query, "toStartOfMinute(event_time)")
	assert.Contains(t, query, "quantileExact")
	assert.Contains(t, query, "event_time >= toDateTime('2024-01-01 12:00:00')")
	assert.Contains(t, query, "event_time < toDateTime('2024-01-01 12:05:00')")
}

func TestStorageMinSyncer_New(t *testing.T) {
	syncer := sync.NewStorageMinSyncer(1*time.Minute, "test_cluster")
	
	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "ops.storage_min", config.TableName)
	assert.Equal(t, 1*time.Minute, config.Interval)
}

func TestStorageMinSyncer_Sync_Success(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewStorageMinSyncer(1*time.Minute, "test_cluster")
	
	// Mock count queries
	countBeforeRow := NewMockRow(int64(0))
	countAfterRow := NewMockRow(int64(5))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.storage_min", []interface{}(nil)).Return(countBeforeRow).Once()
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.storage_min", []interface{}(nil)).Return(countAfterRow).Once()
	
	// Mock Exec for INSERT query
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.Equal(t, "ops.storage_min", result.TableName)
	assert.Equal(t, int64(5), result.RecordsProcessed)
	assert.NotZero(t, result.Duration)
	mockConn.AssertExpectations(t)
}

func TestStorageMinSyncer_BuildInsertSelectQuery(t *testing.T) {
	syncer := sync.NewStorageMinSyncer(1*time.Minute, "test_cluster")
	
	query := syncer.BuildInsertSelectQuery()
	
	assert.Contains(t, query, "INSERT INTO ops.storage_min")
	// The query should contain system.parts (with or without cluster function)
	assert.True(t,
		strings.Contains(query, "FROM cluster(test_cluster, system.parts)") ||
		strings.Contains(query, "FROM system.parts"),
		"Query should contain either cluster() function or direct system.parts reference")
	assert.Contains(t, query, "toStartOfMinute(now())")
}

func TestSyncer_GetLastTimestamp_Error(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	
	// Mock error on GetLastTimestamp
	mockRow := new(MockRow)
	mockRow.On("Scan", mock.Anything).Return(errors.New("database error"))
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRow)
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get last timestamp")
	assert.NotNil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestSyncer_Sync_ExecError(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	
	// Mock GetLastTimestamp - return zero time
	mockRowTimestamp := NewMockRow(time.Time{})
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRowTimestamp).Once()
	
	// Mock count query
	countBeforeRow := NewMockRow(int64(0))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.query_raw", []interface{}(nil)).Return(countBeforeRow)
	
	// Mock Exec to return error
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(errors.New("execution failed"))
	
	result, err := syncer.Sync(ctx, mockConn)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to execute sync query")
	assert.NotNil(t, result.Error)
	mockConn.AssertExpectations(t)
}
