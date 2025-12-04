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
