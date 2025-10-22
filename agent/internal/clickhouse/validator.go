package clickhouse

import (
	"context"
	"fmt"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ValidationType represents the type of validation to perform
type ValidationType int

const (
	// ValidationTypeVersion validates ClickHouse version constraints
	ValidationTypeVersion ValidationType = iota
	// ValidationTypeConnection validates connection parameters
	ValidationTypeConnection
	// ValidationTypeQuery validates query syntax (future use)
	ValidationTypeQuery
)

// ValidationResult represents the result of a validation
type ValidationResult struct {
	IsValid bool
	Message string
	Error   error
}

// Validator interface defines the contract for all validators
type Validator interface {
	Validate(ctx context.Context) ValidationResult
	GetType() ValidationType
}

// VersionValidator validates ClickHouse version constraints
type VersionValidator struct {
	utils *ValidationUtils
	conn  driver.Conn
}

// ConnectionValidator validates connection parameters
type ConnectionValidator struct {
	utils *ValidationUtils
	conn  driver.Conn
}

// ValidationFactory creates validators based on type
type ValidationFactory struct {
	utils *ValidationUtils
}

// NewValidationFactory creates a new validation factory
func NewValidationFactory(cfg *config.ClickHouseConfig, log *logger.Logger) *ValidationFactory {
	return &ValidationFactory{
		utils: NewValidationUtils(cfg, log),
	}
}

// CreateValidator creates a validator of the specified type
func (vf *ValidationFactory) CreateValidator(validationType ValidationType, conn driver.Conn) Validator {
	switch validationType {
	case ValidationTypeVersion:
		return &VersionValidator{
			utils: vf.utils,
			conn:  conn,
		}
	case ValidationTypeConnection:
		return &ConnectionValidator{
			utils: vf.utils,
			conn:  conn,
		}
	default:
		return nil
	}
}

// Validate performs version validation
func (vv *VersionValidator) Validate(ctx context.Context) ValidationResult {
	err := vv.utils.ValidateVersionWithConnection(ctx, vv.conn)
	if err != nil {
		return ValidationResult{
			IsValid: false,
			Message: fmt.Sprintf("Version validation failed: %v", err),
			Error:   err,
		}
	}

	return ValidationResult{
		IsValid: true,
		Message: "Version validation successful",
		Error:   nil,
	}
}

// GetType returns the validation type
func (vv *VersionValidator) GetType() ValidationType {
	return ValidationTypeVersion
}

// Validate performs connection validation
func (cv *ConnectionValidator) Validate(ctx context.Context) ValidationResult {
	err := cv.utils.ValidateConnection(ctx, cv.conn)
	if err != nil {
		return ValidationResult{
			IsValid: false,
			Message: fmt.Sprintf("Connection validation failed: %v", err),
			Error:   err,
		}
	}

	return ValidationResult{
		IsValid: true,
		Message: "Connection validation successful",
		Error:   nil,
	}
}

// GetType returns the validation type
func (cv *ConnectionValidator) GetType() ValidationType {
	return ValidationTypeConnection
}

// UnifiedValidationEntryPoint provides a single entry point for all ClickHouse validations
type UnifiedValidationEntryPoint struct {
	utils *ValidationUtils
}

// NewUnifiedValidationEntryPoint creates a new unified validation entry point
func NewUnifiedValidationEntryPoint(cfg *config.ClickHouseConfig, log *logger.Logger) *UnifiedValidationEntryPoint {
	return &UnifiedValidationEntryPoint{
		utils: NewValidationUtils(cfg, log),
	}
}

// ValidateBeforeQuery performs all necessary validations before executing a query
func (uvep *UnifiedValidationEntryPoint) ValidateBeforeQuery(ctx context.Context, conn driver.Conn) error {
	return uvep.utils.ValidateAll(ctx, conn)
}

// ValidateVersion performs only version validation
func (uvep *UnifiedValidationEntryPoint) ValidateVersion(ctx context.Context, conn driver.Conn) error {
	return uvep.utils.ValidateVersionWithConnection(ctx, conn)
}

// ValidateConnection performs only connection validation
func (uvep *UnifiedValidationEntryPoint) ValidateConnection(ctx context.Context, conn driver.Conn) error {
	return uvep.utils.ValidateConnection(ctx, conn)
}

// getServerVersion is a unified function to get ClickHouse server version
func getServerVersion(ctx context.Context, conn driver.Conn) (string, error) {
	var version string
	rows, err := conn.Query(ctx, "SELECT version()")
	if err != nil {
		return "", fmt.Errorf("failed to query version: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		err = rows.Scan(&version)
		if err != nil {
			return "", fmt.Errorf("failed to scan version: %w", err)
		}
		return version, nil
	}

	return "", fmt.Errorf("no version returned")
}
