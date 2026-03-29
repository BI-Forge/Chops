package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
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

	var errResp apiSystemModels.ErrorResponse
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

	var errResp apiSystemModels.ErrorResponse
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

func TestSettingsHandlerGetAllSettingsSuccess(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_get_all_settings")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node&limit=5", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AllDBSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.LessOrEqual(t, len(resp.Settings), 5)
	assert.GreaterOrEqual(t, resp.Total, len(resp.Settings))
	assert.Equal(t, 5, resp.Limit)
	assert.Equal(t, 0, resp.Offset)

	for _, s := range resp.Settings {
		assert.NotEmpty(t, s.Name)
		assert.NotEmpty(t, s.Type)
		if !s.Server {
			assert.Empty(t, s.ChangeableWithoutRestart, "session settings must have empty changeable_without_restart")
		}
	}
}

func TestSettingsHandlerGetAllSettingsFilterServer(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_all_settings_server_filter")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node&server=true&limit=3", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Skip("server settings may be unavailable on this ClickHouse build")
		return
	}

	var resp models.AllDBSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	for _, s := range resp.Settings {
		assert.True(t, s.Server, "server=true must return only server settings")
	}
}

func TestSettingsHandlerGetAllSettingsInvalidType(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_all_settings_bad_type")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node&type=NotARealType", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandlerGetAllSettingsFilterByUInt64(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_all_settings_type_uint64")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node&type=UInt64&limit=2", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.AllDBSettingsResponse
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	for _, s := range resp.Settings {
		assert.Equal(t, "UInt64", s.Type)
	}
}

func TestSettingsHandlerGetAllSettingsInvalidTier(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	token := testutil.RegisterTestUser(t, router, "test_all_settings_bad_tier")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node&tier=not_a_real_tier", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandlerGetAllSettingsRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/settings/all?node=test_node", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestSettingsHandlerGetSettingByNameSessionRowMatchesList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_get_setting_by_name_session")

	all := fetchAllDBSettingsOK(t, router, token, "node=test_node&server=false&limit=30")
	require.NotEmpty(t, all.Settings)
	want := all.Settings[0]
	got := fetchOneDBSettingOK(t, router, token, want.Name)
	assertDBSettingDetailMatchesListItem(t, want, got)
}

func TestSettingsHandlerGetSettingByNameServerRowMatchesList(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_get_setting_by_name_server")

	all := fetchAllDBSettingsOK(t, router, token, "node=test_node&server=true&limit=5")
	if len(all.Settings) == 0 {
		t.Skip("server settings may be unavailable on this ClickHouse build")
	}
	want := all.Settings[0]
	got := fetchOneDBSettingOK(t, router, token, want.Name)
	assertDBSettingDetailMatchesListItem(t, want, got)
	assert.Empty(t, got.Min)
	assert.Empty(t, got.Max)
	assert.False(t, got.Readonly)
}

func TestSettingsHandlerGetSettingByNameNotFound(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_get_setting_by_name_404")

	v := url.Values{}
	v.Set("node", "test_node")
	v.Set("name", "nonexistent_setting_name_xyz_999")
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/one?"+v.Encode(), token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestSettingsHandlerGetSettingByNameMissingName(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_get_setting_by_name_missing")

	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/one?node=test_node", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandlerGetSettingByNameRequiresAuth(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}

	req, _ := http.NewRequest("GET", "/api/v1/clickhouse/settings/one?node=test_node&name=max_memory_usage", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// fetchAllDBSettingsOK calls GET /clickhouse/settings/all with the given raw query string (without leading '?').
func fetchAllDBSettingsOK(t *testing.T, router http.Handler, token, rawQuery string) models.AllDBSettingsResponse {
	t.Helper()
	path := "/api/v1/clickhouse/settings/all"
	if rawQuery != "" {
		path += "?" + rawQuery
	}
	req, err := testutil.MakeAuthenticatedRequest("GET", path, token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var resp models.AllDBSettingsResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	return resp
}

// fetchOneDBSettingOK calls GET /clickhouse/settings/one with node=test_node and the given setting name.
func fetchOneDBSettingOK(t *testing.T, router http.Handler, token, settingName string) models.DBSettingDetailItem {
	t.Helper()
	v := url.Values{}
	v.Set("node", "test_node")
	v.Set("name", settingName)
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/settings/one?"+v.Encode(), token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var item models.DBSettingDetailItem
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &item))
	return item
}

func assertDBSettingDetailMatchesListItem(t *testing.T, want models.DBSettingItem, got models.DBSettingDetailItem) {
	t.Helper()
	assert.Equal(t, want.Name, got.Name)
	assert.Equal(t, want.Description, got.Description)
	assert.Equal(t, want.Value, got.Value)
	assert.Equal(t, want.Type, got.Type)
	assert.Equal(t, want.Changed, got.Changed)
	assert.Equal(t, want.ChangeableWithoutRestart, got.ChangeableWithoutRestart)
	assert.Equal(t, want.Server, got.Server)
	assert.Equal(t, want.Tier, got.Tier)
}

func TestSettingsHandlerGetAllSettingsPaginationTotalAndDisjointPages(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_pagination")

	base := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=name&order=asc&limit=500")
	if base.Total < 6 {
		t.Skip("need at least 6 merged settings for pagination test")
	}

	page1 := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=name&order=asc&limit=3&offset=0")
	page2 := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=name&order=asc&limit=3&offset=3")

	assert.Equal(t, base.Total, page1.Total)
	assert.Equal(t, base.Total, page2.Total)
	assert.Len(t, page1.Settings, 3)
	assert.GreaterOrEqual(t, len(page2.Settings), 1)

	seen := make(map[string]struct{})
	rowKey := func(s models.DBSettingItem) string {
		return fmt.Sprintf("%s\t%v", s.Name, s.Server)
	}
	for _, s := range page1.Settings {
		seen[rowKey(s)] = struct{}{}
	}
	for _, s := range page2.Settings {
		_, dup := seen[rowKey(s)]
		assert.False(t, dup, "page2 must not repeat rows from page1: %s server=%v", s.Name, s.Server)
	}
	assert.LessOrEqual(t, page1.Settings[len(page1.Settings)-1].Name, page2.Settings[0].Name)
}

func TestSettingsHandlerGetAllSettingsSortByNameAscDesc(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_sort_name")

	asc := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=name&order=asc&limit=50")
	desc := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=name&order=desc&limit=50")

	if len(asc.Settings) < 2 || len(desc.Settings) < 2 {
		t.Skip("need at least 2 settings for sort test")
	}

	for i := 1; i < len(asc.Settings); i++ {
		assert.LessOrEqual(t, asc.Settings[i-1].Name, asc.Settings[i].Name)
	}
	for i := 1; i < len(desc.Settings); i++ {
		assert.GreaterOrEqual(t, desc.Settings[i-1].Name, desc.Settings[i].Name)
	}

	assert.LessOrEqual(t, asc.Settings[0].Name, desc.Settings[0].Name)
}

func TestSettingsHandlerGetAllSettingsSortByServerMonotonic(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_sort_server")

	resp := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=server&order=asc&limit=200")
	if len(resp.Settings) < 2 {
		t.Skip("need at least 2 settings")
	}

	for i := 1; i < len(resp.Settings); i++ {
		prev, cur := resp.Settings[i-1].Server, resp.Settings[i].Server
		if prev && !cur {
			t.Fatalf("server asc violated at %d: got false after true", i)
		}
	}
}

func TestSettingsHandlerGetAllSettingsSortByChangedMonotonic(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_sort_changed")

	resp := fetchAllDBSettingsOK(t, router, token, "node=test_node&sort=changed&order=desc&limit=200")
	if len(resp.Settings) < 2 {
		t.Skip("need at least 2 settings")
	}

	for i := 1; i < len(resp.Settings); i++ {
		prev, cur := resp.Settings[i-1].Changed, resp.Settings[i].Changed
		if prev == false && cur == true {
			t.Fatalf("changed desc violated at %d: false after true", i)
		}
	}
}

func TestSettingsHandlerGetAllSettingsFilterTierProduction(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_tier_prod")

	resp := fetchAllDBSettingsOK(t, router, token, "node=test_node&tier=production&limit=100")
	if resp.Total == 0 {
		t.Skip("no production-tier settings")
	}
	for _, s := range resp.Settings {
		assert.Equal(t, "production", strings.ToLower(s.Tier))
	}
}

func TestSettingsHandlerGetAllSettingsFilterServerFalse(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_srv_false")

	resp := fetchAllDBSettingsOK(t, router, token, "node=test_node&server=false&limit=50")
	require.NotEmpty(t, resp.Settings)
	for _, s := range resp.Settings {
		assert.False(t, s.Server)
	}
}

func TestSettingsHandlerGetAllSettingsSearchQueryMatchesNameOrDescription(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_search")

	v := url.Values{}
	v.Set("node", "test_node")
	v.Set("q", "memory")
	v.Set("limit", "30")

	resp := fetchAllDBSettingsOK(t, router, token, v.Encode())
	if resp.Total == 0 {
		t.Skip("no settings matching search on this build")
	}
	needle := strings.ToLower("memory")
	for _, s := range resp.Settings {
		n := strings.ToLower(s.Name)
		d := strings.ToLower(s.Description)
		assert.True(t, strings.Contains(n, needle) || strings.Contains(d, needle),
			"row %q must match search in name or description", s.Name)
	}
}

func TestSettingsHandlerGetAllSettingsCombinedFiltersAndPagination(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	if router == nil {
		return
	}
	token := testutil.RegisterTestUser(t, router, "test_all_settings_combined")

	v1 := url.Values{}
	v1.Set("node", "test_node")
	v1.Set("tier", "production")
	v1.Set("type", "String")
	v1.Set("sort", "name")
	v1.Set("order", "asc")
	v1.Set("limit", "5")
	v1.Set("offset", "0")

	resp := fetchAllDBSettingsOK(t, router, token, v1.Encode())
	if resp.Total == 0 {
		t.Skip("no production String settings on this ClickHouse build")
	}

	assert.LessOrEqual(t, len(resp.Settings), 5)
	for _, s := range resp.Settings {
		assert.Equal(t, "production", strings.ToLower(s.Tier))
		assert.Equal(t, "String", s.Type)
	}

	if resp.Total <= 5 {
		return
	}

	v2 := url.Values{}
	v2.Set("node", "test_node")
	v2.Set("tier", "production")
	v2.Set("type", "String")
	v2.Set("sort", "name")
	v2.Set("order", "asc")
	v2.Set("limit", "5")
	v2.Set("offset", "5")

	page2 := fetchAllDBSettingsOK(t, router, token, v2.Encode())
	assert.Equal(t, resp.Total, page2.Total)
	seen := make(map[string]struct{})
	rowKey := func(s models.DBSettingItem) string {
		return fmt.Sprintf("%s\t%v", s.Name, s.Server)
	}
	for _, s := range resp.Settings {
		seen[rowKey(s)] = struct{}{}
	}
	for _, s := range page2.Settings {
		_, dup := seen[rowKey(s)]
		assert.False(t, dup, "second page must not repeat rows from first page: %s server=%v", s.Name, s.Server)
	}
	if len(resp.Settings) > 0 && len(page2.Settings) > 0 {
		assert.LessOrEqual(t, resp.Settings[len(resp.Settings)-1].Name, page2.Settings[0].Name)
	}
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

	var errResp apiSystemModels.ErrorResponse
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

	var errResp apiSystemModels.ErrorResponse
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
	var errResp apiSystemModels.ErrorResponse
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
	var errResp apiSystemModels.ErrorResponse
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
	var errResp apiSystemModels.ErrorResponse
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
	var errResp apiSystemModels.ErrorResponse
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
	var errResp apiSystemModels.ErrorResponse
	err = json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "Changing profile_settings is not allowed", errResp.Error)
	assert.Contains(t, errResp.Message, nameFromProfile)
	assert.Contains(t, errResp.Message, "profile")
}
