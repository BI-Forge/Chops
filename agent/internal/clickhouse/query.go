package clickhouse

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
)

// QueryExecutor handles query execution with retry logic and tracing
type QueryExecutor struct {
	conn      driver.Conn
	config    *config.ClickHouseConfig
	retry     *RetryConfig
	logger    *logger.Logger
	validator *UnifiedValidationEntryPoint
}

// NewQueryExecutor creates a new query executor
func NewQueryExecutor(conn driver.Conn, cfg *config.ClickHouseConfig, log *logger.Logger) (*QueryExecutor, error) {
	retryConfig, err := NewRetryConfig(cfg, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create retry config: %w", err)
	}

	return &QueryExecutor{
		conn:      conn,
		config:    cfg,
		retry:     retryConfig,
		logger:    log,
		validator: NewUnifiedValidationEntryPoint(cfg, log),
	}, nil
}

// GetConnection returns the underlying connection
func (qe *QueryExecutor) GetConnection() driver.Conn {
	return qe.conn
}

// validateBeforeQuery performs all necessary validations before executing queries
func (qe *QueryExecutor) validateBeforeQuery(ctx context.Context) error {
	return qe.validator.ValidateBeforeQuery(ctx, qe.conn)
}

// generateQueryID generates a unique query ID with prefix
func (qe *QueryExecutor) generateQueryID() string {
	queryUUID := uuid.New().String()
	return fmt.Sprintf("%s-%s", qe.config.GlobalSettings.QueryIDPrefix, queryUUID)
}

// createContextWithTimeout creates a context with appropriate timeout
func (qe *QueryExecutor) createContextWithTimeout(ctx context.Context, operation string) (context.Context, context.CancelFunc) {
	// If context already has deadline, use it
	if _, hasDeadline := ctx.Deadline(); hasDeadline {
		return context.WithCancel(ctx)
	}

	// Set timeout based on operation type
	var timeout time.Duration
	switch operation {
	case "ping":
		timeout = 2 * time.Second
	case "query":
		timeout, _ = time.ParseDuration(qe.config.GlobalSettings.ReadTimeout)
	case "exec", "insert":
		timeout, _ = time.ParseDuration(qe.config.GlobalSettings.WriteTimeout)
	default:
		timeout = 10 * time.Second
	}

	return context.WithTimeout(ctx, timeout)
}

// Query executes a SELECT query with retry logic
func (qe *QueryExecutor) Query(ctx context.Context, sql string, args ...interface{}) (driver.Rows, error) {
	// Validate before executing query
	if err := qe.validateBeforeQuery(ctx); err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Validation failed before query execution: %v", err)
		}
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	queryID := qe.generateQueryID()
	ctx, cancel := qe.createContextWithTimeout(ctx, "query")
	defer cancel()

	if qe.logger != nil {
		qe.logger.Infof("Executing query (query_id: %s): %s", queryID, sql)
	}

	var rows driver.Rows
	err := qe.retry.ExecuteWithRetry(ctx, "query", queryID, func() error {
		var err error
		rows, err = qe.conn.Query(ctx, sql, args...)
		return err
	})

	if err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Query failed (query_id: %s): %v", queryID, err)
		}
		return nil, err
	}

	if qe.logger != nil {
		qe.logger.Infof("Query completed successfully (query_id: %s)", queryID)
	}

	return rows, nil
}

// Exec executes a non-SELECT query with retry logic
func (qe *QueryExecutor) Exec(ctx context.Context, sql string, args ...interface{}) error {
	// Validate before executing query
	if err := qe.validateBeforeQuery(ctx); err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Validation failed before statement execution: %v", err)
		}
		return fmt.Errorf("validation failed: %w", err)
	}

	queryID := qe.generateQueryID()
	ctx, cancel := qe.createContextWithTimeout(ctx, "exec")
	defer cancel()

	if qe.logger != nil {
		qe.logger.Infof("Executing statement (query_id: %s): %s", queryID, sql)
	}

	err := qe.retry.ExecuteWithRetry(ctx, "exec", queryID, func() error {
		return qe.conn.Exec(ctx, sql, args...)
	})

	if err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Statement execution failed (query_id: %s): %v", queryID, err)
		}
		return err
	}

	if qe.logger != nil {
		qe.logger.Infof("Statement executed successfully (query_id: %s)", queryID)
	}

	return nil
}

// BatchInsert performs batch insert with retry logic
func (qe *QueryExecutor) BatchInsert(ctx context.Context, sql string, args ...interface{}) error {
	// Validate before executing query
	if err := qe.validateBeforeQuery(ctx); err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Validation failed before batch insert execution: %v", err)
		}
		return fmt.Errorf("validation failed: %w", err)
	}

	queryID := qe.generateQueryID()
	ctx, cancel := qe.createContextWithTimeout(ctx, "insert")
	defer cancel()

	if qe.logger != nil {
		qe.logger.Infof("Executing batch insert (query_id: %s): %s", queryID, sql)
	}

	err := qe.retry.ExecuteWithRetry(ctx, "insert", queryID, func() error {
		return qe.conn.Exec(ctx, sql, args...)
	})

	if err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Batch insert failed (query_id: %s): %v", queryID, err)
		}
		return err
	}

	if qe.logger != nil {
		qe.logger.Infof("Batch insert completed successfully (query_id: %s)", queryID)
	}

	return nil
}

// Ping tests the connection with retry logic
func (qe *QueryExecutor) Ping(ctx context.Context) error {
	queryID := qe.generateQueryID()
	ctx, cancel := qe.createContextWithTimeout(ctx, "ping")
	defer cancel()

	if qe.logger != nil {
		qe.logger.Infof("Pinging ClickHouse (query_id: %s)", queryID)
	}

	err := qe.retry.ExecuteWithRetry(ctx, "ping", queryID, func() error {
		return qe.conn.Ping(ctx)
	})

	if err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("ClickHouse ping failed (query_id: %s): %v", queryID, err)
		}
		return err
	}

	if qe.logger != nil {
		qe.logger.Infof("ClickHouse ping successful (query_id: %s)", queryID)
	}

	return nil
}

// GetServerVersion returns the ClickHouse server version
func (qe *QueryExecutor) GetServerVersion(ctx context.Context) (string, error) {
	queryID := qe.generateQueryID()
	ctx, cancel := qe.createContextWithTimeout(ctx, "query")
	defer cancel()

	if qe.logger != nil {
		qe.logger.Infof("Getting server version (query_id: %s)", queryID)
	}

	var version string
	err := qe.retry.ExecuteWithRetry(ctx, "query", queryID, func() error {
		var err error
		version, err = getServerVersion(ctx, qe.conn)
		return err
	})

	if err != nil {
		if qe.logger != nil {
			qe.logger.Errorf("Failed to get server version (query_id: %s): %v", queryID, err)
		}
		return "", err
	}

	if qe.logger != nil {
		qe.logger.Infof("Server version: %s (query_id: %s)", version, queryID)
	}

	return version, nil
}
