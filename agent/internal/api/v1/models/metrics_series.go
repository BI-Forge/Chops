package models

// MetricSeriesPoint represents a single aggregated metric point.
type MetricSeriesPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// MetricSeriesResponse wraps a metrics time series payload.
type MetricSeriesResponse struct {
	Node   string              `json:"node"`
	Metric string              `json:"metric"`
	Period string              `json:"period"`
	Step   string              `json:"step"`
	From   string              `json:"from"`
	To     string              `json:"to"`
	Points []MetricSeriesPoint `json:"points"`
}
