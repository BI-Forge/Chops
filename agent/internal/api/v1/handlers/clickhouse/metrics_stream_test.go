package clickhouse

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"clickhouse-ops/internal/api/stream"
	chmodels "clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const streamTestNode = "n1"

type sseEvent struct {
	name string
	data string
}

// readSSE parses "event:"/"data:" blocks from the stream and sends them to out.
func readSSE(body *bufio.Reader, out chan<- sseEvent) {
	defer close(out)
	var ev sseEvent
	for {
		line, err := body.ReadString('\n')
		if err != nil {
			return
		}
		line = strings.TrimRight(line, "\r\n")
		switch {
		case line == "":
			if ev.name != "" || ev.data != "" {
				out <- ev
			}
			ev = sseEvent{}
		case strings.HasPrefix(line, "event:"):
			ev.name = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		case strings.HasPrefix(line, "data:"):
			ev.data = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		}
	}
}

type streamHarness struct {
	t           *testing.T
	broadcaster *stream.Broadcaster
	events      <-chan sseEvent
}

// newStreamHarness serves StreamMetrics over a real HTTP connection. The
// node publisher is started with a 1h poll interval and its single initial
// poll (which fails: the repository has no config) is consumed before the
// client connects, so the only events the handler sees are the ones the test
// publishes.
func newStreamHarness(t *testing.T) *streamHarness {
	t.Helper()
	gin.SetMode(gin.TestMode)

	log := logger.New(logger.ErrorLevel, "text")
	broadcaster := stream.NewBroadcaster(log)
	repo, err := repository.NewMetricsRepository()
	require.NoError(t, err)
	publisher := stream.NewMetricsPublisher(repo, broadcaster, log, time.Hour)
	t.Cleanup(publisher.Stop)

	probeCtx, cancelProbe := context.WithCancel(context.Background())
	probe, unsubscribe := broadcaster.Subscribe(probeCtx, stream.MetricsTopic(streamTestNode), "")
	publisher.EnsureNodePublisher(streamTestNode)
	select {
	case <-probe:
	case <-time.After(5 * time.Second):
		t.Fatal("publisher did not run its initial poll")
	}
	unsubscribe()
	cancelProbe()

	h := &MetricsHandler{broadcaster: broadcaster, metricsPublisher: publisher, logger: log}
	r := gin.New()
	r.GET("/stream", h.StreamMetrics)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/stream?node="+streamTestNode, nil)
	require.NoError(t, err)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	require.Equal(t, http.StatusOK, resp.StatusCode)

	events := make(chan sseEvent, 64)
	go readSSE(bufio.NewReader(resp.Body), events)

	hs := &streamHarness{t: t, broadcaster: broadcaster, events: events}
	first := hs.waitEvent(nil, nil)
	require.Equal(t, "message", first.name)
	require.Contains(t, first.data, `"connected"`)
	return hs
}

// waitEvent re-publishes ev until the handler emits an SSE event whose name is
// not in ignore, and returns it. Re-publishing is needed because the
// broadcaster drops events for a subscriber whose 1-slot buffer is full.
// With publish == nil it only waits.
func (h *streamHarness) waitEvent(publish func(), ignore map[string]bool) sseEvent {
	h.t.Helper()
	deadline := time.After(5 * time.Second)
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	if publish != nil {
		publish()
	}
	for {
		select {
		case ev, ok := <-h.events:
			require.True(h.t, ok, "stream closed unexpectedly")
			if ignore[ev.name] {
				continue
			}
			return ev
		case <-tick.C:
			if publish != nil {
				publish()
			}
		case <-deadline:
			h.t.Fatal("timed out waiting for an SSE event")
		}
	}
}

func (h *streamHarness) publish(payload interface{}, err error) func() {
	return func() {
		h.broadcaster.Publish(stream.Event{Topic: stream.MetricsTopic(streamTestNode), Payload: payload, Err: err})
	}
}

func TestStreamMetrics_NoRecentMetricsLifecycle(t *testing.T) {
	h := newStreamHarness(t)

	noRecentErr := fmt.Errorf("node %s: %w", streamTestNode, repository.ErrNoRecentMetrics)
	noRecent := h.publish(nil, noRecentErr)
	metrics := h.publish(&chmodels.SystemMetrics{NodeName: streamTestNode, CPULoad: 42.5}, nil)
	failure := h.publish(nil, errors.New("clickhouse: connection refused"))

	// 1. Node goes stale: a single no_data event (not "error") with node and reason.
	ev := h.waitEvent(noRecent, nil)
	require.Equal(t, "no_data", ev.name)
	var payload map[string]string
	require.NoError(t, json.Unmarshal([]byte(ev.data), &payload), "data: %s", ev.data)
	assert.Equal(t, map[string]string{
		"node":  streamTestNode,
		"error": "node n1: no metrics in the last 10 minutes",
	}, payload)

	// 2. The publisher keeps repeating the state on every poll. Each tick below
	//    publishes no-recent followed by metrics, so the handler always consumes
	//    a repeated no-recent before the recovery; it must not be re-sent.
	staleThenRecover := func() { noRecent(); metrics() }
	ev = h.waitEvent(staleThenRecover, nil)
	require.Equal(t, "metrics", ev.name, "repeated no-recent state must not be re-sent")
	var got chmodels.SystemMetrics
	require.NoError(t, json.Unmarshal([]byte(ev.data), &got))
	assert.Equal(t, streamTestNode, got.NodeName)
	assert.InDelta(t, 42.5, got.CPULoad, 1e-9)

	// 3. After recovery, a new outage is a new transition: no_data again.
	ev = h.waitEvent(noRecent, map[string]bool{"metrics": true})
	require.Equal(t, "no_data", ev.name)

	// 4. A real failure during the outage is still reported as "error"...
	ev = h.waitEvent(failure, nil)
	require.Equal(t, "error", ev.name)
	assert.Contains(t, ev.data, "connection refused")

	// 5. ...but it is not a transition: the outage continues and the repeated
	//    no-recent state is still suppressed until metrics resume.
	ev = h.waitEvent(staleThenRecover, map[string]bool{"error": true})
	assert.Equal(t, "metrics", ev.name, "no_data must not be repeated within the same outage")
}
