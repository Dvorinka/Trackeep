#!/bin/sh

# Unified entrypoint for Trackeep
# Starts both backend and nginx in one container

set -e

# Backend configuration
export BACKEND_PORT=8081
export DB_HOST=${DB_HOST:-postgres}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-trackeep}
export DB_USER=${DB_USER:-trackeep}
export DB_PASSWORD=${DB_PASSWORD}
export JWT_SECRET=${JWT_SECRET}
export GIN_MODE=${GIN_MODE:-release}

# Start backend in background
cd /app
echo "Starting Trackeep backend on port ${BACKEND_PORT}..."
./main &

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if wget --no-verbose --tries=1 --spider http://localhost:8081/health 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Start nginx
echo "Starting nginx..."
nginx -g "daemon off;"
