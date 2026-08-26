package clickhouse

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

var (
	clickhouseInstance *Manager
	clickhouseOnce     sync.Once
)

// Manager manages ClickHouse connection and query execution
type Manager struct {
	cluster    *ClusterManager
	executor   *QueryExecutor
	config     *config.ClickHouseConfig
	logger     *logger.Logger
	onReady    func()
	ready      bool
	readyMu    sync.Mutex
	executorMu sync.Mutex
}

// GetInstance returns the singleton ClickHouse manager
func GetInstance() *Manager {
	return clickhouseInstance
}

// GetClusterManager returns the cluster manager
func (m *Manager) GetClusterManager() *ClusterManager {
	return m.cluster
}

// SetOnReady registers a callback invoked once when ClickHouse becomes usable.
// If already ready, the callback runs asynchronously immediately.
func (m *Manager) SetOnReady(fn func()) {
	if m == nil || fn == nil {
		return
	}
	m.readyMu.Lock()
	m.onReady = fn
	alreadyReady := m.ready
	m.readyMu.Unlock()
	if alreadyReady {
		go fn()
	}
}

// IsReady reports whether at least one CH connection and the query executor are available.
func (m *Manager) IsReady() bool {
	if m == nil || m.cluster == nil {
		return false
	}
	m.executorMu.Lock()
	ready := m.executor != nil && m.cluster.GetWorkingConnections() > 0
	m.executorMu.Unlock()
	return ready
}

func (m *Manager) fireReady() {
	m.readyMu.Lock()
	if m.ready {
		m.readyMu.Unlock()
		return
	}
	m.ready = true
	fn := m.onReady
	m.readyMu.Unlock()
	if fn != nil {
		go fn()
	}
}

// Connect initializes the ClickHouse manager (should be called once at startup).
// Returns nil even when no nodes are reachable so HTTP/auth can start; reconnect runs in background.
func Connect(cfg *config.ClickHouseConfig, log *logger.Logger) error {
	var err error
	clickhouseOnce.Do(func() {
		clickhouseInstance = &Manager{
			config: cfg,
			logger: log,
		}

		clickhouseInstance.cluster, err = NewClusterManagerWithRetry(cfg, log)
		if err != nil {
			return
		}

		conn, _, connErr := clickhouseInstance.cluster.GetConnection()
		if connErr != nil {
			if log != nil {
				log.Warningf("No ClickHouse nodes available yet: %v; HTTP server will start and CH will reconnect in background", connErr)
			}
			go clickhouseInstance.ensureExecutorLoop()
			return
		}

		executor, execErr := NewQueryExecutor(conn, cfg, log)
		if execErr != nil {
			if log != nil {
				log.Warningf("Failed to create ClickHouse query executor: %v; will retry in background", execErr)
			}
			go clickhouseInstance.ensureExecutorLoop()
			return
		}

		clickhouseInstance.executorMu.Lock()
		clickhouseInstance.executor = executor
		clickhouseInstance.executorMu.Unlock()
		clickhouseInstance.fireReady()
		go clickhouseInstance.testConnectionWithRetry()
	})

	return err
}

// ensureExecutorLoop waits until a cluster connection is available, then creates the executor.
func (m *Manager) ensureExecutorLoop() {
	retryDelay := 5 * time.Second
	for {
		m.executorMu.Lock()
		hasExecutor := m.executor != nil
		m.executorMu.Unlock()
		if hasExecutor {
			m.fireReady()
			go m.testConnectionWithRetry()
			return
		}

		conn, _, err := m.cluster.GetConnection()
		if err == nil {
			executor, execErr := NewQueryExecutor(conn, m.config, m.logger)
			if execErr == nil {
				m.executorMu.Lock()
				m.executor = executor
				m.executorMu.Unlock()
				if m.logger != nil {
					m.logger.Info("ClickHouse query executor initialized after reconnect")
				}
				m.fireReady()
				go m.testConnectionWithRetry()
				return
			}
			if m.logger != nil {
				m.logger.Warningf("Failed to create ClickHouse query executor after reconnect: %v", execErr)
			}
		}

		time.Sleep(retryDelay)
		retryDelay *= 2
		if retryDelay > 60*time.Second {
			retryDelay = 60 * time.Second
		}
	}
}

// GetCluster returns the cluster manager
func (m *Manager) GetCluster() *ClusterManager {
	return m.cluster
}

// GetExecutor returns the query executor
func (m *Manager) GetExecutor() *QueryExecutor {
	return m.executor
}

// Close closes the ClickHouse connection
func (m *Manager) Close() error {
	if m.cluster != nil {
		return m.cluster.Close()
	}
	return nil
}

// testConnection tests the ClickHouse connection and validates version
func (m *Manager) testConnection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Test ping
	if err := m.executor.Ping(ctx); err != nil {
		if m.logger != nil {
			m.logger.Errorf("ClickHouse ping failed: %v", err)
		}
		return err
	}

	// Get and validate server version
	version, err := m.executor.GetServerVersion(ctx)
	if err != nil {
		if m.logger != nil {
			m.logger.Errorf("Failed to get ClickHouse version: %v", err)
		}
		return err
	}

	// Validate version constraints using utils
	utils := NewValidationUtils(m.config, m.logger)
	if err := utils.ValidateVersionWithConnection(ctx, m.executor.GetConnection()); err != nil {
		if m.logger != nil {
			m.logger.Errorf("ClickHouse version validation failed: %v", err)
		}
		return err
	}

	if m.logger != nil {
		m.logger.Infof("ClickHouse connection validated successfully (version: %s)", version)
	}

	return nil
}

// HealthCheck performs a health check on ClickHouse
func (m *Manager) HealthCheck(ctx context.Context) error {
	if m.cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	// Check all nodes in cluster (works even when executor is not ready yet)
	results := m.cluster.HealthCheck(ctx)
	workingNodes := 0
	for nodeAddr, err := range results {
		if err != nil {
			if m.logger != nil {
				m.logger.Errorf("Node %s health check failed: %v", nodeAddr, err)
			}
		} else {
			workingNodes++
		}
	}

	if workingNodes == 0 {
		// Don't return error — application should continue running without CH
		if m.logger != nil {
			m.logger.Warning("No working ClickHouse nodes available, but application continues running")
		}
		return nil
	}

	if m.logger != nil {
		m.logger.Infof("Cluster health check: %d/%d nodes working",
			workingNodes, len(results))
	}

	return nil
}

// GetConnectionInfo returns connection information
func (m *Manager) GetConnectionInfo() map[string]interface{} {
	info := map[string]interface{}{
		"nodes":               m.cluster.GetAllNodes(),
		"working_connections": m.cluster.GetWorkingConnections(),
		"total_nodes":         len(m.cluster.GetAllNodes()),
		"global_settings":     m.config.GlobalSettings,
	}

	return info
}

// testConnectionWithRetry tests the ClickHouse connection with infinite retry
func (m *Manager) testConnectionWithRetry() {
	retryDelay := 5 * time.Second

	for {
		if m.executor == nil {
			time.Sleep(retryDelay)
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err := m.executor.Ping(ctx)
		cancel()

		if err != nil {
			if m.logger != nil {
				// Get current node info for logging
				nodeInfo := "unknown"
				if m.cluster != nil && len(m.cluster.GetAllNodes()) > 0 {
					nodes := m.cluster.GetAllNodes()
					var nodeNames []string
					for _, node := range nodes {
						nodeNames = append(nodeNames, fmt.Sprintf("'%s' (%s:%d)", node.Name, node.Host, node.Port))
					}
					nodeInfo = strings.Join(nodeNames, ", ")
				}
				m.logger.Errorf("ClickHouse connection test failed for nodes [%s]: %v, retrying in %v...", nodeInfo, err, retryDelay)
			}
			time.Sleep(retryDelay)

			// Exponential backoff with cap
			retryDelay *= 2
			if retryDelay > 60*time.Second {
				retryDelay = 60 * time.Second
			}
		} else {
			if m.logger != nil {
				// Get current node info for logging
				nodeInfo := "unknown"
				if m.cluster != nil && len(m.cluster.GetAllNodes()) > 0 {
					nodes := m.cluster.GetAllNodes()
					var nodeNames []string
					for _, node := range nodes {
						nodeNames = append(nodeNames, fmt.Sprintf("'%s' (%s:%d)", node.Name, node.Host, node.Port))
					}
					nodeInfo = strings.Join(nodeNames, ", ")
				}
				m.logger.Infof("ClickHouse connection test successful for nodes [%s]", nodeInfo)
			}
			// Reset retry delay on success
			retryDelay = 5 * time.Second

			// Wait before next test
			time.Sleep(30 * time.Second)
		}
	}
}
