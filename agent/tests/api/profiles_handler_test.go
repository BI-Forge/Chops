package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProfilesHandlerGetProfilesList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_profiles_list")

	// Create test profiles
	testProfile1 := "test_profile_list_1_" + time.Now().Format("20060102150405")
	testProfile2 := "test_profile_list_2_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseProfile(t, testProfile1, "test_node")
		_ = testutil.DeleteTestClickHouseProfile(t, testProfile2, "test_node")
	}()

	// Create test profiles
	err := testutil.CreateTestClickHouseProfile(t, testProfile1, "test_node")
	require.NoError(t, err, "Failed to create test profile 1")

	err = testutil.CreateTestClickHouseProfile(t, testProfile2, "test_node")
	require.NoError(t, err, "Failed to create test profile 2")

	// Test GET /api/v1/clickhouse/profiles/list
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/profiles/list?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ProfilesListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Profiles)
	assert.GreaterOrEqual(t, len(resp.Profiles), 2, "Should return at least 2 test profiles")

	// Verify that our test profiles are in the list
	profileMap := make(map[string]bool)
	for _, profile := range resp.Profiles {
		profileMap[profile] = true
	}
	assert.True(t, profileMap[testProfile1], "Test profile 1 should be in the list")
	assert.True(t, profileMap[testProfile2], "Test profile 2 should be in the list")
}

func TestProfilesHandlerGetProfilesListWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_get_profiles_list_no_node")

	// Create test profile
	testProfile := "test_profile_list_no_node_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseProfile(t, testProfile, "")
	}()

	// Create test profile
	err := testutil.CreateTestClickHouseProfile(t, testProfile, "")
	require.NoError(t, err, "Failed to create test profile")

	// Test GET /api/v1/clickhouse/profiles/list without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/profiles/list", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.ProfilesListResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Profiles)

	// Verify that our test profile is in the list
	profileMap := make(map[string]bool)
	for _, profile := range resp.Profiles {
		profileMap[profile] = true
	}
	assert.True(t, profileMap[testProfile], "Test profile should be in the list")
}

func TestProfilesHandlerGetProfilesListRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/profiles/list?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
