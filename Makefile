# Run all Go tests in Docker (with test databases)
test:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app
	docker compose -f docker-compose.test.yml exec -T app go test -v ./tests/...
	docker compose -f docker-compose.test.yml down

# Run custom backend tests in Docker (with test databases)
# Usage: make test-custom TEST=TestName
# Example: make test-custom TEST=TestSchemasHandlerGetSchemasList
test-custom:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app
	@if [ -n "$(TEST)" ]; then \
		docker compose -f docker-compose.test.yml exec -T app go test -v ./tests/... -run $(TEST); \
	else \
		docker compose -f docker-compose.test.yml exec -T app go test -v ./tests/...; \
	fi
	docker compose -f docker-compose.test.yml down

# Run ClickHouse tests in Docker (with test databases)
test-clickhouse:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app
	docker compose -f docker-compose.test.yml exec -T app go test -v ./tests/clickhouse/...
	docker compose -f docker-compose.test.yml down

# Run API tests in Docker (with test databases)
test-api:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app
	docker compose -f docker-compose.test.yml exec -T app go test -v ./tests/api/...
	docker compose -f docker-compose.test.yml down

# Run frontend E2E tests in Docker
test-frontend:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app front
	docker compose -f docker-compose.test.yml run --rm test_playwright
	docker compose -f docker-compose.test.yml down

# Run frontend E2E tests in Docker (headed mode)
# Note: This requires X11 forwarding or VNC for GUI display in Docker
test-frontend-h:
	docker compose -f docker-compose.test.yml down
	docker compose -f docker-compose.test.yml up -d --build app front
	docker compose -f docker-compose.test.yml run --rm -e DISPLAY=$$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix test_playwright npx playwright test --headed
	docker compose -f docker-compose.test.yml down

# Test configuration
swagger:
	@cd agent && $(MAKE) swagger

# Clean WSL artifacts
clean-wsl:
	@./scripts/clean-wsl-artifacts.sh