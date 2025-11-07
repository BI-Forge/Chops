package stream

import (
	"context"
	"fmt"
	"sync"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"
)

const (
	defaultMetricsPollInterval = time.Second
	defaultMetricsQueryTimeout = 5 * time.Second
)

// MetricsPublisher continuously publishes metrics snapshots to the broadcaster.
type MetricsPublisher struct {
	repo        *repository.MetricsRepository
	broadcaster *Broadcaster
	logger      *logger.Logger

	pollInterval time.Duration
	queryTimeout time.Duration

	mu    sync.Mutex
	nodes map[string]context.CancelFunc
}

// NewMetricsPublisher creates a metrics publisher tied to a broadcaster.
func NewMetricsPublisher(repo *repository.MetricsRepository, broadcaster *Broadcaster, log *logger.Logger, pollInterval time.Duration) *MetricsPublisher {
	if pollInterval <= 0 {
		pollInterval = defaultMetricsPollInterval
	}

	return &MetricsPublisher{
		repo:         repo,
		broadcaster:  broadcaster,
		logger:       log,
		pollInterval: pollInterval,
		queryTimeout: defaultMetricsQueryTimeout,
		nodes:        make(map[string]context.CancelFunc),
	}
}

// EnsureNodePublisher guarantees that a background publisher runs for the node.
func (p *MetricsPublisher) EnsureNodePublisher(node string) {
	if node == "" {
		return
	}

	p.mu.Lock()
	if _, exists := p.nodes[node]; exists {
		p.mu.Unlock()
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	p.nodes[node] = cancel
	p.mu.Unlock()

	go p.runNodePublisher(ctx, node)
}

// Stop stops all node publishers.
func (p *MetricsPublisher) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for node, cancel := range p.nodes {
		cancel()
		delete(p.nodes, node)
	}
}

func (p *MetricsPublisher) runNodePublisher(ctx context.Context, node string) {
	p.publishOnce(node)
	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.publishOnce(node)
		}
	}
}

func (p *MetricsPublisher) publishOnce(node string) {
	queryCtx, cancel := context.WithTimeout(context.Background(), p.queryTimeout)
	metrics, err := p.repo.GetLatestMetrics(queryCtx, node)
	cancel()

	if err != nil && p.logger != nil {
		p.logger.Errorf("Failed to fetch metrics for node %s: %v", node, err)
	}

	var payload interface{}
	if metrics != nil {
		payload = metrics
	}

	p.broadcaster.Publish(Event{
		Topic:       MetricsTopic(node),
		Payload:     payload,
		Err:         err,
		BroadcastAt: time.Now().UTC(),
	})
}

// MetricsTopic returns a broadcaster topic for the node metrics stream.
func MetricsTopic(node string) string {
	return fmt.Sprintf("metrics:%s", node)
}

// DecodeMetricsPayload converts the payload into a SystemMetrics pointer when possible.
func DecodeMetricsPayload(event Event) (*models.SystemMetrics, bool) {
	payload := event.Payload
	if payload == nil {
		return nil, false
	}

	if metricsPtr, ok := payload.(*models.SystemMetrics); ok {
		return metricsPtr, true
	}

	if metricsVal, ok := payload.(models.SystemMetrics); ok {
		return &metricsVal, true
	}

	return nil, false
}
