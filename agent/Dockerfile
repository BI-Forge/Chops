FROM golang:1.24 as builder
# Define build env
ENV GOOS=linux
ENV CGO_ENABLED=0
# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
# Add a work directory
WORKDIR /app
# Cache and install dependencies
COPY go.mod go.sum ./
RUN go mod download
# Install swag for Swagger documentation generation
RUN go install github.com/swaggo/swag/cmd/swag@latest
# Copy app files
COPY . .
# Generate Swagger documentation
RUN swag init -g ./cmd/main.go -o ./internal/api/docs
# Build app
RUN go build -o ./ops_agent ./cmd/main.go


FROM alpine:3.14 as production
# Add timezone package
RUN apk add --no-cache tzdata
# Add certificates
RUN apk add --no-cache ca-certificates
# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
# Add a work directory
WORKDIR /app
# Copy built binary from builder
COPY --from=builder /app/ops_agent .
# Copy config file
COPY --from=builder /app/configs ./configs
# Expose port
EXPOSE 8080
# Exec built binary
CMD ["/app/ops_agent"]
