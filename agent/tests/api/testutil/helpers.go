package testutil

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"time"

	"clickhouse-ops/internal/api"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/logger"
	"clickhouse-ops/tests/fixtures"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

var (
	// testConfigPath is the path to the test configuration file
	// Can be overridden via OPS_AGENT_CONFIG_PATH environment variable
	testConfigPath = getEnv("OPS_AGENT_CONFIG_PATH", "configs/ops-agent.test.yaml")
)

// SetupTestEnvironmentWithDB sets up test environment with real databases
// Uses the same connection methods as the main application
// Returns router (for backward compatibility, ignores handlers)
func SetupTestEnvironmentWithDB(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine) {
	gormDB, chConn, router, _ := setupTestEnvironmentWithHandlers(t)
	return gormDB, chConn, router
}

// SetupTestEnvironmentWithHandlers sets up test environment and returns handlers for cleanup
func SetupTestEnvironmentWithHandlers(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine, *api.RouterWithHandlers) {
	return setupTestEnvironmentWithHandlers(t)
}

// setupTestEnvironmentWithHandlers sets up test environment and returns handlers for cleanup
func setupTestEnvironmentWithHandlers(t TestingT) (*gorm.DB, driver.Conn, *gin.Engine, *api.RouterWithHandlers) {
	// Load configuration from test config file
	cfg, err := config.Load(testConfigPath)
	if err != nil {
		t.Fatalf("Failed to load test configuration from %s: %v", testConfigPath, err)
		return nil, nil, nil, nil
	}

	log := logger.New(logger.InfoLevel, "text")

	// Use the same connection methods as the main application
	err = db.Connect(cfg, log)
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
	fixtures.SetupClickHouseFixtures(t, chConn)

	// Clean up test data
	CleanupTestData(t, gormDB)

	// Setup router with handlers for cleanup
	gin.SetMode(gin.TestMode)
	routerCfg := api.RouterConfig{
		JWTSecretKey:     "test-secret-key-for-testing-only",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     0, // Disable rate limiting for tests
		RateLimitBurst:   0,
		Logger:           logger.New(logger.InfoLevel, "text"),
		Config:           cfg,
	}
	router, routerWithHandlers := api.SetupRouterWithHandlers(routerCfg)

	return gormDB, chConn, router, routerWithHandlers
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

	cfg := api.RouterConfig{
		JWTSecretKey:     "test-secret-key-for-testing-only",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     0, // Disable rate limiting for tests
		RateLimitBurst:   0,
		Logger:           logger.New(logger.InfoLevel, "text"),
		Config:           appCfg,
	}

	// Setup router - it will use db.GetInstance() from setupTestEnvironment
	router := api.SetupRouter(cfg)

	return router
}

// StopAllPublishers stops all publishers in handlers (useful for test cleanup)
func StopAllPublishers(routerWithHandlers *api.RouterWithHandlers) {
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

// RegisterTestUser registers a new test user and returns the authentication token
func RegisterTestUser(t TestingT, router *gin.Engine, usernamePrefix string) string {
	username := usernamePrefix + "_" + time.Now().Format("20060102150405")
	email := usernamePrefix + "@example.com"
	password := "securepass123"

	registerPayload, err := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    email,
		Password: password,
	})
	require.NoError(t, err)

	registerReq, err := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	require.NoError(t, err)
	registerReq.Header.Set("Content-Type", "application/json")

	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)
	require.Equal(t, http.StatusCreated, registerW.Code, "User registration should succeed")

	var registerResponse models.TokenResponse
	err = json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token, "Token should not be empty")

	return registerResponse.Token
}

// MakeAuthenticatedRequest creates an HTTP request with authentication token
func MakeAuthenticatedRequest(method, url, token string, body []byte) (*http.Request, error) {
	var req *http.Request
	var err error

	if body != nil {
		req, err = http.NewRequest(method, url, bytes.NewBuffer(body))
	} else {
		req, err = http.NewRequest(method, url, nil)
	}

	if err != nil {
		return nil, err
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	return req, nil
}

// InsertTestMetricsData inserts test data into ch_metrics table using fixtures
func InsertTestMetricsData(t TestingT, nodeName string) error {
	gormDB, err := fixtures.GetDBConnection()
	if err != nil {
		return err
	}

	data := fixtures.DefaultMetricsData(nodeName)
	fixtures.InsertMetricsData(t, gormDB, data)
	return nil
}
