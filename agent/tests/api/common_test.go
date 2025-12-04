package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
)

func TestNonExistentEndpoint(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test non-existent endpoint
	req, _ := http.NewRequest("GET", "/api/v1/nonexistent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 404
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestNonExistentMethod(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_nonexistent_method")

	// Test POST on GET-only endpoint
	// Note: Gin router returns 404 for unsupported methods, not 405
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/metrics/nodes", token, nil)
	assert.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Gin returns 404 for unsupported HTTP methods
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestInvalidJSONInRequestBody(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_invalid_json")

	// Test with invalid JSON in request body
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/processes/kill", token, []byte("{invalid}"))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 400 for invalid JSON
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCORSWithDifferentMethods(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	methods := []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}

	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req, _ := http.NewRequest(method, "/api/v1/auth/login", nil)
			req.Header.Set("Origin", "http://localhost:3000")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Should include CORS headers
			assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
		})
	}
}

func TestHealthEndpointWithDifferentMethods(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test GET method - should work
	t.Run("GET", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/healthz", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	// Test unsupported methods - should return 404 (Gin behavior)
	unsupportedMethods := []string{"POST", "PUT", "DELETE"}
	for _, method := range unsupportedMethods {
		t.Run(method, func(t *testing.T) {
			req, _ := http.NewRequest(method, "/healthz", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			// Gin returns 404 for unsupported methods
			assert.Equal(t, http.StatusNotFound, w.Code, "Expected 404 for unsupported method %s", method)
		})
	}
}

func TestAPIVersionPrefix(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test that /api/v1 prefix is required
	req, _ := http.NewRequest("GET", "/metrics/nodes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 404 without /api/v1 prefix
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestQueryParametersWithSpecialCharacters(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_special_chars")

	// Test with special characters (spaces) in query parameters
	// Using existing node "test_node" with leading/trailing spaces (which will be trimmed)
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/users?node=%20test_node%20", token, nil)
	assert.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should handle URL encoding properly - leading/trailing spaces are trimmed
	// Should return 200 for existing node after trimming
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestEmptyQueryParameters(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_empty_params")

	// Test with empty query parameters
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/users?node=", token, nil)
	assert.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should handle empty parameters (may return 200 or 400 depending on validation)
	assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest)
}
