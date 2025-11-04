package sync_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/mock"
)

func TestBaseSyncer_GetConfig(t *testing.T) {
	config := sync.SyncConfig{
		TableName:     "ops.test_table",
		Interval:      1 * time.Minute,
		LastTimestamp: time.Now(),
	}

	baseSyncer := sync.NewBaseSyncer(config)
	require.NotNil(t, baseSyncer)

	retrievedConfig := baseSyncer.GetConfig()
	assert.Equal(t, config.TableName, retrievedConfig.TableName)
	assert.Equal(t, config.Interval, retrievedConfig.Interval)
	assert.Equal(t, config.LastTimestamp, retrievedConfig.LastTimestamp)
}

func TestBaseSyncer_GetLastTimestamp_WithData(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	config := sync.SyncConfig{
		TableName: "ops.test_table",
		Interval:  1 * time.Minute,
	}
	
	baseSyncer := sync.NewBaseSyncer(config)
	
	expectedTime := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	mockRow := NewMockRow(expectedTime)
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRow)
	
	timestamp, err := baseSyncer.GetLastTimestamp(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.Equal(t, expectedTime, timestamp)
	mockConn.AssertExpectations(t)
}

func TestBaseSyncer_GetLastTimestamp_NoData(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	config := sync.SyncConfig{
		TableName: "ops.test_table",
		Interval:  1 * time.Minute,
	}
	
	baseSyncer := sync.NewBaseSyncer(config)
	
	// Mock row that returns sql.ErrNoRows error
	mockRow := new(MockRow)
	mockRow.On("Scan", mock.Anything).Return(errors.New("sql: no rows in result set"))
	mockConn.On("QueryRow", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(mockRow)
	
	timestamp, err := baseSyncer.GetLastTimestamp(ctx, mockConn)
	
	assert.NoError(t, err)
	assert.True(t, timestamp.IsZero())
	mockConn.AssertExpectations(t)
}

func TestBaseSyncer_ExecuteInsertSelectQuery_Success(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	config := sync.SyncConfig{
		TableName: "ops.test_table",
		Interval:  1 * time.Minute,
	}
	
	baseSyncer := sync.NewBaseSyncer(config)
	
	// Mock count queries
	countBeforeRow := NewMockRow(int64(10))
	countAfterRow := NewMockRow(int64(15))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.test_table", []interface{}(nil)).Return(countBeforeRow).Once()
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.test_table", []interface{}(nil)).Return(countAfterRow).Once()
	
	// Mock Exec for INSERT query
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(nil)
	
	query := "INSERT INTO ops.test_table SELECT * FROM source_table"
	recordsProcessed, err := baseSyncer.ExecuteInsertSelectQuery(ctx, mockConn, query)
	
	assert.NoError(t, err)
	assert.Equal(t, int64(5), recordsProcessed)
	mockConn.AssertExpectations(t)
}

func TestBaseSyncer_ExecuteInsertSelectQuery_InsertError(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	config := sync.SyncConfig{
		TableName: "ops.test_table",
		Interval:  1 * time.Minute,
	}
	
	baseSyncer := sync.NewBaseSyncer(config)
	
	// Mock count query before insert
	countBeforeRow := NewMockRow(int64(10))
	mockConn.On("QueryRow", ctx, "SELECT count() FROM ops.test_table", []interface{}(nil)).Return(countBeforeRow)
	
	// Mock Exec to return error
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), []interface{}(nil)).Return(errors.New("execution failed"))
	
	query := "INSERT INTO ops.test_table SELECT * FROM source_table"
	recordsProcessed, err := baseSyncer.ExecuteInsertSelectQuery(ctx, mockConn, query)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to execute insert-select query")
	assert.Equal(t, int64(0), recordsProcessed)
	mockConn.AssertExpectations(t)
}

func TestBaseSyncer_UpdateLastTimestamp(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)
	
	config := sync.SyncConfig{
		TableName: "ops.test_table",
		Interval:  1 * time.Minute,
	}
	
	baseSyncer := sync.NewBaseSyncer(config)
	
	timestamp := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	err := baseSyncer.UpdateLastTimestamp(ctx, mockConn, timestamp)
	
	assert.NoError(t, err)
	updatedConfig := baseSyncer.GetConfig()
	assert.Equal(t, timestamp, updatedConfig.LastTimestamp)
}
