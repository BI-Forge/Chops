.PHONY: help test test-clickhouse test-api test-db-up test-db-down swagger

# Default target
help:
	@echo "ClickHouse Operations - Makefile Commands"
	@echo "========================================="
	@echo ""
	@echo "Tests (run in Docker):"
	@echo "  Backend:"
	@echo "    test                - Run all Go tests"
	@echo "    test-clickhouse     - Run ClickHouse tests only"
	@echo "    test-api            - Run API unit tests only (with mocks)"
	@echo "    test-db-up          - Start test databases (PostgreSQL and ClickHouse)"
	@echo "    test-db-down        - Stop test databases"
	@echo ""

# Run all tests
test:
	@cd agent && $(MAKE) test

# Run ClickHouse tests
test-clickhouse:
	@cd agent && $(MAKE) test-clickhouse

# Run API tests
test-api:
	@cd agent && $(MAKE) test-api

# Start test databases
test-db-up:
	@cd agent && $(MAKE) test-db-up

# Stop test databases
test-db-down:
	@cd agent && $(MAKE) test-db-down

# Test configuration
swagger:
	@cd agent && $(MAKE) swagger
