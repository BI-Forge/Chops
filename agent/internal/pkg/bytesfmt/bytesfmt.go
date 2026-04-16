package bytesfmt

import (
	"fmt"
	"math"
	"strings"
)

// HumanReadable returns a compact binary size (1024-based: B, KB, …, PB) matching the UI rounding (2 fractional digits).
func HumanReadable(n uint64) string {
	if n == 0 {
		return "0 B"
	}
	const k = 1024.0
	sizes := []string{"B", "KB", "MB", "GB", "TB", "PB"}
	i := int(math.Floor(math.Log(float64(n)) / math.Log(k)))
	if i >= len(sizes) {
		i = len(sizes) - 1
	}
	val := float64(n) / math.Pow(k, float64(i))
	rounded := math.Round(val*100) / 100
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", rounded), "0"), ".") + " " + sizes[i]
}
