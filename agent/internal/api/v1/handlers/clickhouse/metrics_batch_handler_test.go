package clickhouse

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newValidationOnlyHandler returns a handler without a metrics repository.
// Every case below must be rejected before the repository is touched; if the
// handler ever reached the repository, the nil repo would panic and fail the test.
func newValidationOnlyHandler() *MetricsHandler {
	return &MetricsHandler{
		logger:        logger.New(logger.ErrorLevel, "text"),
		retentionDays: 10,
	}
}

func serveSeriesRequest(t *testing.T, h *MetricsHandler, path string, query url.Values) (int, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/series", h.GetMetricSeries)
	r.GET("/series/batch", h.GetMetricSeriesBatch)

	req := httptest.NewRequest(http.MethodGet, path+"?"+query.Encode(), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var body struct {
		Error string `json:"error"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body), "body: %s", w.Body.String())
	return w.Code, body.Error
}

func TestGetMetricSeriesBatch_RejectsInvalidParams(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	rfc := func(t time.Time) string { return t.Format(time.RFC3339) }

	cases := []struct {
		name    string
		query   url.Values
		wantErr string // exact message, or a prefix when prefix is set
		prefix  bool
	}{
		{
			name:    "missing node",
			query:   url.Values{"metrics": {"cpu_load"}},
			wantErr: "node parameter is required",
		},
		{
			name:    "missing metrics",
			query:   url.Values{"node": {"n1"}},
			wantErr: "metrics parameter is required",
		},
		{
			name:    "blank metrics",
			query:   url.Values{"node": {"n1"}, "metrics": {"   "}},
			wantErr: "metrics parameter is required",
		},
		{
			name:    "empty item in the middle",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load,,memory_load"}},
			wantErr: "metrics parameter contains an empty item",
		},
		{
			name:    "trailing comma",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load,"}},
			wantErr: "metrics parameter contains an empty item",
		},
		{
			name:    "whitespace-only item",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load, ,memory_load"}},
			wantErr: "metrics parameter contains an empty item",
		},
		{
			name:    "unknown metric",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load,disk_io"}},
			wantErr: "unsupported metric type: disk_io",
		},
		{
			name:    "metric names are case sensitive",
			query:   url.Values{"node": {"n1"}, "metrics": {"CPU_LOAD"}},
			wantErr: "unsupported metric type: CPU_LOAD",
		},
		{
			name:    "SQL-looking input is just an unknown metric",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load; DROP TABLE x"}},
			wantErr: "unsupported metric type: cpu_load; DROP TABLE x",
		},
		{
			name:    "duplicate after trimming",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load, memory_load ,cpu_load "}},
			wantErr: "duplicate metric type: cpu_load",
		},
		{
			name: "seven metrics",
			query: url.Values{"node": {"n1"}, "metrics": {
				"cpu_load,memory_load,memory_used_gb,storage_used,active_connections,active_queries,cpu_load",
			}},
			wantErr: "too many metrics requested (max 6)",
		},
		{
			name:    "unsupported period",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load"}, "period": {"2h"}},
			wantErr: "unsupported period: 2h",
		},
		{
			name:    "step not matching period",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load"}, "period": {"1h"}, "step": {"5m"}},
			wantErr: "step 5m is not allowed for the selected period; expected 1m",
		},
		{
			name:    "only from",
			query:   url.Values{"node": {"n1"}, "metrics": {"cpu_load"}, "from": {rfc(now.Add(-time.Hour))}},
			wantErr: "both from and to must be provided together",
		},
		{
			name: "from after to",
			query: url.Values{"node": {"n1"}, "metrics": {"cpu_load"},
				"from": {rfc(now)}, "to": {rfc(now.Add(-time.Hour))}},
			wantErr: "from must be before to",
		},
		{
			name: "range beyond retention",
			query: url.Values{"node": {"n1"}, "metrics": {"cpu_load"},
				"from": {rfc(now.Add(-11 * 24 * time.Hour))}, "to": {rfc(now)}},
			wantErr: "range exceeds retention window of 10d",
		},
		{
			name: "invalid from timestamp",
			query: url.Values{"node": {"n1"}, "metrics": {"cpu_load"},
				"from": {"yesterday"}, "to": {rfc(now)}},
			wantErr: "invalid from timestamp",
			prefix:  true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			code, errMsg := serveSeriesRequest(t, newValidationOnlyHandler(), "/series/batch", tc.query)

			assert.Equal(t, http.StatusBadRequest, code)
			if tc.prefix {
				assert.True(t, strings.HasPrefix(errMsg, tc.wantErr), "error %q should start with %q", errMsg, tc.wantErr)
			} else {
				assert.Equal(t, tc.wantErr, errMsg)
			}
		})
	}
}

func TestGetMetricSeriesBatch_TrimsAndKeepsOrder(t *testing.T) {
	got, err := parseMetricTypesList(" active_queries, cpu_load ,memory_load")

	require.NoError(t, err)
	assert.Equal(t, []string{"active_queries", "cpu_load", "memory_load"}, got)

	all, err := parseMetricTypesList("cpu_load,memory_load,memory_used_gb,storage_used,active_connections,active_queries")
	require.NoError(t, err)
	assert.Len(t, all, 6, "exactly 6 metrics is allowed")
}

// /series shares the window resolution with /series/batch; its validation
// contract (status and messages) must be unchanged by the refactoring.
func TestGetMetricSeries_ValidationContractUnchanged(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)

	cases := []struct {
		name    string
		query   url.Values
		wantErr string
	}{
		{"missing node", url.Values{"metric": {"cpu_load"}}, "node parameter is required"},
		{"unknown metric", url.Values{"node": {"n1"}, "metric": {"disk_io"}}, "unsupported metric type: disk_io"},
		{"comma list is not accepted by /series", url.Values{"node": {"n1"}, "metric": {"cpu_load,memory_load"}}, "unsupported metric type: cpu_load,memory_load"},
		{"unsupported period", url.Values{"node": {"n1"}, "period": {"2h"}}, "unsupported period: 2h"},
		{"unsupported step", url.Values{"node": {"n1"}, "period": {"1h"}, "step": {"7m"}}, "unsupported step: 7m"},
		{"only to", url.Values{"node": {"n1"}, "to": {now.Format(time.RFC3339)}}, "both from and to must be provided together"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			code, errMsg := serveSeriesRequest(t, newValidationOnlyHandler(), "/series", tc.query)

			assert.Equal(t, http.StatusBadRequest, code)
			assert.Equal(t, tc.wantErr, errMsg)
		})
	}
}

func TestSeriesQueryTimeout_Boundaries(t *testing.T) {
	cases := []struct {
		rangeDuration time.Duration
		want          time.Duration
	}{
		{0, 10 * time.Second},
		{24*time.Hour - time.Second, 10 * time.Second}, // partial day does not add time
		{10 * time.Minute, 10 * time.Second},
		{24 * time.Hour, 15 * time.Second}, // 1d
		{48 * time.Hour, 20 * time.Second},
		{72 * time.Hour, 25 * time.Second},     // 3d
		{168 * time.Hour, 45 * time.Second},    // 7d
		{9 * 24 * time.Hour, 55 * time.Second}, // 10+45 hits the cap exactly
		{10 * 24 * time.Hour, 55 * time.Second},
	}
	for _, tc := range cases {
		assert.Equal(t, tc.want, seriesQueryTimeout(tc.rangeDuration), "range %s", tc.rangeDuration)
	}
}
