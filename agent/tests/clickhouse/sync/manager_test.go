package sync_test

import (
	"context"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"
	"clickhouse-ops/internal/config"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestManager_New(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	require.NotNil(t, manager)
}

func TestManager_RegisterSyncer(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	err := manager.RegisterSyncer(syncer)
	
	assert.NoError(t, err)
}

func TestManager_RegisterSyncer_Duplicate(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer1 := sync.NewQueryRawSyncer(1 * time.Minute)
	syncer2 := sync.NewQueryRawSyncer(2 * time.Minute)
	
	err1 := manager.RegisterSyncer(syncer1)
	assert.NoError(t, err1)
	
	err2 := manager.RegisterSyncer(syncer2)
	assert.Error(t, err2)
	assert.Contains(t, err2.Error(), "already registered")
}

func TestManager_RegisterSyncer_Multiple(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer1 := sync.NewQueryRawSyncer(1 * time.Minute)
	syncer2 := sync.NewPartLogRawSyncer(1 * time.Minute)
	syncer3 := sync.NewQueryAggMinSyncer(5*time.Minute, "test_cluster")
	
	err1 := manager.RegisterSyncer(syncer1)
	assert.NoError(t, err1)
	
	err2 := manager.RegisterSyncer(syncer2)
	assert.NoError(t, err2)
	
	err3 := manager.RegisterSyncer(syncer3)
	assert.NoError(t, err3)
}

func TestManager_Start_NoSyncers(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	ctx := context.Background()
	err := manager.Start(ctx)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no syncers registered")
}

func TestManager_Start_NoConnections(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	clusterManager.On("GetWorkingConnections").Return(0)
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	manager.RegisterSyncer(syncer)
	
	ctx := context.Background()
	err := manager.Start(ctx)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no working ClickHouse connections")
}

func TestManager_GetStatus(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	status := manager.GetStatus()
	
	assert.NotNil(t, status)
	assert.IsType(t, map[string]sync.SyncResult{}, status)
}

func TestManager_Stop(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	
	manager := sync.NewManager(log, clusterManager)
	
	err := manager.Stop()
	
	assert.NoError(t, err)
}

func TestManager_Start_WithSyncers(t *testing.T) {
	log := setupTestLogger(t)
	nodes := []config.ClickHouseNode{
		{Name: "node1", Host: "localhost", Port: 9000},
	}
	clusterManager := NewMockClusterManager(nodes)
	clusterManager.On("GetWorkingConnections").Return(1)
	
	mockConn := new(MockConn)
	clusterManager.On("GetConnectionByNodeName", "node1").Return(mockConn, 0, nil)
	
	// Setup mocks for GetLastTimestamp query (QueryRow)
	// The query will return zero time indicating no previous data
	mockRowTimestamp := NewMockRow(time.Time{})
	mockConn.On("QueryRow", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(mockRowTimestamp).Maybe()
	
	// Setup mock for Exec (for INSERT INTO SELECT)
	mockConn.On("Exec", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(nil).Maybe()
	
	// Setup mock for count queries
	countRow := NewMockRow(int64(0))
	mockConn.On("QueryRow", mock.Anything, "SELECT count() FROM ops.query_raw", mock.Anything).Return(countRow).Maybe()
	
	// Setup mock for max timestamp query
	maxTsRow := NewMockRow(time.Time{})
	mockConn.On("QueryRow", mock.Anything, "SELECT max(event_time) FROM ops.query_raw", mock.Anything).Return(maxTsRow).Maybe()
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	manager.RegisterSyncer(syncer)
	
	// Use context with timeout to prevent test from hanging
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	err := manager.Start(ctx)
	
	// Start should succeed
	assert.NoError(t, err)
	
	// Give a small delay for sync to potentially start
	time.Sleep(50 * time.Millisecond)
	
	// Stop the manager
	// Note: Stop() might wait for sync to complete, so we use context timeout above
	err = manager.Stop()
	assert.NoError(t, err)
	
	// Note: We use Maybe() for mocks since goroutines execution timing is unpredictable
}
