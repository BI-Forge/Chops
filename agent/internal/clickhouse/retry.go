package clickhouse

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// RetryConfig holds retry configuration
type RetryConfig struct {
	MaxAttempts     int
	InitialBackoff  time.Duration
	MaxBackoff      time.Duration
	Jitter          float64
	RetryOnInsert   bool
	Logger          *logger.Logger
}

// NewRetryConfig creates a new retry configuration from ClickHouse config
func NewRetryConfig(cfg *config.ClickHouseConfig, log *logger.Logger) (*RetryConfig, error) {
	initialBackoff, err := time.ParseDuration(cfg.GlobalSettings.RetryInitialBackoff)
	if err != nil {
		return nil, fmt.Errorf("invalid retry_initial_backoff: %w", err)
	}

	maxBackoff, err := time.ParseDuration(cfg.GlobalSettings.RetryMaxBackoff)
	if err != nil {
		return nil, fmt.Errorf("invalid retry_max_backoff: %w", err)
	}

	return &RetryConfig{
		MaxAttempts:    cfg.GlobalSettings.RetryMaxAttempts,
		InitialBackoff: initialBackoff,
		MaxBackoff:     maxBackoff,
		Jitter:         cfg.GlobalSettings.RetryJitter,
		RetryOnInsert:  cfg.GlobalSettings.RetryOnInsert,
		Logger:         log,
	}, nil
}

// ExecuteWithRetry executes a function with retry logic
func (rc *RetryConfig) ExecuteWithRetry(ctx context.Context, operation string, queryID string, fn func() error) error {
	var lastErr error
	
	for attempt := 0; attempt <= rc.MaxAttempts; attempt++ {
		if attempt > 0 {
			// Calculate backoff delay
			delay := rc.calculateBackoff(attempt)
			
			if rc.Logger != nil {
				rc.Logger.Warningf("Retrying %s (attempt %d/%d, delay %v, query_id: %s, error: %v)", 
					operation, attempt, rc.MaxAttempts, delay, queryID, lastErr)
			}
			
			// Wait with context cancellation support
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}
		
		// Execute the operation
		err := fn()
		if err == nil {
			return nil
		}
		
		lastErr = err
		
		// Check if error is retryable
		if !rc.isRetryableError(err, operation) {
			if rc.Logger != nil {
				rc.Logger.Errorf("Non-retryable error in %s: %v", operation, err)
			}
			return err
		}
		
		// Check if we've exhausted retries
		if attempt >= rc.MaxAttempts {
			if rc.Logger != nil {
				rc.Logger.Errorf("Max retries exceeded for %s (query_id: %s): %v", operation, queryID, err)
			}
			return fmt.Errorf("max retries exceeded: %w", err)
		}
	}
	
	return lastErr
}

// calculateBackoff calculates the backoff delay for the given attempt
func (rc *RetryConfig) calculateBackoff(attempt int) time.Duration {
	// Exponential backoff: initial * 2^attempt
	delay := float64(rc.InitialBackoff) * math.Pow(2, float64(attempt-1))
	
	// Cap at max backoff
	if delay > float64(rc.MaxBackoff) {
		delay = float64(rc.MaxBackoff)
	}
	
	// Add jitter
	if rc.Jitter > 0 {
		jitterRange := delay * rc.Jitter
		jitter := (rand.Float64() - 0.5) * 2 * jitterRange
		delay += jitter
	}
	
	// Ensure non-negative
	if delay < 0 {
		delay = 0
	}
	
	return time.Duration(delay)
}

// isRetryableError determines if an error is retryable
func (rc *RetryConfig) isRetryableError(err error, operation string) bool {
	// Don't retry on context cancellation
	if err == context.Canceled || err == context.DeadlineExceeded {
		return false
	}
	
	// Check if it's an insert operation and retry_on_insert is false
	if operation == "insert" && !rc.RetryOnInsert {
		return false
	}
	
	// Check for retryable error patterns
	errStr := err.Error()
	
	// Network/timeout errors
	retryablePatterns := []string{
		"timeout",
		"connection reset",
		"connection refused",
		"network is unreachable",
		"no route to host",
		"EOF",
		"broken pipe",
		"server busy",
		"too many simultaneous queries",
		"temporary failure",
		"service unavailable",
	}
	
	for _, pattern := range retryablePatterns {
		if contains(errStr, pattern) {
			return true
		}
	}
	
	// HTTP status codes (if using HTTP transport)
	if contains(errStr, "429") || contains(errStr, "503") {
		return true
	}
	
	// Non-retryable errors
	nonRetryablePatterns := []string{
		"syntax error",
		"unknown table",
		"memory limit",
		"quota exceeded",
		"type mismatch",
		"table is locked",
		"database doesn't exist",
		"table doesn't exist",
		"column doesn't exist",
		"duplicate key",
		"constraint violation",
	}
	
	for _, pattern := range nonRetryablePatterns {
		if contains(errStr, pattern) {
			return false
		}
	}
	
	// Default to retryable for unknown errors
	return true
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || 
		    len(s) > len(substr) && 
		    (s[:len(substr)] == substr || 
		     s[len(s)-len(substr):] == substr || 
		     indexOf(s, substr) >= 0))
}

// indexOf finds the index of substr in s
func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
