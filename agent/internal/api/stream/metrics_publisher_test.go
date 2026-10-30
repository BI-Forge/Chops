package stream

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"clickhouse-ops/internal/clickhouse/repository"
)

func TestNextNoRecentState(t *testing.T) {
	noRecentErr := fmt.Errorf("node n1: %w", repository.ErrNoRecentMetrics)
	otherErr := errors.New("connection refused")

	tests := []struct {
		name        string
		wasNoRecent bool
		err         error
		want        bool
	}{
		{name: "ok stays ok", wasNoRecent: false, err: nil, want: false},
		{name: "enter no-recent", wasNoRecent: false, err: noRecentErr, want: true},
		{name: "stay no-recent", wasNoRecent: true, err: noRecentErr, want: true},
		{name: "recover", wasNoRecent: true, err: nil, want: false},
		{name: "other error keeps no-recent", wasNoRecent: true, err: otherErr, want: true},
		{name: "other error keeps ok", wasNoRecent: false, err: otherErr, want: false},
		{name: "timeout keeps no-recent", wasNoRecent: true, err: context.DeadlineExceeded, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := nextNoRecentState(tt.wasNoRecent, tt.err); got != tt.want {
				t.Fatalf("nextNoRecentState(%v, %v) = %v, want %v", tt.wasNoRecent, tt.err, got, tt.want)
			}
		})
	}
}

// No-recent -> unrelated error -> recovery must still be seen as a recovery
// transition (CR-10).
func TestNextNoRecentState_RecoveryAfterUnrelatedError(t *testing.T) {
	state := false
	state = nextNoRecentState(state, fmt.Errorf("node n1: %w", repository.ErrNoRecentMetrics))
	state = nextNoRecentState(state, errors.New("timeout"))
	if !state {
		t.Fatal("unrelated error must not clear the no-recent state")
	}
	if next := nextNoRecentState(state, nil); next {
		t.Fatal("successful poll must clear the no-recent state")
	}
}

func TestIsNoRecentMetrics(t *testing.T) {
	if !IsNoRecentMetrics(Event{Err: fmt.Errorf("node n1: %w", repository.ErrNoRecentMetrics)}) {
		t.Error("wrapped ErrNoRecentMetrics must be detected")
	}
	if IsNoRecentMetrics(Event{Err: errors.New("boom")}) {
		t.Error("unrelated error must not be treated as no-recent")
	}
	if IsNoRecentMetrics(Event{}) {
		t.Error("event without error must not be treated as no-recent")
	}
}
