package clickhouse

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ValidationUtils provides utility functions for ClickHouse validation
type ValidationUtils struct {
	config *config.ClickHouseConfig
	logger *logger.Logger
}

// NewValidationUtils creates a new validation utils instance
func NewValidationUtils(cfg *config.ClickHouseConfig, log *logger.Logger) *ValidationUtils {
	return &ValidationUtils{
		config: cfg,
		logger: log,
	}
}

// GetServerVersion is a unified utility function to get ClickHouse server version
func (vu *ValidationUtils) GetServerVersion(ctx context.Context, conn driver.Conn) (string, error) {
	return getServerVersion(ctx, conn)
}

// ValidateVersionConstraints validates version against configured constraints
func (vu *ValidationUtils) ValidateVersionConstraints(version string) error {
	// Basic validation - check if version string is not empty
	if version == "" {
		return fmt.Errorf("empty version string received from server")
	}
	
	// Check if version constraints are configured
	if vu.config.GlobalSettings.MinVersion == "" && vu.config.GlobalSettings.MaxVersion == "" {
		if vu.logger != nil {
			vu.logger.Infof("ClickHouse server version: %s (no version constraints configured)", version)
		}
		return nil // No version constraints
	}
	
	// Parse version (assuming format like "21.8.15.25" or "22.1.3.7")
	versionParts := strings.Split(version, ".")
	if len(versionParts) < 3 {
		if vu.logger != nil {
			vu.logger.Warningf("ClickHouse version format is invalid: %s", version)
		}
		return fmt.Errorf("invalid version format: %s", version)
	}
	
	// Convert to comparable format (major.minor.patch)
	versionStr := strings.Join(versionParts[:3], ".")
	
	// Check minimum version
	if vu.config.GlobalSettings.MinVersion != "" {
		if err := vu.compareVersions(versionStr, vu.config.GlobalSettings.MinVersion); err != nil {
			if vu.logger != nil {
				vu.logger.Warningf("ClickHouse version %s is below minimum required %s", versionStr, vu.config.GlobalSettings.MinVersion)
			}
			return fmt.Errorf("version %s is below minimum required %s: %w", versionStr, vu.config.GlobalSettings.MinVersion, err)
		}
	}
	
	// Check maximum version
	if vu.config.GlobalSettings.MaxVersion != "" {
		if err := vu.compareVersions(vu.config.GlobalSettings.MaxVersion, versionStr); err != nil {
			if vu.logger != nil {
				vu.logger.Warningf("ClickHouse version %s is above maximum allowed %s", versionStr, vu.config.GlobalSettings.MaxVersion)
			}
			return fmt.Errorf("version %s is above maximum allowed %s: %w", versionStr, vu.config.GlobalSettings.MaxVersion, err)
		}
	}
	
	if vu.logger != nil {
		vu.logger.Infof("ClickHouse server version: %s (within constraints: %s - %s)", 
			version, vu.config.GlobalSettings.MinVersion, vu.config.GlobalSettings.MaxVersion)
	}
	
	return nil
}

// ValidateConnection tests the connection with ping
func (vu *ValidationUtils) ValidateConnection(ctx context.Context, conn driver.Conn) error {
	err := conn.Ping(ctx)
	if err != nil {
		if vu.logger != nil {
			vu.logger.Warningf("ClickHouse connection validation failed: %v", err)
		}
		return fmt.Errorf("connection validation failed: %w", err)
	}
	
	if vu.logger != nil {
		vu.logger.Info("ClickHouse connection validation successful")
	}
	
	return nil
}

// ValidateVersionWithConnection gets version and validates it against constraints
func (vu *ValidationUtils) ValidateVersionWithConnection(ctx context.Context, conn driver.Conn) error {
	version, err := vu.GetServerVersion(ctx, conn)
	if err != nil {
		return fmt.Errorf("failed to get server version: %w", err)
	}
	
	return vu.ValidateVersionConstraints(version)
}

// ValidateAll performs all available validations
func (vu *ValidationUtils) ValidateAll(ctx context.Context, conn driver.Conn) error {
	// Validate connection first
	if err := vu.ValidateConnection(ctx, conn); err != nil {
		return fmt.Errorf("connection validation failed: %w", err)
	}
	
	// Validate version constraints
	if err := vu.ValidateVersionWithConnection(ctx, conn); err != nil {
		return fmt.Errorf("version validation failed: %w", err)
	}
	
	return nil
}

// compareVersions compares two version strings (returns error if v1 < v2)
func (vu *ValidationUtils) compareVersions(v1, v2 string) error {
	v1Parts := strings.Split(v1, ".")
	v2Parts := strings.Split(v2, ".")
	
	maxLen := len(v1Parts)
	if len(v2Parts) > maxLen {
		maxLen = len(v2Parts)
	}
	
	for i := 0; i < maxLen; i++ {
		var v1Num, v2Num int
		
		if i < len(v1Parts) {
			if num, err := strconv.Atoi(v1Parts[i]); err == nil {
				v1Num = num
			}
		}
		
		if i < len(v2Parts) {
			if num, err := strconv.Atoi(v2Parts[i]); err == nil {
				v2Num = num
			}
		}
		
		if v1Num < v2Num {
			return fmt.Errorf("version %s is lower than %s", v1, v2)
		} else if v1Num > v2Num {
			return nil // v1 is higher than v2
		}
	}
	
	return nil // versions are equal
}

// GetFirstAvailableConnection gets the first available connection from a slice
func (vu *ValidationUtils) GetFirstAvailableConnection(conns []driver.Conn) (driver.Conn, int, error) {
	for i, conn := range conns {
		if conn != nil {
			return conn, i, nil
		}
	}
	return nil, -1, fmt.Errorf("no available connections")
}

// ValidateWithFirstConnection validates using the first available connection
func (vu *ValidationUtils) ValidateWithFirstConnection(ctx context.Context, conns []driver.Conn) error {
	conn, _, err := vu.GetFirstAvailableConnection(conns)
	if err != nil {
		return fmt.Errorf("no available connections for validation: %w", err)
	}
	
	return vu.ValidateAll(ctx, conn)
}
