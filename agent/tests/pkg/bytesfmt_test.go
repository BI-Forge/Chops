package pkg_test

import (
	"testing"

	"clickhouse-ops/internal/pkg/bytesfmt"

	"github.com/stretchr/testify/assert"
)

func TestHumanReadable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		n    uint64
		want string
	}{
		{0, "0 B"},
		{1, "1 B"},
		{1536, "1.5 KB"},
		{500 * 1024 * 1024 * 1024, "500 GB"},
	}
	for _, tc := range cases {
		assert.Equal(t, tc.want, bytesfmt.HumanReadable(tc.n), "n=%d", tc.n)
	}
}
