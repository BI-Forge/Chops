package testutil

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"time"

	"clickhouse-ops/internal/api"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/db/models"
	"clickhouse-ops/internal/rbac"
	chmodels "clickhouse-ops/internal/clickhouse/models"
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

// GetTestConfigPath returns the test configuration file path
func GetTestConfigPath() string {
	return testConfigPath
}

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
	if gormDB != nil {
		// Clean PostgreSQL test data
		gormDB.Exec("DELETE FROM users WHERE username LIKE 'test_%'")
	}

	// Clean ClickHouse metrics data
	chManager := clickhouse.GetInstance()
	if chManager != nil {
		cluster := chManager.GetCluster()
		if cluster != nil {
			cfg, err := config.Load(testConfigPath)
			if err == nil {
				ctx := context.Background()
				for _, node := range cfg.Database.ClickHouse.Nodes {
					conn, _, err := cluster.GetConnectionByNodeName(node.Name)
					if err != nil {
						continue
					}

					schema := node.MetricsSchema
					table := node.MetricsTable
					if schema == "" {
						schema = "ops"
					}
					if table == "" {
						table = "metrics_snapshot"
					}

					// Try to delete test data (table might not exist)
					deleteQuery := fmt.Sprintf("ALTER TABLE %s.%s DELETE WHERE 1=1", schema, table)
					_ = conn.Exec(ctx, deleteQuery)
				}
			}
		}
	}
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

	registerPayload, err := json.Marshal(apiSystemModels.RegisterRequest{
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

	var registerResponse apiSystemModels.TokenResponse
	err = json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token, "Token should not be empty")

	mgr := db.GetInstance()
	require.NotNil(t, mgr, "database manager required to promote test user to admin")
	gdb := mgr.GetGormDB()
	require.NotNil(t, gdb, "gorm db required to promote test user to admin")
	var adminRole models.Role
	require.NoError(t, gdb.Where("name = ?", rbac.RoleNameAdmin).First(&adminRole).Error)
	res := gdb.Model(&models.User{}).Where("username = ?", username).Update("role_id", adminRole.ID)
	require.NoError(t, res.Error)
	require.Equal(t, int64(1), res.RowsAffected, "test user should exist for role promotion")

	return registerResponse.Token
}

// RegisterGuestTestUser registers a user and returns a JWT without promoting to admin (keeps default guest role).
func RegisterGuestTestUser(t TestingT, router *gin.Engine, usernamePrefix string) string {
	username := usernamePrefix + "_" + time.Now().Format("20060102150405")
	email := usernamePrefix + "@example.com"
	password := "securepass123"

	registerPayload, err := json.Marshal(apiSystemModels.RegisterRequest{
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

	var registerResponse apiSystemModels.TokenResponse
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

// InsertTestMetricsData inserts test data into ClickHouse metrics_snapshot table
func InsertTestMetricsData(t TestingT, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		return fmt.Errorf("Failed to get ClickHouse connection for node %s: %v", nodeName, err)
	}

	// Get config to find metrics schema and table
	cfg, err := config.Load(testConfigPath)
	if err != nil {
		return fmt.Errorf("Failed to load config: %v", err)
	}

	var nodeConfig config.ClickHouseNode
	for _, node := range cfg.Database.ClickHouse.Nodes {
		if node.Name == nodeName {
			nodeConfig = node
			break
		}
	}

	if nodeConfig.Name == "" {
		return fmt.Errorf("Node %s not found in config", nodeName)
	}

	schema := nodeConfig.MetricsSchema
	table := nodeConfig.MetricsTable
	if schema == "" {
		schema = "ops"
	}
	if table == "" {
		table = "metrics_snapshot"
	}

	// Create schema and table if they don't exist
	ctx := context.Background()
	createSchemaQuery := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", schema)
	if err := conn.Exec(ctx, createSchemaQuery); err != nil {
		return fmt.Errorf("Failed to create schema: %v", err)
	}

	createTableQuery := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s.%s
		(
			timestamp DateTime,
			profile Map(String, Float64)
		)
		ENGINE = MergeTree
		PARTITION BY toDate(timestamp)
		ORDER BY timestamp
		SETTINGS index_granularity = 8192
	`, schema, table)
	if err := conn.Exec(ctx, createTableQuery); err != nil {
		return fmt.Errorf("Failed to create table: %v", err)
	}

	// Insert test metrics data
	data := fixtures.DefaultMetricsData(nodeName)
	profile := map[string]float64{
		"OSUserTimeNormalized":    data.CPULoad / 100.0 / 7.0,
		"OSSystemTimeNormalized":  data.CPULoad / 100.0 / 7.0,
		"OSIOWaitTimeNormalized":  0.0,
		"OSIrqTimeNormalized":     data.CPULoad / 100.0 / 7.0,
		"OSSoftIrqTimeNormalized": data.CPULoad / 100.0 / 7.0,
		"OSGuestTimeNormalized":   data.CPULoad / 100.0 / 7.0,
		"OSStealTimeNormalized":   data.CPULoad / 100.0 / 7.0,
		"OSNiceTimeNormalized":    data.CPULoad / 100.0 / 7.0,
		"OSMemoryTotal":           float64(data.MemoryTotal),
		"OSMemoryAvailable":       float64(data.MemoryAvail),
		"DiskTotalSpace":          float64(data.DiskTotal),
		"DiskFreeSpace":           float64(data.DiskFree),
		"TCPConnection":           float64(data.Connections.TCP),
		"MySQLConnection":         float64(data.Connections.MySQL),
		"HTTPConnection":          float64(data.Connections.HTTP),
		"InterserverConnection":   float64(data.Connections.Interserver),
		"PostgreSQLConnection":    float64(data.Connections.PostgreSQL),
		"Query":                   float64(data.QueryCount),
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s.%s (timestamp, profile) VALUES (?, ?)", schema, table)
	if err := conn.Exec(ctx, insertQuery, data.Timestamp, profile); err != nil {
		return fmt.Errorf("Failed to insert metrics data: %v", err)
	}

	return nil
}

// CreateTestClickHouseUser creates a test user in ClickHouse for testing purposes
func CreateTestClickHouseUser(t TestingT, userName, password string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Create user if not exists
	createUserQuery := fmt.Sprintf("CREATE USER IF NOT EXISTS `%s` IDENTIFIED BY '%s'", userName, password)
	if err := conn.Exec(ctx, createUserQuery); err != nil {
		return fmt.Errorf("Failed to create test user: %v", err)
	}

	return nil
}

// DeleteTestClickHouseUser deletes a test user from ClickHouse
func DeleteTestClickHouseUser(t TestingT, userName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Drop user if exists
	dropUserQuery := fmt.Sprintf("DROP USER IF EXISTS `%s`", userName)
	if err := conn.Exec(ctx, dropUserQuery); err != nil {
		return fmt.Errorf("Failed to delete test user: %v", err)
	}

	return nil
}

// CreateTestClickHouseProfile creates a test profile in ClickHouse for testing purposes
func CreateTestClickHouseProfile(t TestingT, profileName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Escape backticks in profile name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Create profile if not exists with basic settings
	createProfileQuery := fmt.Sprintf("CREATE PROFILE IF NOT EXISTS `%s` SETTINGS max_memory_usage = 10000000000, max_execution_time = 300", escapeIdentifier(profileName))
	if err := conn.Exec(ctx, createProfileQuery); err != nil {
		return fmt.Errorf("Failed to create test profile: %v", err)
	}

	return nil
}

// DeleteTestClickHouseProfile deletes a test profile from ClickHouse
func DeleteTestClickHouseProfile(t TestingT, profileName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Escape backticks in profile name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Drop profile if exists
	dropProfileQuery := fmt.Sprintf("DROP PROFILE IF EXISTS `%s`", escapeIdentifier(profileName))
	if err := conn.Exec(ctx, dropProfileQuery); err != nil {
		return fmt.Errorf("Failed to delete test profile: %v", err)
	}

	return nil
}

// CreateTestClickHouseUserWithProfile creates a test user in ClickHouse with a specified profile
func CreateTestClickHouseUserWithProfile(t TestingT, userName, password, profileName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}
	escapePassword := func(pwd string) string {
		return strings.ReplaceAll(pwd, "'", "''")
	}
	escapeProfileName := func(name string) string {
		return strings.ReplaceAll(name, "'", "''")
	}

	createUserQuery := fmt.Sprintf("CREATE USER IF NOT EXISTS `%s` IDENTIFIED BY '%s' SETTINGS PROFILE '%s'",
		escapeIdentifier(userName), escapePassword(password), escapeProfileName(profileName))
	if err := conn.Exec(ctx, createUserQuery); err != nil {
		return fmt.Errorf("Failed to create test user with profile: %v", err)
	}

	return nil
}

// CreateTestClickHouseRole creates a test role in ClickHouse for testing purposes
func CreateTestClickHouseRole(t TestingT, roleName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Escape backticks in role name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Create role if not exists
	createRoleQuery := fmt.Sprintf("CREATE ROLE IF NOT EXISTS `%s`", escapeIdentifier(roleName))
	if err := conn.Exec(ctx, createRoleQuery); err != nil {
		return fmt.Errorf("Failed to create test role: %v", err)
	}

	return nil
}

// DeleteTestClickHouseRole deletes a test role from ClickHouse
func DeleteTestClickHouseRole(t TestingT, roleName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		// Try default connection if node not found
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	// Escape backticks in role name for SQL safety
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Drop role if exists
	dropRoleQuery := fmt.Sprintf("DROP ROLE IF EXISTS `%s`", escapeIdentifier(roleName))
	if err := conn.Exec(ctx, dropRoleQuery); err != nil {
		return fmt.Errorf("Failed to delete test role: %v", err)
	}

	return nil
}

// GetTestClickHouseUserDetails fetches user details directly from ClickHouse for verification
func GetTestClickHouseUserDetails(t TestingT, userName, nodeName string) (*chmodels.UserDetails, error) {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return nil, fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()
	var profile sql.NullString
	var roleName sql.NullString

	// Query profile from system.settings_profile_elements where user_name matches
	profileQuery := `SELECT inherit_profile as profile
		FROM system.settings_profile_elements
		WHERE user_name = ?
		LIMIT 1`
	err = conn.QueryRow(ctx, profileQuery, userName).Scan(&profile)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to query user profile: %w", err)
	}

	// Query role from system.role_grants where user_name matches
	// Try to query role - if table doesn't exist, roleName will remain empty
	roleQuery := `SELECT granted_role_name as role_name
		FROM system.role_grants
		WHERE user_name = ?
		LIMIT 1`
	err = conn.QueryRow(ctx, roleQuery, userName).Scan(&roleName)
	if err != nil && err != sql.ErrNoRows {
		// If error is not "no rows", it might be table doesn't exist - that's ok
		// Just log and continue with empty role
		roleName = sql.NullString{String: "", Valid: false}
	}

	return &chmodels.UserDetails{
		Profile:  profile.String,
		RoleName: roleName.String,
	}, nil
}

// CreateTestClickHouseGrant creates a test grant in ClickHouse for testing purposes.
// database, table, and column can be empty strings or "All" to represent wildcard.
func CreateTestClickHouseGrant(t TestingT, userName, accessType, database, table, column, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Build GRANT statement
	// If database/table/column is empty or "All", use ON *.*, database.*, or database.table.*
	var grantQuery string
	if database == "" || database == "All" {
		// Global grant: ON *.*
		grantQuery = fmt.Sprintf("GRANT %s ON *.* TO `%s`", accessType, escapeIdentifier(userName))
	} else if table == "" || table == "All" {
		// Database-level grant: ON database.*
		grantQuery = fmt.Sprintf("GRANT %s ON `%s`.* TO `%s`", accessType, escapeIdentifier(database), escapeIdentifier(userName))
	} else if column == "" || column == "All" {
		// Table-level grant: ON database.table
		grantQuery = fmt.Sprintf("GRANT %s ON `%s`.`%s` TO `%s`", accessType, escapeIdentifier(database), escapeIdentifier(table), escapeIdentifier(userName))
	} else {
		// Column-level grant: GRANT access_type(column) ON database.table TO user
		grantQuery = fmt.Sprintf("GRANT %s(`%s`) ON `%s`.`%s` TO `%s`", accessType, escapeIdentifier(column), escapeIdentifier(database), escapeIdentifier(table), escapeIdentifier(userName))
	}

	if err := conn.Exec(ctx, grantQuery); err != nil {
		return fmt.Errorf("Failed to create test grant: %v", err)
	}

	return nil
}

// DeleteTestClickHouseGrants deletes all grants for a test user from ClickHouse.
func DeleteTestClickHouseGrants(t TestingT, userName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Revoke all grants from user
	revokeQuery := fmt.Sprintf("REVOKE ALL ON *.* FROM `%s`", escapeIdentifier(userName))
	if err := conn.Exec(ctx, revokeQuery); err != nil {
		// Ignore errors - user might not have any grants
		return nil
	}

	return nil
}

// CreateTestClickHouseDatabase creates a test database (schema) in ClickHouse for testing purposes.
func CreateTestClickHouseDatabase(t TestingT, databaseName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Create database if not exists
	createDatabaseQuery := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", escapeIdentifier(databaseName))
	if err := conn.Exec(ctx, createDatabaseQuery); err != nil {
		return fmt.Errorf("Failed to create test database: %v", err)
	}

	return nil
}

// DeleteTestClickHouseDatabase deletes a test database from ClickHouse.
func DeleteTestClickHouseDatabase(t TestingT, databaseName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Drop database if exists
	dropDatabaseQuery := fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", escapeIdentifier(databaseName))
	if err := conn.Exec(ctx, dropDatabaseQuery); err != nil {
		return fmt.Errorf("Failed to delete test database: %v", err)
	}

	return nil
}

// CreateTestClickHouseTable creates a test table in ClickHouse for testing purposes.
func CreateTestClickHouseTable(t TestingT, databaseName, tableName string, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Create table if not exists
	createTableQuery := fmt.Sprintf(
		"CREATE TABLE IF NOT EXISTS `%s`.`%s` ("+
			"id UInt64, "+
			"name String, "+
			"value String, "+
			"created_at DateTime DEFAULT now()"+
			") ENGINE = MergeTree ORDER BY id SETTINGS index_granularity = 8192",
		escapeIdentifier(databaseName), escapeIdentifier(tableName))
	if err := conn.Exec(ctx, createTableQuery); err != nil {
		return fmt.Errorf("Failed to create test table: %v", err)
	}

	return nil
}

// DeleteTestClickHouseTable deletes a test table from ClickHouse.
func DeleteTestClickHouseTable(t TestingT, databaseName, tableName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}

	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}

	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}

	ctx := context.Background()

	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}

	// Drop table if exists
	dropTableQuery := fmt.Sprintf("DROP TABLE IF EXISTS `%s`.`%s`", escapeIdentifier(databaseName), escapeIdentifier(tableName))
	if err := conn.Exec(ctx, dropTableQuery); err != nil {
		return fmt.Errorf("Failed to delete test table: %v", err)
	}

	return nil
}

// CreateTestClickHouseDatabaseAtomic creates an Atomic database (tables get unique UUIDs in system.tables).
func CreateTestClickHouseDatabaseAtomic(t TestingT, databaseName, nodeName string) error {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return fmt.Errorf("ClickHouse manager not initialized")
	}
	cluster := chManager.GetCluster()
	if cluster == nil {
		return fmt.Errorf("ClickHouse cluster not initialized")
	}
	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}
	ctx := context.Background()
	escapeIdentifier := func(name string) string {
		return strings.ReplaceAll(name, "`", "``")
	}
	createQuery := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` ENGINE = Atomic", escapeIdentifier(databaseName))
	if err := conn.Exec(ctx, createQuery); err != nil {
		return fmt.Errorf("Failed to create Atomic test database: %v", err)
	}
	return nil
}

// GetTableUUID returns the UUID of a table from system.tables (database, name). Empty string and error if not found.
func GetTableUUID(t TestingT, databaseName, tableName, nodeName string) (string, error) {
	chManager := clickhouse.GetInstance()
	if chManager == nil {
		return "", fmt.Errorf("ClickHouse manager not initialized")
	}
	cluster := chManager.GetCluster()
	if cluster == nil {
		return "", fmt.Errorf("ClickHouse cluster not initialized")
	}
	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	if err != nil {
		conn, _, err = cluster.GetConnection()
		if err != nil {
			return "", fmt.Errorf("Failed to get ClickHouse connection: %v", err)
		}
	}
	ctx := context.Background()
	query := "SELECT uuid FROM system.tables WHERE database = ? AND name = ? LIMIT 1"
	row := conn.QueryRow(ctx, query, databaseName, tableName)
	var uuid string
	if err := row.Scan(&uuid); err != nil {
		return "", fmt.Errorf("Failed to get table UUID: %w", err)
	}
	return uuid, nil
}
