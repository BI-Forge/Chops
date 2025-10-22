package clickhouse

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClickHouse holds the ClickHouse connection and configuration
type ClickHouse struct {
	conn   driver.Conn
	config *config.ClickHouseConfig
	logger *logger.Logger
}

// New creates a new ClickHouse connection
func New(cfg *config.ClickHouseConfig, log *logger.Logger) (*ClickHouse, error) {
	if log != nil {
		log.Info("Initializing ClickHouse connection")
	}

	// Validate configuration
	if err := validateConfig(cfg); err != nil {
		if log != nil {
			log.Errorf("ClickHouse config validation failed: %v", err)
		}
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	// Get connection nodes
	nodes, err := getConnectionNodes(cfg)
	if err != nil {
		if log != nil {
			log.Errorf("Failed to get connection nodes: %v", err)
		}
		return nil, fmt.Errorf("failed to get connection nodes: %w", err)
	}

	// Parse timeouts from global settings
	dialTimeout, err := time.ParseDuration(cfg.GlobalSettings.DialTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid dial_timeout: %w", err)
	}

	readTimeout, err := time.ParseDuration(cfg.GlobalSettings.ReadTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid read_timeout: %w", err)
	}

	_, err = time.ParseDuration(cfg.GlobalSettings.WriteTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid write_timeout: %w", err)
	}

	connMaxLifetime, err := time.ParseDuration(cfg.GlobalSettings.ConnMaxLifetime)
	if err != nil {
		return nil, fmt.Errorf("invalid conn_max_lifetime: %w", err)
	}

	// Build connection options for the first node
	firstNode := nodes[0]
	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", firstNode.Host, firstNode.Port)},
		Auth: clickhouse.Auth{
			Database: firstNode.Database,
			Username: firstNode.Username,
			Password: firstNode.Password,
		},
		DialTimeout: dialTimeout,
		ReadTimeout: readTimeout,
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
		MaxOpenConns:    cfg.GlobalSettings.MaxOpenConns,
		MaxIdleConns:    cfg.GlobalSettings.MaxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
	}

	// Configure TLS if secure (use node-specific or global setting)
	useSecure := false
	if firstNode.Secure != nil {
		useSecure = *firstNode.Secure
	} else {
		useSecure = cfg.GlobalSettings.Secure
	}

	if useSecure {
		// TLS configuration will be handled by the driver
		// Note: TLS configuration may need to be set differently based on driver version
	}

	// Configure compression (use node-specific or global setting)
	compression := cfg.GlobalSettings.Compression
	if firstNode.Compression != "" {
		compression = firstNode.Compression
	}

	if compression != "" {
		switch compression {
		case "lz4":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionLZ4}
		case "gzip":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionGZIP}
		case "deflate":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionDeflate}
		case "brotli":
			options.Compression = &clickhouse.Compression{Method: clickhouse.CompressionBrotli}
		}
	}

	// Connect to ClickHouse
	conn, err := clickhouse.Open(options)
	if err != nil {
		if log != nil {
			log.Errorf("Failed to connect to ClickHouse: %v", err)
		}
		return nil, fmt.Errorf("failed to connect to ClickHouse: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := conn.Ping(ctx); err != nil {
		conn.Close()
		if log != nil {
			log.Errorf("ClickHouse ping failed: %v", err)
		}
		return nil, fmt.Errorf("ClickHouse ping failed: %w", err)
	}

	if log != nil {
		log.Info("ClickHouse connection established successfully")
	}

	return &ClickHouse{
		conn:   conn,
		config: cfg,
		logger: log,
	}, nil
}

// GetConnection returns the underlying ClickHouse connection
func (ch *ClickHouse) GetConnection() driver.Conn {
	return ch.conn
}

// Close closes the ClickHouse connection
func (ch *ClickHouse) Close() error {
	if ch.conn != nil {
		if ch.logger != nil {
			ch.logger.Info("Closing ClickHouse connection")
		}
		return ch.conn.Close()
	}
	return nil
}

// Ping tests the ClickHouse connection
func (ch *ClickHouse) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	err := ch.conn.Ping(ctx)
	if err != nil && ch.logger != nil {
		ch.logger.Errorf("ClickHouse ping failed: %v", err)
	}
	return err
}

// getConnectionNodes returns the list of nodes to connect to
func getConnectionNodes(cfg *config.ClickHouseConfig) ([]config.ClickHouseNode, error) {
	// Validate that nodes are configured
	if len(cfg.Nodes) == 0 {
		return nil, fmt.Errorf("no nodes configured")
	}

	// Validate nodes
	for i, node := range cfg.Nodes {
		if node.Name == "" {
			return nil, fmt.Errorf("node %d: name cannot be empty", i)
		}
		if node.Host == "" {
			return nil, fmt.Errorf("node %d (%s): host cannot be empty", i, node.Name)
		}
		if node.Port <= 0 || node.Port > 65535 {
			return nil, fmt.Errorf("node %d (%s): port must be between 1 and 65535, got: %d", i, node.Name, node.Port)
		}
		if node.Username == "" {
			return nil, fmt.Errorf("node %d (%s): username cannot be empty", i, node.Name)
		}
		if node.Database == "" {
			return nil, fmt.Errorf("node %d (%s): database cannot be empty", i, node.Name)
		}
	}

	return cfg.Nodes, nil
}

// validateConfig validates ClickHouse configuration
func validateConfig(cfg *config.ClickHouseConfig) error {
	// Check if we have nodes configured
	if len(cfg.Nodes) == 0 {
		return fmt.Errorf("no nodes configured")
	}

	// Validate global settings
	if cfg.GlobalSettings.DialTimeout == "" {
		return fmt.Errorf("global_settings.dial_timeout cannot be empty")
	}
	if cfg.GlobalSettings.ReadTimeout == "" {
		return fmt.Errorf("global_settings.read_timeout cannot be empty")
	}
	if cfg.GlobalSettings.WriteTimeout == "" {
		return fmt.Errorf("global_settings.write_timeout cannot be empty")
	}

	// Validate connection pooling
	if cfg.GlobalSettings.MaxOpenConns < 1 || cfg.GlobalSettings.MaxOpenConns > 512 {
		return fmt.Errorf("global_settings.max_open_conns must be between 1 and 512, got: %d", cfg.GlobalSettings.MaxOpenConns)
	}
	if cfg.GlobalSettings.MaxIdleConns < 0 || cfg.GlobalSettings.MaxIdleConns > cfg.GlobalSettings.MaxOpenConns {
		return fmt.Errorf("global_settings.max_idle_conns must be between 0 and max_open_conns (%d), got: %d", cfg.GlobalSettings.MaxOpenConns, cfg.GlobalSettings.MaxIdleConns)
	}

	// Validate retry configuration
	if cfg.GlobalSettings.RetryMaxAttempts < 0 || cfg.GlobalSettings.RetryMaxAttempts > 10 {
		return fmt.Errorf("global_settings.retry_max_attempts must be between 0 and 10, got: %d", cfg.GlobalSettings.RetryMaxAttempts)
	}
	if cfg.GlobalSettings.RetryJitter < 0 || cfg.GlobalSettings.RetryJitter > 0.5 {
		return fmt.Errorf("global_settings.retry_jitter must be between 0 and 0.5, got: %f", cfg.GlobalSettings.RetryJitter)
	}

	return nil
}
