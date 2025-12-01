package testutil

import (
	"context"
	"database/sql"
	"os"
	"strconv"
	"time"

	v1 "clickhouse-ops/internal/api/v1"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var (
	testPostgresDSN = getEnv("TEST_POSTGRES_DSN", "postgres://test_ops:test12345@test_postgres:5432/test_public?sslmode=disable")
	testCHHost      = getEnv("TEST_CLICKHOUSE_HOST", "test_clickhouse")
	testCHPort      = getEnvInt("TEST_CLICKHOUSE_PORT", 9000)
	testCHDatabase  = getEnv("TEST_CLICKHOUSE_DATABASE", "default")
	testCHUser      = getEnv("TEST_CLICKHOUSE_USER", "ops")
	testCHPassword  = getEnv("TEST_CLICKHOUSE_PASSWORD", "12345")
	testCHNodeName  = getEnv("TEST_CLICKHOUSE_NODE_NAME", "test_node")
)

// SetupTestEnvironmentWithDB sets up test environment with real databases
// Uses the same connection methods as the main application
// Returns router (for backward compatibility, ignores handlers)
func SetupTestEnvironmentWithDB(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine) {
	gormDB, chConn, router, _ := setupTestEnvironmentWithHandlers(t)
	return gormDB, chConn, router
}

// SetupTestEnvironmentWithHandlers sets up test environment and returns handlers for cleanup
func SetupTestEnvironmentWithHandlers(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine, *v1.RouterWithHandlers) {
	return setupTestEnvironmentWithHandlers(t)
}

// setupTestEnvironmentWithHandlers sets up test environment and returns handlers for cleanup
func setupTestEnvironmentWithHandlers(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine, *v1.RouterWithHandlers) {
	// Check if we're running in test environment
	if os.Getenv("TEST_DB_ENABLED") != "true" {
		t.Fatalf("TEST_DB_ENABLED not set - functional tests require database connection")
		return nil, nil, nil, nil
	}

	// Initialize database instance for handlers
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Postgres: config.DatabaseDSN{
				DSN: testPostgresDSN,
			},
			ClickHouse: config.ClickHouseConfig{
				Nodes: []config.ClickHouseNode{
					{
						Name:     testCHNodeName,
						Host:     testCHHost,
						Port:     testCHPort,
						Database: testCHDatabase,
						Username: testCHUser,
						Password: testCHPassword,
					},
				},
				GlobalSettings: config.ClickHouseGlobalSettings{
					DialTimeout:      "5s",
					ReadTimeout:      "10s",
					WriteTimeout:     "10s",
					ConnMaxLifetime:  "1h",
					MaxOpenConns:     10,
					MaxIdleConns:     5,
					RetryMaxAttempts: 3,
				},
			},
		},
		Server: config.ServerConfig{
			JWTSecretKey:     "test-secret-key-for-testing-only",
			JWTTokenDuration: "24h",
		},
		Sync: config.SyncConfig{
			RetentionDays: 10,
		},
	}

	log := logger.New(logger.InfoLevel, "text")

	// Use the same connection methods as the main application
	err := db.Connect(cfg, log)
	if err != nil {
		t.Fatalf("Failed to connect to PostgreSQL database: %v", err)
		return nil, nil, nil, nil
	}

	// Initialize ClickHouse manager using the same method as main application
	err = clickhouse.Connect(&cfg.Database.ClickHouse, log)
	if err != nil {
		t.Fatalf("Failed to initialize ClickHouse database connection: %v", err)
		return nil, nil, nil, nil
	}

	// Get connections from managers (same as main application)
	dbManager := db.GetInstance()
	if dbManager == nil {
		t.Fatalf("Database manager not initialized")
		return nil, nil, nil, nil
	}

	gormDB := dbManager.GetGormDB()
	if gormDB == nil {
		t.Fatalf("GORM DB not initialized")
		return nil, nil, nil, nil
	}

	chManager := clickhouse.GetInstance()
	if chManager == nil {
		t.Fatalf("ClickHouse manager not initialized")
		return nil, nil, nil, nil
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		t.Fatalf("ClickHouse cluster not initialized")
		return nil, nil, nil, nil
	}

	chConn, _, err := cluster.GetConnection()
	if err != nil {
		t.Fatalf("Failed to get ClickHouse connection: %v", err)
		return nil, nil, nil, nil
	}

	// Initialize ClickHouse test fixtures (creates system.query_log table by executing queries)
	SetupTestClickHouseFixtures(t, chConn)

	// Clean up test data
	CleanupTestData(t, gormDB)

	// Setup router with handlers for cleanup
	gin.SetMode(gin.TestMode)
	routerCfg := v1.RouterConfig{
		JWTSecretKey:     "test-secret-key-for-testing-only",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     0, // Disable rate limiting for tests
		RateLimitBurst:   0,
		Logger:           logger.New(logger.InfoLevel, "text"),
		Config:           cfg,
	}
	router, routerWithHandlers := v1.SetupRouterWithHandlers(routerCfg)

	return gormDB, chConn, router, routerWithHandlers
}

// SetupTestClickHouseFixtures initializes ClickHouse test fixtures
// Executes test queries to ensure system.query_log table is created and populated
func SetupTestClickHouseFixtures(t TestingT, chConn driver.Conn) {
	if chConn == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Execute several test queries to initialize system.query_log table
	// These queries will be logged in system.query_log
	testQueries := []string{
		"SELECT 1",
		"SELECT 2 + 2",
		"SELECT now()",
		"SELECT version()",
		"SELECT database()",
		"SELECT count() FROM system.tables",
		"SELECT name FROM system.databases LIMIT 5",
	}

	for _, query := range testQueries {
		rows, err := chConn.Query(ctx, query)
		if err != nil {
			// Log but don't fail - query_log might not be ready yet
			continue
		}
		if rows != nil {
			rows.Close()
		}
	}

	// Wait a bit for query_log to be flushed
	time.Sleep(500 * time.Millisecond)
}

// CleanupTestData cleans up test data from databases
func CleanupTestData(t TestingT, gormDB *gorm.DB) {
	if gormDB == nil {
		return
	}

	// Clean PostgreSQL test data
	gormDB.Exec("DELETE FROM users WHERE username LIKE 'test_%'")
	gormDB.Exec("DELETE FROM ch_metrics WHERE node_name LIKE 'test_%'")
}

// SetupTestRouter creates a test router
func SetupTestRouter(t TestingT, gormDB *gorm.DB, sqlDB *sql.DB, appCfg *config.Config) *gin.Engine {
	gin.SetMode(gin.TestMode)

	cfg := v1.RouterConfig{
		JWTSecretKey:     "test-secret-key-for-testing-only",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     0, // Disable rate limiting for tests
		RateLimitBurst:   0,
		Logger:           logger.New(logger.InfoLevel, "text"),
		Config:           appCfg,
	}

	// Setup router - it will use db.GetInstance() from setupTestEnvironment
	router := v1.SetupRouter(cfg)

	return router
}

// StopAllPublishers stops all publishers in handlers (useful for test cleanup)
func StopAllPublishers(routerWithHandlers *v1.RouterWithHandlers) {
	if routerWithHandlers == nil {
		return
	}
	if routerWithHandlers.MetricsHandler != nil {
		routerWithHandlers.MetricsHandler.Stop()
	}
	if routerWithHandlers.QueryLogHandler != nil {
		routerWithHandlers.QueryLogHandler.Stop()
	}
	if routerWithHandlers.ProcessHandler != nil {
		routerWithHandlers.ProcessHandler.Stop()
	}
}

type TestingT interface {
	Skipf(format string, args ...interface{})
	Skip(args ...interface{})
	Errorf(format string, args ...interface{})
	Fatalf(format string, args ...interface{})
	FailNow()
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}
