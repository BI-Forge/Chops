package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
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
