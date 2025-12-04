package httpserver

import (
	"clickhouse-ops/internal/api"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Server represents the HTTP server configuration and dependencies
type Server struct {
	router *gin.Engine
	port   string
	logger *logger.Logger
}

// Config holds server configuration options
type Config struct {
	Config *config.Config
	Logger *logger.Logger
}

// New creates a new HTTP server instance
func New(cfg Config) *Server {
	// Set Gin to release mode for production
	gin.SetMode(gin.ReleaseMode)

	// Convert config to router config
	routerCfg, err := api.ConvertToRouterConfig(cfg.Config, cfg.Logger)
	if err != nil {
		cfg.Logger.Errorf("Failed to convert config: %v", err)
		routerCfg = api.GetDefaultRouterConfig(cfg.Logger)
	}

	// Setup API v1 router
	router := api.SetupRouter(routerCfg)

	// Add Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Set default port if not provided
	port := cfg.Config.Server.Port
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
// Routes are now set up in api.SetupRouter, this method is kept for compatibility
func (s *Server) SetupRoutes() {
	// Routes are already configured in New() via api.SetupRouter
	// This method is kept for backward compatibility
}

// GetRouter returns the Gin router for additional route configuration
func (s *Server) GetRouter() *gin.Engine {
	return s.router
}

// GetPort returns the server port
func (s *Server) GetPort() string {
	return s.port
}
