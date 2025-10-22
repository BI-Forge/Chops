package context

import (
	"context"
	"clickhouse-ops/internal/config"
)

// ContextKey is a custom type for context keys
type ContextKey string

const (
	ConfigKey ContextKey = "config"
)

// WithConfig adds config to context
func WithConfig(ctx context.Context, cfg *config.Config) context.Context {
	return context.WithValue(ctx, ConfigKey, cfg)
}

// GetConfig retrieves config from context
func GetConfig(ctx context.Context) (*config.Config, bool) {
	cfg, ok := ctx.Value(ConfigKey).(*config.Config)
	return cfg, ok
}

// MustGetConfig retrieves config from context, panics if not found
func MustGetConfig(ctx context.Context) *config.Config {
	cfg, ok := GetConfig(ctx)
	if !ok {
		panic("config not found in context")
	}
	return cfg
}
