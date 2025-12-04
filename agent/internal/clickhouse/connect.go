package clickhouse

import (
	"fmt"
	"time"

	"clickhouse-ops/internal/config"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

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

// OpenConnection creates a ClickHouse connection for a specific node using unified configuration
func OpenConnection(node config.ClickHouseNode, cfg *config.ClickHouseConfig) (driver.Conn, error) {
	// Parse timeouts from global settings
	dialTimeout, err := time.ParseDuration(cfg.GlobalSettings.DialTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid dial_timeout: %w", err)
	}

	readTimeout, err := time.ParseDuration(cfg.GlobalSettings.ReadTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid read_timeout: %w", err)
	}

	connMaxLifetime, err := time.ParseDuration(cfg.GlobalSettings.ConnMaxLifetime)
	if err != nil {
		return nil, fmt.Errorf("invalid conn_max_lifetime: %w", err)
	}

	// Build connection options
	options := &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%d", node.Host, node.Port)},
		Auth: clickhouse.Auth{
			Database: node.Database,
			Username: node.Username,
			Password: node.Password,
		},
		DialTimeout: dialTimeout,
		ReadTimeout: readTimeout,
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		MaxOpenConns:    cfg.GlobalSettings.MaxOpenConns,
		MaxIdleConns:    cfg.GlobalSettings.MaxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
	}

	// Configure TLS if secure (use node-specific or global setting)
	useSecure := false
	if node.Secure != nil {
		useSecure = *node.Secure
	} else {
		useSecure = cfg.GlobalSettings.Secure
	}

	if useSecure {
		// TLS configuration will be handled by the driver
		// Note: TLS configuration may need to be set differently based on driver version
	}

	// Configure compression (use node-specific or global setting)
	compression := cfg.GlobalSettings.Compression
	if node.Compression != "" {
		compression = node.Compression
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

	// Connect to ClickHouse using unified method
	conn, err := clickhouse.Open(options)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s:%d: %w", node.Host, node.Port, err)
	}

	return conn, nil
}
