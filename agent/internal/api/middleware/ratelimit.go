package middleware

import (
	"net/http"

	"golang.org/x/time/rate"
	"github.com/gin-gonic/gin"
)

// RateLimiter holds rate limiter configuration
type RateLimiter struct {
	limiter *rate.Limiter
}

// NewRateLimiter creates a new rate limiter
// rps: requests per second, burst: maximum burst size
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	return &RateLimiter{
		limiter: rate.NewLimiter(rate.Limit(rps), burst),
	}
}

// RateLimitMiddleware creates a rate limiting middleware
func (rl *RateLimiter) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rl.limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
