FROM golang:1.21-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o oauth-service main.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Create a non-root user
RUN addgroup -g 1001 -S oauth && \
    adduser -u 1001 -S oauth -G oauth

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/oauth-service .

# Copy .env file if it exists
COPY --from=builder /app/.env.example .env

# Change ownership to non-root user
RUN chown -R oauth:oauth /app

# Switch to non-root user
USER oauth

# Expose port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9090/health || exit 1

# Run the binary
CMD ["./oauth-service"]
