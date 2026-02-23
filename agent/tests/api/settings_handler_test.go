package api_test

import (
	"bytes"
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

func TestSettingsHandlerGetUserSettingsSuccess(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_get_user_settings")

	// default user exists in ClickHouse test env
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings?user_name=default&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UserSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "default", resp.UserName)
	assert.NotNil(t, resp.UserSettings)
	assert.NotNil(t, resp.ProfileSettings)
	// user_settings has same structure as profile_settings (map name -> value)
	assert.IsType(t, map[string]string{}, resp.UserSettings)
}

func TestSettingsHandlerGetUserSettingsMissingUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_settings_no_username")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.NotEmpty(t, errResp.Error)
}

func TestSettingsHandlerGetUserSettingsUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_settings_user_not_found")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings?user_name=nonexistent_user_xyz_123&node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.NotEmpty(t, errResp.Error)
}

func TestSettingsHandlerGetUserSettingsRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/settings?user_name=default&node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestSettingsHandlerGetAvailableSettingsSuccess(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_get_available_settings")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/available?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AvailableSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.NotNil(t, resp.Settings)
	assert.Greater(t, len(resp.Settings), 0, "Should return at least one setting from system.settings")

	// Check structure of first setting
	first := resp.Settings[0]
	assert.NotEmpty(t, first.Name)
	assert.NotEmpty(t, first.Type)
}

func TestSettingsHandlerGetAvailableSettingsWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_available_settings_no_node")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/available", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AvailableSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.NotNil(t, resp.Settings)
}

func TestSettingsHandlerGetAvailableSettingsRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/settings/available?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestSettingsHandlerUpdateUserSettingsSuccess(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_user_settings")
	testUserName := "test_user_settings_update_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "max_memory_usage", Value: "10000000000"},
			{Name: "max_execution_time", Value: "60"},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UserSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, testUserName, resp.UserName)
	require.NotNil(t, resp.UserSettings)
	require.NotNil(t, resp.ProfileSettings)
	// Response: user_settings and profile_settings have same structure (map name -> value)
	assert.Len(t, resp.UserSettings, 2)
	assert.Equal(t, "10000000000", resp.UserSettings["max_memory_usage"])
	assert.Equal(t, "60", resp.UserSettings["max_execution_time"])
	assert.Equal(t, "10000000000", resp.ProfileSettings["max_memory_usage"])
	assert.Equal(t, "60", resp.ProfileSettings["max_execution_time"])
}

func TestSettingsHandlerUpdateUserSettingsReplaceExisting(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_settings_replace")
	testUserName := "test_user_settings_replace_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// 1) Set initial settings
	reqBody1 := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "max_memory_usage", Value: "5000000000"},
			{Name: "max_execution_time", Value: "30"},
			{Name: "max_rows_to_read", Value: "1000"},
		},
	}
	bodyBytes1, err := json.Marshal(reqBody1)
	require.NoError(t, err)

	req1, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes1)
	require.NoError(t, err)
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	require.Equal(t, http.StatusOK, w1.Code)
	var resp1 models.UserSettingsResponse
	err = json.Unmarshal(w1.Body.Bytes(), &resp1)
	require.NoError(t, err)
	assert.Len(t, resp1.UserSettings, 3)
	assert.Equal(t, "5000000000", resp1.UserSettings["max_memory_usage"])
	assert.Equal(t, "30", resp1.UserSettings["max_execution_time"])
	assert.Equal(t, "1000", resp1.UserSettings["max_rows_to_read"])
	assert.Equal(t, "5000000000", resp1.ProfileSettings["max_memory_usage"])
	assert.Equal(t, "30", resp1.ProfileSettings["max_execution_time"])
	assert.Equal(t, "1000", resp1.ProfileSettings["max_rows_to_read"])

	// 2) Update with new settings (replace all: different values, one removed, one new)
	reqBody2 := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "max_memory_usage", Value: "20000000000"},
			{Name: "max_execution_time", Value: "120"},
		},
	}
	bodyBytes2, err := json.Marshal(reqBody2)
	require.NoError(t, err)

	req2, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes2)
	require.NoError(t, err)
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	require.Equal(t, http.StatusOK, w2.Code)
	var resp2 models.UserSettingsResponse
	err = json.Unmarshal(w2.Body.Bytes(), &resp2)
	require.NoError(t, err)
	assert.Equal(t, testUserName, resp2.UserName)
	// Response: user_settings and profile_settings are maps with same structure
	require.Len(t, resp2.UserSettings, 2)
	assert.Equal(t, "20000000000", resp2.UserSettings["max_memory_usage"])
	assert.Equal(t, "120", resp2.UserSettings["max_execution_time"])
	assert.Equal(t, "20000000000", resp2.ProfileSettings["max_memory_usage"])
	assert.Equal(t, "120", resp2.ProfileSettings["max_execution_time"])
	_, hadOld := resp2.UserSettings["max_rows_to_read"]
	assert.False(t, hadOld, "max_rows_to_read should not be in response after replace")
}

func TestSettingsHandlerUpdateUserSettingsEmptyList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_settings_empty")
	testUserName := "test_user_settings_empty_" + time.Now().Format("20060102150405")
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{},
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UserSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, testUserName, resp.UserName)
	assert.NotNil(t, resp.UserSettings)
	assert.Empty(t, resp.UserSettings, "user_settings should be empty map after clearing")
}

func TestSettingsHandlerUpdateUserSettingsMissingUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_settings_no_name")

	reqBody := models.UpdateUserSettingsRequest{
		UserName: "",
		Settings: []models.UserSettingItem{{Name: "max_memory_usage", Value: "1000"}},
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.NotEmpty(t, errResp.Error)
}

func TestSettingsHandlerUpdateUserSettingsUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_settings_not_found")

	reqBody := models.UpdateUserSettingsRequest{
		UserName: "nonexistent_user_settings_xyz_123",
		Settings: []models.UserSettingItem{{Name: "max_memory_usage", Value: "1000"}},
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.NotEmpty(t, errResp.Error)
}

func TestSettingsHandlerUpdateUserSettingsInvalidJSON(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_update_settings_invalid_json")

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, []byte("{invalid}"))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandlerUpdateUserSettingsRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	reqBody := models.UpdateUserSettingsRequest{
		UserName: "some_user",
		Settings: []models.UserSettingItem{},
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestSettingsHandlerUpdateUserSettingsEmptySettingName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	ts := time.Now().Format("20060102150405")
	token := testutil.RegisterTestUser(t, router, "test_set_empty_name")
	testUserName := "test_user_settings_empty_name_" + ts
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "", Value: "1000"},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Invalid request", errResp.Error)
	assert.Contains(t, errResp.Message, "Setting name cannot be empty")
}

func TestSettingsHandlerUpdateUserSettingsEmptySettingValue(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	ts := time.Now().Format("20060102150405")
	token := testutil.RegisterTestUser(t, router, "test_set_empty_val")
	testUserName := "test_user_settings_empty_value_" + ts
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "max_memory_usage", Value: ""},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Invalid request", errResp.Error)
	assert.Contains(t, errResp.Message, "Setting value cannot be empty")
	assert.Contains(t, errResp.Message, "max_memory_usage")
}

func TestSettingsHandlerUpdateUserSettingsInvalidBoolValue(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	ts := time.Now().Format("20060102150405")
	token := testutil.RegisterTestUser(t, router, "test_set_inv_bool")
	testUserName := "test_user_settings_invalid_bool_" + ts
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	// join_use_nulls is Bool in ClickHouse; "yes" is invalid
	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "join_use_nulls", Value: "yes"},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Invalid request", errResp.Error)
	assert.Contains(t, errResp.Message, "boolean")
	assert.Contains(t, errResp.Message, "join_use_nulls")
}

func TestSettingsHandlerUpdateUserSettingsInvalidNumericValue(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	ts := time.Now().Format("20060102150405")
	token := testutil.RegisterTestUser(t, router, "test_set_inv_num")
	testUserName := "test_user_settings_invalid_num_" + ts
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: "max_memory_usage", Value: "not_a_number"},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Invalid request", errResp.Error)
	assert.Contains(t, errResp.Message, "numeric")
	assert.Contains(t, errResp.Message, "max_memory_usage")
}

// TestSettingsHandlerUpdateUserSettingsChangeProfileSettingForbidden verifies that changing
// a setting that comes from the user's profile returns 400.
func TestSettingsHandlerUpdateUserSettingsChangeProfileSettingForbidden(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	ts := time.Now().Format("20060102150405")
	token := testutil.RegisterTestUser(t, router, "test_set_profile_forbid")
	testUserName := "test_user_profile_forbid_" + ts
	testPassword := "testpass123"

	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err)

	// Assign default profile (often has settings in ClickHouse)
	profileBody, _ := json.Marshal(map[string]string{"user_name": testUserName, "profile_name": "default"})
	profileReq, _ := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, profileBody)
	profileReq.Header.Set("Content-Type", "application/json")
	profileW := httptest.NewRecorder()
	router.ServeHTTP(profileW, profileReq)
	// Ignore if profile assign fails (e.g. no default profile)

	// Get current settings to see if user has any profile_settings
	getReq, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings?user_name="+testUserName+"&node=test_node", token, nil)
	require.NoError(t, err)
	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, getReq)
	require.Equal(t, http.StatusOK, getW.Code)
	var getResp models.UserSettingsResponse
	err = json.Unmarshal(getW.Body.Bytes(), &getResp)
	require.NoError(t, err)

	// If no profile settings, set one user-level so we have at least one; then try to "change" it by sending same name different value.
	// Backend treats any name that exists in profile_settings as profile and rejects value change. So we need profile_settings non-empty.
	// Pick first profile setting if any, else skip test
	var nameFromProfile string
	var valueFromProfile string
	for k, v := range getResp.ProfileSettings {
		nameFromProfile = k
		valueFromProfile = v
		break
	}
	if nameFromProfile == "" {
		t.Skip("User has no profile_settings; skip test that requires changing a profile setting")
		return
	}

	// Try to change that profile setting to a different value
	reqBody := models.UpdateUserSettingsRequest{
		UserName: testUserName,
		Settings: []models.UserSettingItem{
			{Name: nameFromProfile, Value: valueFromProfile + "_changed"},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	require.NoError(t, err)
	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/settings?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var errResp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Changing profile_settings is not allowed", errResp.Error)
	assert.Contains(t, errResp.Message, nameFromProfile)
	assert.Contains(t, errResp.Message, "profile")
}
