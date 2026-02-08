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

# Start the services
echo "📦 Building and starting containers..."
docker compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker compose ps

# Test API health
echo "🏥 Testing API health..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Backend API is healthy!"
else
    echo "❌ Backend API is not responding"
fi

# Test frontend
echo "🌐 Testing frontend..."
if curl -s -I http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is accessible!"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Trackeep is now running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8080"
echo "📊 Health Check: http://localhost:8080/health"
echo ""
echo "👤 Demo Login Credentials:"
echo "   Email: demo@trackeep.com"
echo "   Password: password"
echo ""
echo "🛑 To stop: docker compose down"
