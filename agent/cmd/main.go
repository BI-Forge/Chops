package main

import (
	_ "clickhouse-ops/internal/api/docs" // swagger docs
	"clickhouse-ops/internal/cli"
)

// @title           ClickHouse Operations API
// @version         1.0
// @description     API for ClickHouse Operations Agent
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@example.com

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Run CLI with command line arguments
	cli.Execute()
}
