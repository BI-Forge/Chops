package middleware

import (
	"time"

	"clickhouse-ops/internal/logger"
	"github.com/gin-gonic/gin"
)

// LoggingMiddleware creates a structured logging middleware
func LoggingMiddleware(appLogger *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()

		if query != "" {
			path = path + "?" + query
		}

		if appLogger != nil {
			appLogger.Infof(
				"[%s] %s %s %d %v %s",
				method,
				path,
				clientIP,
				status,
				latency,
				c.Request.UserAgent(),
			)
		}
	}
}
