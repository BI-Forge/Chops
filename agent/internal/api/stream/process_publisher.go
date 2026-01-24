package stream

import (
	"context"
	"fmt"
	"sync"
	"time"

	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"
)

const (
	defaultProcessPollInterval = 2 * time.Second
	defaultProcessQueryTimeout = 5 * time.Second
)

// ProcessPublisher continuously publishes process snapshots to the broadcaster
type ProcessPublisher struct {
	repo        *repository.ProcessRepository
	broadcaster *Broadcaster
	logger      *logger.Logger

	pollInterval time.Duration
	queryTimeout time.Duration

	mu    sync.Mutex
	nodes map[string]context.CancelFunc
}

// NewProcessPublisher creates a process publisher tied to a broadcaster
func NewProcessPublisher(repo *repository.ProcessRepository, broadcaster *Broadcaster, log *logger.Logger, pollInterval time.Duration) *ProcessPublisher {
	if pollInterval <= 0 {
		pollInterval = defaultProcessPollInterval
	}

	return &ProcessPublisher{
		repo:         repo,
		broadcaster:  broadcaster,
		logger:       log,
		pollInterval: pollInterval,
		queryTimeout: defaultProcessQueryTimeout,
		nodes:        make(map[string]context.CancelFunc),
	}
}

// EnsureNodePublisher guarantees that a background publisher runs for the node
func (p *ProcessPublisher) EnsureNodePublisher(node string) {
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

// Stop stops all node publishers
func (p *ProcessPublisher) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for node, cancel := range p.nodes {
		cancel()
		delete(p.nodes, node)
	}
}

func (p *ProcessPublisher) runNodePublisher(ctx context.Context, node string) {
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

func (p *ProcessPublisher) publishOnce(node string) {
	queryCtx, cancel := context.WithTimeout(context.Background(), p.queryTimeout)
	processes, err := p.repo.GetCurrentProcesses(queryCtx, node)
	cancel()

	if err != nil && p.logger != nil {
		p.logger.Errorf("Failed to fetch processes for node %s: %v", node, err)
	}

	var payload interface{}
	if processes != nil {
		payload = models.ProcessListResponse{
			Processes: processes,
			Node:      node,
		}
	}

	p.broadcaster.Publish(Event{
		Topic:       ProcessTopic(node),
		Payload:     payload,
		Err:         err,
		BroadcastAt: time.Now().UTC(),
	})
}

// ProcessTopic returns a broadcaster topic for the node process stream
func ProcessTopic(node string) string {
	return fmt.Sprintf("processes:%s", node)
}

// DecodeProcessPayload converts the payload into a ProcessListResponse pointer when possible
func DecodeProcessPayload(event Event) (*models.ProcessListResponse, bool) {
	payload := event.Payload
	if payload == nil {
		return nil, false
	}

	if processPtr, ok := payload.(*models.ProcessListResponse); ok {
		return processPtr, true
	}

	if processVal, ok := payload.(models.ProcessListResponse); ok {
		return &processVal, true
	}

	return nil, false
}
