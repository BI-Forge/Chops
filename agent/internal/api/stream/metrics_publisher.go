package stream

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
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
	noRecent := p.publishOnce(node, false)
	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			noRecent = p.publishOnce(node, noRecent)
		}
	}
}

// publishOnce fetches and publishes one metrics snapshot. wasNoRecent is the
// previous "no recent metrics" state; the new state is returned so that this
// expected condition is logged only on transitions instead of on every poll.
//
// The no-recent event is still published on every poll: it is an in-memory
// broadcast, it lets subscribers that connect later (or that dropped an event
// because their buffer was full) learn the current state within one poll
// interval, and the SSE handler de-duplicates it per connection.
func (p *MetricsPublisher) publishOnce(node string, wasNoRecent bool) bool {
	queryCtx, cancel := context.WithTimeout(context.Background(), p.queryTimeout)
	metrics, err := p.repo.GetLatestMetrics(queryCtx, node)
	cancel()

	isNoRecent := errors.Is(err, repository.ErrNoRecentMetrics)
	noRecent := nextNoRecentState(wasNoRecent, err)
	if p.logger != nil {
		switch {
		case noRecent && !wasNoRecent:
			p.logger.Warningf("No recent metrics for node %s: %v", node, err)
		case !noRecent && wasNoRecent:
			p.logger.Infof("Metrics for node %s are available again", node)
		case err != nil && !isNoRecent:
			p.logger.Errorf("Failed to fetch metrics for node %s: %v", node, err)
		}
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

	return noRecent
}

// nextNoRecentState returns the "no recent metrics" state after a poll that
// ended with err. Only a successful poll clears the state; unrelated errors
// (timeouts, connection failures) keep the previous state so that the
// recovery is still detected once metrics come back.
func nextNoRecentState(wasNoRecent bool, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, repository.ErrNoRecentMetrics):
		return true
	default:
		return wasNoRecent
	}
}

// IsNoRecentMetrics reports whether the event signals the expected
// "node has no metrics in the recent window" state rather than a failure.
func IsNoRecentMetrics(event Event) bool {
	return errors.Is(event.Err, repository.ErrNoRecentMetrics)
}

// MetricsTopic returns a broadcaster topic for the node metrics stream.
func MetricsTopic(node string) string {
	return fmt.Sprintf("metrics:%s", node)
}

// DecodeMetricsPayload converts the payload into a SystemMetrics pointer when possible.
func DecodeMetricsPayload(event Event) (*chmodels.SystemMetrics, bool) {
	payload := event.Payload
	if payload == nil {
		return nil, false
	}

	if metricsPtr, ok := payload.(*chmodels.SystemMetrics); ok {
		return metricsPtr, true
	}

	if metricsVal, ok := payload.(chmodels.SystemMetrics); ok {
		return &metricsVal, true
	}

	return nil, false
}
