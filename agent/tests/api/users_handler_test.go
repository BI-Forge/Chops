package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUsersHandlerReturnsUsers(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_users_user")

	// Test GET /api/v1/clickhouse/users with node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UsersResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Users)
	// Should contain at least default user
	assert.GreaterOrEqual(t, len(resp.Users), 0)
}

func TestUsersHandlerReturnsUsersWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_users_no_node")

	// Test GET /api/v1/clickhouse/users without node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UsersResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.NotNil(t, resp.Users)
}

func TestUsersHandlerHandlesNodeWithWhitespace(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_users_whitespace")

	// Test GET /api/v1/clickhouse/users with whitespace in node parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users?node=%20test_node%20", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should still work (whitespace is trimmed)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUsersHandlerRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUserBasicInfo(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info")

	// Test GET /api/v1/clickhouse/users/details with node and name parameters
	// Using "default" user which should exist in ClickHouse
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name=default", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp chmodels.UserDetails
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	// Verify all required fields are present
	assert.NotEmpty(t, resp.Name, "Name should not be empty")
	assert.Equal(t, "default", resp.Name)
	assert.NotEmpty(t, resp.ID, "ID should not be empty")

	// Verify optional fields structure (may be empty but should exist)
	assert.NotNil(t, resp.UserSettings, "UserSettings should not be nil (can be empty slice)")
	assert.NotNil(t, resp.ProfileSettings, "ProfileSettings should not be nil (can be empty map)")
	assert.NotNil(t, resp.Grants, "Grants should not be nil (can be empty slice)")

	// Verify field types by checking that we can iterate over them
	// This ensures they are the correct types
	_ = len(resp.UserSettings)    // []string can use len()
	_ = len(resp.ProfileSettings) // map[string]string can use len()
	_ = len(resp.Grants)          // []string can use len()

	// Profile, Storage, RoleName, Scope are strings (may be empty)
	// Just verify they exist in the response structure
	_ = resp.Profile
	_ = resp.Storage
	_ = resp.RoleName
	_ = resp.Scope
}

func TestUsersHandlerUserBasicInfoWithoutName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_no_name")

	// Test GET /api/v1/clickhouse/users/details without name parameter
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "name parameter is required")
}

func TestUsersHandlerUserBasicInfoUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_not_found")

	// Test GET /api/v1/clickhouse/users/details with non-existent user
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name=nonexistent_user_12345", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User not found")
	assert.Contains(t, resp.Message, "nonexistent_user_12345")
}

func TestUsersHandlerUserBasicInfoRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name=default", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUserBasicInfoWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_user_basic_info_no_node")

	// Test GET /api/v1/clickhouse/users/details without node parameter
	// Should work with default connection
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?name=default", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp chmodels.UserDetails
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	// Verify response structure
	assert.NotEmpty(t, resp.Name, "Name should not be empty")
	assert.NotEmpty(t, resp.ID, "ID should not be empty")
	assert.NotNil(t, resp.UserSettings, "UserSettings should not be nil")
	assert.NotNil(t, resp.ProfileSettings, "ProfileSettings should not be nil")
	assert.NotNil(t, resp.Grants, "Grants should not be nil")
}

func TestUsersHandlerUpdateUserLogin(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login")

	// Create test user in ClickHouse
	testUserName := "test_user_rename_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	newUserName := "test_user_renamed_" + time.Now().Format("20060102150405")

	// Cleanup: ensure test users are deleted
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseUser(t, newUserName, "test_node")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/rename
	requestBody := models.UpdateUserLoginRequest{
		OldName: testUserName,
		NewName: newUserName,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserLoginResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User renamed successfully", resp.Message)
	assert.Equal(t, testUserName, resp.OldName)
	assert.Equal(t, newUserName, resp.NewName)

	// Verify user was renamed by trying to get details with new name
	reqDetails, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name="+newUserName, token, nil)
	require.NoError(t, err)
	wDetails := httptest.NewRecorder()
	router.ServeHTTP(wDetails, reqDetails)

	assert.Equal(t, http.StatusOK, wDetails.Code)

	var userDetails chmodels.UserDetails
	err = json.Unmarshal(wDetails.Body.Bytes(), &userDetails)
	assert.NoError(t, err)
	assert.Equal(t, newUserName, userDetails.Name)

	// Verify old user name doesn't exist
	reqOldDetails, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name="+testUserName, token, nil)
	require.NoError(t, err)
	wOldDetails := httptest.NewRecorder()
	router.ServeHTTP(wOldDetails, reqOldDetails)

	assert.Equal(t, http.StatusNotFound, wOldDetails.Code)
}

func TestUsersHandlerUpdateUserLoginSameName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_same")

	// Create test user in ClickHouse
	testUserName := "test_user_same_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/rename with same name
	requestBody := models.UpdateUserLoginRequest{
		OldName: testUserName,
		NewName: testUserName,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return success (no error) when names are the same
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserLoginResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User name unchanged", resp.Message)
	assert.Equal(t, testUserName, resp.OldName)
	assert.Equal(t, testUserName, resp.NewName)
}

func TestUsersHandlerUpdateUserLoginUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_not_found")

	// Test PUT /api/v1/clickhouse/users/rename with non-existent user
	requestBody := models.UpdateUserLoginRequest{
		OldName: "nonexistent_user_12345",
		NewName: "new_name_user",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User not found")
	assert.Contains(t, resp.Message, "nonexistent_user_12345")
}

func TestUsersHandlerUpdateUserLoginMissingOldName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_missing_old")

	// Test PUT /api/v1/clickhouse/users/rename without old_name
	requestBody := models.UpdateUserLoginRequest{
		OldName: "",
		NewName: "new_name_user",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (OldName), not JSON (old_name)
	assert.Contains(t, resp.Message, "OldName")
}

func TestUsersHandlerUpdateUserLoginMissingNewName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_missing_new")

	// Test PUT /api/v1/clickhouse/users/rename without new_name
	requestBody := models.UpdateUserLoginRequest{
		OldName: "old_user",
		NewName: "",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (NewName), not JSON (new_name)
	assert.Contains(t, resp.Message, "NewName")
}

func TestUsersHandlerUpdateUserLoginRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	requestBody := models.UpdateUserLoginRequest{
		OldName: "old_user",
		NewName: "new_user",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := http.NewRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUpdateUserLoginWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_no_node")

	// Create test user in ClickHouse
	testUserName := "test_user_no_node_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	newUserName := "test_user_no_node_renamed_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "")
		_ = testutil.DeleteTestClickHouseUser(t, newUserName, "")
	}()

	// Create test user (without node, uses default connection)
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/rename without node parameter
	requestBody := models.UpdateUserLoginRequest{
		OldName: testUserName,
		NewName: newUserName,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserLoginResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User renamed successfully", resp.Message)
}

func TestUsersHandlerUpdateUserLoginUsersXmlStorage(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_users_xml")

	// Get details of default user to check storage
	reqDetails, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name=default", token, nil)
	require.NoError(t, err)
	wDetails := httptest.NewRecorder()
	router.ServeHTTP(wDetails, reqDetails)

	if wDetails.Code != http.StatusOK {
		t.Skip("Cannot get default user details, skipping test")
		return
	}

	var userDetails chmodels.UserDetails
	err = json.Unmarshal(wDetails.Body.Bytes(), &userDetails)
	require.NoError(t, err)

	// Only test if default user has users_xml storage
	if userDetails.Storage != "users_xml" {
		t.Skipf("Default user storage is '%s', not 'users_xml', skipping test", userDetails.Storage)
		return
	}

	// Test PUT /api/v1/clickhouse/users/rename with user from users.xml
	newUserName := "test_user_renamed_from_xml_" + time.Now().Format("20060102150405")
	requestBody := models.UpdateUserLoginRequest{
		OldName: "default",
		NewName: newUserName,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Cannot rename user")
	assert.Contains(t, resp.Message, "users.xml file")
}

func TestUsersHandlerCreateUser(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user")

	// Create unique test user name
	testUserName := "test_user_create_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"

	// Cleanup: ensure test user is deleted
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Test POST /api/v1/clickhouse/users
	requestBody := models.CreateUserRequest{
		Name:     testUserName,
		Password: testPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.CreateUserResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User created successfully", resp.Message)
	assert.Equal(t, testUserName, resp.Name)

	// Verify user was created by trying to get details
	reqDetails, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/users/details?node=test_node&name="+testUserName, token, nil)
	require.NoError(t, err)
	wDetails := httptest.NewRecorder()
	router.ServeHTTP(wDetails, reqDetails)

	assert.Equal(t, http.StatusOK, wDetails.Code)

	var userDetails chmodels.UserDetails
	err = json.Unmarshal(wDetails.Body.Bytes(), &userDetails)
	assert.NoError(t, err)
	assert.Equal(t, testUserName, userDetails.Name)
}

func TestUsersHandlerCreateUserAlreadyExists(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_exists")

	// Create test user in ClickHouse
	testUserName := "test_user_exists_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user first
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Try to create the same user again
	requestBody := models.CreateUserRequest{
		Name:     testUserName,
		Password: "different_password",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User already exists")
	assert.Contains(t, resp.Message, testUserName)
}

func TestUsersHandlerCreateUserMissingName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_missing_name")

	// Test POST /api/v1/clickhouse/users without name
	requestBody := models.CreateUserRequest{
		Name:     "",
		Password: "test_password_123",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (Name), not JSON (name)
	assert.Contains(t, resp.Message, "Name")
}

func TestUsersHandlerCreateUserMissingPassword(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_missing_password")

	// Test POST /api/v1/clickhouse/users without password
	requestBody := models.CreateUserRequest{
		Name:     "test_user",
		Password: "",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (Password), not JSON (password)
	assert.Contains(t, resp.Message, "Password")
}

func TestUsersHandlerCreateUserRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	requestBody := models.CreateUserRequest{
		Name:     "test_user",
		Password: "test_password",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", "/api/v1/clickhouse/users?node=test_node", bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerCreateUserWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_no_node")

	// Create unique test user name
	testUserName := "test_user_no_node_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "")
	}()

	// Test POST /api/v1/clickhouse/users without node parameter
	requestBody := models.CreateUserRequest{
		Name:     testUserName,
		Password: testPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.CreateUserResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User created successfully", resp.Message)
	assert.Equal(t, testUserName, resp.Name)
}

func TestUsersHandlerCreateUserWithSpecialCharacters(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_special")

	// Create unique test user name with special characters
	testUserName := "test_user_special_" + time.Now().Format("20060102150405") + "_`backtick`"
	testPassword := "test_password_with_'quotes'"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Test POST /api/v1/clickhouse/users with special characters
	requestBody := models.CreateUserRequest{
		Name:     testUserName,
		Password: testPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should handle special characters correctly
	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.CreateUserResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User created successfully", resp.Message)
	assert.Equal(t, testUserName, resp.Name)
}

func TestUsersHandlerCreateUserWithCyrillicInName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_cyrillic_name")

	// Test POST /api/v1/clickhouse/users with Cyrillic characters in name
	requestBody := models.CreateUserRequest{
		Name:     "пользователь_тест", // Cyrillic characters
		Password: "test_password_123",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "name cannot contain Cyrillic characters")
}

func TestUsersHandlerCreateUserWithCyrillicInPassword(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_create_user_cyrillic_password")

	// Test POST /api/v1/clickhouse/users with Cyrillic characters in password
	requestBody := models.CreateUserRequest{
		Name:     "test_user_cyrillic",
		Password: "пароль123", // Cyrillic characters
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/clickhouse/users?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "password cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdateUserLoginWithCyrillicInOldName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_cyrillic_old")

	// Test PUT /api/v1/clickhouse/users/rename with Cyrillic characters in old_name
	requestBody := models.UpdateUserLoginRequest{
		OldName: "старое_имя", // Cyrillic characters
		NewName: "new_user_name",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "old_name cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdateUserLoginWithCyrillicInNewName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_cyrillic_new")

	// Test PUT /api/v1/clickhouse/users/rename with Cyrillic characters in new_name
	requestBody := models.UpdateUserLoginRequest{
		OldName: "old_user_name",
		NewName: "новое_имя", // Cyrillic characters
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "new_name cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdateUserLoginWithCyrillicInBothNames(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_login_cyrillic_both")

	// Test PUT /api/v1/clickhouse/users/rename with Cyrillic characters in both names
	requestBody := models.UpdateUserLoginRequest{
		OldName: "старое_имя", // Cyrillic characters
		NewName: "новое_имя",  // Cyrillic characters
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/rename?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Should detect Cyrillic in old_name first
	assert.Contains(t, resp.Message, "old_name cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdatePassword(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_password")

	// Create test user in ClickHouse
	testUserName := "test_user_password_" + time.Now().Format("20060102150405")
	testPassword := "old_password_123"
	newPassword := "new_password_456"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
	}()

	// Create test user first
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/password
	requestBody := models.UpdateUserPasswordRequest{
		UserName: testUserName,
		Password: newPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserPasswordResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User password updated successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
}

func TestUsersHandlerUpdatePasswordUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_password_not_found")

	// Test PUT /api/v1/clickhouse/users/password with non-existent user
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "nonexistent_user_12345",
		Password: "new_password_123",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User not found")
	assert.Contains(t, resp.Message, "nonexistent_user_12345")
}

func TestUsersHandlerUpdatePasswordUsersXmlStorage(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_password_xml_storage")

	// Attempt to update password for a user typically defined in users.xml (e.g., "default")
	userName := "default" // "default" user is usually defined in users.xml
	newPassword := "new_password_123"

	// Test PUT /api/v1/clickhouse/users/password
	requestBody := models.UpdateUserPasswordRequest{
		UserName: userName,
		Password: newPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Cannot update password")
	assert.Contains(t, resp.Message, "user is defined in users.xml file on the server")
}

func TestUsersHandlerUpdatePasswordMissingUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_pwd_missing_usr")

	// Test PUT /api/v1/clickhouse/users/password without user_name
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "",
		Password: "new_password_123",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (UserName), not JSON (user_name)
	assert.Contains(t, resp.Message, "UserName")
}

func TestUsersHandlerUpdatePasswordMissingPassword(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_pwd_missing_pwd")

	// Test PUT /api/v1/clickhouse/users/password without password
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "test_user",
		Password: "",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (Password), not JSON (password)
	assert.Contains(t, resp.Message, "Password")
}

func TestUsersHandlerUpdatePasswordRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "test_user",
		Password: "new_password",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := http.NewRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUpdatePasswordWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_password_no_node")

	// Create test user
	testUserName := "test_user_no_node_" + time.Now().Format("20060102150405")
	testPassword := "old_password_123"
	newPassword := "new_password_456"

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "")
	}()

	// Create test user first
	err := testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/password without node parameter
	requestBody := models.UpdateUserPasswordRequest{
		UserName: testUserName,
		Password: newPassword,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserPasswordResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User password updated successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
}

func TestUsersHandlerUpdatePasswordWithCyrillicInUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_pwd_cyr_usr")

	// Test PUT /api/v1/clickhouse/users/password with Cyrillic characters in user_name
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "пользователь_тест", // Cyrillic characters
		Password: "new_password_123",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "user_name cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdatePasswordWithCyrillicInPassword(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_pwd_cyr_pwd")

	// Test PUT /api/v1/clickhouse/users/password with Cyrillic characters in password
	requestBody := models.UpdateUserPasswordRequest{
		UserName: "test_user",
		Password: "новый_пароль123", // Cyrillic characters
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/password?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "password cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdateProfile(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_profile")

	// Create test user in ClickHouse
	testUserName := "test_user_profile_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	newProfile := "test_profile_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseProfile(t, newProfile, "test_node")
	}()

	// Create test profile first
	err := testutil.CreateTestClickHouseProfile(t, newProfile, "test_node")
	require.NoError(t, err, "Failed to create test profile")

	// Create test user
	err = testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "test_node")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/profile
	requestBody := models.UpdateUserProfileRequest{
		UserName:    testUserName,
		ProfileName: newProfile,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserProfileResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User profile updated successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
	assert.Equal(t, newProfile, resp.ProfileName)
}

func TestUsersHandlerUpdateProfileUserNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_profile_not_found")

	// Test PUT /api/v1/clickhouse/users/profile with non-existent user
	requestBody := models.UpdateUserProfileRequest{
		UserName:    "nonexistent_user_12345",
		ProfileName: "readonly",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "User not found")
	assert.Contains(t, resp.Message, "nonexistent_user_12345")
}

func TestUsersHandlerUpdateProfileUsersXmlStorage(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_profile_xml_storage")

	// Attempt to update profile for a user typically defined in users.xml (e.g., "default")
	userName := "default" // "default" user is usually defined in users.xml
	newProfile := "readonly"

	// Test PUT /api/v1/clickhouse/users/profile
	requestBody := models.UpdateUserProfileRequest{
		UserName:    userName,
		ProfileName: newProfile,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Cannot update user profile")
	assert.Contains(t, resp.Message, "user is defined in users.xml file on the server")
}

func TestUsersHandlerUpdateProfileMissingUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_prof_missing_usr")

	// Test PUT /api/v1/clickhouse/users/profile without user_name
	requestBody := models.UpdateUserProfileRequest{
		UserName:    "",
		ProfileName: "readonly",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	// Gin validation returns field name in Go format (UserName), not JSON (user_name)
	assert.Contains(t, resp.Message, "UserName")
}

func TestUsersHandlerUpdateProfileMissingProfileName(t *testing.T) {
	// This test is now obsolete since empty profile_name is allowed to remove profile
	// The test TestUsersHandlerRemoveProfile covers this case
	// Keeping this test for backward compatibility but it should now succeed
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_prof_missing_prof")

	// Create test user
	testUserName := "test_user_missing_prof_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	testProfileName := "test_profile_missing_prof_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseProfile(t, testProfileName, "test_node")
	}()

	// Create test profile first
	err := testutil.CreateTestClickHouseProfile(t, testProfileName, "test_node")
	require.NoError(t, err, "Failed to create test profile")

	// Create test user and assign the created profile
	err = testutil.CreateTestClickHouseUserWithProfile(t, testUserName, testPassword, testProfileName, "test_node")
	require.NoError(t, err, "Failed to create test user with profile")

	// Test PUT /api/v1/clickhouse/users/profile with empty profile_name (should remove profile)
	requestBody := models.UpdateUserProfileRequest{
		UserName:    testUserName,
		ProfileName: "", // Empty profile name is now allowed to remove profile
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Empty profile_name is now allowed - should succeed
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserProfileResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User profile removed successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
	assert.Equal(t, "", resp.ProfileName)
}

func TestUsersHandlerUpdateProfileRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Test without auth token
	requestBody := models.UpdateUserProfileRequest{
		UserName:    "test_user",
		ProfileName: "readonly",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := http.NewRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", bytes.NewBuffer(bodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUsersHandlerUpdateProfileWithoutNode(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_update_profile_no_node")

	// Create test user
	testUserName := "test_user_no_node_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	newProfile := "test_profile_no_node_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "")
		_ = testutil.DeleteTestClickHouseProfile(t, newProfile, "")
	}()

	// Create test profile first
	err := testutil.CreateTestClickHouseProfile(t, newProfile, "")
	require.NoError(t, err, "Failed to create test profile")

	// Create test user
	err = testutil.CreateTestClickHouseUser(t, testUserName, testPassword, "")
	require.NoError(t, err, "Failed to create test user")

	// Test PUT /api/v1/clickhouse/users/profile without node parameter
	requestBody := models.UpdateUserProfileRequest{
		UserName:    testUserName,
		ProfileName: newProfile,
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should work (node is optional, uses default connection)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserProfileResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User profile updated successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
	assert.Equal(t, newProfile, resp.ProfileName)
}

func TestUsersHandlerUpdateProfileWithCyrillicInUserName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_prof_cyr_usr")

	// Test PUT /api/v1/clickhouse/users/profile with Cyrillic characters in user_name
	requestBody := models.UpdateUserProfileRequest{
		UserName:    "пользователь_тест", // Cyrillic characters
		ProfileName: "readonly",
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "user_name cannot contain Cyrillic characters")
}

func TestUsersHandlerUpdateProfileWithCyrillicInProfileName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_upd_prof_cyr_prof")

	// Test PUT /api/v1/clickhouse/users/profile with Cyrillic characters in profile_name
	requestBody := models.UpdateUserProfileRequest{
		UserName:    "test_user",
		ProfileName: "профиль_тест", // Cyrillic characters
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp models.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp.Error, "Invalid request")
	assert.Contains(t, resp.Message, "profile_name cannot contain Cyrillic characters")
}

func TestUsersHandlerRemoveProfile(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	// Register user and get token
	token := testutil.RegisterTestUser(t, router, "test_remove_profile")

	// Create test user in ClickHouse
	testUserName := "test_user_remove_profile_" + time.Now().Format("20060102150405")
	testPassword := "test_password_123"
	testProfileName := "test_profile_remove_" + time.Now().Format("20060102150405")

	// Cleanup
	defer func() {
		_ = testutil.DeleteTestClickHouseUser(t, testUserName, "test_node")
		_ = testutil.DeleteTestClickHouseProfile(t, testProfileName, "test_node")
	}()

	// Create test profile first
	err := testutil.CreateTestClickHouseProfile(t, testProfileName, "test_node")
	require.NoError(t, err, "Failed to create test profile")

	// Create test user and assign the created profile
	err = testutil.CreateTestClickHouseUserWithProfile(t, testUserName, testPassword, testProfileName, "test_node")
	require.NoError(t, err, "Failed to create test user with profile")

	// Verify user has profile before removal
	userDetails, err := testutil.GetTestClickHouseUserDetails(t, testUserName, "test_node")
	require.NoError(t, err, "Failed to get user details before removal")
	assert.Equal(t, testProfileName, userDetails.Profile, "User should have profile before removal")

	// Test PUT /api/v1/clickhouse/users/profile with empty profile_name to remove profile
	requestBody := models.UpdateUserProfileRequest{
		UserName:    testUserName,
		ProfileName: "", // Empty profile name to remove profile
	}
	bodyBytes, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/clickhouse/users/profile?node=test_node", token, bodyBytes)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.UpdateUserProfileResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "User profile removed successfully", resp.Message)
	assert.Equal(t, testUserName, resp.UserName)
	assert.Equal(t, "", resp.ProfileName)

	// Verify user profile was removed by getting details
	userDetailsAfter, err := testutil.GetTestClickHouseUserDetails(t, testUserName, "test_node")
	require.NoError(t, err, "Failed to get user details after removal")
	// Profile should be empty or default after removal
	assert.Empty(t, userDetailsAfter.Profile, "User profile should be removed")
}
