# ClickHouse Operations Agent - Test Makefile

.PHONY: help build test test-all test-clickhouse test-api test-coverage test-version test-config test-flags test-env test-combined test-validation test-server test-custom-port test-db test-migrations test-docker-compose clean swagger

# Default target
help:
	@echo "ClickHouse Operations Agent - Test Commands"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo "  build              - Build Docker image"
	@echo "  test               - Run all Go unit/integration tests"
	@echo "  test-clickhouse    - Run ClickHouse tests only"
	@echo "  test-api           - Run API functional tests only"
	@echo "  test-coverage      - Run tests with coverage report"
	@echo "  test-all           - Run all Docker-based tests"
	@echo "  test-version       - Test --version flag"
	@echo "  test-config        - Test --print-config flag"
	@echo "  test-flags         - Test flag overrides"
	@echo "  test-env           - Test environment variables"
	@echo "  test-combined      - Test combined env + flags"
	@echo "  test-validation    - Test configuration validation"
	@echo "  test-server        - Test HTTP server startup"
	@echo "  test-custom-port   - Test custom port"
	@echo "  test-db            - Test database connection"
	@echo "  test-migrations    - Test database migrations"
	@echo "  test-docker-compose- Test full docker-compose setup"
	@echo "  swagger            - Generate Swagger documentation using Docker"
	@echo "  clean              - Stop all running containers"
	@echo ""

# Build Docker image
build:
	@echo "Building Docker image..."
	docker build -f build/docker/Dockerfile -t ops-clickhouse:prod .
	@echo "✅ Docker image built successfully"

# Run all tests
test-all: build test-version test-config test-flags test-env test-combined test-validation test-server test-custom-port test-db test-migrations test-docker-compose
	@echo ""
	@echo "🎉 All tests completed successfully!"

# Test --version flag
test-version:
	@echo ""
	@echo "Testing --version flag..."
	@echo "========================="
	docker run --rm ops-clickhouse:prod ./app --version

# Test --print-config flag
test-config:
	@echo ""
	@echo "Testing --print-config flag..."
	@echo "=============================="
	docker run --rm ops-clickhouse:prod ./app --print-config

# Test flag overrides
test-flags:
	@echo ""
	@echo "Testing flag overrides..."
	@echo "========================"
	@echo "Testing --http-port flag:"
	docker run --rm ops-clickhouse:prod ./app --print-config --http-port 3000 --log-format console,json

# Test environment variables
test-env:
	@echo ""
	@echo "Testing environment variables..."
	@echo "==============================="
	docker run --rm \
		-e HTTP_PORT=4000 \
		-e POSTGRES_DSN="postgres://user:pass@localhost:5432/db" \
		ops-clickhouse:prod ./app --print-config

# Test combined env + flags
test-combined:
	@echo ""
	@echo "Testing combined env + flags..."
	@echo "==============================="
	docker run --rm \
		-e HTTP_PORT=4000 \
		-e POSTGRES_DSN="postgres://user:pass@localhost:5432/db" \
		ops-clickhouse:prod ./app --print-config --clickhouse-dsn "tcp://localhost:9000"

# Test configuration validation (should fail)
test-validation:
	@echo ""
	@echo "Testing configuration validation..."
	@echo "=================================="
	@echo "Testing invalid ClickHouse DSN (should fail):"
	-docker run --rm ops-clickhouse:prod ./app --print-config --clickhouse-dsn "invalid://dsn"
	@echo ""
	@echo "Testing invalid port (should fail):"
	-docker run --rm ops-clickhouse:prod ./app --print-config --http-port 99999

# Test HTTP server startup
test-server:
	@echo ""
	@echo "Testing HTTP server startup..."
	@echo "============================="
	@echo "Starting server on port 8080..."
	docker run -d --name test-server-8080 -p 8080:8080 ops-clickhouse:prod ./app
	@sleep 3
	@echo "Testing health endpoint:"
	curl -s http://localhost:8080/health || echo "❌ Health check failed"
	@echo ""
	@echo "Testing root endpoint:"
	curl -s http://localhost:8080/ || echo "❌ Root endpoint failed"
	@echo ""
	docker stop test-server-8080
	docker rm test-server-8080
	@echo "✅ Server test completed"

# Test custom port
test-custom-port:
	@echo ""
	@echo "Testing custom port..."
	@echo "====================="
	@echo "Starting server on port 3000..."
	docker run -d --name test-server-3000 -p 3000:3000 ops-clickhouse:prod ./app --http-port 3000
	@sleep 3
	@echo "Testing health endpoint on port 3000:"
	curl -s http://localhost:3000/health || echo "❌ Health check failed"
	@echo ""
	docker stop test-server-3000
	docker rm test-server-3000
	@echo "✅ Custom port test completed"

# Clean up running containers
clean:
	@echo "Cleaning up running containers..."
	-docker stop $$(docker ps -q --filter ancestor=ops-clickhouse:prod) 2>/dev/null || true
	-docker rm $$(docker ps -aq --filter ancestor=ops-clickhouse:prod) 2>/dev/null || true
	@echo "✅ Cleanup completed"

# Development commands
dev-build:
	@echo "Building development image..."
	docker build -f build/docker/Dockerfile.dev -t ops-clickhouse:dev .

dev-run:
	@echo "Running development server with auto-reload..."
	docker run --rm -p 8080:8080 -v $$(pwd):/app ops-clickhouse:dev

# Production commands
prod-run:
	@echo "Running production server..."
	docker run --rm -p 8080:8080 ops-clickhouse:prod ./app

prod-run-custom:
	@echo "Running production server with custom port..."
	docker run --rm -p 3000:3000 ops-clickhouse:prod ./app --http-port 3000

# Test database connection
test-db:
	@echo ""
	@echo "Testing database connection..."
	@echo "============================"
	@echo "Starting PostgreSQL container..."
	docker run -d --name test-postgres -e POSTGRES_USER=ops -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=public -p 5433:5432 postgres:13.11
	@sleep 5
	@echo "Testing database connection with DSN:"
	docker run --rm --link test-postgres:postgres \
		-e POSTGRES_DSN="postgres://ops:12345@postgres:5432/public?sslmode=disable" \
		ops-clickhouse:prod ./app --print-config | grep -A5 "Database:"
	@echo ""
	docker stop test-postgres
	docker rm test-postgres
	@echo "✅ Database connection test completed"

# Test database migrations
test-migrations:
	@echo ""
	@echo "Testing database migrations..."
	@echo "============================"
	@echo "Starting PostgreSQL container..."
	docker run -d --name test-postgres-mig -e POSTGRES_USER=ops -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=public -p 5434:5432 postgres:13.11
	@sleep 5
	@echo "Running application with migrations..."
	@echo "This should create 'users' table and 'system_migrations' table"
	docker run --rm --link test-postgres-mig:ops_db \
		-e POSTGRES_DSN="postgres://ops:12345@ops_db:5432/public?sslmode=disable" \
		ops-clickhouse:prod ./app --http-port 8081 &
	@sleep 8
	@echo "Checking if migrations were applied:"
	docker exec test-postgres-mig psql -U ops -d public -c "\dt" | grep -E "(users|system_migrations)" || echo "❌ Tables not found"
	@echo ""
	@echo "Checking migration record:"
	docker exec test-postgres-mig psql -U ops -d public -c "SELECT * FROM system_migrations;" || echo "❌ Migration record not found"
	@echo ""
	docker stop test-postgres-mig
	docker rm test-postgres-mig
	@echo "✅ Database migrations test completed"

# Test full docker-compose setup
test-docker-compose:
	@echo ""
	@echo "Testing full docker-compose setup..."
	@echo "==================================="
	@echo "Starting services with docker-compose..."
	cd .. && docker-compose up -d ops_db
	@sleep 5
	@echo "Building and running application..."
	cd .. && docker-compose up --build -d ops_agent
	@sleep 10
	@echo "Testing application endpoints:"
	@echo "Health check:"
	curl -s http://localhost:8080/health || echo "❌ Health check failed"
	@echo ""
	@echo "Root endpoint:"
	curl -s http://localhost:8080/ || echo "❌ Root endpoint failed"
	@echo ""
	@echo "Checking database tables:"
	docker-compose exec ops_db psql -U ops -d public -c "\dt" | grep -E "(users|system_migrations)" || echo "❌ Tables not found"
	@echo ""
	@echo "Stopping services..."
	cd .. && docker-compose down
	@echo "✅ Docker-compose test completed"

# Quick test commands
quick-test: build test-version test-config test-flags
	@echo "✅ Quick tests completed"

# Database-specific tests
db-test: test-db test-migrations
	@echo "✅ Database tests completed"

# Full integration test
integration-test: test-docker-compose
	@echo "✅ Integration test completed"

# Test commands
test:
	@echo "Running all tests..."
	@go test -v ./tests/...

test-clickhouse:
	@echo "Running ClickHouse tests..."
	@go test -v ./tests/clickhouse/...

test-api:
	@echo "Running API tests..."
	@go test -v ./tests/api/...

test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./tests/...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Generate Swagger documentation using Docker
swagger:
	@echo "Generating Swagger documentation..."
	@mkdir -p ./internal/api/docs
	@echo "Building builder stage..."
	@docker build --target builder -t ops_agent-builder:temp -f Dockerfile . > /dev/null 2>&1
	@echo "Running swag init in container..."
	@docker run --name swagger-gen ops_agent-builder:temp swag init -g ./cmd/main.go -o ./internal/api/docs
	@echo "Copying generated files from container..."
	@docker cp swagger-gen:/app/internal/api/docs/. ./internal/api/docs/
	@docker rm swagger-gen > /dev/null 2>&1
	@echo "✅ Swagger documentation generated at internal/api/docs/"
	@echo "Files: docs.go, swagger.json, swagger.yaml"
