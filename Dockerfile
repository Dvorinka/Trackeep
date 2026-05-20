# Multi-stage build for unified Trackeep image
# Builds both frontend and backend in one package

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 3: Final unified image
FROM alpine:latest

# Install dependencies
RUN apk --no-cache add ca-certificates tzdata nginx

# Copy backend binary and migrations
COPY --from=backend-builder /app/backend/main /app/main
COPY --from=backend-builder /app/backend/migrations /app/migrations

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy branding assets
COPY trackeep.svg /usr/share/nginx/html/
COPY trackeepfavi.png /usr/share/nginx/html/
COPY trackeepfavi_bg.png /usr/share/nginx/html/

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Create directories
RUN mkdir -p /app/uploads /data /var/log/nginx

# Expose single port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start script to run both backend and nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
