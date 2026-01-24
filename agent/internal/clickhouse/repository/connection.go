package repository

import (
	"fmt"

	"clickhouse-ops/internal/clickhouse"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// getConnection gets ClickHouse connection for a specific node.
// If nodeName is empty, returns default connection.
func getConnection(nodeName string) (driver.Conn, error) {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	clusterManager := chManager.GetClusterManager()
	if clusterManager == nil {
		return nil, fmt.Errorf("ClickHouse cluster manager not initialized")
	}

	var conn driver.Conn
	var err error
	if nodeName != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(nodeName)
		if err != nil {
			return nil, fmt.Errorf("failed to get connection for node %s: %w", nodeName, err)
		}
	} else {
		// Use default connection if no node specified
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	return conn, nil
}
