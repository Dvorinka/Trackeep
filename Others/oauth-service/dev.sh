#!/bin/bash

# Trackeep Main Controller Development Script
# This script starts both the backend API server and frontend dev server

echo "🚀 Starting Trackeep Main Controller Development Environment..."

# Check if we're in the right directory
if [ ! -f "main.go" ]; then
    echo "❌ Error: Please run this script from the oauth-service directory"
    exit 1
fi

# Start backend server in background
echo "🔧 Starting backend API server on port 9090..."
go run main.go &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend dev server
echo "🎨 Starting frontend dev server on port 5174..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Trackeep Main Controller is running!"
echo ""
echo "📊 Dashboard:     http://localhost:5174/dashboard"
echo "📚 Courses:       http://localhost:5174/dashboard/courses"
echo "🖥️  Instances:     http://localhost:5174/dashboard/instances"
echo "🔧 API:           http://localhost:9090/api/v1"
echo "💚 Health Check:  http://localhost:9090/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All servers stopped"
    exit 0
}

# Set up trap to kill processes on Ctrl+C
trap cleanup INT

# Wait for both processes
wait
