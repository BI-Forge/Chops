package middleware

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TraceIDHeader is the header name for trace ID
const TraceIDHeader = "X-Trace-ID"

// TracingMiddleware creates a tracing middleware that adds trace ID to requests
func TracingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := c.GetHeader(TraceIDHeader)
		if traceID == "" {
			traceID = uuid.New().String()
		}

		// Add trace ID to response header
		c.Header(TraceIDHeader, traceID)

		// Store trace ID in context and gin context
		ctx := context.WithValue(c.Request.Context(), TraceIDHeader, traceID)
		c.Request = c.Request.WithContext(ctx)
		c.Set("trace_id", traceID)

		c.Next()
	}
}
