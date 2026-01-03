package cli

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"regexp"
	"strings"
	"time"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/clickhouse/sync"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/httpserver"
	"clickhouse-ops/internal/logger"

	"github.com/spf13/cobra"
)

// FlagConfig represents a configuration flag
type FlagConfig struct {
	FlagName        string
	ConfigName      string
	FlagDescription string
	EnvName         string
}

// AllConfigFlags defines all possible configuration flags
var AllConfigFlags = []FlagConfig{
	{
		FlagName:        "http-port",
		ConfigName:      "Server.Port",
		FlagDescription: "HTTP server port (overrides config)",
		EnvName:         "HTTP_PORT",
	},
	{
		FlagName:        "postgres-dsn",
		ConfigName:      "Database.Postgres.DSN",
		FlagDescription: "PostgreSQL connection string (overrides config)",
		EnvName:         "POSTGRES_DSN",
	},
	{
		FlagName:        "clickhouse-dsn",
		ConfigName:      "Database.ClickHouse.DSN",
		FlagDescription: "ClickHouse connection string (overrides config)",
		EnvName:         "CLICKHOUSE_DSN",
	},
	{
		FlagName:        "log-level",
		ConfigName:      "Logging.Level",
		FlagDescription: "Logging level: info, warning, error, fatal (overrides config)",
		EnvName:         "LOG_LEVEL",
	},
	{
		FlagName:        "log-format",
		ConfigName:      "Logging.Format",
		FlagDescription: "Logging format: json, text, console (comma-separated for multiple formats) (overrides config)",
		EnvName:         "LOG_FORMAT",
	},
}

var rootCmd = &cobra.Command{
	Use:   "clickhouse-ops",
	Short: "ClickHouse Operations Agent",
	Long:  "A simple ClickHouse operations agent with HTTP server",
	Run: func(cmd *cobra.Command, args []string) {
		// Process informational flags
		if processInfoFlags(cmd) {
			return
		}

		// Normal server startup
		cfg := loadConfig(cmd)

		// Create logger
		logLevel, err := logger.ParseLogLevel(cfg.Logging.Level)
		if err != nil {
			panic(fmt.Sprintf("Invalid log level: %v", err))
		}

		appLogger := logger.New(logLevel, cfg.Logging.Format)
		appLogger.Info("Starting ClickHouse Operations Agent")
		appLogger.Infof("Server will start on port: %s", cfg.Server.Port)
		appLogger.Infof("Log level: %s, Format: %s", cfg.Logging.Level, cfg.Logging.Format)
		appLogger.Infof("PostgreSQL DSN: %s", maskPasswordInDSN(cfg.Database.Postgres.DSN))

		// Connect to PostgreSQL database and run migrations
		appLogger.Info("Connecting to PostgreSQL database...")
		err = db.Connect(cfg, appLogger)
		if err != nil {
			appLogger.Fatalf("Failed to connect to PostgreSQL database: %v", err)
		}
		appLogger.Info("PostgreSQL database connected successfully")

		// Connect to ClickHouse database (non-blocking with retry)
		appLogger.Info("Initializing ClickHouse database connection...")
		err = clickhouse.Connect(&cfg.Database.ClickHouse, appLogger)
		if err != nil {
			appLogger.Errorf("Failed to initialize ClickHouse database connection: %v", err)
			appLogger.Warning("Application will continue running, ClickHouse will be retried in background")
		} else {
			appLogger.Info("ClickHouse database connection initialized successfully")

			// Initialize table synchronization
			appLogger.Info("Initializing table synchronization...")
			err = initializeTableSync(cfg, appLogger)
			if err != nil {
				appLogger.Errorf("Failed to initialize table synchronization: %v", err)
				appLogger.Warning("Application will continue running, but table sync is disabled")
			} else {
				appLogger.Info("Table synchronization initialized successfully")
			}
		}

		server := httpserver.New(httpserver.Config{
			Config: cfg,
			Logger: appLogger,
		})

		server.SetupRoutes()
		appLogger.Info("HTTP server routes configured")
		appLogger.Info("Starting HTTP server...")
		server.GetRouter().Run(":" + server.GetPort())
	},
}

func init() {
	// Add flags dynamically from AllConfigFlags
	for _, flagConfig := range AllConfigFlags {
		if flagConfig.FlagName == "http-port" {
			rootCmd.Flags().StringP(flagConfig.FlagName, "p", "", flagConfig.FlagDescription)
		} else {
			rootCmd.Flags().String(flagConfig.FlagName, "", flagConfig.FlagDescription)
		}
	}

	// Add special flags
	rootCmd.Flags().String("config", config.GetConfigPath(), "Path to config file")
	rootCmd.Flags().Bool("version", false, "Print version and exit")
	rootCmd.Flags().Bool("print-config", false, "Print current configuration and exit")
}

// processInfoFlags processes informational flags and returns true if handled
func processInfoFlags(cmd *cobra.Command) bool {
	// Check for version flag
	if version, _ := cmd.Flags().GetBool("version"); version {
		printVersion(cmd)
		return true
	}

	// Check for print-config flag
	if shouldPrintConfig, _ := cmd.Flags().GetBool("print-config"); shouldPrintConfig {
		cfg := loadConfig(cmd)
		printConfig(cfg)
		return true
	}

	return false
}

// loadConfig loads configuration from file and overrides with flags
func loadConfig(cmd *cobra.Command) *config.Config {
	// Get config file path from flag
	configPath, _ := cmd.Flags().GetString("config")

	// If config path is default value, check environment variable first
	defaultConfigPath := config.GetConfigPath()
	if configPath == defaultConfigPath {
		// Check environment variable - it has priority over default
		if envConfigPath := os.Getenv("OPS_AGENT_CONFIG_PATH"); envConfigPath != "" {
			configPath = envConfigPath
		}
	}

	// Load config from file
	cfg, err := config.Load(configPath)
	if err != nil {
		panic(fmt.Sprintf("Failed to load config file: %v", err))
	}

	// Get environment variables (highest priority)
	envVars := getAllEnvVars()

	// Get flags (medium priority)
	flags := getAllFlags(cmd)

	// Apply with priority: env -> flags -> yaml
	// Convert AllConfigFlags to []interface{}
	flagConfigs := make([]interface{}, len(AllConfigFlags))
	for i, flagConfig := range AllConfigFlags {
		flagConfigs[i] = flagConfig
	}

	// First apply flags, then env (env will override flags)
	cfg.OverrideWithFlags(flags, flagConfigs)
	cfg.OverrideWithFlags(envVars, flagConfigs)

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		panic(fmt.Sprintf("Configuration validation failed: %v", err))
	}

	return cfg
}

// getAllFlags automatically collects all flag values
func getAllFlags(cmd *cobra.Command) map[string]string {
	flags := make(map[string]string)

	// Collect all flag values using the shared flag list
	for _, flagConfig := range AllConfigFlags {
		if value, err := cmd.Flags().GetString(flagConfig.FlagName); err == nil && value != "" {
			flags[flagConfig.FlagName] = value
		}
	}

	return flags
}

// getAllEnvVars automatically collects all environment variables
func getAllEnvVars() map[string]string {
	envVars := make(map[string]string)

	// Collect all environment variables using the shared flag list
	for _, flagConfig := range AllConfigFlags {
		if envValue := os.Getenv(flagConfig.EnvName); envValue != "" {
			envVars[flagConfig.FlagName] = envValue
		}
	}

	return envVars
}

// printVersion prints version information and all available flags
func printVersion(cmd *cobra.Command) {
	// Load config to get app name and version
	configPath, _ := cmd.Flags().GetString("config")
	cfg, err := config.Load(configPath)

	var appName, appVersion string
	if err != nil {
		// Set defaults if config not found
		appName = "ClickHouse Operations Agent"
		appVersion = "1.0.0"
	} else {
		appName = cfg.App.Name
		appVersion = cfg.App.Version
	}

	// Create a simple logger for version output
	logger := logger.New(logger.InfoLevel, "text")

	logger.Info(fmt.Sprintf("%s v%s", appName, appVersion))
	logger.Info("")
	logger.Info("Available configuration flags:")
	logger.Info("=============================")

	for _, flagConfig := range AllConfigFlags {
		logger.Info(fmt.Sprintf("  --%-20s %s", flagConfig.FlagName, flagConfig.FlagDescription))
		if flagConfig.EnvName != "" {
			logger.Info(fmt.Sprintf("  %-22s Environment variable: %s", "", flagConfig.EnvName))
		}
		logger.Info("")
	}

	logger.Info("Special flags:")
	logger.Info("==============")
	logger.Info("  --version             Print version and exit")
	logger.Info("  --print-config        Print current configuration and exit")
	logger.Info("  --config              Path to config file")
}

// printConfig prints current configuration after applying overrides
func printConfig(cfg *config.Config) {
	// Create logger using the configuration from cfg
	logLevel, err := logger.ParseLogLevel(cfg.Logging.Level)
	if err != nil {
		logLevel = logger.InfoLevel
	}

	appLogger := logger.New(logLevel, cfg.Logging.Format)

	appLogger.Info("Current Configuration:")
	appLogger.Info("=====================")

	// Print config using reflection
	v := reflect.ValueOf(cfg).Elem()
	t := reflect.TypeOf(cfg).Elem()

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)

		if field.Kind() == reflect.Struct {
			appLogger.Info(fmt.Sprintf("%s:", fieldType.Name))
			printStructWithLogger(field, 2, appLogger)
		} else {
			appLogger.Info(fmt.Sprintf("  %s: %v", fieldType.Name, field.Interface()))
		}
	}
}

// maskPasswordInDSN masks password in DSN strings for display
func maskPasswordInDSN(dsn string) string {
	if dsn == "" {
		return dsn
	}

	// For PostgreSQL DSN: postgres://user:password@host:port/db
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		re := regexp.MustCompile(`(://[^:]+:)([^@]+)(@)`)
		return re.ReplaceAllString(dsn, "$1****$3")
	}

	// For ClickHouse DSN: tcp://user:password@host:port
	if strings.HasPrefix(dsn, "tcp://") {
		re := regexp.MustCompile(`(://[^:]+:)([^@]+)(@)`)
		return re.ReplaceAllString(dsn, "$1****$3")
	}

	return dsn
}

// shouldMaskField determines if a field should be masked
func shouldMaskField(fieldName string) bool {
	// List of field names that contain sensitive information
	sensitiveFields := []string{
		"Password",
		"password",
		"Pass",
		"pass",
		"Secret",
		"secret",
		"Token",
		"token",
		"Key",
		"key",
		"Auth",
		"auth",
	}

	fieldNameLower := strings.ToLower(fieldName)
	for _, sensitive := range sensitiveFields {
		if strings.Contains(fieldNameLower, strings.ToLower(sensitive)) {
			return true
		}
	}

	return false
}

// maskPassword masks a password string for display
func maskPassword(password string) string {
	if password == "" {
		return password
	}

	// Completely mask the password with asterisks
	return "****"
}

// printStructWithLogger recursively prints struct fields with indentation using logger
func printStructWithLogger(v reflect.Value, indent int, logger *logger.Logger) {
	t := v.Type()

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)

		indentStr := ""
		for j := 0; j < indent; j++ {
			indentStr += "  "
		}

		if field.Kind() == reflect.Struct {
			logger.Info(fmt.Sprintf("%s%s:", indentStr, fieldType.Name))
			printStructWithLogger(field, indent+1, logger)
		} else if field.Kind() == reflect.Slice {
			// Handle slices (like Nodes array)
			logger.Info(fmt.Sprintf("%s%s:", indentStr, fieldType.Name))
			for i := 0; i < field.Len(); i++ {
				item := field.Index(i)
				if item.Kind() == reflect.Struct {
					logger.Info(fmt.Sprintf("%s  [%d]:", indentStr, i))
					printStructWithLogger(item, indent+2, logger)
				} else {
					value := item.Interface()
					if shouldMaskField(fieldType.Name) && reflect.TypeOf(value).Kind() == reflect.String {
						value = maskPassword(value.(string))
					}
					logger.Info(fmt.Sprintf("%s    %v", indentStr, value))
				}
			}
		} else {
			value := field.Interface()

			// Mask password in DSN fields
			if fieldType.Name == "DSN" && reflect.TypeOf(value).Kind() == reflect.String {
				value = maskPasswordInDSN(value.(string))
			}

			// Mask password fields
			if shouldMaskField(fieldType.Name) && reflect.TypeOf(value).Kind() == reflect.String {
				value = maskPassword(value.(string))
			}

			logger.Info(fmt.Sprintf("%s%s: %v", indentStr, fieldType.Name, value))
		}
	}
}

// initializeTableSync initializes table synchronization
func initializeTableSync(cfg *config.Config, logger *logger.Logger) error {
	// Get ClickHouse manager instance
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	// Get cluster manager
	clusterManager := chManager.GetClusterManager()
	if clusterManager == nil {
		return fmt.Errorf("ClickHouse cluster manager not initialized")
	}

	// Create sync manager
	syncManager := sync.NewManager(logger, clusterManager)

	// Create and register syncers
	factory := sync.NewSyncerFactory(cfg.Database.ClickHouse.ClusterName)

	// Parse sync frequency from config
	metricsInterval := 1 * time.Second // Default
	if cfg.Sync.MetricsFrequency != "" {
		parsedInterval, err := time.ParseDuration(cfg.Sync.MetricsFrequency)
		if err != nil {
			logger.Warningf("Invalid metrics_frequency '%s', using default 1s: %v", cfg.Sync.MetricsFrequency, err)
		} else {
			metricsInterval = parsedInterval
		}
	}

	syncers, err := factory.CreateAllDefaultSyncersWithInterval(metricsInterval)
	if err != nil {
		return fmt.Errorf("failed to create syncers: %w", err)
	}

	// Register all syncers
	for _, syncer := range syncers {
		if err := syncManager.RegisterSyncer(syncer); err != nil {
			return fmt.Errorf("failed to register syncer: %w", err)
		}
	}

	// Start synchronization
	ctx := context.Background()
	if err := syncManager.Start(ctx); err != nil {
		return fmt.Errorf("failed to start sync manager: %w", err)
	}

	logger.Info("Table synchronization started successfully")
	return nil
}

// Execute runs the CLI
func Execute() error {
	return rootCmd.Execute()
}
