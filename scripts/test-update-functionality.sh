#!/bin/bash

# Test script to demonstrate the Docker-based Update Settings functionality
# This script shows how the update system works with Docker pulls

echo "🧪 Testing Trackeep Docker-Based Update Functionality"
echo "====================================================="

# Check if backend is running
echo "1. Checking backend health..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
    exit 1
fi

# Test the update check endpoint (now works without OAuth!)
echo "2. Testing Docker-based update check endpoint..."
response=$(curl -s http://localhost:8080/api/updates/check)
echo "Response: $response"

if echo "$response" | grep -q "updateAvailable.*true"; then
    echo "✅ Update check working - updates available"
    echo "   System now uses Docker registry instead of OAuth"
elif echo "$response" | grep -q "updateAvailable.*false"; then
    echo "✅ Update check working - no updates needed"
else
    echo "⚠️  Unexpected response from update check"
fi

# Test update progress endpoint
echo "3. Testing update progress endpoint..."
progress_response=$(curl -s http://localhost:8080/api/updates/progress)
echo "Progress response: $progress_response"

# Extract version info
current_version=$(echo "$response" | grep -o '"currentVersion":"[^"]*"' | cut -d'"' -f4)
latest_version=$(echo "$response" | grep -o '"latestVersion":"[^"]*"' | cut -d'"' -f4)
update_available=$(echo "$response" | grep -o '"updateAvailable":[^,]*' | cut -d':' -f2)

echo ""
echo "📊 Update Status:"
echo "================"
echo "Current Version: $current_version"
echo "Latest Version:  $latest_version"
echo "Update Available: $update_available"

# Test manual update script
echo "4. Testing manual Docker update script..."
if [ -f "./scripts/auto-update.sh" ]; then
    echo "✅ Docker auto-update script exists"
    echo "   Location: ./scripts/auto-update.sh"
    echo "   To test manually: ./scripts/auto-update.sh"
else
    echo "❌ Auto-update script not found"
fi

# Check production docker-compose
echo "5. Checking production Docker Compose..."
if [ -f "./docker-compose.prod.yml" ]; then
    echo "✅ Production docker-compose exists"
    echo "   Uses pre-built images from GitHub Container Registry:"
    grep -A 1 "image:" ./docker-compose.prod.yml | head -2
else
    echo "❌ Production docker-compose not found"
fi

# Check if specific images are available locally
echo "6. Checking if Docker images are available..."
if command -v docker > /dev/null 2>&1; then
    echo "✅ Docker is available on host system"
    
    # Check if images exist
    if docker images | grep -q "ghcr.io/dvorinka/trackeep/backend"; then
        echo "✅ Backend image exists locally"
    else
        echo "⚠️  Backend image not found locally (will be pulled on update)"
    fi
    
    if docker images | grep -q "ghcr.io/dvorinka/trackeep/frontend"; then
        echo "✅ Frontend image exists locally"
    else
        echo "⚠️  Frontend image not found locally (will be pulled on update)"
    fi
else
    echo "⚠️  Docker not available on host system (update simulation in container)"
fi

echo ""
echo "🔄 How the Docker-Based Update System Works:"
echo "=========================================="
echo "The Update Settings in the frontend (Settings page, bottom section) now uses Docker:"
echo ""
echo "1. **Check for Updates Button**:"
echo "   - Calls GET /api/updates/check"
echo "   - No longer requires OAuth authentication!"
echo "   - Checks Docker registry for new image versions"
echo "   - Shows current vs latest version"
echo ""
echo "2. **Install Update Button**:"
echo "   - Appears when updates are available"
echo "   - Calls POST /api/updates/install"
echo "   - Uses docker compose to pull and restart services"
echo "   - Automatic health checks after update"
echo ""
echo "3. **Docker Images Used**:"
echo "   - Backend: ghcr.io/dvorinka/trackeep/backend:main-aef1e39"
echo "   - Frontend: ghcr.io/dvorinka/trackeep/frontend:main-aef1e39"
echo ""
echo "4. **Auto-Update Settings**:"
echo "   - UI still exists (localStorage)"
echo "   - For true auto-updates, use the Docker scripts"
echo ""
echo "� To Test the Full Update Flow:"
echo "1. Go to Settings > Update Settings (bottom of left nav)"
echo "2. Click 'Check Now' - should work without login"
echo "3. If update available, click 'Install Update'"
echo "4. System will pull new images and restart services"
echo ""
echo "� For Automated Daily Updates:"
echo "1. Use: sudo ./scripts/setup-auto-update.sh"
echo "2. Or: sudo ./scripts/setup-systemd-update.sh"
echo "3. These pull your specific tagged images daily"
echo ""
echo "✨ Key Improvements:"
echo "- ❌ No OAuth authentication required"
echo "- ✅ Uses Docker pulls (safer, atomic updates)"
echo "- ✅ Works with your specific image tags"
echo "- ✅ Faster and more reliable than file-based updates"
echo "- ✅ Better rollback capabilities"
