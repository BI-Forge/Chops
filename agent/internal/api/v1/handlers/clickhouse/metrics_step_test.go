package clickhouse

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStepForDuration(t *testing.T) {
	cases := []struct {
		name string
		d    time.Duration
		step string
	}{
		{"5m", 5 * time.Minute, "1s"},
		{"10m", 10 * time.Minute, "1s"},
		{"15m", 15 * time.Minute, "10s"},
		{"30m", 30 * time.Minute, "10s"},
		{"45m", 45 * time.Minute, "1m"},
		{"1h", time.Hour, "1m"},
		{"3h", 3 * time.Hour, "5m"},
		{"6h", 6 * time.Hour, "5m"},
		{"8h", 8 * time.Hour, "5m"},
		{"12h", 12 * time.Hour, "5m"},
		{"18h", 18 * time.Hour, "30m"},
		{"1d", 24 * time.Hour, "30m"},
		{"2d", 48 * time.Hour, "1h"},
		{"7d", 168 * time.Hour, "1h"},
		{"10m+1s", 10*time.Minute + time.Second, "10s"},
		{"30m+1s", 30*time.Minute + time.Second, "1m"},
		{"1h+1s", time.Hour + time.Second, "5m"},
		{"6h+1s", 6*time.Hour + time.Second, "5m"},
		{"12h+1s", 12*time.Hour + time.Second, "30m"},
		{"1d+1s", 24*time.Hour + time.Second, "1h"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, key, err := stepForDuration(tc.d)
			require.NoError(t, err)
			assert.Equal(t, tc.step, key)
		})
	}

	t.Run("non-positive", func(t *testing.T) {
		_, _, err := stepForDuration(0)
		require.Error(t, err)
	})
}
