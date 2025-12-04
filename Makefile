# Run all Go tests in Docker (with test databases)
test:
	docker compose -f docker-compose.test.yml stop
	docker compose -f docker-compose.test.yml up -d --build chops_app_test
	docker compose -f docker-compose.test.yml exec -T chops_app_test go test -v ./tests/...
	docker compose -f docker-compose.test.yml down

# Run ClickHouse tests in Docker (with test databases)
test-clickhouse:
	docker compose -f docker-compose.test.yml stop
	docker compose -f docker-compose.test.yml up -d --build chops_app_test
	docker compose -f docker-compose.test.yml exec -T chops_app_test go test -v ./tests/clickhouse/...
	docker compose -f docker-compose.test.yml down

# Run API tests in Docker (with test databases)
test-api:
	docker compose -f docker-compose.test.yml stop
	docker compose -f docker-compose.test.yml up -d --build chops_app_test
	docker compose -f docker-compose.test.yml exec -T chops_app_test go test -v ./tests/api/...
	docker compose -f docker-compose.test.yml down

# Run frontend E2E tests in Docker
test-e2e:
	docker compose -f docker-compose.test.yml stop
	docker compose -f docker-compose.test.yml up -d --build chops_app_test chops_front_test
	docker compose -f docker-compose.test.yml run --rm test_playwright
	docker compose -f docker-compose.test.yml down

# Run frontend E2E tests in Docker (headed mode)
# Note: This requires X11 forwarding or VNC for GUI display in Docker
test-e2e-headed:
	docker compose -f docker-compose.test.yml stop
	docker compose -f docker-compose.test.yml up -d --build chops_app_test chops_front_test
	docker compose -f docker-compose.test.yml run --rm -e DISPLAY=$$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix test_playwright npx playwright test --headed
	docker compose -f docker-compose.test.yml down

# Test configuration
swagger:
	@cd agent && $(MAKE) swagger
