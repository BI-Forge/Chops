package clickhouse

import (
	"context"
	"fmt"
	"math/rand"
	"sort"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClusterManager manages connections to multiple ClickHouse nodes
type ClusterManager struct {
	nodes        []config.ClickHouseNode
	conns        []driver.Conn
	nodeVersions []string // Version of each node
	config       *config.ClickHouseConfig
	logger       *logger.Logger
	current      int // Current node index for round-robin
}

// NewClusterManagerWithRetry creates a new cluster manager with infinite retry logic
func NewClusterManagerWithRetry(cfg *config.ClickHouseConfig, log *logger.Logger) (*ClusterManager, error) {
	// Get connection nodes
	nodes, err := getConnectionNodes(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection nodes: %w", err)
	}

	// Sort nodes by priority (lower number = higher priority)
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Priority < nodes[j].Priority
	})

	cm := &ClusterManager{
		nodes:  nodes,
		config: cfg,
		logger: log,
	}

	// Initialize node versions array
	cm.nodeVersions = make([]string, len(nodes))

	// Initialize connections with infinite retry
	if err := cm.initializeConnectionsWithRetry(); err != nil {
		return nil, fmt.Errorf("failed to initialize connections: %w", err)
	}

	return cm, nil
}

// NewClusterManager creates a new cluster manager
func NewClusterManager(cfg *config.ClickHouseConfig, log *logger.Logger) (*ClusterManager, error) {
	// Get connection nodes
	nodes, err := getConnectionNodes(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection nodes: %w", err)
	}

	// Sort nodes by priority (lower number = higher priority)
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Priority < nodes[j].Priority
	})

	cm := &ClusterManager{
		nodes:  nodes,
		config: cfg,
		logger: log,
	}

	// Initialize node versions array
	cm.nodeVersions = make([]string, len(nodes))

	// Initialize connections to all nodes
	if err := cm.initializeConnections(); err != nil {
		return nil, fmt.Errorf("failed to initialize connections: %w", err)
	}

	return cm, nil
}

// initializeConnections establishes connections to all nodes
func (cm *ClusterManager) initializeConnections() error {
	cm.conns = make([]driver.Conn, len(cm.nodes))

	for i, node := range cm.nodes {
		conn, err := cm.connectToNode(node)
		if err != nil {
			if cm.logger != nil {
				cm.logger.Errorf("Failed to connect to node %s:%d: %v", node.Host, node.Port, err)
			}
			// Continue with other nodes, but mark this one as nil
			cm.conns[i] = nil
			continue
		}

		cm.conns[i] = conn
		if cm.logger != nil {
			cm.logger.Infof("Connected to ClickHouse node %s (%s:%d) (priority: %d, weight: %d)",
				node.Name, node.Host, node.Port, node.Priority, node.Weight)
		}
	}

	// Check if we have at least one working connection
	workingConnections := 0
	for _, conn := range cm.conns {
		if conn != nil {
			workingConnections++
		}
	}

	if workingConnections == 0 {
		return fmt.Errorf("no working connections to any ClickHouse node")
	}

	if cm.logger != nil {
		cm.logger.Infof("Cluster manager initialized with %d/%d working connections",
			workingConnections, len(cm.nodes))
	}

	return nil
}

// initializeConnectionsWithRetry establishes connections to all nodes with infinite retry
func (cm *ClusterManager) initializeConnectionsWithRetry() error {
	cm.conns = make([]driver.Conn, len(cm.nodes))

	// Try to connect to at least one node
	connected := false
	retryDelay := 5 * time.Second

	for !connected {
		connected = true

		for i, node := range cm.nodes {
			if cm.conns[i] != nil {
				continue // Already connected
			}

			conn, err := cm.connectToNode(node)
			if err != nil {
				if cm.logger != nil {
					cm.logger.Errorf("Failed to connect to ClickHouse node '%s' (%s:%d): %v",
						node.Name, node.Host, node.Port, err)
				}
				cm.conns[i] = nil
				connected = false
			} else {
				cm.conns[i] = conn

				// Get and store version
				version, err := cm.getClickHouseVersion(conn)
				if err != nil {
					if cm.logger != nil {
						cm.logger.Warningf("Failed to get version for node '%s' (%s:%d): %v",
							node.Name, node.Host, node.Port, err)
					}
					cm.nodeVersions[i] = "unknown"
				} else {
					cm.nodeVersions[i] = version
					if cm.logger != nil {
						cm.logger.Infof("Connected to ClickHouse node '%s' (%s:%d) version %s (priority: %d, weight: %d)",
							node.Name, node.Host, node.Port, version, node.Priority, node.Weight)
					}
				}
			}
		}

		if !connected {
			if cm.logger != nil {
				cm.logger.Errorf("No ClickHouse nodes available, retrying in %v... (nodes: %v)", retryDelay,
					func() []string {
						var nodeNames []string
						for _, node := range cm.nodes {
							nodeNames = append(nodeNames, fmt.Sprintf("'%s' (%s:%d)", node.Name, node.Host, node.Port))
						}
						return nodeNames
					}())
			}
			time.Sleep(retryDelay)

			// Exponential backoff with cap
			retryDelay *= 2
			if retryDelay > 60*time.Second {
				retryDelay = 60 * time.Second
			}
		}
	}

	if cm.logger != nil {
		workingConnections := 0
		for _, conn := range cm.conns {
			if conn != nil {
				workingConnections++
			}
		}
		cm.logger.Infof("Cluster manager initialized with %d/%d working connections",
			workingConnections, len(cm.nodes))
	}

	return nil
}

// getClickHouseVersion retrieves the version of a ClickHouse node
func (cm *ClusterManager) getClickHouseVersion(conn driver.Conn) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return getServerVersion(ctx, conn)
}

// connectToNode creates a connection to a specific node
func (cm *ClusterManager) connectToNode(node config.ClickHouseNode) (driver.Conn, error) {
	// Parse timeouts from global settings
	dialTimeout, err := time.ParseDuration(cm.config.GlobalSettings.DialTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid dial_timeout: %w", err)
	}

	readTimeout, err := time.ParseDuration(cm.config.GlobalSettings.ReadTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid read_timeout: %w", err)
	}

	_, err = time.ParseDuration(cm.config.GlobalSettings.WriteTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid write_timeout: %w", err)
	}

	connMaxLifetime, err := time.ParseDuration(cm.config.GlobalSettings.ConnMaxLifetime)
	if err != nil {
		return nil, fmt.Errorf("invalid conn_max_lifetime: %w", err)
	}

	// Build connection options
	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", node.Host, node.Port)},
		Auth: clickhouse.Auth{
			Database: node.Database,
			Username: node.Username,
			Password: node.Password,
		},
		DialTimeout: dialTimeout,
		ReadTimeout: readTimeout,
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		MaxOpenConns:    cm.config.GlobalSettings.MaxOpenConns,
		MaxIdleConns:    cm.config.GlobalSettings.MaxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
	}

	// Configure TLS if secure (use node-specific or global setting)
	useSecure := false
	if node.Secure != nil {
		useSecure = *node.Secure
	} else {
		useSecure = cm.config.GlobalSettings.Secure
	}

	if useSecure {
		// TLS configuration will be handled by the driver
		// Note: TLS configuration may need to be set differently based on driver version
	}

	// Configure compression (use node-specific or global setting)
	compression := cm.config.GlobalSettings.Compression
	if node.Compression != "" {
		compression = node.Compression
	}

	if compression != "" {
		switch compression {
		case "lz4":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionLZ4}
		case "gzip":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionGZIP}
		case "deflate":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionDeflate}
		case "brotli":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionBrotli}
		}
	}

	// Connect to the node
	conn, err := clickhouse.Open(options)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s:%d: %w", node.Host, node.Port, err)
	}

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := conn.Ping(ctx); err != nil {
		conn.Close()
		return nil, fmt.Errorf("ping failed for %s:%d: %w", node.Host, node.Port, err)
	}

	// Get and validate version
	version, err := cm.getClickHouseVersion(conn)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to get version for %s:%d: %w", node.Host, node.Port, err)
	}

	// Validate version using utils
	utils := NewValidationUtils(cm.config, cm.logger)
	if err := utils.ValidateVersionConstraints(version); err != nil {
		conn.Close()
		return nil, fmt.Errorf("version validation failed for %s:%d (version %s): %w", node.Host, node.Port, version, err)
	}

	return conn, nil
}

// GetConnection returns a connection using load balancing strategy
func (cm *ClusterManager) GetConnection() (driver.Conn, int, error) {
	// Find available connections
	available := make([]int, 0)
	for i, conn := range cm.conns {
		if conn != nil {
			available = append(available, i)
		}
	}

	if len(available) == 0 {
		return nil, -1, fmt.Errorf("no available connections")
	}

	// Use weighted round-robin selection
	nodeIndex := cm.selectNode(available)

	// Validate node version before returning connection
	if err := cm.ValidateNodeVersion(nodeIndex); err != nil {
		// Remove this node from available nodes and try again
		newAvailable := make([]int, 0)
		for _, idx := range available {
			if idx != nodeIndex {
				newAvailable = append(newAvailable, idx)
			}
		}

		if len(newAvailable) == 0 {
			return nil, -1, fmt.Errorf("no nodes with valid versions available: %w", err)
		}

		// Try with remaining nodes
		return cm.GetConnection()
	}

	conn := cm.conns[nodeIndex]
	return conn, nodeIndex, nil
}

// selectNode selects a node using weighted round-robin
func (cm *ClusterManager) selectNode(available []int) int {
	if len(available) == 1 {
		return available[0]
	}

	// Calculate total weight
	totalWeight := 0
	for _, i := range available {
		totalWeight += cm.nodes[i].Weight
	}

	if totalWeight == 0 {
		// Fallback to simple round-robin
		cm.current = (cm.current + 1) % len(available)
		return available[cm.current]
	}

	// Weighted selection
	rand.Seed(time.Now().UnixNano())
	target := rand.Intn(totalWeight)

	currentWeight := 0
	for _, i := range available {
		currentWeight += cm.nodes[i].Weight
		if target < currentWeight {
			return i
		}
	}

	// Fallback to first available
	return available[0]
}

// GetNodeInfo returns information about a specific node
func (cm *ClusterManager) GetNodeInfo(index int) (config.ClickHouseNode, bool) {
	if index < 0 || index >= len(cm.nodes) {
		return config.ClickHouseNode{}, false
	}
	return cm.nodes[index], true
}

// GetAllNodes returns information about all nodes
func (cm *ClusterManager) GetAllNodes() []config.ClickHouseNode {
	return cm.nodes
}

// GetWorkingConnections returns the number of working connections
func (cm *ClusterManager) GetWorkingConnections() int {
	count := 0
	for _, conn := range cm.conns {
		if conn != nil {
			count++
		}
	}
	return count
}

// Close closes all connections
func (cm *ClusterManager) Close() error {
	var lastErr error
	for i, conn := range cm.conns {
		if conn != nil {
			if err := conn.Close(); err != nil {
				if cm.logger != nil {
					cm.logger.Errorf("Failed to close connection to node %s (%s:%d): %v",
						cm.nodes[i].Name, cm.nodes[i].Host, cm.nodes[i].Port, err)
				}
				lastErr = err
			}
		}
	}
	return lastErr
}

// HealthCheck performs health check on all nodes
func (cm *ClusterManager) HealthCheck(ctx context.Context) map[string]error {
	results := make(map[string]error)

	for i, conn := range cm.conns {
		if conn == nil {
			results[fmt.Sprintf("%s:%d", cm.nodes[i].Host, cm.nodes[i].Port)] =
				fmt.Errorf("no connection")
			continue
		}

		// Test connection with timeout
		testCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err := conn.Ping(testCtx)
		cancel()

		nodeAddr := fmt.Sprintf("%s (%s:%d)", cm.nodes[i].Name, cm.nodes[i].Host, cm.nodes[i].Port)
		results[nodeAddr] = err
	}

	return results
}

// ValidateNodeVersion checks if a node's version is valid before executing queries
func (cm *ClusterManager) ValidateNodeVersion(nodeIndex int) error {
	if nodeIndex < 0 || nodeIndex >= len(cm.nodeVersions) {
		return fmt.Errorf("invalid node index: %d", nodeIndex)
	}

	version := cm.nodeVersions[nodeIndex]
	if version == "" || version == "unknown" {
		return fmt.Errorf("node %d has unknown version", nodeIndex)
	}

	// Create validation utils
	utils := NewValidationUtils(cm.config, cm.logger)

	// Validate version against constraints using utils
	if err := utils.ValidateVersionConstraints(version); err != nil {
		node := cm.nodes[nodeIndex]
		if cm.logger != nil {
			cm.logger.Warningf("Node '%s' (%s:%d) version %s is not supported: %v",
				node.Name, node.Host, node.Port, version, err)
		}
		return fmt.Errorf("node '%s' version %s is not supported: %w", node.Name, version, err)
	}

	return nil
}

// GetNodeVersion returns the version of a specific node
func (cm *ClusterManager) GetNodeVersion(nodeIndex int) (string, error) {
	if nodeIndex < 0 || nodeIndex >= len(cm.nodeVersions) {
		return "", fmt.Errorf("invalid node index: %d", nodeIndex)
	}

	return cm.nodeVersions[nodeIndex], nil
}

// GetAllNodeVersions returns versions of all nodes
func (cm *ClusterManager) GetAllNodeVersions() map[string]string {
	versions := make(map[string]string)
	for i, node := range cm.nodes {
		versions[fmt.Sprintf("'%s' (%s:%d)", node.Name, node.Host, node.Port)] = cm.nodeVersions[i]
	}
	return versions
}
