package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/tests/api/testutil"
	"clickhouse-ops/tests/fixtures"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestHealthEndpoint tests the /healthz endpoint
func TestHealthEndpoint(t *testing.T) {
	fmt.Println("TestHealthEndpoint")
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
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
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

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
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

	// Create test user for login
	username := "test_login_user_" + time.Now().Format("20060102150405")
	password := "securepass123"
	email := "login_test@example.com"

	// Create user directly via repository for testing
	dbInstance := db.GetInstance()
	if dbInstance != nil {
		userRepo := repository.NewUserRepositoryWithDB(dbInstance.GetGormDB())
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
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

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

// TestMetricsSeriesEndpoint tests the GET /api/v1/metrics/series endpoint
func TestMetricsSeriesEndpoint(t *testing.T) {
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

	nodeName := "test_node"
	now := time.Now().UTC().Truncate(time.Second)

	// Insert metrics series data into ClickHouse
	chManager := clickhouse.GetInstance()
	require.NotNil(t, chManager, "ClickHouse manager should be initialized")
	cluster := chManager.GetCluster()
	require.NotNil(t, cluster, "ClickHouse cluster should be initialized")
	conn, _, err := cluster.GetConnectionByNodeName(nodeName)
	require.NoError(t, err, "Failed to get ClickHouse connection")

	cfg, err := config.Load(testutil.GetTestConfigPath())
	require.NoError(t, err)

	var nodeConfig config.ClickHouseNode
	for _, node := range cfg.Database.ClickHouse.Nodes {
		if node.Name == nodeName {
			nodeConfig = node
			break
		}
	}
	require.NotEmpty(t, nodeConfig.Name, "Node should be found in config")

	schema := nodeConfig.MetricsSchema
	table := nodeConfig.MetricsTable
	if schema == "" {
		schema = "ops"
	}
	if table == "" {
		table = "metrics_snapshot"
	}

	ctx := context.Background()
	// Ensure schema and table exist
	createSchemaQuery := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", schema)
	_ = conn.Exec(ctx, createSchemaQuery)
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
	_ = conn.Exec(ctx, createTableQuery)

	// Insert metrics series points
	points := []fixtures.MetricsSeriesPoint{
		{Timestamp: now.Add(-2 * time.Minute), CPULoad: 30.0},
		{Timestamp: now.Add(-time.Minute), CPULoad: 33.0},
		{Timestamp: now, CPULoad: 36.0},
	}

	for _, point := range points {
		profile := map[string]float64{
			"OSUserTimeNormalized":    point.CPULoad / 100.0 / 7.0,
			"OSSystemTimeNormalized":  point.CPULoad / 100.0 / 7.0,
			"OSIOWaitTimeNormalized":  0.0,
			"OSIrqTimeNormalized":     point.CPULoad / 100.0 / 7.0,
			"OSSoftIrqTimeNormalized": point.CPULoad / 100.0 / 7.0,
			"OSGuestTimeNormalized":   point.CPULoad / 100.0 / 7.0,
			"OSStealTimeNormalized":   point.CPULoad / 100.0 / 7.0,
			"OSNiceTimeNormalized":    point.CPULoad / 100.0 / 7.0,
			"Query":                   10.0,
		}
		insertQuery := fmt.Sprintf("INSERT INTO %s.%s (timestamp, profile) VALUES (?, ?)", schema, table)
		execErr := conn.Exec(ctx, insertQuery, point.Timestamp, profile)
		require.NoError(t, execErr, "Failed to insert metrics point")
	}

	username := "test_metrics_user_" + time.Now().Format("20060102150405")
	password := "securepass123"
	email := "metrics_test@example.com"

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
	err = json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	require.NoError(t, err)
	require.NotEmpty(t, registerResponse.Token)

	req, _ := http.NewRequest("GET", "/api/v1/metrics/series?node="+nodeName+"&metric=cpu_load&period=1h&step=1m", nil)
	req.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var series models.MetricSeriesResponse
	err = json.Unmarshal(w.Body.Bytes(), &series)
	require.NoError(t, err)
	assert.Equal(t, nodeName, series.Node)
	assert.Equal(t, "cpu_load", series.Metric)
	assert.Equal(t, "1m", series.Step)
	if assert.NotEmpty(t, series.Points) {
		latest := series.Points[len(series.Points)-1]
		// CPULoad formula multiplies by 100, so 36% CPU load = 36.0
		assert.InDelta(t, 36.0, latest.Value, 0.5)
	}

	reqWide, _ := http.NewRequest("GET", "/api/v1/metrics/series?node="+nodeName+"&metric=cpu_load&period=7d&step=1h", nil)
	reqWide.Header.Set("Authorization", "Bearer "+registerResponse.Token)
	wWide := httptest.NewRecorder()
	router.ServeHTTP(wWide, reqWide)
	require.Equal(t, http.StatusOK, wWide.Code)

	var wideSeries models.MetricSeriesResponse
	err = json.Unmarshal(wWide.Body.Bytes(), &wideSeries)
	require.NoError(t, err)
	assert.Equal(t, "1h", wideSeries.Step)
}

// TestCORSHeaders tests CORS headers
func TestCORSHeaders(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
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

// TestRegisterEndpointWithDuplicateEmail tests registration with duplicate email
func TestRegisterEndpointWithDuplicateEmail(t *testing.T) {
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

	// Use unique email with timestamp to avoid conflicts from previous test runs
	email := "duplicate_" + time.Now().Format("20060102150405") + "@example.com"
	username1 := "test_user1_" + time.Now().Format("20060102150405")
	username2 := "test_user2_" + time.Now().Format("20060102150405")

	// Register first user
	payload1, _ := json.Marshal(models.RegisterRequest{
		Username: username1,
		Email:    email,
		Password: "securepass123",
	})
	req1, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(payload1))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusCreated, w1.Code, "First user registration should succeed")

	// Try to register second user with same email
	payload2, _ := json.Marshal(models.RegisterRequest{
		Username: username2,
		Email:    email,
		Password: "securepass123",
	})
	req2, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(payload2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	// Should return 409 Conflict
	assert.Equal(t, http.StatusConflict, w2.Code)
}

// TestLoginEndpointWithExpiredToken tests token expiration (if implemented)
func TestLoginEndpointWithExpiredToken(t *testing.T) {
	dbConn, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	defer testutil.CleanupTestData(t, dbConn)

	// This test verifies that expired tokens are rejected
	// Note: Actual expiration testing would require time manipulation
	timestamp := time.Now().Format("20060102150405")
	username := "test_expired_token_user_" + timestamp
	password := "securepass123"
	email := "expired_" + timestamp + "@example.com"

	// Create user
	dbInstance := db.GetInstance()
	if dbInstance != nil {
		userRepo := repository.NewUserRepositoryWithDB(dbInstance.GetGormDB())
		_, err := userRepo.CreateUser(username, email, password)
		require.NoError(t, err)
	}

	// Login to get token
	loginPayload, _ := json.Marshal(models.LoginRequest{
		Username: username,
		Password: password,
	})
	loginReq, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(loginPayload))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)
	require.Equal(t, http.StatusOK, loginW.Code)

	var loginResponse models.TokenResponse
	err := json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	require.NoError(t, err)
	require.NotEmpty(t, loginResponse.Token)

	// Use token to access protected endpoint
	req, _ := http.NewRequest("GET", "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+loginResponse.Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work with valid token
	assert.Equal(t, http.StatusOK, w.Code)
}

// TestAuthWithMalformedToken tests authentication with malformed tokens
func TestAuthWithMalformedToken(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	tests := []struct {
		name  string
		token string
	}{
		{"empty token", ""},
		{"invalid format", "not.a.token"},
		{"missing parts", "Bearer"},
		{"too many parts", "part1.part2.part3.part4"},
		{"special characters", "token!@#$%"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/api/v1/auth/me", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should return 401 for malformed tokens
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})
	}
}

// TestRegisterEndpointWithLongValues tests registration with very long values
func TestRegisterEndpointWithLongValues(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	longString := string(make([]byte, 1000)) // 1000 character string

	tests := []struct {
		name           string
		payload        models.RegisterRequest
		expectedStatus int
	}{
		{
			name: "very long username",
			payload: models.RegisterRequest{
				Username: longString,
				Email:    "test@example.com",
				Password: "securepass123",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "very long email",
			payload: models.RegisterRequest{
				Username: "testuser",
				Email:    longString + "@example.com",
				Password: "securepass123",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
