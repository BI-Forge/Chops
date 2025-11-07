package stream_test

import (
	"context"
	"testing"
	"time"

	"clickhouse-ops/internal/api/stream"
	"clickhouse-ops/internal/logger"
)

func newTestBroadcaster() *stream.Broadcaster {
	return stream.NewBroadcaster(logger.New(logger.InfoLevel, "text"))
}

func awaitEvent(t *testing.T, ch <-chan stream.Event) stream.Event {
	t.Helper()

	select {
	case evt, ok := <-ch:
		if !ok {
			t.Fatalf("subscriber channel closed unexpectedly")
		}
		return evt
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("timed out waiting for event")
		return stream.Event{}
	}
}

func TestBroadcasterBroadcastsToAllSubscribers(t *testing.T) {
	b := newTestBroadcaster()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sub1, unsub1 := b.Subscribe(ctx, "metrics:test", "user1")
	defer unsub1()
	sub2, unsub2 := b.Subscribe(ctx, "metrics:test", "user2")
	defer unsub2()

	payload := "shared-payload"
	b.Publish(stream.Event{Topic: "metrics:test", Payload: payload})

	for _, ch := range []<-chan stream.Event{sub1, sub2} {
		event := awaitEvent(t, ch)
		if event.Payload != payload {
			t.Fatalf("expected payload %q, got %#v", payload, event.Payload)
		}
		if event.TargetUserID != "" {
			t.Fatalf("expected broadcast event to have empty target user, got %q", event.TargetUserID)
		}
	}
}

func TestBroadcasterDeliversTargetedEvents(t *testing.T) {
	b := newTestBroadcaster()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sub1, unsub1 := b.Subscribe(ctx, "alerts:test", "user1")
	defer unsub1()
	sub2, unsub2 := b.Subscribe(ctx, "alerts:test", "user2")
	defer unsub2()

	payload := "personal-message"
	b.Publish(stream.Event{Topic: "alerts:test", Payload: payload, TargetUserID: "user2"})

	// user2 should receive the event
	event := awaitEvent(t, sub2)
	if event.Payload != payload {
		t.Fatalf("expected targeted payload %q, got %#v", payload, event.Payload)
	}
	if event.TargetUserID != "user2" {
		t.Fatalf("expected target user user2, got %q", event.TargetUserID)
	}

	// user1 should not receive anything
	select {
	case <-sub1:
		t.Fatalf("unexpected event received by non-targeted subscriber")
	case <-time.After(200 * time.Millisecond):
		// Expected path: no event
	}
}

func TestBroadcasterHandlesPublishWithoutSubscribers(t *testing.T) {
	b := newTestBroadcaster()
	// Should not panic or block when no subscribers exist.
	b.Publish(stream.Event{Topic: "no-subs", Payload: "noop"})
}
