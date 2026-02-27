#!/bin/bash

# Trackeep Docker Update Script
# Pulls latest images and restarts services

set -e

echo "🔄 Pulling latest Trackeep images..."
docker compose pull

echo "🚀 Restarting services..."
docker compose up -d

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Update complete!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8080"
