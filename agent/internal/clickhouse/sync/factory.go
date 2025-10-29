package sync

import (
	"fmt"
	"time"
)

// SyncerType represents the type of syncer
type SyncerType string

const (
	QueryRawSyncerType    SyncerType = "query_raw"
	ThreadRawSyncerType   SyncerType = "thread_raw"
	PartLogRawSyncerType  SyncerType = "part_log_raw"
	QueryAggMinSyncerType SyncerType = "query_agg_min"
)

// SyncerConfig represents configuration for creating a syncer
type SyncerConfig struct {
	Type      SyncerType
	Interval  time.Duration
	BatchSize int
	Cluster   string // For query_agg_min syncer
}

// SyncerFactory creates table syncers based on configuration
type SyncerFactory struct{
	clusterName string
}

// NewSyncerFactory creates a new syncer factory
func NewSyncerFactory(clusterName string) *SyncerFactory {
	return &SyncerFactory{
		clusterName: clusterName,
	}
}

// CreateSyncer creates a syncer based on the provided configuration
func (sf *SyncerFactory) CreateSyncer(config SyncerConfig) (TableSyncer, error) {
	switch config.Type {
	case QueryRawSyncerType:
		return NewQueryRawSyncer(config.Interval, config.BatchSize), nil
	case ThreadRawSyncerType:
		return NewThreadRawSyncer(config.Interval, config.BatchSize), nil
	case PartLogRawSyncerType:
		return NewPartLogRawSyncer(config.Interval, config.BatchSize), nil
	case QueryAggMinSyncerType:
		return NewQueryAggMinSyncer(config.Interval, config.BatchSize, config.Cluster), nil
	default:
		return nil, fmt.Errorf("unknown syncer type: %s", config.Type)
	}
}

// GetDefaultConfigs returns default configurations for all available syncers
func (sf *SyncerFactory) GetDefaultConfigs() map[SyncerType]SyncerConfig {
	return map[SyncerType]SyncerConfig{
		QueryRawSyncerType: {
			Type:      QueryRawSyncerType,
			Interval:  1 * time.Minute, // Sync every minute
			BatchSize: 1000,            // Process 1000 records at a time
		},
		//ThreadRawSyncerType: {
		//	Type:      ThreadRawSyncerType,
		//	Interval:  1 * time.Minute, // Sync every minute
		//	BatchSize: 1000,            // Process 1000 records at a time
		//},
		PartLogRawSyncerType: {
			Type:      PartLogRawSyncerType,
			Interval:  1 * time.Minute, // Sync every minute
			BatchSize: 1000,            // Process 1000 records at a time
		},
		QueryAggMinSyncerType: {
			Type:      QueryAggMinSyncerType,
			Interval:  5 * time.Minute, // Sync every 5 minutes (aggregation)
			BatchSize: 10000,           // Process 10000 records at a time
			Cluster:   sf.clusterName,  // Use cluster name from factory
		},
	}
}

// CreateAllDefaultSyncers creates all default syncers
func (sf *SyncerFactory) CreateAllDefaultSyncers() ([]TableSyncer, error) {
	configs := sf.GetDefaultConfigs()
	syncers := make([]TableSyncer, 0, len(configs))

	for _, config := range configs {
		syncer, err := sf.CreateSyncer(config)
		if err != nil {
			return nil, fmt.Errorf("failed to create syncer for type %s: %w", config.Type, err)
		}
		syncers = append(syncers, syncer)
	}

	return syncers, nil
}
