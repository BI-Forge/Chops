# ClickHouse Operations Agent - Test Makefile

.PHONY: help build test
# Default target
help:
	@echo "ClickHouse Operations Agent - Test Commands"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo "  build              - Build Docker image"
	@echo "  test               - Run all Go tests in Docker (with test databases)"
	@echo "  test-clickhouse    - Run ClickHouse tests in Docker (with test databases)"
	@echo "  test-api           - Run API tests in Docker (with test databases)"
	@echo "  test-db-up         - Start test databases (PostgreSQL and ClickHouse)"
	@echo "  test-db-down       - Stop test databases"
	@echo "  swagger            - Generate Swagger documentation using Docker"
	@echo ""

# Build Docker image
build:
	@echo "Building Docker image..."
	@docker build -f Dockerfile -t ops-clickhouse:prod .
	@echo "✅ Docker image built successfully"

# Start test app container (builds image automatically)
test-app-up:
	@echo "Starting test app container (building if needed)..."
	@cd .. && docker compose -f docker-compose.test.yml up -d --build test_app
	@sleep 3

# Run all Go tests in Docker (with test databases)
test: test-db-up test-app-up
	@echo "Running all Go tests..."
	@cd .. && docker compose -f docker-compose.test.yml exec -T test_app go test -v ./tests/...; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -ne 0 ]; then \
		echo "❌ Tests failed with exit code $$EXIT_CODE"; \
		$(MAKE) test-db-down; \
		exit $$EXIT_CODE; \
	fi
	@echo "✅ All tests completed"
	@$(MAKE) test-db-down

# Run ClickHouse tests in Docker (with test databases)
test-clickhouse: test-db-up test-app-up
	@echo "Running ClickHouse tests..."
	@cd .. && docker compose -f docker-compose.test.yml exec -T test_app go test -v ./tests/clickhouse/...; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -ne 0 ]; then \
		echo "❌ Tests failed with exit code $$EXIT_CODE"; \
		$(MAKE) test-db-down; \
		exit $$EXIT_CODE; \
	fi
	@echo "✅ ClickHouse tests completed"
	@$(MAKE) test-db-down

# Run API tests in Docker (with test databases)
test-api: test-db-up test-app-up
	@echo "Running API tests..."
	@cd .. && docker compose -f docker-compose.test.yml exec -T test_app go test -v ./tests/api/...; \
	EXIT_CODE=$$?; \
	if [ $$EXIT_CODE -ne 0 ]; then \
		echo "❌ Tests failed with exit code $$EXIT_CODE"; \
		$(MAKE) test-db-down; \
		exit $$EXIT_CODE; \
	fi
	@echo "✅ API tests completed"
	@$(MAKE) test-db-down

# Start test databases
test-db-up:
	@echo "Starting test databases..."
	@cd .. && docker compose -f docker-compose.test.yml up -d test_postgres test_clickhouse
	@echo "Waiting for databases to be ready..."
	@for i in $$(seq 1 60); do \
		POSTGRES_STATUS=$$(cd .. && docker compose -f docker-compose.test.yml ps test_postgres --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo ""); \
		CH_STATUS=$$(cd .. && docker compose -f docker-compose.test.yml ps test_clickhouse --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo ""); \
		if [ "$$POSTGRES_STATUS" = "healthy" ] && [ "$$CH_STATUS" = "healthy" ]; then \
			echo "Databases are ready!"; \
			break; \
		fi; \
		if [ $$i -eq 60 ]; then \
			echo "⚠️  Databases may not be fully ready, but continuing..."; \
			break; \
		fi; \
		echo "Waiting for databases... ($$i/60) - Postgres: $$POSTGRES_STATUS, ClickHouse: $$CH_STATUS"; \
		sleep 2; \
	done
	@echo "✅ Test databases started"

# Stop test databases
test-db-down:
	@echo "Stopping test databases and containers..."
	@cd .. && docker compose -f docker-compose.test.yml down -v
	@echo "✅ Test databases stopped"

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
