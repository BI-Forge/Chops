package clickhouse

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/logger"
)

// WaitForSystemTablesReady waits for ClickHouse system tables to be ready
func WaitForSystemTablesReady(logger *logger.Logger) error {
	// Get ClickHouse manager instance
	chManager := GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	// Get cluster manager
	clusterManager := chManager.GetClusterManager()
	if clusterManager == nil {
		return fmt.Errorf("ClickHouse cluster manager not initialized")
	}

	// Wait up to 30 seconds for system tables to be ready
	maxAttempts := 30
	attempt := 0
	
	for attempt < maxAttempts {
		attempt++
		
		// Try to get a connection
		conn, _, err := clusterManager.GetConnection()
		if err != nil {
			logger.Infof("Attempt %d: Failed to get connection: %v", attempt, err)
			time.Sleep(1 * time.Second)
			continue
		}

		// Check if system.query_log table exists
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		query := "SELECT count() FROM system.tables WHERE database = 'system' AND name = 'query_log'"
		row := conn.QueryRow(ctx, query)
		var count uint64
		err = row.Scan(&count)
		
		if err == nil && count > 0 {
			logger.Infof("System tables are ready after %d attempts", attempt)
			return nil
		}
		
		if err != nil {
			logger.Infof("Attempt %d: Query failed: %v", attempt, err)
		} else {
			logger.Infof("Attempt %d: system.query_log table not found yet", attempt)
		}
		
		time.Sleep(1 * time.Second)
	}
	
	return fmt.Errorf("system tables not ready after %d attempts", maxAttempts)
}
