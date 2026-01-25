package config

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

// getWorkingDir returns current working directory for error messages
func getWorkingDir() string {
	wd, err := os.Getwd()
	if err != nil {
		return "unknown"
	}
	return wd
}

// Config represents the application configuration
type Config struct {
	App      AppConfig      `yaml:"app"`
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Logging  LoggingConfig  `yaml:"logging"`
	Sync     SyncConfig     `yaml:"sync"`
}

// AppConfig holds application information
type AppConfig struct {
	Name    string `yaml:"name"`
	Version string `yaml:"version"`
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port             string  `yaml:"port"`
	JWTSecretKey     string  `yaml:"jwt_secret_key"`
	JWTTokenDuration string  `yaml:"jwt_token_duration"` // e.g., "24h", "1h"
	RateLimitRPS     float64 `yaml:"rate_limit_rps"`     // Requests per second (0 to disable)
	RateLimitBurst   int     `yaml:"rate_limit_burst"`   // Burst size
}

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	Postgres   DatabaseDSN      `yaml:"postgres"`
	ClickHouse ClickHouseConfig `yaml:"clickhouse"`
}

// DatabaseDSN holds database connection string
type DatabaseDSN struct {
	DSN string `yaml:"dsn"`
}

// ClickHouseConfig holds ClickHouse connection configuration
type ClickHouseConfig struct {
	// Cluster configuration - DSN for each node
	Nodes []ClickHouseNode `yaml:"nodes"`

	// Cluster name for operations
	ClusterName string `yaml:"cluster_name"`

	// Global settings (applied to all nodes unless overridden)
	GlobalSettings ClickHouseGlobalSettings `yaml:"global_settings"`
}

// ClickHouseGlobalSettings holds global settings for all nodes
type ClickHouseGlobalSettings struct {
	// Version constraints
	MinVersion string `yaml:"min_version"`
	MaxVersion string `yaml:"max_version"`

	// Connection timeouts
	DialTimeout  string `yaml:"dial_timeout"`
	ReadTimeout  string `yaml:"read_timeout"`
	WriteTimeout string `yaml:"write_timeout"`

	// Connection pooling
	ConnMaxLifetime string `yaml:"conn_max_lifetime"`
	MaxOpenConns    int    `yaml:"max_open_conns"`
	MaxIdleConns    int    `yaml:"max_idle_conns"`

	// Retry configuration
	RetryMaxAttempts    int     `yaml:"retry_max_attempts"`
	RetryInitialBackoff string  `yaml:"retry_initial_backoff"`
	RetryMaxBackoff     string  `yaml:"retry_max_backoff"`
	RetryJitter         float64 `yaml:"retry_jitter"`
	RetryOnInsert       bool    `yaml:"retry_on_insert"`

	// Security and compression
	Secure      bool   `yaml:"secure"`
	SkipVerify  bool   `yaml:"skip_verify"`
	Compression string `yaml:"compression"`

	// Query configuration
	QueryIDPrefix string `yaml:"query_id_prefix"`
}

// ClickHouseNode represents a single ClickHouse node configuration
type ClickHouseNode struct {
	// Node identification
	Name string `yaml:"name"` // Unique node name for identification

	// Connection settings
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	Database string `yaml:"database"`

	// Node-specific overrides (optional)
	Secure      *bool  `yaml:"secure,omitempty"`      // Override global secure setting
	Compression string `yaml:"compression,omitempty"` // Override global compression

	// Load balancing settings
	Weight   int `yaml:"weight"`   // Load balancing weight
	Priority int `yaml:"priority"` // Connection priority

	// Metrics synchronization settings
	MetricsSchema string `yaml:"metrics_schema"` // Schema name for metrics table (e.g., "ch_ops")
	MetricsTable  string `yaml:"metrics_table"`  // Table name for metrics (e.g., "metrics")

	// Backups table name (schema.table format, e.g., "ops.backups")
	BackupsTable string `yaml:"backups_table"`
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
}

// SyncConfig holds synchronization configuration
type SyncConfig struct {
	MetricsFrequency      string `yaml:"metrics_frequency"`       // e.g., "1s", "1m"
	RetentionDays         int    `yaml:"retention_days"`          // Number of days to keep data
	ProcessesPollInterval string `yaml:"processes_poll_interval"` // e.g., "2s", "5s" - interval for polling system.processes
}

// Load loads configuration from YAML file
func Load(configPath string) (*Config, error) {
	// Use parameter if provided, otherwise check environment variable
	if configPath == "" {
		if envConfigPath := os.Getenv("OPS_AGENT_CONFIG_PATH"); envConfigPath != "" {
			configPath = envConfigPath
		}
	}

	// Default config path if still not provided
	if configPath == "" {
		configPath = "configs/ops-agent.yaml"
	}

	// Check if file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file not found: %s (working directory: %s, OPS_AGENT_CONFIG_PATH: %s)",
			configPath, getWorkingDir(), os.Getenv("OPS_AGENT_CONFIG_PATH"))
	}

	// Read config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse YAML
	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

// OverrideWithFlags overrides config values with flag values if provided
func (c *Config) OverrideWithFlags(flags map[string]string, flagConfigs []interface{}) {
	// Get all config paths from the flag configs
	configPaths := c.getAllConfigPaths(flagConfigs)

	// Override config values with flags
	for flagName, flagValue := range flags {
		if flagValue != "" {
			// Find matching config path for this flag
			if configPath, exists := configPaths[flagName]; exists {
				c.setFieldByPath(configPath, flagValue)
			}
		}
	}
}

// getAllConfigPaths returns a map of flag names to their config field paths
func (c *Config) getAllConfigPaths(flagConfigs []interface{}) map[string]string {
	configPaths := make(map[string]string)
	for _, flagConfig := range flagConfigs {
		// Use reflection to get FlagName and ConfigName
		v := reflect.ValueOf(flagConfig)
		if v.Kind() == reflect.Struct {
			flagName := v.FieldByName("FlagName").String()
			configName := v.FieldByName("ConfigName").String()
			configPaths[flagName] = configName
		}
	}
	return configPaths
}

// setFieldByPath sets a field value using dot notation path (e.g., "Server.Port")
func (c *Config) setFieldByPath(path, value string) {
	parts := strings.Split(path, ".")
	field := reflect.ValueOf(c).Elem()

	for i, part := range parts {
		field = field.FieldByName(part)
		if !field.IsValid() {
			return // Field not found
		}

		if i < len(parts)-1 {
			// Not the final field, continue navigating
			if field.Kind() == reflect.Ptr {
				field = field.Elem()
			}
		} else {
			// Final field, set the value
			if field.CanSet() && field.Kind() == reflect.String {
				field.SetString(value)
			}
		}
	}
}

// FlagOverrides holds flag values that can override config (deprecated)
type FlagOverrides struct {
	HTTPPort      string
	PostgresDSN   string
	ClickHouseDSN string
}

// Validate validates all configuration values
func (c *Config) Validate() error {
	// Validate Server config
	if err := c.validateServer(); err != nil {
		return fmt.Errorf("server validation failed: %w", err)
	}

	// Validate Database config
	if err := c.validateDatabase(); err != nil {
		return fmt.Errorf("database validation failed: %w", err)
	}

	// Validate Logging config
	if err := c.validateLogging(); err != nil {
		return fmt.Errorf("logging validation failed: %w", err)
	}

	return nil
}

// validateServer validates server configuration
func (c *Config) validateServer() error {
	if c.Server.Port == "" {
		return fmt.Errorf("server port cannot be empty")
	}

	// Validate port number
	port, err := strconv.Atoi(c.Server.Port)
	if err != nil {
		return fmt.Errorf("server port must be a valid number, got: %s", c.Server.Port)
	}

	if port < 1 || port > 65535 {
		return fmt.Errorf("server port must be between 1 and 65535, got: %d", port)
	}

	// Check if port is in reserved range
	if port < 1024 {
		return fmt.Errorf("server port %d is in reserved range (1-1023), use a port >= 1024", port)
	}

	return nil
}

// validateDatabase validates database configuration
func (c *Config) validateDatabase() error {
	// Validate PostgreSQL DSN if provided
	if c.Database.Postgres.DSN != "" {
		if err := c.validatePostgresDSN(); err != nil {
			return fmt.Errorf("postgres DSN validation failed: %w", err)
		}
	}

	// Validate ClickHouse configuration
	if len(c.Database.ClickHouse.Nodes) > 0 {
		if err := c.validateClickHouseConfig(); err != nil {
			return fmt.Errorf("clickhouse configuration validation failed: %w", err)
		}
	}

	return nil
}

// validatePostgresDSN validates PostgreSQL connection string
func (c *Config) validatePostgresDSN() error {
	dsn := c.Database.Postgres.DSN

	// Basic format validation
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		return fmt.Errorf("postgres DSN must start with 'postgres://' or 'postgresql://'")
	}

	// Extract host and port from DSN
	// Simple regex to extract host:port from DSN
	hostPortRegex := regexp.MustCompile(`@([^/]+)/`)
	matches := hostPortRegex.FindStringSubmatch(dsn)
	if len(matches) < 2 {
		return fmt.Errorf("postgres DSN must contain valid host:port format")
	}

	hostPort := matches[1]
	if err := c.validateHostPort(hostPort); err != nil {
		return fmt.Errorf("postgres host:port validation failed: %w", err)
	}

	return nil
}

// validateClickHouseConfig validates ClickHouse configuration
func (c *Config) validateClickHouseConfig() error {
	// Validate that we have at least one node
	if len(c.Database.ClickHouse.Nodes) == 0 {
		return fmt.Errorf("clickhouse configuration must have at least one node")
	}

	// Validate each node
	for i, node := range c.Database.ClickHouse.Nodes {
		if node.Name == "" {
			return fmt.Errorf("clickhouse node %d: name cannot be empty", i)
		}
		if node.Host == "" {
			return fmt.Errorf("clickhouse node %d (%s): host cannot be empty", i, node.Name)
		}
		if node.Port <= 0 || node.Port > 65535 {
			return fmt.Errorf("clickhouse node %d (%s): port must be between 1 and 65535, got: %d", i, node.Name, node.Port)
		}
		if node.Username == "" {
			return fmt.Errorf("clickhouse node %d (%s): username cannot be empty", i, node.Name)
		}
		if node.Database == "" {
			return fmt.Errorf("clickhouse node %d (%s): database cannot be empty", i, node.Name)
		}

		// Validate host:port format
		hostPort := fmt.Sprintf("%s:%d", node.Host, node.Port)
		if err := c.validateHostPort(hostPort); err != nil {
			return fmt.Errorf("clickhouse node %d (%s) host:port validation failed: %w", i, node.Name, err)
		}
	}

	return nil
}

// validateHostPort validates host:port format
func (c *Config) validateHostPort(hostPort string) error {
	// Check if it contains port
	if !strings.Contains(hostPort, ":") {
		// Only host, validate hostname
		if err := c.validateHostname(hostPort); err != nil {
			return fmt.Errorf("hostname validation failed: %w", err)
		}
		return nil
	}

	parts := strings.Split(hostPort, ":")
	if len(parts) != 2 {
		return fmt.Errorf("host:port must have exactly one colon")
	}

	host, portStr := parts[0], parts[1]

	// Validate hostname
	if err := c.validateHostname(host); err != nil {
		return fmt.Errorf("hostname validation failed: %w", err)
	}

	// Validate port
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("port must be a valid number, got: %s", portStr)
	}

	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535, got: %d", port)
	}

	return nil
}

// validateHostname validates hostname or IP address
func (c *Config) validateHostname(host string) error {
	if host == "" {
		return fmt.Errorf("host cannot be empty")
	}

	// Check if it's an IP address
	if net.ParseIP(host) != nil {
		return nil // Valid IP address
	}

	// Check if it's a valid hostname
	if len(host) > 253 {
		return fmt.Errorf("hostname too long (max 253 characters)")
	}

	// Basic hostname validation (allowing underscores for Docker container names)
	hostnameRegex := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-_]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-_]{0,61}[a-zA-Z0-9])?)*$`)
	if !hostnameRegex.MatchString(host) {
		return fmt.Errorf("invalid hostname format: %s", host)
	}

	return nil
}

// validateLogging validates logging configuration
func (c *Config) validateLogging() error {
	// Validate log level
	validLevels := []string{"debug", "info", "warn", "warning", "error", "fatal", "panic"}
	if c.Logging.Level != "" {
		found := false
		for _, level := range validLevels {
			if strings.ToLower(c.Logging.Level) == level {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("invalid log level: %s, valid levels: %s", c.Logging.Level, strings.Join(validLevels, ", "))
		}
	}

	// Validate log format (support comma-separated formats)
	validFormats := []string{"json", "text", "console"}
	if c.Logging.Format != "" {
		// Split by comma and validate each format
		formats := strings.Split(c.Logging.Format, ",")
		for _, format := range formats {
			format = strings.TrimSpace(format)
			if format == "" {
				continue
			}

			found := false
			for _, validFormat := range validFormats {
				if strings.ToLower(format) == validFormat {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("invalid log format: %s, valid formats: %s", format, strings.Join(validFormats, ", "))
			}
		}
	}

	return nil
}

// GetConfigPath returns the default config path
func GetConfigPath() string {
	return filepath.Join("configs", "ops-agent.yaml")
}
