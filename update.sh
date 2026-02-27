#!/bin/bash

# Trackeep Docker Update Script
# Pulls latest pre-built images and restarts services
# Much faster than building from source!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Trackeep Docker Update Script${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found. Please run this script from the Trackeep root directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Pulling latest Trackeep images from GitHub Container Registry...${NC}"
echo ""

# Pull images with better error handling
if docker compose pull; then
    echo -e "${GREEN}✅ Images pulled successfully!${NC}"
else
    echo -e "${RED}❌ Failed to pull images. Check your internet connection and Docker registry access.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Restarting Trackeep services...${NC}"

# Restart services
if docker compose up -d; then
    echo -e "${GREEN}✅ Services restarted successfully!${NC}"
else
    echo -e "${RED}❌ Failed to restart services. Check the logs with 'docker compose logs'.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"

# Wait for services to be healthy (with timeout)
for i in {1..30}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend health check timed out, but services are starting...${NC}"
    fi
    sleep 1
done

echo ""
echo -e "${YELLOW}🧹 Cleaning up old unused images...${NC}"

# Clean up old images
docker image prune -f > /dev/null 2>&1

echo ""
echo -e "${GREEN}🎉 Trackeep update completed successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Access your Trackeep instance:${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:8080${NC}"
echo -e "${GREEN}❤️  Health Check: http://localhost:8080/health${NC}"
echo ""
echo -e "${BLUE}💡 Pro tip: Use 'docker compose logs' to see service logs if needed${NC}"
echo -e "${BLUE}📖 More info: https://github.com/Dvorinka/Trackeep${NC}"
