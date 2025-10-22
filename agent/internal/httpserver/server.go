package httpserver

import (
	"context"
	"net/http"
	"time"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/logger"
	"github.com/gin-gonic/gin"
)

// Server represents the HTTP server configuration and dependencies
type Server struct {
	router *gin.Engine
	port   string
	logger *logger.Logger
}

// Config holds server configuration options
type Config struct {
	Port   string
	Logger *logger.Logger
}

// New creates a new HTTP server instance
func New(cfg Config) *Server {
	// Set Gin to release mode for production
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()

	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Set default port if not provided
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	return &Server{
		router: router,
		port:   port,
		logger: cfg.Logger,
	}
}

// SetupRoutes configures all HTTP routes
func (s *Server) SetupRoutes() {
	// Health check endpoint
	s.router.GET("/health", func(c *gin.Context) {
		if s.logger != nil {
			s.logger.Info("Health check endpoint accessed")
		}
		
		// Check database connections
		health := gin.H{
			"status":    "ok",
			"timestamp": time.Now().UTC(),
			"services":  gin.H{},
		}
		
		// Check PostgreSQL
		if dbManager := db.GetInstance(); dbManager != nil {
			if err := dbManager.GetDBManager().Ping(); err != nil {
				health["services"].(gin.H)["postgres"] = gin.H{"status": "error", "error": err.Error()}
			} else {
				health["services"].(gin.H)["postgres"] = gin.H{"status": "ok"}
			}
		}
		
		// Check ClickHouse
		if chManager := clickhouse.GetInstance(); chManager != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
			defer cancel()
			
			if err := chManager.HealthCheck(ctx); err != nil {
				health["services"].(gin.H)["clickhouse"] = gin.H{"status": "error", "error": err.Error()}
			} else {
				health["services"].(gin.H)["clickhouse"] = gin.H{"status": "ok"}
			}
		}
		
		c.JSON(http.StatusOK, health)
	})

	// Root endpoint
	s.router.GET("/", func(c *gin.Context) {
		if s.logger != nil {
			s.logger.Info("Root endpoint accessed")
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "ClickHouse Operations Agent",
			"version": "1.0.0",
		})
	})
}

// GetRouter returns the Gin router for additional route configuration
func (s *Server) GetRouter() *gin.Engine {
	return s.router
}

// GetPort returns the server port
func (s *Server) GetPort() string {
	return s.port
}
