package api_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"testing"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/clickhouse"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	dbmodels "clickhouse-ops/internal/db/models"
	"clickhouse-ops/internal/rbac"
	"clickhouse-ops/tests/api/testutil"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

const (
	isolatedMetricsNode   = "test_node"
	isolatedMetricsSchema = "ops"
)

// isolatedMetrics points the node's metrics table at a table owned by the test.
// The agent running in the test container writes a fresh snapshot to the
// default metrics table every second, so tests that need exact values or
// "no recent rows" cannot use it.
type isolatedMetrics struct {
	t      *testing.T
	conn   driver.Conn
	table  string
	router *gin.Engine
}

func setupIsolatedMetrics(t *testing.T) *isolatedMetrics {
	t.Helper()
	table := fmt.Sprintf("qa_metrics_%d", time.Now().UnixNano())
	// Read by config.Load (os.ExpandEnv) inside the test setup; restored after the test.
	t.Setenv("OPS_CLICKHOUSE_METRICS_SCHEMA", isolatedMetricsSchema)
	t.Setenv("OPS_CLICKHOUSE_METRICS_TABLE", table)

	_, _, router, handlers := testutil.SetupTestEnvironmentWithHandlers(t)
	require.NotNil(t, router)
	t.Cleanup(func() { testutil.StopAllPublishers(handlers) })

	conn, _, err := clickhouse.GetInstance().GetCluster().GetConnectionByNodeName(isolatedMetricsNode)
	require.NoError(t, err)

	ctx := context.Background()
	require.NoError(t, conn.Exec(ctx, "CREATE DATABASE IF NOT EXISTS "+isolatedMetricsSchema))
	require.NoError(t, conn.Exec(ctx, fmt.Sprintf(`
		CREATE TABLE %s.%s
		(
			timestamp DateTime,
			profile Map(String, Float64)
		)
		ENGINE = MergeTree
		ORDER BY timestamp`, isolatedMetricsSchema, table)))
	t.Cleanup(func() {
		_ = conn.Exec(context.Background(), fmt.Sprintf("DROP TABLE IF EXISTS %s.%s", isolatedMetricsSchema, table))
	})

	return &isolatedMetrics{t: t, conn: conn, table: table, router: router}
}

func (m *isolatedMetrics) insert(ts time.Time, profile map[string]float64) {
	m.t.Helper()
	q := fmt.Sprintf("INSERT INTO %s.%s (timestamp, profile) VALUES (?, ?)", isolatedMetricsSchema, m.table)
	require.NoError(m.t, m.conn.Exec(context.Background(), q, ts.UTC(), profile))
}

func (m *isolatedMetrics) get(token, path string, query url.Values) *httptest.ResponseRecorder {
	m.t.Helper()
	target := path
	if query != nil {
		target += "?" + query.Encode()
	}
	req, err := testutil.MakeAuthenticatedRequest("GET", target, token, nil)
	require.NoError(m.t, err)
	w := httptest.NewRecorder()
	m.router.ServeHTTP(w, req)
	return w
}

// snapshotProfile builds a profile with the given cpu (%), query count and memory.
func snapshotProfile(cpuPercent, queries, memTotal, memAvail float64) map[string]float64 {
	return map[string]float64{
		"OSUserTimeNormalized": cpuPercent / 100,
		"OSMemoryTotal":        memTotal,
		"OSMemoryAvailable":    memAvail,
		"Query":                queries,
	}
}

func TestMetricsSeriesBatch_ReturnsRequestedSeriesFromOneWindow(t *testing.T) {
	m := setupIsolatedMetrics(t)
	token := testutil.RegisterTestUser(t, m.router, "test_series_batch_ok")

	// One hour window → 1m buckets. Two snapshots fall into the first bucket
	// (averaged), one into a later bucket; buckets without rows are absent.
	t0 := time.Now().UTC().Truncate(time.Minute).Add(-90 * time.Minute)
	m.insert(t0.Add(10*time.Second), snapshotProfile(10, 2, 100, 75))
	m.insert(t0.Add(20*time.Second), snapshotProfile(30, 4, 100, 25))
	m.insert(t0.Add(2*time.Minute+5*time.Second), snapshotProfile(50, 7, 200, 100))
	// Outside the window: must not leak into any bucket.
	m.insert(t0.Add(-5*time.Minute), snapshotProfile(99, 99, 100, 1))

	from, to := t0, t0.Add(time.Hour)
	w := m.get(token, "/api/v1/clickhouse/metrics/series/batch", url.Values{
		"node":    {isolatedMetricsNode},
		"metrics": {" active_queries,cpu_load , memory_load"},
		"from":    {from.Format(time.RFC3339)},
		"to":      {to.Format(time.RFC3339)},
	})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var resp models.MetricSeriesBatchResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, isolatedMetricsNode, resp.Node)
	assert.Equal(t, []string{"active_queries", "cpu_load", "memory_load"}, resp.Metrics, "trimmed, order preserved")
	assert.Equal(t, "custom", resp.Period)
	assert.Equal(t, "1m", resp.Step)
	assert.Equal(t, from.Format(time.RFC3339), resp.From)
	assert.Equal(t, to.Format(time.RFC3339), resp.To)

	keys := make([]string, 0, len(resp.Series))
	for k := range resp.Series {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	assert.Equal(t, []string{"active_queries", "cpu_load", "memory_load"}, keys, "exactly the requested metrics")

	b0 := t0.Format(time.RFC3339)
	b2 := t0.Add(2 * time.Minute).Format(time.RFC3339)
	assertSeries(t, resp.Series["active_queries"], []chmodels.MetricSeriesPoint{{Timestamp: b0, Value: 3}, {Timestamp: b2, Value: 7}})
	assertSeries(t, resp.Series["cpu_load"], []chmodels.MetricSeriesPoint{{Timestamp: b0, Value: 20}, {Timestamp: b2, Value: 50}})
	assertSeries(t, resp.Series["memory_load"], []chmodels.MetricSeriesPoint{{Timestamp: b0, Value: 50}, {Timestamp: b2, Value: 50}})

	// /series (single metric) is served by the same query and must agree.
	single := m.get(token, "/api/v1/clickhouse/metrics/series", url.Values{
		"node":   {isolatedMetricsNode},
		"metric": {"cpu_load"},
		"from":   {from.Format(time.RFC3339)},
		"to":     {to.Format(time.RFC3339)},
	})
	require.Equal(t, http.StatusOK, single.Code, single.Body.String())
	var singleResp models.MetricSeriesResponse
	require.NoError(t, json.Unmarshal(single.Body.Bytes(), &singleResp))
	assert.Equal(t, "cpu_load", singleResp.Metric)
	assert.Equal(t, "1m", singleResp.Step)
	assertSeries(t, singleResp.Points, resp.Series["cpu_load"])
}

func TestMetricsSeriesBatch_EmptyWindowReturnsEmptyArrayPerMetric(t *testing.T) {
	m := setupIsolatedMetrics(t)
	token := testutil.RegisterTestUser(t, m.router, "test_series_batch_empty")
	m.insert(time.Now().UTC().Add(-time.Minute), snapshotProfile(10, 1, 100, 50)) // outside the requested window

	now := time.Now().UTC().Truncate(time.Second)
	w := m.get(token, "/api/v1/clickhouse/metrics/series/batch", url.Values{
		"node":    {isolatedMetricsNode},
		"metrics": {"cpu_load,active_connections"},
		"from":    {now.Add(-3 * time.Hour).Format(time.RFC3339)},
		"to":      {now.Add(-2 * time.Hour).Format(time.RFC3339)},
	})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	// Raw JSON: an empty series must be [] (not null, not missing).
	var raw struct {
		Series map[string]json.RawMessage `json:"series"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &raw))
	require.Len(t, raw.Series, 2)
	assert.JSONEq(t, `[]`, string(raw.Series["cpu_load"]))
	assert.JSONEq(t, `[]`, string(raw.Series["active_connections"]))
}

func TestMetricsSeriesBatch_RelativePeriod(t *testing.T) {
	m := setupIsolatedMetrics(t)
	token := testutil.RegisterTestUser(t, m.router, "test_series_batch_period")
	m.insert(time.Now().UTC().Add(-2*time.Minute), snapshotProfile(40, 5, 100, 50))

	w := m.get(token, "/api/v1/clickhouse/metrics/series/batch", url.Values{
		"node":    {isolatedMetricsNode},
		"metrics": {"cpu_load,active_queries"},
		"period":  {"1h"},
		"step":    {"1m"},
	})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var resp models.MetricSeriesBatchResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "1h", resp.Period)
	assert.Equal(t, "1m", resp.Step)
	require.Len(t, resp.Series["cpu_load"], 1)
	require.Len(t, resp.Series["active_queries"], 1)
	assert.InDelta(t, 40, resp.Series["cpu_load"][0].Value, 1e-9)
	assert.InDelta(t, 5, resp.Series["active_queries"][0].Value, 1e-9)
	assert.Equal(t, resp.Series["cpu_load"][0].Timestamp, resp.Series["active_queries"][0].Timestamp)
}

func TestMetricsSeriesBatch_ValidationErrors(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	require.NotNil(t, router)
	token := testutil.RegisterTestUser(t, router, "test_series_batch_400")

	cases := []struct {
		name    string
		query   url.Values
		wantErr string
	}{
		{"metrics missing", url.Values{"node": {"test_node"}}, "metrics parameter is required"},
		{"empty item", url.Values{"node": {"test_node"}, "metrics": {"cpu_load,,memory_load"}}, "metrics parameter contains an empty item"},
		{"unsupported metric", url.Values{"node": {"test_node"}, "metrics": {"cpu_load,bogus"}}, "unsupported metric type: bogus"},
		{"duplicate", url.Values{"node": {"test_node"}, "metrics": {"cpu_load,cpu_load"}}, "duplicate metric type: cpu_load"},
		{"too many", url.Values{"node": {"test_node"}, "metrics": {"cpu_load,memory_load,memory_used_gb,storage_used,active_connections,active_queries,cpu_load"}}, "too many metrics requested (max 6)"},
		{"node missing", url.Values{"metrics": {"cpu_load"}}, "node parameter is required"},
		{"unsupported period", url.Values{"node": {"test_node"}, "metrics": {"cpu_load"}, "period": {"2h"}}, "unsupported period: 2h"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", "/api/v1/clickhouse/metrics/series/batch?"+tc.query.Encode(), token, nil)
			require.NoError(t, err)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
			var body map[string]string
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			assert.Equal(t, tc.wantErr, body["error"])
		})
	}
}

func TestMetricsSeriesBatch_RequiresSeriesPermission(t *testing.T) {
	gormDB, _, router := testutil.SetupTestEnvironmentWithDB(t)
	require.NotNil(t, router)
	// The first user in an empty users table becomes admin; register one so the
	// next users really get the guest role (which has no metrics permissions).
	adminToken := testutil.RegisterTestUser(t, router, "test_series_batch_admin")
	guestToken := testutil.RegisterGuestTestUser(t, router, "test_series_batch_guest")
	seriesOnlyToken, seriesOnlyRoleID := registerUserWithOnlyPermission(t, gormDB, router, adminToken, rbac.PermClickhouseMetricsSeries)
	t.Cleanup(func() {
		gormDB.Exec("DELETE FROM users WHERE username LIKE 'test_series_only%'")
		gormDB.Exec("DELETE FROM role_permissions WHERE role_id = ?", seriesOnlyRoleID)
		gormDB.Exec("DELETE FROM roles WHERE id = ?", seriesOnlyRoleID)
	})

	const (
		batchPath   = "/api/v1/clickhouse/metrics/series/batch?node=test_node&metrics=cpu_load"
		seriesPath  = "/api/v1/clickhouse/metrics/series?node=test_node&metric=cpu_load"
		currentPath = "/api/v1/clickhouse/metrics/current?node=test_node"
	)
	cases := []struct {
		name  string
		token string
		path  string
		want  int
	}{
		{"guest batch", guestToken, batchPath, http.StatusForbidden},
		{"guest series", guestToken, seriesPath, http.StatusForbidden},
		// Exactly the /series permission grants /series/batch, and nothing else.
		{"series-only batch", seriesOnlyToken, batchPath, http.StatusOK},
		{"series-only series", seriesOnlyToken, seriesPath, http.StatusOK},
		{"series-only current", seriesOnlyToken, currentPath, http.StatusForbidden},
		{"no token batch", "", batchPath, http.StatusUnauthorized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := testutil.MakeAuthenticatedRequest("GET", tc.path, tc.token, nil)
			require.NoError(t, err)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			assert.Equal(t, tc.want, w.Code, w.Body.String())
		})
	}
}

// registerUserWithOnlyPermission creates a role holding just `permission`,
// registers a user and assigns the role. Returns the user's token and the role ID.
func registerUserWithOnlyPermission(t *testing.T, gormDB *gorm.DB, router *gin.Engine, adminToken, permission string) (string, int) {
	t.Helper()
	serve := func(method, path, token string, body interface{}) *httptest.ResponseRecorder {
		var payload []byte
		if body != nil {
			var err error
			payload, err = json.Marshal(body)
			require.NoError(t, err)
		}
		req, err := testutil.MakeAuthenticatedRequest(method, path, token, payload)
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}

	uniq := strconv.FormatInt(time.Now().UnixNano(), 10)
	w := serve("POST", "/api/v1/system/roles", adminToken,
		apiSystemModels.CreateRoleRequest{Name: "test_role_series_only_" + uniq, Description: "only " + permission})
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	var role apiSystemModels.RoleResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &role))

	var perm dbmodels.Permission
	require.NoError(t, gormDB.Where("name = ?", permission).First(&perm).Error)
	w = serve("PUT", "/api/v1/system/roles/"+strconv.Itoa(role.ID)+"/permissions", adminToken,
		apiSystemModels.SetRolePermissionsRequest{PermissionIDs: []int{perm.ID}})
	require.Equal(t, http.StatusNoContent, w.Code, w.Body.String())

	username := "test_series_only_" + uniq
	w = serve("POST", "/api/v1/auth/register", "",
		apiSystemModels.RegisterRequest{Username: username, Email: username + "@example.com", Password: "securepass123"})
	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	var tok apiSystemModels.TokenResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &tok))

	var user dbmodels.User
	require.NoError(t, gormDB.Where("username = ?", username).First(&user).Error)
	w = serve("PUT", "/api/v1/system/users/"+strconv.Itoa(user.ID)+"/role", adminToken,
		apiSystemModels.AssignUserRoleRequest{RoleID: role.ID})
	require.Equal(t, http.StatusNoContent, w.Code, w.Body.String())

	return tok.Token, role.ID
}

func TestMetricsLatest_StaleSnapshotIsNotFound(t *testing.T) {
	m := setupIsolatedMetrics(t)
	token := testutil.RegisterTestUser(t, m.router, "test_metrics_stale")
	// The only row is older than the 10-minute freshness window.
	m.insert(time.Now().UTC().Add(-30*time.Minute), snapshotProfile(10, 1, 100, 50))

	nodeQuery := url.Values{"node": {isolatedMetricsNode}}

	current := m.get(token, "/api/v1/clickhouse/metrics/current", nodeQuery)
	require.Equal(t, http.StatusNotFound, current.Code, current.Body.String())
	assert.JSONEq(t, `{"error":"node test_node: no metrics in the last 10 minutes"}`, current.Body.String())

	info := m.get(token, "/api/v1/clickhouse/metrics/server-info", nodeQuery)
	require.Equal(t, http.StatusNotFound, info.Code, info.Body.String())
	var infoErr apiSystemModels.ErrorResponse
	require.NoError(t, json.Unmarshal(info.Body.Bytes(), &infoErr))
	assert.Equal(t, "No recent metrics", infoErr.Error)
	assert.Equal(t, "node test_node: no metrics in the last 10 minutes", infoErr.Message)

	// A fresh snapshot makes both endpoints answer again, with the fresh values.
	m.insert(time.Now().UTC().Add(-time.Minute), snapshotProfile(35, 4, 100, 50))

	current = m.get(token, "/api/v1/clickhouse/metrics/current", nodeQuery)
	require.Equal(t, http.StatusOK, current.Code, current.Body.String())
	var metrics chmodels.SystemMetrics
	require.NoError(t, json.Unmarshal(current.Body.Bytes(), &metrics))
	assert.Equal(t, isolatedMetricsNode, metrics.NodeName)
	assert.InDelta(t, 35, metrics.CPULoad, 1e-9)
	assert.Equal(t, int64(4), metrics.ActiveQueries)

	info = m.get(token, "/api/v1/clickhouse/metrics/server-info", nodeQuery)
	require.Equal(t, http.StatusOK, info.Code, info.Body.String())
}

func TestMetricsLatest_UnknownNodeIsServerError(t *testing.T) {
	_, _, router := testutil.SetupTestEnvironmentWithDB(t)
	require.NotNil(t, router)
	token := testutil.RegisterTestUser(t, router, "test_metrics_unknown_node")

	for _, path := range []string{
		"/api/v1/clickhouse/metrics/current?node=nonexistent_node_12345",
		"/api/v1/clickhouse/metrics/server-info?node=nonexistent_node_12345",
	} {
		req, err := testutil.MakeAuthenticatedRequest("GET", path, token, nil)
		require.NoError(t, err)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code, "%s: %s", path, w.Body.String())
	}
}

func assertSeries(t *testing.T, got, want []chmodels.MetricSeriesPoint) {
	t.Helper()
	require.Len(t, got, len(want), "points: %+v", got)
	for i := range want {
		assert.Equal(t, want[i].Timestamp, got[i].Timestamp, "point %d timestamp", i)
		assert.InDelta(t, want[i].Value, got[i].Value, 1e-9, "point %d value", i)
	}
}
