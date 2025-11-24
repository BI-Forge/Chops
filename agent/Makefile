# ClickHouse Operations Agent - Test Makefile

.PHONY: help build test test-unit test-clickhouse test-api test-config test-server test-db test-integration clean swagger

# Default target
help:
	@echo "ClickHouse Operations Agent - Test Commands"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo "  build              - Build Docker image"
	@echo "  test               - Run all Go unit/integration tests in Docker"
	@echo "  test-unit          - Run all unit tests in Docker"
	@echo "  test-clickhouse    - Run ClickHouse tests only in Docker"
	@echo "  test-api           - Run API functional tests only in Docker"
	@echo "  test-config        - Test configuration flags and validation in Docker"
	@echo "  test-server        - Test HTTP server startup in Docker"
	@echo "  test-db            - Test database connection and migrations in Docker"
	@echo "  test-integration   - Test full docker-compose setup"
	@echo "  swagger            - Generate Swagger documentation using Docker"
	@echo "  clean              - Stop all running test containers"
	@echo ""

# Build Docker image
build:
	@echo "Building Docker image..."
	@docker build -f Dockerfile -t ops-clickhouse:prod .
	@echo "✅ Docker image built successfully"

# Build test image (builder stage)
build-test:
	@echo "Building test image..."
	@docker build --target builder -t ops-clickhouse:test -f Dockerfile .
	@echo "✅ Test image built successfully"

# Run all Go tests in Docker
test: build-test
	@echo "Running all Go tests in Docker..."
	@docker run --rm -v $$(pwd):/app -w /app ops-clickhouse:test go test -v ./tests/...
	@echo "✅ All tests completed"

# Run all unit tests in Docker
test-unit: build-test
	@echo "Running all unit tests in Docker..."
	@docker run --rm -v $$(pwd):/app -w /app ops-clickhouse:test go test -v -short ./tests/...
	@echo "✅ Unit tests completed"

# Run ClickHouse tests in Docker
test-clickhouse: build-test
	@echo "Running ClickHouse tests in Docker..."
	@docker run --rm -v $$(pwd):/app -w /app ops-clickhouse:test go test -v ./tests/clickhouse/...
	@echo "✅ ClickHouse tests completed"

# Run API tests in Docker
test-api: build-test
	@echo "Running API tests in Docker..."
	@docker run --rm -v $$(pwd):/app -w /app ops-clickhouse:test go test -v ./tests/api/...
	@echo "✅ API tests completed"

# Test configuration flags and validation in Docker
test-config: build
	@echo "Testing configuration in Docker..."
	@echo "Testing --version flag:"
	@docker run --rm ops-clickhouse:prod /app/ops_agent --version
	@echo ""
	@echo "Testing --print-config flag:"
	@docker run --rm ops-clickhouse:prod /app/ops_agent --print-config
	@echo ""
	@echo "Testing flag overrides:"
	@docker run --rm ops-clickhouse:prod /app/ops_agent --print-config --http-port 3000 --log-format console,json
	@echo ""
	@echo "Testing environment variables:"
	@docker run --rm -e HTTP_PORT=4000 -e POSTGRES_DSN="postgres://user:pass@localhost:5432/db" \
		ops-clickhouse:prod /app/ops_agent --print-config
	@echo ""
	@echo "Testing combined env + flags:"
	@docker run --rm -e HTTP_PORT=4000 -e POSTGRES_DSN="postgres://user:pass@localhost:5432/db" \
		ops-clickhouse:prod /app/ops_agent --print-config --clickhouse-dsn "tcp://localhost:9000"
	@echo ""
	@echo "Testing configuration validation (should fail):"
	@-docker run --rm ops-clickhouse:prod /app/ops_agent --print-config --clickhouse-dsn "invalid://dsn" || true
	@-docker run --rm ops-clickhouse:prod /app/ops_agent --print-config --http-port 99999 || true
	@echo "✅ Configuration tests completed"

# Test HTTP server startup in Docker
test-server: build
	@echo "Testing HTTP server startup in Docker..."
	@echo "Starting server on port 8080..."
	@docker run -d --name test-server-8080 -p 8080:8080 ops-clickhouse:prod /app/ops_agent
	@sleep 3
	@echo "Testing health endpoint:"
	@curl -s http://localhost:8080/health || echo "❌ Health check failed"
	@echo ""
	@echo "Testing root endpoint:"
	@curl -s http://localhost:8080/ || echo "❌ Root endpoint failed"
	@echo ""
	@docker stop test-server-8080 > /dev/null 2>&1 || true
	@docker rm test-server-8080 > /dev/null 2>&1 || true
	@echo ""
	@echo "Testing custom port 3000..."
	@docker run -d --name test-server-3000 -p 3000:3000 ops-clickhouse:prod /app/ops_agent --http-port 3000
	@sleep 3
	@echo "Testing health endpoint on port 3000:"
	@curl -s http://localhost:3000/health || echo "❌ Health check failed"
	@docker stop test-server-3000 > /dev/null 2>&1 || true
	@docker rm test-server-3000 > /dev/null 2>&1 || true
	@echo "✅ Server tests completed"

# Test database connection and migrations in Docker
test-db: build
	@echo "Testing database connection and migrations in Docker..."
	@echo "Starting PostgreSQL container..."
	@docker run -d --name test-postgres -e POSTGRES_USER=ops -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=public -p 5433:5432 postgres:13.11 > /dev/null 2>&1
	@sleep 5
	@echo "Testing database connection:"
	@docker run --rm --link test-postgres:postgres \
		-e POSTGRES_DSN="postgres://ops:12345@postgres:5432/public?sslmode=disable" \
		ops-clickhouse:prod /app/ops_agent --print-config | grep -A5 "Database:" || true
	@echo ""
	@echo "Testing database migrations..."
	@docker run -d --name test-postgres-mig -e POSTGRES_USER=ops -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=public -p 5434:5432 postgres:13.11 > /dev/null 2>&1
	@sleep 5
	@docker run -d --name test-app-mig --link test-postgres-mig:ops_db \
		-e POSTGRES_DSN="postgres://ops:12345@ops_db:5432/public?sslmode=disable" \
		ops-clickhouse:prod /app/ops_agent --http-port 8081 > /dev/null 2>&1
	@sleep 8
	@echo "Checking if migrations were applied:"
	@docker exec test-postgres-mig psql -U ops -d public -c "\dt" | grep -E "(users|system_migrations)" || echo "❌ Tables not found"
	@echo ""
	@echo "Checking migration record:"
	@docker exec test-postgres-mig psql -U ops -d public -c "SELECT * FROM system_migrations;" || echo "❌ Migration record not found"
	@docker stop test-postgres test-postgres-mig test-app-mig > /dev/null 2>&1 || true
	@docker rm test-postgres test-postgres-mig test-app-mig > /dev/null 2>&1 || true
	@echo "✅ Database tests completed"

# Test full docker-compose setup
test-integration:
	@echo "Testing full docker-compose setup..."
	@cd .. && docker compose -f docker-compose.dev.yml up -d ops_db
	@sleep 5
	@cd .. && docker compose -f docker-compose.dev.yml up --build -d ops_agent
	@echo "Waiting for service to be ready..."
	@for i in $$(seq 1 10); do \
		if curl -s http://localhost:8080/health > /dev/null 2>&1; then \
			echo "Service is ready!"; \
			break; \
		fi; \
		echo "Waiting... ($$i/30)"; \
		sleep 2; \
	done
	@echo ""
	@echo "Testing application endpoints:"
	@echo "Health check:"
	@curl -s http://localhost:8080/health || echo "❌ Health check failed"
	@echo ""
	@echo "Root endpoint:"
	@curl -s http://localhost:8080/ || echo "❌ Root endpoint failed"
	@echo ""
	@echo "Checking database tables:"
	@cd .. && docker compose -f docker-compose.dev.yml exec -T ops_db psql -U ops -d public -c "\dt" | grep -E "(users|system_migrations)" || echo "❌ Tables not found"
	@cd .. && docker compose -f docker-compose.dev.yml down
	@echo "✅ Integration test completed"

# Clean up running test containers
clean:
	@echo "Cleaning up running test containers..."
	@-docker stop test-server-8080 test-server-3000 test-postgres test-postgres-mig test-app-mig 2>/dev/null || true
	@-docker rm test-server-8080 test-server-3000 test-postgres test-postgres-mig test-app-mig 2>/dev/null || true
	@-docker stop $$(docker ps -q --filter ancestor=ops-clickhouse:prod) 2>/dev/null || true
	@-docker rm $$(docker ps -aq --filter ancestor=ops-clickhouse:prod) 2>/dev/null || true
	@echo "✅ Cleanup completed"

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
