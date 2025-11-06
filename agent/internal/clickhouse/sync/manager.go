package sync

import (
	"context"
	"fmt"
	"sync"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/logger"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// Manager implements SyncManager interface
type Manager struct {
	syncers    map[string]TableSyncer
	status     map[string]SyncResult
	mu         sync.RWMutex
	logger     *logger.Logger
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	cluster    ClusterManagerInterface
}

// ClusterManagerInterface defines the interface for cluster management
type ClusterManagerInterface interface {
	GetAllNodes() []config.ClickHouseNode
	GetWorkingConnections() int
	GetConnection() (driver.Conn, int, error)
	GetConnectionByNodeName(string) (driver.Conn, int, error)
}

// NewManager creates a new sync manager
func NewManager(log *logger.Logger, cluster ClusterManagerInterface) *Manager {
	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{
		syncers: make(map[string]TableSyncer),
		status:  make(map[string]SyncResult),
		logger:  log,
		ctx:     ctx,
		cancel:  cancel,
		cluster: cluster,
	}
}

// RegisterSyncer registers a new table syncer
func (m *Manager) RegisterSyncer(syncer TableSyncer) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	config := syncer.GetConfig()
	tableName := config.TableName
	
	if _, exists := m.syncers[tableName]; exists {
		return fmt.Errorf("syncer for table %s already registered", tableName)
	}
	
	m.syncers[tableName] = syncer
	
	if m.logger != nil {
		m.logger.Infof("Registered syncer for table %s with interval %v", tableName, config.Interval)
	}
	
	return nil
}

// Start starts all registered synchronizations on all available nodes
func (m *Manager) Start(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if len(m.syncers) == 0 {
		return fmt.Errorf("no syncers registered")
	}
	
	if m.cluster == nil {
		return fmt.Errorf("cluster manager not set")
	}
	
	// Get all available nodes
	nodes := m.cluster.GetAllNodes()
	workingConnections := m.cluster.GetWorkingConnections()
	
	if workingConnections == 0 {
		return fmt.Errorf("no working ClickHouse connections available")
	}
	
	if m.logger != nil {
		m.logger.Infof("Starting sync on %d nodes (%d working connections)", len(nodes), workingConnections)
	}
	
	// Start each syncer on each available node
	for _, node := range nodes {
		for tableName, syncer := range m.syncers {
			m.wg.Add(1)
			go m.runSyncerOnNode(ctx, tableName, syncer, node)
		}
	}
	
	if m.logger != nil {
		m.logger.Infof("Started %d table synchronizations on %d nodes", len(m.syncers), len(nodes))
	}
	
	return nil
}

// Stop stops all synchronizations
func (m *Manager) Stop() error {
	m.cancel()
	m.wg.Wait()
	
	if m.logger != nil {
		m.logger.Info("All table synchronizations stopped")
	}
	
	return nil
}

// GetStatus returns the status of all synchronizations
func (m *Manager) GetStatus() map[string]SyncResult {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Return a copy of the status
	statusCopy := make(map[string]SyncResult)
	for k, v := range m.status {
		statusCopy[k] = v
	}
	
	return statusCopy
}

// runSyncerOnNode runs a single syncer on a specific node
func (m *Manager) runSyncerOnNode(ctx context.Context, tableName string, syncer TableSyncer, node config.ClickHouseNode) {
	defer m.wg.Done()
	
	config := syncer.GetConfig()
	ticker := time.NewTicker(config.Interval)
	defer ticker.Stop()
	
	// Run initial sync
	m.executeSyncOnNode(ctx, tableName, syncer, node)
	
	for {
		select {
		case <-ctx.Done():
			if m.logger != nil {
				m.logger.Infof("Stopping syncer for table %s on node %s", tableName, node.Name)
			}
			return
		case <-ticker.C:
			m.executeSyncOnNode(ctx, tableName, syncer, node)
		}
	}
}

// executeSyncOnNode executes a single synchronization on a specific node
func (m *Manager) executeSyncOnNode(ctx context.Context, tableName string, syncer TableSyncer, node config.ClickHouseNode) {
	startTime := time.Now()
	
	// Get connection from cluster manager for specific node
	conn, _, err := m.cluster.GetConnectionByNodeName(node.Name)
	if err != nil {
		result := SyncResult{
			TableName: tableName,
			Error:     fmt.Errorf("failed to get connection: %w", err),
			Duration:  time.Since(startTime),
		}
		
		// Update status
		m.mu.Lock()
		m.status[fmt.Sprintf("%s_%s", tableName, node.Name)] = result
		m.mu.Unlock()
		
		if m.logger != nil {
			m.logger.Errorf("Sync failed for table %s on node %s: %v", tableName, node.Name, result.Error)
		}
		return
	}
	
	// Add node name to context for syncers that need it
	syncCtx := context.WithValue(ctx, "node_name", node.Name)
	
	// Execute synchronization
	result, err := syncer.Sync(syncCtx, conn)
	if err != nil {
		result.Error = err
	}
	
	result.Duration = time.Since(startTime)
	
	// Update status with node-specific key
	m.mu.Lock()
	m.status[fmt.Sprintf("%s_%s", tableName, node.Name)] = result
	m.mu.Unlock()
	
	// Log sync status to PostgreSQL
	var status string
	var errorMessage *string
	var lastTimestamp *time.Time
	var durationMs *int
	
	if result.Error != nil {
		status = "error"
		errMsg := result.Error.Error()
		errorMessage = &errMsg
	} else {
		status = "success"
	}
	
	if !result.LastTimestamp.IsZero() {
		lastTimestamp = &result.LastTimestamp
	}
	
	durationMsInt := int(result.Duration.Milliseconds())
	durationMs = &durationMsInt
	
	// Log to PostgreSQL (async, don't block sync)
	go func() {
		if err := db.LogSyncStatus(tableName, node.Name, status, result.RecordsProcessed, lastTimestamp, durationMs, errorMessage); err != nil {
			if m.logger != nil {
				m.logger.Errorf("Failed to log sync status to PostgreSQL: %v", err)
			}
		}
	}()
	
	if m.logger != nil {
		if result.Error != nil {
			m.logger.Errorf("Sync failed for table %s on node %s: %v", tableName, node.Name, result.Error)
		} else {
			m.logger.Infof("Sync completed for table %s on node %s: %d records in %v", 
				tableName, node.Name, result.RecordsProcessed, result.Duration)
		}
	}
}
