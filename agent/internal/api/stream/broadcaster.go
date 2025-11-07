package stream

import (
	"context"
	"sync"
	"time"

	"clickhouse-ops/internal/logger"
)

const defaultSubscriberBuffer = 1

// Event represents a message published through the broadcaster.
type Event struct {
	Topic        string
	Payload      interface{}
	Err          error
	TargetUserID string
	BroadcastAt  time.Time
}

type subscriber struct {
	userID string
	ch     chan Event
}

type topicState struct {
	subscribers map[*subscriber]struct{}
}

// Broadcaster fans-out published events to topic subscribers.
type Broadcaster struct {
	logger *logger.Logger

	mu     sync.RWMutex
	topics map[string]*topicState
}

// NewBroadcaster creates a new broadcaster instance.
func NewBroadcaster(log *logger.Logger) *Broadcaster {
	return &Broadcaster{
		logger: log,
		topics: make(map[string]*topicState),
	}
}

// Subscribe registers a user-specific subscriber for a topic.
func (b *Broadcaster) Subscribe(ctx context.Context, topicName, userID string) (<-chan Event, func()) {
	if topicName == "" {
		ch := make(chan Event)
		close(ch)
		return ch, func() {}
	}

	sub := &subscriber{
		userID: userID,
		ch:     make(chan Event, defaultSubscriberBuffer),
	}

	b.mu.Lock()
	state := b.ensureTopicLocked(topicName)
	state.subscribers[sub] = struct{}{}
	b.mu.Unlock()

	unsub := func() {
		b.removeSubscriber(topicName, sub)
	}

	go func() {
		<-ctx.Done()
		unsub()
	}()

	return sub.ch, unsub
}

// Publish sends an event to all subscribers of the given topic.
func (b *Broadcaster) Publish(event Event) {
	if event.Topic == "" {
		return
	}

	if event.BroadcastAt.IsZero() {
		event.BroadcastAt = time.Now().UTC()
	}

	b.mu.RLock()
	topic := b.topics[event.Topic]
	if topic == nil {
		b.mu.RUnlock()
		return
	}

	subscribers := make([]*subscriber, 0, len(topic.subscribers))
	for sub := range topic.subscribers {
		subscribers = append(subscribers, sub)
	}
	b.mu.RUnlock()

	for _, sub := range subscribers {
		if event.TargetUserID != "" && event.TargetUserID != sub.userID {
			continue
		}
		select {
		case sub.ch <- event:
		default:
			// Drop event for slow subscriber; maintaining bounded buffer.
		}
	}
}

// PublishPayload publishes a payload to all subscribers of the topic.
func (b *Broadcaster) PublishPayload(topicName string, payload interface{}) {
	b.Publish(Event{Topic: topicName, Payload: payload})
}

// PublishToUser publishes a payload targeted to a specific user.
func (b *Broadcaster) PublishToUser(topicName, userID string, payload interface{}) {
	b.Publish(Event{Topic: topicName, TargetUserID: userID, Payload: payload})
}

func (b *Broadcaster) ensureTopicLocked(topicName string) *topicState {
	state := b.topics[topicName]
	if state == nil {
		state = &topicState{subscribers: make(map[*subscriber]struct{})}
		b.topics[topicName] = state
	}
	return state
}

func (b *Broadcaster) removeSubscriber(topicName string, sub *subscriber) {
	b.mu.Lock()
	defer b.mu.Unlock()

	state := b.topics[topicName]
	if state == nil {
		return
	}

	if _, exists := state.subscribers[sub]; !exists {
		return
	}

	delete(state.subscribers, sub)
	close(sub.ch)

	if len(state.subscribers) == 0 {
		delete(b.topics, topicName)
	}
}
