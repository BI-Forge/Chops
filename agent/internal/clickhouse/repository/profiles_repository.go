package repository

import (
	"context"
	"fmt"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// ProfilesRepository executes queries to get ClickHouse profiles list.
type ProfilesRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewProfilesRepository creates a repository backed by the shared ClickHouse manager.
func NewProfilesRepository(cfg *config.Config, log *logger.Logger) (*ProfilesRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	return &ProfilesRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetProfiles returns list of available ClickHouse profiles from a specific node.
func (r *ProfilesRepository) GetProfiles(ctx context.Context, nodeName string) ([]string, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	// Check if system.settings_profile_elements exists
	if err := checkTableExists(ctx, conn, "system.settings_profile_elements"); err != nil {
		return nil, err
	}

	// Query distinct profile names from system.settings_profile_elements
	// where profile_name IS NOT NULL (profiles are defined by profile_name, not user_name)
	query := `SELECT DISTINCT profile_name 
		FROM system.settings_profile_elements 
		WHERE profile_name IS NOT NULL AND profile_name != ''
		ORDER BY profile_name`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query profiles: %w", err)
	}
	defer rows.Close()

	var profiles []string
	for rows.Next() {
		var profileName string
		if err := rows.Scan(&profileName); err != nil {
			return nil, fmt.Errorf("failed to scan profile name: %w", err)
		}
		profiles = append(profiles, profileName)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("profiles query iteration failed: %w", err)
	}

	// Profiles are already sorted by ORDER BY in query
	return profiles, nil
}
