#!/bin/bash

# Trackeep Release Script
# Builds and pushes Docker images with version tags

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from argument or prompt
VERSION=${1:-}
if [ -z "$VERSION" ]; then
    echo -e "${YELLOW}Usage: $0 <version>${NC}"
    echo -e "${YELLOW}Example: $0 1.2.0${NC}"
    exit 1
fi

# Validate version format (semantic versioning)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Version must be in format MAJOR.MINOR.PATCH (e.g., 1.2.0)${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Releasing Trackeep version $VERSION${NC}"
echo ""

# Configuration
REGISTRY="ghcr.io/dvorinka/trackeep"
BACKEND_CONTEXT="./backend"
FRONTEND_CONTEXT="."
BACKEND_DOCKERFILE="./backend/Dockerfile"
FRONTEND_DOCKERFILE="./frontend/Dockerfile"

# Update version in .env for next development
echo -e "${BLUE}📝 Updating version in .env...${NC}"
if [ -f ".env" ]; then
    # Update existing APP_VERSION
    if grep -q "APP_VERSION=" .env; then
        sed -i "s/APP_VERSION=.*/APP_VERSION=$VERSION/" .env
    else
        echo "APP_VERSION=$VERSION" >> .env
    fi
    echo -e "${GREEN}✅ Updated .env with APP_VERSION=$VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found, creating it...${NC}"
    echo "APP_VERSION=$VERSION" > .env
fi

# Build backend image
echo -e "${BLUE}🐳 Building backend image...${NC}"
docker build -t ${REGISTRY}/backend:${VERSION} -t ${REGISTRY}/backend:latest \
    -f ${BACKEND_DOCKERFILE} ${BACKEND_CONTEXT}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend image built successfully${NC}"
else
    echo -e "${RED}❌ Backend image build failed${NC}"
    exit 1
fi

# Build frontend image
echo -e "${BLUE}🐳 Building frontend image...${NC}"
docker build -t ${REGISTRY}/frontend:${VERSION} -t ${REGISTRY}/frontend:latest \
    -f ${FRONTEND_DOCKERFILE} ${FRONTEND_CONTEXT}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image built successfully${NC}"
else
    echo -e "${RED}❌ Frontend image build failed${NC}"
    exit 1
fi

# Check if user is logged in to GitHub Container Registry
echo -e "${BLUE}🔐 Checking GitHub Container Registry authentication...${NC}"
if ! docker info 2>/dev/null | grep -q "Username.*dvorinka"; then
    echo -e "${YELLOW}⚠️  Warning: You may need to login to GitHub Container Registry${NC}"
    echo -e "${YELLOW}Run: docker login ghcr.io -u dvorinka${NC}"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Release cancelled${NC}"
        exit 1
    fi
fi

# Push backend images
echo -e "${BLUE}📤 Pushing backend images...${NC}"
docker push ${REGISTRY}/backend:${VERSION}
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend ${VERSION} pushed${NC}"
else
    echo -e "${RED}❌ Failed to push backend ${VERSION}${NC}"
    exit 1
fi

docker push ${REGISTRY}/backend:latest
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend latest pushed${NC}"
else
    echo -e "${RED}❌ Failed to push backend latest${NC}"
    exit 1
fi

# Push frontend images
echo -e "${BLUE}📤 Pushing frontend images...${NC}"
docker push ${REGISTRY}/frontend:${VERSION}
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend ${VERSION} pushed${NC}"
else
    echo -e "${RED}❌ Failed to push frontend ${VERSION}${NC}"
    exit 1
fi

docker push ${REGISTRY}/frontend:latest
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend latest pushed${NC}"
else
    echo -e "${RED}❌ Failed to push frontend latest${NC}"
    exit 1
fi

# Create and push Git tag
echo -e "${BLUE}🏷️ Creating Git tag...${NC}"
git tag -a v${VERSION} -m "Release version ${VERSION}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git tag v${VERSION} created${NC}"
else
    echo -e "${RED}❌ Failed to create Git tag${NC}"
    exit 1
fi

echo -e "${BLUE}📤 Pushing Git tag...${NC}"
git push origin v${VERSION}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git tag v${VERSION} pushed${NC}"
else
    echo -e "${RED}❌ Failed to push Git tag${NC}"
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Release $VERSION completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  • Backend: ${REGISTRY}/backend:${VERSION} and ${REGISTRY}/backend:latest"
echo -e "  • Frontend: ${REGISTRY}/frontend:${VERSION} and ${REGISTRY}/frontend:latest"
echo -e "  • Git tag: v${VERSION}"
echo ""
echo -e "${BLUE}🚀 Users will now see this update available!${NC}"
echo -e "${YELLOW}💡 Tip: Deploy with: docker compose -f docker-compose.prod.yml up -d${NC}"
