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
	StorageMinSyncerType  SyncerType = "storage_min"
	MetricsSyncerType     SyncerType = "metrics"
)

// SyncerConfig represents configuration for creating a syncer
type SyncerConfig struct {
	Type     SyncerType
	Interval time.Duration
	Cluster  string // For query_agg_min and storage_min syncers
}

// SyncerFactory creates table syncers based on configuration
type SyncerFactory struct {
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
		return NewQueryRawSyncer(config.Interval), nil
	case ThreadRawSyncerType:
		return NewThreadRawSyncer(config.Interval), nil
	case PartLogRawSyncerType:
		return NewPartLogRawSyncer(config.Interval), nil
	case QueryAggMinSyncerType:
		return NewQueryAggMinSyncer(config.Interval, config.Cluster), nil
	case StorageMinSyncerType:
		return NewStorageMinSyncer(config.Interval, config.Cluster), nil
	case MetricsSyncerType:
		return NewMetricsSyncer(config.Interval, config.Cluster), nil
	default:
		return nil, fmt.Errorf("unknown syncer type: %s", config.Type)
	}
}

// GetDefaultConfigs returns default configurations for all available syncers
func (sf *SyncerFactory) GetDefaultConfigs() map[SyncerType]SyncerConfig {
	return map[SyncerType]SyncerConfig{
		// Other syncers are deactivated for now
		// QueryRawSyncerType: {
		// 	Type:     QueryRawSyncerType,
		// 	Interval: 1 * time.Minute, // Sync every minute
		// },
		// ThreadRawSyncerType: {
		// 	Type:     ThreadRawSyncerType,
		// 	Interval: 1 * time.Minute, // Sync every minute
		// },
		// PartLogRawSyncerType: {
		// 	Type:     PartLogRawSyncerType,
		// 	Interval: 1 * time.Minute, // Sync every minute
		// },
		// QueryAggMinSyncerType: {
		// 	Type:     QueryAggMinSyncerType,
		// 	Interval: 5 * time.Minute, // Sync every 5 minutes (aggregation)
		// 	Cluster:  sf.clusterName,  // Use cluster name from factory
		// },
		// StorageMinSyncerType: {
		// 	Type:     StorageMinSyncerType,
		// 	Interval: 1 * time.Minute, // Sync every minute
		// 	Cluster:  sf.clusterName,  // Use cluster name from factory
		// },
		MetricsSyncerType: {
			Type:     MetricsSyncerType,
			Interval: 1 * time.Second, // Default: sync every second
			Cluster:  sf.clusterName,  // Use cluster name from factory
		},
	}
}

// GetDefaultConfigsWithInterval returns default configurations with custom interval for metrics
func (sf *SyncerFactory) GetDefaultConfigsWithInterval(metricsInterval time.Duration) map[SyncerType]SyncerConfig {
	configs := sf.GetDefaultConfigs()
	if metricsConfig, ok := configs[MetricsSyncerType]; ok {
		metricsConfig.Interval = metricsInterval
		configs[MetricsSyncerType] = metricsConfig
	}
	return configs
}

// CreateAllDefaultSyncers creates all default syncers
func (sf *SyncerFactory) CreateAllDefaultSyncers() ([]TableSyncer, error) {
	return sf.CreateAllDefaultSyncersWithInterval(1 * time.Second)
}

// CreateAllDefaultSyncersWithInterval creates all default syncers with custom metrics interval
func (sf *SyncerFactory) CreateAllDefaultSyncersWithInterval(metricsInterval time.Duration) ([]TableSyncer, error) {
	configs := sf.GetDefaultConfigsWithInterval(metricsInterval)
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
