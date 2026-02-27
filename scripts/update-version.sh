#!/bin/bash

# Simple version update script
# Updates version numbers in package.json and go.mod

set -e

VERSION=${1:-}
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.6"
    exit 1
fi

echo "🏷️ Updating versions to $VERSION"

# Update frontend package.json
if [ -f "frontend/package.json" ]; then
    echo "📝 Updating frontend/package.json..."
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" frontend/package.json
    echo "✅ Frontend updated to $VERSION"
fi

# Update backend go.mod  
if [ -f "backend/go.mod" ]; then
    echo "📝 Updating backend/go.mod..."
    sed -i "s/go [^\"]*\"/go $VERSION/" backend/go.mod
    echo "✅ Backend updated to $VERSION"
fi

# Update docker-compose files
echo "📝 Updating docker-compose files..."
if [ -f "docker-compose.yml" ]; then
    sed -i "s/APP_VERSION=.*/APP_VERSION=$VERSION/" docker-compose.yml
    echo "✅ docker-compose.yml updated"
fi

if [ -f "docker-compose.prod.yml" ]; then
    sed -i "s/APP_VERSION=.*/APP_VERSION=$VERSION/" docker-compose.prod.yml
    echo "✅ docker-compose.prod.yml updated"
fi

echo ""
echo "🎉 Version updates complete!"
echo "💡 Now commit and push to trigger release:" 
echo "   git add ."
echo "   git commit -m 'chore: bump version to $VERSION'"
echo "   git tag v$VERSION"
echo "   git push origin main && git push origin v$VERSION"
