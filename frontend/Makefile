.PHONY: help test test-watch build-test-image clean

# Default target
help:
	@echo "Frontend Test Commands"
	@echo "====================="
	@echo ""
	@echo "Available commands:"
	@echo "  test                - Run all tests in Docker"
	@echo "  test-watch          - Run tests in watch mode in Docker"
	@echo "  build-test-image    - Build test Docker image"
	@echo "  clean               - Clean test containers"
	@echo ""

# Build test Docker image
build-test-image:
	@echo "Building test Docker image..."
	@docker build -f Dockerfile.test -t frontend-test:latest .
	@echo "✅ Test image built successfully"

# Run all tests in Docker
test: build-test-image
	@echo "Running all tests in Docker..."
	@docker run --rm \
		-v $$(pwd)/src:/app/src:ro \
		-v $$(pwd)/vitest.config.ts:/app/vitest.config.ts:ro \
		-v $$(pwd)/tsconfig.json:/app/tsconfig.json:ro \
		-v $$(pwd)/tsconfig.node.json:/app/tsconfig.node.json:ro \
		-v $$(pwd)/index.html:/app/index.html:ro \
		-w /app \
		frontend-test:latest npm run test
	@echo "✅ Tests completed"

# Run tests in watch mode in Docker
test-watch: build-test-image
	@echo "Running tests in watch mode in Docker..."
	@docker run --rm -v $$(pwd):/app -w /app frontend-test:latest npm run test:watch

# Clean test containers
clean:
	@echo "Cleaning up test containers..."
	@-docker stop $$(docker ps -q --filter ancestor=frontend-test:latest) 2>/dev/null || true
	@-docker rm $$(docker ps -aq --filter ancestor=frontend-test:latest) 2>/dev/null || true
	@echo "✅ Cleanup completed"

