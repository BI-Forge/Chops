package models

import chmodels "clickhouse-ops/internal/clickhouse/models"

// MetricSeriesResponse wraps a metrics time series payload.
type MetricSeriesResponse struct {
	Node   string                    `json:"node"`
	Metric string                    `json:"metric"`
	Period string                    `json:"period"`
	Step   string                    `json:"step"`
	From   string                    `json:"from"`
	To     string                    `json:"to"`
	Points []chmodels.MetricSeriesPoint `json:"points"`
}

// MetricSeriesBatchResponse wraps several metric time series computed over the same window.
// Series is keyed by metric type; every requested metric is present (empty array when no data).
type MetricSeriesBatchResponse struct {
	Node    string                                  `json:"node"`
	Metrics []string                                `json:"metrics"`
	Period  string                                  `json:"period"`
	Step    string                                  `json:"step"`
	From    string                                  `json:"from"`
	To      string                                  `json:"to"`
	Series  map[string][]chmodels.MetricSeriesPoint `json:"series"`
}
