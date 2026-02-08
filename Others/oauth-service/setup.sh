#!/bin/bash

# GitHub OAuth Service Setup Script

echo "🚀 Setting up GitHub OAuth Service..."

# Create directory if it doesn't exist
mkdir -p oauth-service
cd oauth-service

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go first."
    exit 1
fi

# Initialize Go module
echo "📦 Initializing Go module..."
go mod init github-oauth-service

# Install dependencies
echo "📥 Installing dependencies..."
go get github.com/gin-gonic/gin
go get github.com/golang-jwt/jwt/v5
go get github.com/joho/godotenv
go get golang.org/x/oauth2

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your GitHub OAuth credentials"
fi

# Make the service executable
chmod +x main.go

echo "✅ GitHub OAuth Service setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit oauth-service/.env with your GitHub OAuth credentials"
echo "2. Run: cd oauth-service && go run main.go"
echo "3. Service will start on port 9090"
echo ""
echo "🔗 OAuth endpoints:"
echo "- Initiate: http://localhost:9090/auth/github"
echo "- Callback: http://localhost:9090/auth/github/callback"
echo "- Health: http://localhost:9090/health"
