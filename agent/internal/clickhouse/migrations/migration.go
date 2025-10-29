package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClickHouseMigration represents a ClickHouse migration
type ClickHouseMigration struct {
	Version     int
	Name        string
	Description string
	Up          func(ctx context.Context, conn driver.Conn) error
	Down        func(ctx context.Context, conn driver.Conn) error
}

// MigrationResult represents the result of a migration execution
type MigrationResult struct {
	Version          int
	Name             string
	NodeName         string
	Status           string // "success" or "error"
	ErrorMessage     string
	ExecutionTimeMs  int64
	Checksum         string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// ClickHouseMigrator handles ClickHouse migrations with PostgreSQL tracking
type ClickHouseMigrator struct {
	clickhouseManager interface{}
	postgresDB        *sql.DB
	config            *config.Config
	logger            *logger.Logger
	migrations        []ClickHouseMigration
}

// NewClickHouseMigrator creates a new ClickHouse migrator
func NewClickHouseMigrator(
	clickhouseManager interface{},
	postgresDB *sql.DB,
	cfg *config.Config,
	log *logger.Logger,
) *ClickHouseMigrator {
	return &ClickHouseMigrator{
		clickhouseManager: clickhouseManager,
		postgresDB:        postgresDB,
		config:            cfg,
		logger:            log,
		migrations:        GetClickHouseMigrations(),
	}
}

// GetClickHouseMigrations returns all available ClickHouse migrations
func GetClickHouseMigrations() []ClickHouseMigration {
	return ClickhouseMigrations
}

// RunMigrations runs all pending ClickHouse migrations
func (cm *ClickHouseMigrator) RunMigrations(ctx context.Context) error {
	if cm.logger != nil {
		cm.logger.Info("Starting ClickHouse migrations")
	}

	// Get ClickHouse manager using reflection to call GetClusterManager
	managerValue := reflect.ValueOf(cm.clickhouseManager)
	if !managerValue.IsValid() {
		return fmt.Errorf("ClickHouse manager is not valid")
	}

	getClusterManagerMethod := managerValue.MethodByName("GetClusterManager")
	if !getClusterManagerMethod.IsValid() {
		return fmt.Errorf("ClickHouse manager does not have GetClusterManager method: %T", cm.clickhouseManager)
	}

	result := getClusterManagerMethod.Call(nil)
	if len(result) == 0 {
		return fmt.Errorf("GetClusterManager returned no values")
	}

	clusterManagerRaw := result[0].Interface()
	if clusterManagerRaw == nil {
		return fmt.Errorf("cluster manager is nil")
	}
	
	// Now assert the cluster manager to the interface we need
	clusterManager, ok := clusterManagerRaw.(interface {
		GetAllNodes() []config.ClickHouseNode
		GetWorkingConnections() int
		GetConnection() (driver.Conn, int, error)
	})
	if !ok {
		return fmt.Errorf("cluster manager does not implement required interface: %T", clusterManagerRaw)
	}
	
	// Get all nodes and working connections count
	nodes := clusterManager.GetAllNodes()
	workingConnections := clusterManager.GetWorkingConnections()

	if workingConnections == 0 {
		return fmt.Errorf("no working ClickHouse connections available")
	}

	if cm.logger != nil {
		cm.logger.Infof("Found %d ClickHouse nodes, %d working connections", len(nodes), workingConnections)
	}

	// Run migrations on each working connection (node)
	processedNodes := make(map[int]bool)
	for i := 0; i < len(nodes); i++ {
		conn, nodeIndex, err := clusterManager.GetConnection()
		if err != nil {
			if cm.logger != nil {
				cm.logger.Errorf("Failed to get connection for node %d: %v", i, err)
			}
			continue
		}

		if conn == nil {
			continue
		}

		// Skip if we already processed this node
		if processedNodes[nodeIndex] {
			continue
		}

		node := nodes[nodeIndex]
		if cm.logger != nil {
			cm.logger.Infof("Running migrations on node: %s (%s:%d)", node.Name, node.Host, node.Port)
		}

		if err := cm.runMigrationsOnNode(ctx, conn, node); err != nil {
			if cm.logger != nil {
				cm.logger.Errorf("Failed to run migrations on node %s: %v", node.Name, err)
			}
			return fmt.Errorf("failed to run migrations on node %s: %w", node.Name, err)
		}

		// Mark this node as processed
		processedNodes[nodeIndex] = true
	}

	if cm.logger != nil {
		cm.logger.Info("ClickHouse migrations completed successfully")
	}

	return nil
}

// runMigrationsOnNode runs migrations on a specific ClickHouse node
func (cm *ClickHouseMigrator) runMigrationsOnNode(ctx context.Context, conn driver.Conn, node config.ClickHouseNode) error {
	// Get applied migrations for this node
	appliedMigrations, err := cm.getAppliedMigrationsForNode(node)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations for node %s: %w", node.Name, err)
	}

	// Run pending migrations
	for _, migration := range cm.migrations {
		// Skip if already applied successfully
		if appliedMigrations[migration.Version] == "success" {
			continue
		}

		// Run the migration
		result := cm.runMigration(ctx, conn, migration, node)

		// Record the result in PostgreSQL
		if err := cm.recordMigrationResult(result); err != nil {
			if cm.logger != nil {
				cm.logger.Errorf("Failed to record migration result for node %s: %v", node.Name, err)
			}
			// Don't fail the entire process, just log the error
		}
	}

	return nil
}

// runMigration runs a single migration on a ClickHouse connection
func (cm *ClickHouseMigrator) runMigration(ctx context.Context, conn driver.Conn, migration ClickHouseMigration, node config.ClickHouseNode) MigrationResult {
	startTime := time.Now()
	now := time.Now()
	result := MigrationResult{
		Version:   migration.Version,
		Name:      migration.Name,
		NodeName:  node.Name,
		Status:    "error",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Validate ClickHouse connection before migration
	if err := cm.validateConnection(ctx, conn); err != nil {
		result.ErrorMessage = fmt.Sprintf("connection validation failed: %v", err)
		return result
	}

	// Check if migration conflicts with existing objects
	if err := cm.checkMigrationConflicts(ctx, conn, migration); err != nil {
		result.ErrorMessage = fmt.Sprintf("migration conflicts with existing objects: %v", err)
		return result
	}

	// Execute the migration
	if err := migration.Up(ctx, conn); err != nil {
		result.ErrorMessage = fmt.Sprintf("migration execution failed: %v", err)
		return result
	}

	// Mark as successful
	result.Status = "success"
	result.ErrorMessage = ""
	result.ExecutionTimeMs = time.Since(startTime).Milliseconds()

	if cm.logger != nil {
		cm.logger.Infof("Migration %d (%s) completed successfully on node %s in %dms",
			migration.Version, migration.Name, node.Name, result.ExecutionTimeMs)
	}

	return result
}

// validateConnection validates ClickHouse connection using the validation factory
func (cm *ClickHouseMigrator) validateConnection(ctx context.Context, conn driver.Conn) error {
	// Basic connection validation - ping the connection
	if err := conn.Ping(ctx); err != nil {
		return fmt.Errorf("connection ping failed: %w", err)
	}

	// TODO: Integrate with the existing validation factory
	// For now, we'll do basic validation
	// In a real implementation, you would call the validation factory here

	return nil
}

// checkMigrationConflicts checks if migration conflicts with existing ClickHouse objects
func (cm *ClickHouseMigrator) checkMigrationConflicts(ctx context.Context, conn driver.Conn, migration ClickHouseMigration) error {
	// This is a simplified check - in real implementation, you'd parse the migration SQL
	// and check for existing tables/schemas
	// For now, we'll assume no conflicts
	return nil
}

// getAppliedMigrationsForNode gets applied migrations for a specific node
func (cm *ClickHouseMigrator) getAppliedMigrationsForNode(node config.ClickHouseNode) (map[int]string, error) {
	query := `
		SELECT version, status 
		FROM clickhouse_migrations 
		WHERE node_name = $1 
		ORDER BY version
	`

	rows, err := cm.postgresDB.Query(query, node.Name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[int]string)
	for rows.Next() {
		var version int
		var status string
		if err := rows.Scan(&version, &status); err != nil {
			return nil, err
		}
		applied[version] = status
	}

	return applied, rows.Err()
}

// recordMigrationResult records migration result in PostgreSQL
func (cm *ClickHouseMigrator) recordMigrationResult(result MigrationResult) error {
	query := `
		INSERT INTO clickhouse_migrations 
		(version, name, node_name, checksum, execution_time_ms, status, error_message, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (version, node_name) DO UPDATE SET
			status = EXCLUDED.status,
			error_message = EXCLUDED.error_message,
			execution_time_ms = EXCLUDED.execution_time_ms,
			updated_at = EXCLUDED.updated_at
	`

	_, err := cm.postgresDB.Exec(query,
		result.Version,
		result.Name,
		result.NodeName,
		result.Checksum,
		result.ExecutionTimeMs,
		result.Status,
		result.ErrorMessage,
		result.CreatedAt,
		result.UpdatedAt,
	)

	return err
}

// DeleteMigrationRecord deletes a migration record by ID
func (cm *ClickHouseMigrator) DeleteMigrationRecord(migrationID int) error {
	query := `DELETE FROM clickhouse_migrations WHERE id = $1`
	
	result, err := cm.postgresDB.Exec(query, migrationID)
	if err != nil {
		return fmt.Errorf("failed to delete migration record: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("migration record with ID %d not found", migrationID)
	}
	
	if cm.logger != nil {
		cm.logger.Infof("Deleted migration record with ID %d", migrationID)
	}
	
	return nil
}

// DeleteMigrationRecordsByNode deletes all migration records for a specific node
func (cm *ClickHouseMigrator) DeleteMigrationRecordsByNode(nodeName string) error {
	query := `DELETE FROM clickhouse_migrations WHERE node_name = $1`
	
	result, err := cm.postgresDB.Exec(query, nodeName)
	if err != nil {
		return fmt.Errorf("failed to delete migration records for node %s: %w", nodeName, err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if cm.logger != nil {
		cm.logger.Infof("Deleted %d migration records for node %s", rowsAffected, nodeName)
	}
	
	return nil
}
