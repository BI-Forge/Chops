package pkg_test

import (
	"os"
	"path/filepath"
	"testing"

	"clickhouse-ops/internal/config"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadExpandsEnvironmentInYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cfg.yaml")
	content := []byte(`app:
  name: "x"
  version: "1"
server:
  port: "8080"
  jwt_secret_key: "${OPS_JWT_SECRET_KEY}"
  jwt_token_duration: "1h"
  rate_limit_rps: 0
  rate_limit_burst: 0
database:
  postgres:
    dsn: "${OPS_POSTGRES_DSN}"
  clickhouse:
    cluster_name: "c"
    nodes:
      - name: "${OPS_CLICKHOUSE_NAME}"
        host: "${OPS_CLICKHOUSE_HOST}"
        port: ${OPS_CLICKHOUSE_PORT}
        username: "${OPS_CLICKHOUSE_USERNAME}"
        password: "${OPS_CLICKHOUSE_PASSWORD}"
        database: "${OPS_CLICKHOUSE_DATABASE}"
        weight: 1
        priority: 1
        metrics_schema: "${OPS_CLICKHOUSE_METRICS_SCHEMA}"
        metrics_table: "${OPS_CLICKHOUSE_METRICS_TABLE}"
        backups_table: "ops.backups"
    global_settings:
      min_version: "24.0.0"
      max_version: "25.10.6"
      dial_timeout: "1s"
      read_timeout: "1s"
      write_timeout: "1s"
      conn_max_lifetime: "1h"
      max_open_conns: 1
      max_idle_conns: 1
      retry_max_attempts: 1
      retry_initial_backoff: "1ms"
      retry_max_backoff: "1ms"
      retry_jitter: 0.1
      retry_on_insert: false
      secure: false
      skip_verify: false
      compression: "lz4"
      query_id_prefix: "t"
logging:
  level: "info"
  format: "text"
sync:
  metrics_frequency: "1s"
  retention_days: 1
  processes_poll_interval: "1s"
`)
	require.NoError(t, os.WriteFile(path, content, 0o600))

	t.Setenv("OPS_JWT_SECRET_KEY", "jwt-from-env")
	t.Setenv("OPS_POSTGRES_DSN", "postgres://u:p@h:5432/db?sslmode=disable")
	t.Setenv("OPS_CLICKHOUSE_NAME", "node-a")
	t.Setenv("OPS_CLICKHOUSE_HOST", "ch.example")
	t.Setenv("OPS_CLICKHOUSE_PORT", "9001")
	t.Setenv("OPS_CLICKHOUSE_USERNAME", "opsuser")
	t.Setenv("OPS_CLICKHOUSE_PASSWORD", "secretpw")
	t.Setenv("OPS_CLICKHOUSE_DATABASE", "default")
	t.Setenv("OPS_CLICKHOUSE_METRICS_SCHEMA", "ms")
	t.Setenv("OPS_CLICKHOUSE_METRICS_TABLE", "mt")

	cfg, err := config.Load(path)
	require.NoError(t, err)
	assert.Equal(t, "jwt-from-env", cfg.Server.JWTSecretKey)
	assert.Equal(t, "postgres://u:p@h:5432/db?sslmode=disable", cfg.Database.Postgres.DSN)
	require.Len(t, cfg.Database.ClickHouse.Nodes, 1)
	n := cfg.Database.ClickHouse.Nodes[0]
	assert.Equal(t, "node-a", n.Name)
	assert.Equal(t, "ch.example", n.Host)
	assert.Equal(t, 9001, n.Port)
	assert.Equal(t, "opsuser", n.Username)
	assert.Equal(t, "secretpw", n.Password)
	assert.Equal(t, "default", n.Database)
	assert.Equal(t, "ms", n.MetricsSchema)
	assert.Equal(t, "mt", n.MetricsTable)
}
