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
