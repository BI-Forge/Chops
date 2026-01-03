package sync

import (
	"fmt"
	"time"
)

// SyncerType represents the type of syncer
type SyncerType string

const (
	MetricsSnapshotType SyncerType = "metrics"
)

// SyncerConfig represents configuration for creating a syncer
type SyncerConfig struct {
	Type     SyncerType
	Interval time.Duration
	Cluster  string // For metrics snapshot
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
	case MetricsSnapshotType:
		return NewMetricsSnapshot(config.Interval, config.Cluster), nil
	default:
		return nil, fmt.Errorf("unknown syncer type: %s", config.Type)
	}
}

// GetDefaultConfigs returns default configurations for all available syncers
func (sf *SyncerFactory) GetDefaultConfigs() map[SyncerType]SyncerConfig {
	return map[SyncerType]SyncerConfig{
		MetricsSnapshotType: {
			Type:     MetricsSnapshotType,
			Interval: 1 * time.Second, // Default: sync every second
			Cluster:  sf.clusterName,  // Use cluster name from factory
		},
	}
}

// GetDefaultConfigsWithInterval returns default configurations with custom interval for metrics
func (sf *SyncerFactory) GetDefaultConfigsWithInterval(metricsInterval time.Duration) map[SyncerType]SyncerConfig {
	configs := sf.GetDefaultConfigs()
	if metricsConfig, ok := configs[MetricsSnapshotType]; ok {
		metricsConfig.Interval = metricsInterval
		configs[MetricsSnapshotType] = metricsConfig
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
