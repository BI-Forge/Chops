package sync_test

import (
	"context"
	"testing"
	"time"

	"clickhouse-ops/internal/clickhouse/sync"
	"clickhouse-ops/internal/config"

	"github.com/stretchr/testify/assert"
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
	
	manager := sync.NewManager(log, clusterManager)
	
	syncer := sync.NewQueryRawSyncer(1 * time.Minute)
	manager.RegisterSyncer(syncer)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	err := manager.Start(ctx)
	
	// Start should succeed, but we'll stop it immediately
	assert.NoError(t, err)
	
	// Stop the manager
	err = manager.Stop()
	assert.NoError(t, err)
}
