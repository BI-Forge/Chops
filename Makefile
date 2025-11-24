.PHONY: help dev prod stop test test-unit test-clickhouse test-api test-coverage test-config test-server test-db test-integration clean

# Default target
help:
	@echo "ClickHouse Operations - Makefile Commands"
	@echo "========================================="
	@echo ""
	@echo "Environment:"
	@echo "  dev                 - Start development environment"
	@echo "  prod                - Start production environment"
	@echo "  stop                - Stop all services"
	@echo ""
	@echo "Tests (run in Docker):"
	@echo "  Backend:"
	@echo "    test                - Run all Go tests"
	@echo "    test-unit           - Run unit tests only"
	@echo "    test-clickhouse     - Run ClickHouse tests only"
	@echo "    test-api            - Run API tests only"
	@echo "    test-coverage       - Run tests with coverage"
	@echo "    test-config         - Test configuration"
	@echo "    test-server         - Test HTTP server"
	@echo "    test-db             - Test database"
	@echo "    test-integration    - Test full integration"
	@echo ""
	@echo "Other:"
	@echo "  clean               - Clean test containers"
	@echo ""

# Development environment
dev:
	docker-compose -f docker-compose.dev.yml up -d

# Production environment
prod:
	docker-compose up -d

# Stop all services
stop:
	docker-compose stop

# Run all tests
test:
	@cd agent && $(MAKE) test

# Run unit tests
test-unit:
	@cd agent && $(MAKE) test-unit

# Run ClickHouse tests
test-clickhouse:
	@cd agent && $(MAKE) test-clickhouse

# Run API tests
test-api:
	@cd agent && $(MAKE) test-api

# Test configuration
test-config:
	@cd agent && $(MAKE) test-config

# Test server
test-server:
	@cd agent && $(MAKE) test-server

# Test database
test-db:
	@cd agent && $(MAKE) test-db

# Test integration
test-integration:
	@cd agent && $(MAKE) test-integration

# Clean test containers
clean:
	@cd agent && $(MAKE) clean