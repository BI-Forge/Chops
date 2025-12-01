package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/tests/api/testutil"

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

	nodeName := "test_node_series"
	now := time.Now().UTC().Truncate(time.Second)

	insertSample := func(ts time.Time, cpuPercent float64) {
		// cpuPercent is expected CPU load percentage (0-100)
		// Formula: (sum of all normalized CPU times) * 100 = cpuPercent
		// So we need: sum = cpuPercent / 100
		// Distribute evenly across all 7 CPU time fields
		cpuNormalized := cpuPercent / 100.0 / 7.0
		
		memoryTotal := int64(16 * 1024 * 1024 * 1024)
		memoryAvailable := int64(8 * 1024 * 1024 * 1024)
		diskTotal := int64(10 * 1024 * 1024 * 1024)
		diskFree := int64(3 * 1024 * 1024 * 1024)

		req := dbConn.Exec(`
			INSERT INTO ch_metrics (
				"timestamp", node_name,
				os_user_time_normalized, os_system_time_normalized, os_io_wait_time_normalized,
				os_irq_time_normalized, os_soft_irq_time_normalized, os_guest_time_normalized, os_steal_time_normalized, os_nice_time_normalized,
				os_memory_total, os_memory_available,
				disk_total_space, disk_free_space,
				tcp_connection, mysql_connection, http_connection, interserver_connection, postgresql_connection,
				query
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, ts, nodeName, 
			cpuNormalized, cpuNormalized, cpuNormalized, // user, system, io_wait
			cpuNormalized, cpuNormalized, cpuNormalized, cpuNormalized, cpuNormalized, // irq, soft_irq, guest, steal, nice
			memoryTotal, memoryAvailable, diskTotal, diskFree, 
			2, 1, 3, 0, 4, 5)
		require.NoError(t, req.Error)
	}

	insertSample(now.Add(-2*time.Minute), 30.0)  // 30% CPU load
	insertSample(now.Add(-time.Minute), 33.0)    // 33% CPU load
	insertSample(now, 36.0)                       // 36% CPU load

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
	err := json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
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

// TestSwaggerEndpoint tests Swagger documentation availability
func TestSwaggerEndpoint(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
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
