package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"clickhouse-ops/internal/api/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"
)

const (
	defaultStatsPollInterval = 2 * time.Second
	defaultStatsQueryTimeout = 5 * time.Second
)

// QueryLogStatsPublisher continuously publishes query log stats to the broadcaster
// Stats are personalized per user and filter combination
type QueryLogStatsPublisher struct {
	repo        *repository.QueryLogRepository
	broadcaster *Broadcaster
	logger      *logger.Logger

	pollInterval time.Duration
	queryTimeout time.Duration

	mu     sync.Mutex
	active map[string]context.CancelFunc // key: "userID:filterKey"
}

// FilterKey represents a unique combination of filters
type FilterKey struct {
	Node        string
	User        string
	Search      string
	Last        string
	From        string
	To          string
	RangePreset string
}

// Key returns a string representation of the filter key
func (f FilterKey) Key() string {
	data, _ := json.Marshal(f)
	return string(data)
}

// NewQueryLogStatsPublisher creates a query log stats publisher tied to a broadcaster
func NewQueryLogStatsPublisher(repo *repository.QueryLogRepository, broadcaster *Broadcaster, log *logger.Logger, pollInterval time.Duration) *QueryLogStatsPublisher {
	if pollInterval <= 0 {
		pollInterval = defaultStatsPollInterval
	}

	return &QueryLogStatsPublisher{
		repo:         repo,
		broadcaster:  broadcaster,
		logger:       log,
		pollInterval: pollInterval,
		queryTimeout: defaultStatsQueryTimeout,
		active:       make(map[string]context.CancelFunc),
	}
}

// EnsurePublisher guarantees that a background publisher runs for the user+filter combination
func (p *QueryLogStatsPublisher) EnsurePublisher(userID string, filter repository.QueryLogFilter) {
	if userID == "" {
		return
	}

	filterKey := FilterKey{
		Node:        filter.Node,
		User:        filter.User,
		Search:      filter.Search,
		Last:        filter.RangePreset,
		From:        filter.From.Format(time.RFC3339),
		To:          filter.To.Format(time.RFC3339),
		RangePreset: filter.RangePreset,
	}

	key := fmt.Sprintf("%s:%s", userID, filterKey.Key())

	p.mu.Lock()
	if _, exists := p.active[key]; exists {
		p.mu.Unlock()
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	p.active[key] = cancel
	p.mu.Unlock()

	go p.runPublisher(ctx, userID, filterKey, filter)
}

// Stop stops all publishers
func (p *QueryLogStatsPublisher) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for key, cancel := range p.active {
		cancel()
		delete(p.active, key)
	}
}

// StopPublisher stops a specific publisher for user+filter combination
func (p *QueryLogStatsPublisher) StopPublisher(userID string, filterKey FilterKey) {
	key := fmt.Sprintf("%s:%s", userID, filterKey.Key())

	p.mu.Lock()
	defer p.mu.Unlock()

	if cancel, exists := p.active[key]; exists {
		cancel()
		delete(p.active, key)
	}
}

func (p *QueryLogStatsPublisher) runPublisher(ctx context.Context, userID string, filterKey FilterKey, filter repository.QueryLogFilter) {
	p.publishOnce(userID, filterKey, filter)
	ticker := time.NewTicker(p.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.publishOnce(userID, filterKey, filter)
		}
	}
}

func (p *QueryLogStatsPublisher) publishOnce(userID string, filterKey FilterKey, filter repository.QueryLogFilter) {
	queryCtx, cancel := context.WithTimeout(context.Background(), p.queryTimeout)
	stats, err := p.repo.GetStats(queryCtx, filter)
	cancel()

	if err != nil && p.logger != nil {
		p.logger.Errorf("Failed to fetch query log stats for user %s: %v", userID, err)
	}

	var payload interface{}
	if stats.Running >= 0 || stats.Finished >= 0 || stats.Error >= 0 {
		payload = stats
	}

	topic := QueryLogStatsTopic(userID, filterKey)
	p.broadcaster.Publish(Event{
		Topic:        topic,
		Payload:      payload,
		Err:          err,
		TargetUserID: userID,
		BroadcastAt:  time.Now().UTC(),
	})
}

// QueryLogStatsTopic returns a broadcaster topic for the user+filter stats stream
func QueryLogStatsTopic(userID string, filterKey FilterKey) string {
	return fmt.Sprintf("query-log-stats:%s:%s", userID, filterKey.Key())
}

// DecodeQueryLogStatsPayload converts the payload into a QueryLogStatsResponse pointer when possible
func DecodeQueryLogStatsPayload(event Event) (*models.QueryLogStatsResponse, bool) {
	payload := event.Payload
	if payload == nil {
		return nil, false
	}

	if statsPtr, ok := payload.(*models.QueryLogStatsResponse); ok {
		return statsPtr, true
	}

	if statsVal, ok := payload.(models.QueryLogStatsResponse); ok {
		return &statsVal, true
	}

	return nil, false
}

