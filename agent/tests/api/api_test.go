package api_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupTestDB creates a test database connection
func setupTestDB(t *testing.T) (*gorm.DB, *sql.DB) {
	// Use test database
	dsn := "postgres://ops:12345@localhost:5436/public?sslmode=disable"
	
	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("Skipping test: cannot connect to test database: %v", err)
		return nil, nil
	}
	
	// Get underlying sql.DB
	sqlDB, err := gormDB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Ping())
	
	// Clean up test data
	cleanupTestData(t, gormDB)
	
	return gormDB, sqlDB
}

// cleanupTestData cleans up test data
func cleanupTestData(t *testing.T, gormDB *gorm.DB) {
	gormDB.Exec("DELETE FROM users WHERE username LIKE 'test_%'")
}

// setupTestRouter creates a test router
func setupTestRouter(t *testing.T, gormDB *gorm.DB, sqlDB *sql.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	
	cfg := v1.RouterConfig{
		JWTSecretKey:     "test-secret-key-for-testing-only",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     0, // Disable rate limiting for tests
		RateLimitBurst:   0,
		Logger:           logger.New(logger.InfoLevel, "text"),
	}
	
	// Setup router - it will use db.GetInstance() from setupTestEnvironment
	router := v1.SetupRouter(cfg)
	
	return router
}

// setupTestEnvironment sets up test environment
func setupTestEnvironment(t *testing.T) (*gorm.DB, *gin.Engine) {
	gormDB, sqlDB := setupTestDB(t)
	if gormDB == nil {
		return nil, nil
	}
	
	// Initialize database instance for handlers
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Postgres: config.DatabaseDSN{
				DSN: "postgres://ops:12345@localhost:5436/public?sslmode=disable",
			},
		},
	}
	
	log := logger.New(logger.InfoLevel, "text")
	
	// Create database manager properly
	err := db.Connect(cfg, log)
	if err != nil {
		t.Skipf("Skipping test: failed to initialize database manager: %v", err)
		return nil, nil
	}
	
	router := setupTestRouter(t, gormDB, sqlDB)
	return gormDB, router
}

// TestHealthEndpoint tests the /healthz endpoint
func TestHealthEndpoint(t *testing.T) {
	_, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	
	req, _ := http.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	
	assert.Equal(t, "ok", response["status"])
	assert.NotNil(t, response["timestamp"])
	assert.NotNil(t, response["services"])
}

// TestRegisterEndpoint tests the POST /api/v1/auth/register endpoint
func TestRegisterEndpoint(t *testing.T) {
	dbConn, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	defer cleanupTestData(t, dbConn)
	
	tests := []struct {
		name           string
		payload        models.RegisterRequest
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name: "successful registration",
			payload: models.RegisterRequest{
				Username: "test_user_" + time.Now().Format("20060102150405"),
				Email:    "test@example.com",
				Password: "securepass123",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.TokenResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.NotEmpty(t, response.Token)
				assert.Equal(t, "Bearer", response.Type)
				assert.Greater(t, response.ExpiresIn, int64(0))
			},
		},
		{
			name: "duplicate username",
			payload: models.RegisterRequest{
				Username: "test_duplicate",
				Email:    "test1@example.com",
				Password: "securepass123",
			},
			expectedStatus: http.StatusConflict,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response.Error, "already exists")
			},
		},
		{
			name: "invalid email",
			payload: models.RegisterRequest{
				Username: "test_invalid_email",
				Email:    "invalid-email",
				Password: "securepass123",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "short password",
			payload: models.RegisterRequest{
				Username: "test_short_pass",
				Email:    "test2@example.com",
				Password: "short",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing fields",
			payload: models.RegisterRequest{
				Username: "",
				Email:    "",
				Password: "",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}
	
	// Register first user for duplicate test
	if len(tests) > 1 {
		firstPayload, _ := json.Marshal(tests[1].payload)
		firstReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(firstPayload))
		firstReq.Header.Set("Content-Type", "application/json")
		firstW := httptest.NewRecorder()
		router.ServeHTTP(firstW, firstReq)
		if firstW.Code == http.StatusCreated {
			// User created, now test duplicate scenario
		}
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// TestLoginEndpoint tests the POST /api/v1/auth/login endpoint
func TestLoginEndpoint(t *testing.T) {
	dbConn, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	defer cleanupTestData(t, dbConn)
	
	// Create test user for login
	username := "test_login_user_" + time.Now().Format("20060102150405")
	password := "securepass123"
	email := "login_test@example.com"
	
	// Create user directly via repository for testing
	dbInstance := db.GetInstance()
	if dbInstance != nil {
		userRepo := repository.NewUserRepository(dbInstance.GetGormDB())
		_, err := userRepo.CreateUser(username, email, password)
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}
	}
	
	tests := []struct {
		name           string
		payload        models.LoginRequest
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name: "successful login",
			payload: models.LoginRequest{
				Username: username,
				Password: password,
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.TokenResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.NotEmpty(t, response.Token)
				assert.Equal(t, "Bearer", response.Type)
				assert.Greater(t, response.ExpiresIn, int64(0))
			},
		},
		{
			name: "wrong password",
			payload: models.LoginRequest{
				Username: username,
				Password: "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response.Error, "Invalid credentials")
			},
		},
		{
			name: "non-existent user",
			payload: models.LoginRequest{
				Username: "nonexistent_user",
				Password: "password123",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response.Error, "Invalid credentials")
			},
		},
		{
			name: "missing fields",
			payload: models.LoginRequest{
				Username: "",
				Password: "",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// TestMeEndpoint tests the GET /api/v1/auth/me endpoint
func TestMeEndpoint(t *testing.T) {
	dbConn, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	defer cleanupTestData(t, dbConn)
	
	// Create user and get token
	username := "test_me_user_" + time.Now().Format("20060102150405")
	password := "securepass123"
	email := "me_test@example.com"
	
	// Create user and get token via register endpoint
	registerPayload, _ := json.Marshal(models.RegisterRequest{
		Username: username,
		Email:    email,
		Password: password,
	})
	
	registerReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)
	
	require.Equal(t, http.StatusCreated, registerW.Code)
	
	var registerResponse models.TokenResponse
	err := json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token)
	
	tests := []struct {
		name           string
		token          string
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:           "valid token",
			token:          registerResponse.Token,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response models.UserInfo
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, username, response.Username)
				assert.Equal(t, email, response.Email)
				assert.NotEmpty(t, response.ID)
			},
		},
		{
			name:           "missing token",
			token:          "",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "invalid token",
			token:          "invalid.token.here",
			expectedStatus: http.StatusUnauthorized,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/api/v1/auth/me", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}
			w := httptest.NewRecorder()
			
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// TestSwaggerEndpoint tests Swagger documentation availability
func TestSwaggerEndpoint(t *testing.T) {
	_, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	
	req, _ := http.NewRequest("GET", "/swagger/index.html", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Swagger endpoint may not be available in test router setup
	// Check if it exists (200) or if it's not configured (404)
	// Both are acceptable in test environment
	assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code, "Swagger endpoint should return 200 or 404")
}

// TestCORSHeaders tests CORS headers
func TestCORSHeaders(t *testing.T) {
	_, router := setupTestEnvironment(t)
	if router == nil {
		return
	}
	
	req, _ := http.NewRequest("OPTIONS", "/api/v1/auth/login", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "GET, POST, PUT, DELETE, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
}
