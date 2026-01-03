package sync_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"
	"clickhouse-ops/internal/config"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMetricsSnapshot_New(t *testing.T) {
	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	require.NotNil(t, syncer)
	config := syncer.GetConfig()
	assert.Equal(t, "metrics", config.TableName)
	assert.Equal(t, 1*time.Second, config.Interval)
}

func TestMetricsSnapshot_Sync_NoNodeConfig(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	result, err := syncer.Sync(ctx, mockConn)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "node config not found in context")
	assert.NotNil(t, result.Error)
}

func TestMetricsSnapshot_Sync_TableNotFoundError(t *testing.T) {
	nodeConfig := config.ClickHouseNode{
		Name:          "test_node",
		MetricsSchema: "ops",
		MetricsTable:  "metrics_snapshot",
	}
	ctx := context.WithValue(context.Background(), "node_config", nodeConfig)
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// First call: INSERT fails with table not found error
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), mock.Anything).
		Return(errors.New("Table ops.metrics_snapshot doesn't exist")).
		Once()

	// Second call: CREATE DATABASE
	mockConn.On("Exec", ctx, "CREATE DATABASE IF NOT EXISTS ops", mock.Anything).
		Return(nil).
		Once()

	// Third call: CREATE TABLE
	mockConn.On("Exec", ctx, mock.MatchedBy(func(query string) bool {
		return len(query) > 0 && query != "CREATE DATABASE IF NOT EXISTS ops"
	}), mock.Anything).
		Return(nil).
		Once()

	// Fourth call: Retry INSERT
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), mock.Anything).
		Return(nil).
		Once()

	result, err := syncer.Sync(ctx, mockConn)

	assert.NoError(t, err)
	assert.Nil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestMetricsSnapshot_Sync_OtherError(t *testing.T) {
	nodeConfig := config.ClickHouseNode{
		Name:          "test_node",
		MetricsSchema: "ops",
		MetricsTable:  "metrics_snapshot",
	}
	ctx := context.WithValue(context.Background(), "node_config", nodeConfig)
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// INSERT fails with non-table-not-found error
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), mock.Anything).
		Return(errors.New("connection error")).
		Once()

	result, err := syncer.Sync(ctx, mockConn)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection error")
	assert.NotNil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestMetricsSnapshot_Sync_Success(t *testing.T) {
	nodeConfig := config.ClickHouseNode{
		Name:          "test_node",
		MetricsSchema: "ops",
		MetricsTable:  "metrics_snapshot",
	}
	ctx := context.WithValue(context.Background(), "node_config", nodeConfig)
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// INSERT succeeds
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), mock.Anything).
		Return(nil).
		Once()

	result, err := syncer.Sync(ctx, mockConn)

	assert.NoError(t, err)
	assert.Nil(t, result.Error)
	assert.Equal(t, int64(1), result.RecordsProcessed)
	mockConn.AssertExpectations(t)
}

func TestMetricsSnapshot_Sync_DefaultSchemaAndTable(t *testing.T) {
	nodeConfig := config.ClickHouseNode{
		Name: "test_node",
		// MetricsSchema and MetricsTable are empty, should use defaults
	}
	ctx := context.WithValue(context.Background(), "node_config", nodeConfig)
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// INSERT succeeds
	mockConn.On("Exec", ctx, mock.AnythingOfType("string"), mock.Anything).
		Return(nil).
		Once()

	result, err := syncer.Sync(ctx, mockConn)

	assert.NoError(t, err)
	assert.Nil(t, result.Error)
	mockConn.AssertExpectations(t)
}

func TestMetricsSnapshot_GetLastTimestamp(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// GetLastTimestamp should always return zero time for metrics snapshot
	timestamp, err := syncer.GetLastTimestamp(ctx, mockConn)

	assert.NoError(t, err)
	assert.True(t, timestamp.IsZero())
}

func TestMetricsSnapshot_UpdateLastTimestamp(t *testing.T) {
	ctx := context.Background()
	mockConn := new(MockConn)

	syncer := sync.NewMetricsSnapshot(1*time.Second, "test_cluster")

	// UpdateLastTimestamp should always succeed for metrics snapshot
	timestamp := time.Now()
	err := syncer.UpdateLastTimestamp(ctx, mockConn, timestamp)

	assert.NoError(t, err)
}
