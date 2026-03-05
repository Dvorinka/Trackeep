#!/bin/bash

# Trackeep Startup Script
# This script starts the Trackeep application using Docker Compose

echo "🚀 Starting Trackeep..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker compose is available
if ! command -v docker compose &> /dev/null; then
    echo "❌ docker compose is not available. Please install Docker Compose."
    exit 1
fi

# Check if demo mode is enabled
DEMO_MODE=${VITE_DEMO_MODE:-false}
if [ "$DEMO_MODE" = "true" ]; then
    echo "🎭 Demo mode enabled - starting without databases"
    COMPOSE_FILE="-f docker-compose.demo.yml"
else
    echo "🗄️ Normal mode enabled - starting with databases"
    COMPOSE_FILE="-f docker-compose.yml"
fi

# Start the services
echo "📦 Building and starting containers..."
docker compose $COMPOSE_FILE up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker compose $COMPOSE_FILE ps

# Test API health
echo "🏥 Testing API health..."
if curl -s http://localhost:${BACKEND_PORT:-8080}/health > /dev/null; then
    echo "✅ Backend API is healthy!"
else
    echo "❌ Backend API is not responding"
fi

# Test frontend
echo "🌐 Testing frontend..."
if curl -s -I http://localhost:${FRONTEND_PORT:-3000} > /dev/null; then
    echo "✅ Frontend is accessible!"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Trackeep is now running!"
echo "📱 Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "🔧 Backend API: http://localhost:${BACKEND_PORT:-8080}"
echo "📊 Health Check: http://localhost:${BACKEND_PORT:-8080}/health"
if [ "$DEMO_MODE" = "true" ]; then
    echo "🎭 Mode: Demo (no databases)"
else
    echo "🗄️ Mode: Full (with databases)"
fi
echo ""
echo "👤 Demo Login Credentials:"
echo "   Email: demo@trackeep.com"
echo "   Password: password"
echo ""
echo "🛑 To stop: docker compose $COMPOSE_FILE down"
