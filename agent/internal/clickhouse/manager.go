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
	cluster  *ClusterManager
	executor *QueryExecutor
	config   *config.ClickHouseConfig
	logger   *logger.Logger
}

// GetInstance returns the singleton ClickHouse manager
func GetInstance() *Manager {
	return clickhouseInstance
}

// GetClusterManager returns the cluster manager
func (m *Manager) GetClusterManager() *ClusterManager {
	return m.cluster
}

// Connect initializes the ClickHouse manager (should be called once at startup)
func Connect(cfg *config.ClickHouseConfig, log *logger.Logger) error {
	var err error
	clickhouseOnce.Do(func() {
		clickhouseInstance = &Manager{
			config: cfg,
			logger: log,
		}

		// Use cluster manager for all connections with retry logic
		clickhouseInstance.cluster, err = NewClusterManagerWithRetry(cfg, log)
		if err != nil {
			return
		}

		// Get first working connection for executor
		conn, _, err := clickhouseInstance.cluster.GetConnection()
		if err != nil {
			clickhouseInstance.cluster.Close()
			return
		}

		// Create query executor with cluster connection
		clickhouseInstance.executor, err = NewQueryExecutor(conn, cfg, log)
		if err != nil {
			clickhouseInstance.cluster.Close()
			return
		}

		// Test connection and get version (non-blocking)
		go clickhouseInstance.testConnectionWithRetry()
	})

	return err
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
	if m.executor == nil {
		return fmt.Errorf("ClickHouse executor not initialized")
	}

	// Check all nodes in cluster
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
		// Don't return error, just log it - application should continue running
		if m.logger != nil {
			m.logger.Warning("No working ClickHouse nodes available, but application continues running")
		}
		return nil // Return nil to prevent application crash
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
