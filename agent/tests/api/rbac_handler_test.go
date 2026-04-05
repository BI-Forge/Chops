package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/db/models"
	"clickhouse-ops/internal/rbac"
	"clickhouse-ops/tests/api/testutil"

	"github.com/stretchr/testify/require"
)

func TestRBACListRoles(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_list_roles")
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/system/roles", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var roles []apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &roles))
	require.NotEmpty(t, roles)
	var foundAdmin bool
	for _, r := range roles {
		if r.Name == "admin" {
			foundAdmin = true
			break
		}
	}
	require.True(t, foundAdmin, "admin role should exist")
	for _, r := range roles {
		if r.Name == "admin" {
			require.GreaterOrEqual(t, r.UsersCount, 1, "at least registering user")
			require.False(t, r.CreatedAt.IsZero())
			break
		}
	}
}

func TestRBACListSystemUsers(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_list_users")
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/system/users", token, nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var users []apiSystemModels.SystemUserResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &users))
	require.NotEmpty(t, users)
	var found bool
	for _, u := range users {
		// RegisterTestUser appends a timestamp: test_rbac_list_users_20060102150405
		if strings.HasPrefix(u.Username, "test_rbac_list_users") {
			found = true
			require.NotEmpty(t, u.RoleName)
			require.Contains(t, u.Permissions, rbac.PermAuthMe)
			break
		}
	}
	require.True(t, found, "registered user should appear in system user list")
}

func TestRBACCreateRoleAndAssignPermissions(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_create")

	uniq := time.Now().Format("20060102150405")
	body, _ := json.Marshal(apiSystemModels.CreateRoleRequest{Name: "test_role_api_" + uniq, Description: "api test"})
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/system/roles", token, body)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var created apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	require.Positive(t, created.ID)

	var perms []models.Permission
	require.NoError(t, gormDB.Where("name = ?", rbac.PermClickhouseMetricsNodes).Find(&perms).Error)
	require.Len(t, perms, 1)

	setBody, _ := json.Marshal(apiSystemModels.SetRolePermissionsRequest{PermissionIDs: []int{perms[0].ID}})
	req2, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/system/roles/"+strconv.Itoa(created.ID)+"/permissions", token, setBody)
	require.NoError(t, err)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusNoContent, w2.Code, w2.Body.String())

	req3, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/system/permissions?role_id="+strconv.Itoa(created.ID), token, nil)
	require.NoError(t, err)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	require.Equal(t, http.StatusOK, w3.Code, w3.Body.String())

	var listed []apiSystemModels.PermissionSummary
	require.NoError(t, json.Unmarshal(w3.Body.Bytes(), &listed))
	require.Len(t, listed, 1)
	require.Equal(t, rbac.PermClickhouseMetricsNodes, listed[0].Name)
}

func TestRBACLimitedUserForbidden(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	adminToken := testutil.RegisterTestUser(t, router, "test_rbac_admin_user")

	uniq := time.Now().Format("20060102150405")
	body, _ := json.Marshal(apiSystemModels.CreateRoleRequest{Name: "limited_role_" + uniq, Description: "no metrics"})
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/system/roles", adminToken, body)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var created apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))

	limUser := "test_limited_" + time.Now().Format("20060102150405")
	registerPayload, _ := json.Marshal(apiSystemModels.RegisterRequest{
		Username: limUser,
		Email:    limUser + "@example.com",
		Password: "securepass123",
	})
	regReq, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(registerPayload))
	regReq.Header.Set("Content-Type", "application/json")
	regW := httptest.NewRecorder()
	router.ServeHTTP(regW, regReq)
	require.Equal(t, http.StatusCreated, regW.Code, regW.Body.String())

	var tok apiSystemModels.TokenResponse
	require.NoError(t, json.Unmarshal(regW.Body.Bytes(), &tok))

	var limitedUser models.User
	require.NoError(t, gormDB.Where("username = ?", limUser).First(&limitedUser).Error)

	assignBody, _ := json.Marshal(apiSystemModels.AssignUserRoleRequest{RoleID: created.ID})
	assignReq, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/system/users/"+strconv.Itoa(limitedUser.ID)+"/role", adminToken, assignBody)
	require.NoError(t, err)
	assignW := httptest.NewRecorder()
	router.ServeHTTP(assignW, assignReq)
	require.Equal(t, http.StatusNoContent, assignW.Code, assignW.Body.String())

	metricsReq, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/nodes?node=test_node", tok.Token, nil)
	require.NoError(t, err)
	mw := httptest.NewRecorder()
	router.ServeHTTP(mw, metricsReq)
	require.Equal(t, http.StatusForbidden, mw.Code, mw.Body.String())
}

func TestRBACDeleteEmptyRole(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_delete_role")
	uniq := time.Now().Format("20060102150405")
	body, _ := json.Marshal(apiSystemModels.CreateRoleRequest{Name: "del_me_" + uniq, Description: "to delete"})
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/system/roles", token, body)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var created apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))

	delReq, err := testutil.MakeAuthenticatedRequest("DELETE", "/api/v1/system/roles/"+strconv.Itoa(created.ID), token, nil)
	require.NoError(t, err)
	dw := httptest.NewRecorder()
	router.ServeHTTP(dw, delReq)
	require.Equal(t, http.StatusNoContent, dw.Code, dw.Body.String())
}

func TestRBACDeleteAdminForbidden(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_del_admin")
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/system/roles", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var roles []apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &roles))
	var adminID int
	for _, r := range roles {
		if r.Name == rbac.RoleNameAdmin {
			adminID = r.ID
			break
		}
	}
	require.Positive(t, adminID)

	delReq, err := testutil.MakeAuthenticatedRequest("DELETE", "/api/v1/system/roles/"+strconv.Itoa(adminID), token, nil)
	require.NoError(t, err)
	dw := httptest.NewRecorder()
	router.ServeHTTP(dw, delReq)
	require.Equal(t, http.StatusBadRequest, dw.Code, dw.Body.String())
}

func TestRBACDeleteGuestForbidden(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	token := testutil.RegisterTestUser(t, router, "test_rbac_del_guest")
	req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/system/roles", token, nil)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var roles []apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &roles))
	var guestID int
	for _, r := range roles {
		if r.Name == rbac.RoleNameGuest {
			guestID = r.ID
			require.True(t, r.IsSystem, "guest should be marked system")
			break
		}
	}
	require.Positive(t, guestID)

	delReq, err := testutil.MakeAuthenticatedRequest("DELETE", "/api/v1/system/roles/"+strconv.Itoa(guestID), token, nil)
	require.NoError(t, err)
	dw := httptest.NewRecorder()
	router.ServeHTTP(dw, delReq)
	require.Equal(t, http.StatusBadRequest, dw.Code, dw.Body.String())
}

func TestRBACDeleteRoleWithUsersForbidden(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	adminToken := testutil.RegisterTestUser(t, router, "test_rbac_del_busy")

	uniq := time.Now().Format("20060102150405")
	body, _ := json.Marshal(apiSystemModels.CreateRoleRequest{Name: "busy_role_" + uniq, Description: "has users"})
	req, err := testutil.MakeAuthenticatedRequest("POST", "/api/v1/system/roles", adminToken, body)
	require.NoError(t, err)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var created apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))

	_ = testutil.RegisterGuestTestUser(t, router, "test_rbac_guest_busy")
	var guestUser models.User
	require.NoError(t, gormDB.Where("username LIKE ?", "test_rbac_guest_busy%").First(&guestUser).Error)

	assignBody, _ := json.Marshal(apiSystemModels.AssignUserRoleRequest{RoleID: created.ID})
	assignReq, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/system/users/"+strconv.Itoa(guestUser.ID)+"/role", adminToken, assignBody)
	require.NoError(t, err)
	aw := httptest.NewRecorder()
	router.ServeHTTP(aw, assignReq)
	require.Equal(t, http.StatusNoContent, aw.Code, aw.Body.String())

	delReq, err := testutil.MakeAuthenticatedRequest("DELETE", "/api/v1/system/roles/"+strconv.Itoa(created.ID), adminToken, nil)
	require.NoError(t, err)
	dw := httptest.NewRecorder()
	router.ServeHTTP(dw, delReq)
	require.Equal(t, http.StatusBadRequest, dw.Code, dw.Body.String())
}

func TestRBACDeactivateUserBlocksProtectedRoutes(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	defer testutil.CleanupTestData(t, gormDB)

	adminToken := testutil.RegisterTestUser(t, router, "test_rbac_deact_admin")
	guestToken := testutil.RegisterGuestTestUser(t, router, "test_rbac_deact_guest")

	var guestUser models.User
	require.NoError(t, gormDB.Where("username LIKE ?", "test_rbac_deact_guest%").First(&guestUser).Error)

	activeBody, _ := json.Marshal(apiSystemModels.SetUserActiveRequest{IsActive: false})
	putReq, err := testutil.MakeAuthenticatedRequest("PUT", "/api/v1/system/users/"+strconv.Itoa(guestUser.ID)+"/active", adminToken, activeBody)
	require.NoError(t, err)
	pw := httptest.NewRecorder()
	router.ServeHTTP(pw, putReq)
	require.Equal(t, http.StatusNoContent, pw.Code, pw.Body.String())

	meReq, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/auth/me", guestToken, nil)
	require.NoError(t, err)
	mw := httptest.NewRecorder()
	router.ServeHTTP(mw, meReq)
	require.Equal(t, http.StatusUnauthorized, mw.Code, mw.Body.String())
}
