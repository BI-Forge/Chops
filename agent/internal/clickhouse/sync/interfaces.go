package sync

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// SyncConfig represents configuration for a table synchronization
type SyncConfig struct {
	TableName     string        // Target table name (e.g., "ops.query_raw")
	Interval      time.Duration // Synchronization interval
	LastTimestamp time.Time     // Last processed timestamp
}

// SyncResult represents the result of a synchronization operation
type SyncResult struct {
	TableName      string
	RecordsProcessed int64
	LastTimestamp  time.Time
	Duration       time.Duration
	Error          error
}

// TableSyncer defines the interface for table synchronization
type TableSyncer interface {
	// GetConfig returns the synchronization configuration
	GetConfig() SyncConfig
	
	// Sync performs the synchronization operation
	Sync(ctx context.Context, conn driver.Conn) (SyncResult, error)
	
	// GetLastTimestamp retrieves the last processed timestamp
	GetLastTimestamp(ctx context.Context, conn driver.Conn) (time.Time, error)
	
	// UpdateLastTimestamp updates the last processed timestamp
	UpdateLastTimestamp(ctx context.Context, conn driver.Conn, timestamp time.Time) error
}

// SyncManager manages multiple table synchronizations
type SyncManager interface {
	// RegisterSyncer registers a new table syncer
	RegisterSyncer(syncer TableSyncer) error
	
	// Start starts all registered synchronizations
	Start(ctx context.Context) error
	
	// Stop stops all synchronizations
	Stop() error
	
	// GetStatus returns the status of all synchronizations
	GetStatus() map[string]SyncResult
}
