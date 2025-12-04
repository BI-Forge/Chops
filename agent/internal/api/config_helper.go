package api

import (
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// ConvertToRouterConfig converts app config to API router config
func ConvertToRouterConfig(cfg *config.Config, appLogger *logger.Logger) (RouterConfig, error) {
	// Parse JWT token duration
	tokenDuration := 24 * time.Hour // default
	if cfg.Server.JWTTokenDuration != "" {
		var err error
		tokenDuration, err = time.ParseDuration(cfg.Server.JWTTokenDuration)
		if err != nil {
			return RouterConfig{}, err
		}
	}

	// Set default JWT secret if not provided
	jwtSecret := cfg.Server.JWTSecretKey
	if jwtSecret == "" {
		jwtSecret = "default-secret-key-change-in-production" // TODO: Generate or require
	}

	// Set default rate limit if not configured
	rateLimitRPS := cfg.Server.RateLimitRPS
	if rateLimitRPS == 0 {
		rateLimitRPS = 100 // Default: 100 requests per second
	}

	rateLimitBurst := cfg.Server.RateLimitBurst
	if rateLimitBurst == 0 {
		rateLimitBurst = 200 // Default burst size
	}

	return RouterConfig{
		JWTSecretKey:     jwtSecret,
		JWTTokenDuration: tokenDuration,
		RateLimitRPS:     rateLimitRPS,
		RateLimitBurst:   rateLimitBurst,
		Logger:           appLogger,
		Config:           cfg,
	}, nil
}

// GetDefaultRouterConfig returns default router configuration
func GetDefaultRouterConfig(appLogger *logger.Logger) RouterConfig {
	return RouterConfig{
		JWTSecretKey:     "default-secret-key-change-in-production",
		JWTTokenDuration: 24 * time.Hour,
		RateLimitRPS:     100,
		RateLimitBurst:   200,
		Logger:           appLogger,
	}
}
