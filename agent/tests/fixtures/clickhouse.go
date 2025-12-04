package fixtures

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/stretchr/testify/require"
)

// ExecuteTestQueries executes test queries in ClickHouse to populate system.query_log
func ExecuteTestQueries(t require.TestingT, conn driver.Conn, queries []string) {
	if conn == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, query := range queries {
		rows, err := conn.Query(ctx, query)
		if err != nil {
			// Log but don't fail - query_log might not be ready yet
			continue
		}
		if rows != nil {
			rows.Close()
		}
	}

	// Wait a bit for query_log to be flushed
	time.Sleep(500 * time.Millisecond)
}

// DefaultTestQueries returns default test queries for ClickHouse
func DefaultTestQueries() []string {
	return []string{
		"SELECT 1",
		"SELECT 2 + 2",
		"SELECT now()",
		"SELECT version()",
		"SELECT database()",
		"SELECT count() FROM system.tables",
		"SELECT name FROM system.databases LIMIT 5",
	}
}

// SetupClickHouseFixtures initializes ClickHouse test fixtures
func SetupClickHouseFixtures(t require.TestingT, conn driver.Conn) {
	ExecuteTestQueries(t, conn, DefaultTestQueries())
}
