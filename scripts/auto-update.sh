#!/bin/bash

# Trackeep Auto-Update Script
# Automatically pulls specific tagged images and restarts services
# Designed for daily automated execution via cron

set -e

# Configuration
BACKEND_IMAGE="ghcr.io/dvorinka/trackeep/backend:main-aef1e39"
FRONTEND_IMAGE="ghcr.io/dvorinka/trackeep/frontend:main-aef1e39"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/var/log/trackeep-auto-update.log"
BACKUP_DIR="./backups/auto-update-$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Aborting update."
        exit 1
    fi
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "$COMPOSE_FILE not found. Please run this script from the Trackeep root directory."
        exit 1
    fi
}

# Create backup before update
create_backup() {
    print_status "Creating backup before update..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup docker-compose files
    cp docker-compose*.yml "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup environment file
    cp .env "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup database if postgres is running
    if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        print_status "Backing up database..."
        docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-trackeep}" "${POSTGRES_DB:-trackeep}" > "$BACKUP_DIR/database.sql" 2>/dev/null || print_warning "Database backup failed"
    fi
    
    print_success "Backup created at $BACKUP_DIR"
}

# Check for new images
check_for_updates() {
    print_status "Checking for new images..."
    
    # Get current image IDs
    CURRENT_BACKEND_ID=$(docker images -q "$BACKEND_IMAGE" 2>/dev/null || echo "")
    CURRENT_FRONTEND_ID=$(docker images -q "$FRONTEND_IMAGE" 2>/dev/null || echo "")
    
    # Pull images
    print_status "Pulling backend image: $BACKEND_IMAGE"
    if docker pull "$BACKEND_IMAGE"; then
        NEW_BACKEND_ID=$(docker images -q "$BACKEND_IMAGE")
        if [ "$CURRENT_BACKEND_ID" != "$NEW_BACKEND_ID" ] && [ -n "$CURRENT_BACKEND_ID" ]; then
            print_status "New backend image available"
            BACKEND_UPDATE=true
        else
            print_status "Backend image is up to date"
            BACKEND_UPDATE=false
        fi
    else
        print_error "Failed to pull backend image"
        return 1
    fi
    
    print_status "Pulling frontend image: $FRONTEND_IMAGE"
    if docker pull "$FRONTEND_IMAGE"; then
        NEW_FRONTEND_ID=$(docker images -q "$FRONTEND_IMAGE")
        if [ "$CURRENT_FRONTEND_ID" != "$NEW_FRONTEND_ID" ] && [ -n "$CURRENT_FRONTEND_ID" ]; then
            print_status "New frontend image available"
            FRONTEND_UPDATE=true
        else
            print_status "Frontend image is up to date"
            FRONTEND_UPDATE=false
        fi
    else
        print_error "Failed to pull frontend image"
        return 1
    fi
    
    # Return true if any updates are available
    if [ "$BACKEND_UPDATE" = true ] || [ "$FRONTEND_UPDATE" = true ]; then
        return 0
    else
        print_success "All images are up to date"
        return 1
    fi
}

# Update services
update_services() {
    print_status "Updating services..."
    
    # Restart services with new images
    if docker compose -f "$COMPOSE_FILE" up -d --force-recreate; then
        print_success "Services updated successfully"
    else
        print_error "Failed to update services"
        return 1
    fi
}

# Wait for services to be healthy
wait_for_health() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for backend health
    for i in {1..60}; do
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            print_success "Backend is healthy!"
            break
        fi
        if [ $i -eq 60 ]; then
            print_warning "Backend health check timed out"
        fi
        sleep 2
    done
    
    # Wait for frontend health
    for i in {1..30}; do
        if curl -f http://localhost:80/ > /dev/null 2>&1 || curl -f http://localhost:443/ > /dev/null 2>&1; then
            print_success "Frontend is healthy!"
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "Frontend health check timed out"
        fi
        sleep 2
    done
}

# Cleanup old images
cleanup_images() {
    print_status "Cleaning up old unused images..."
    docker image prune -f > /dev/null 2>&1 || print_warning "Image cleanup failed"
}

# Main execution
main() {
    print_status "Starting Trackeep auto-update..."
    
    # Pre-flight checks
    check_docker
    check_directory
    
    # Check for updates
    if check_for_updates; then
        # Updates available, proceed with update
        create_backup
        update_services
        wait_for_health
        cleanup_images
        
        print_success "Trackeep auto-update completed successfully!"
        print_status "Services are running with latest images"
        print_status "Backup saved at: $BACKUP_DIR"
    else
        # No updates available
        print_success "No updates needed - all images are current"
    fi
    
    print_status "Auto-update process completed"
}

# Run main function
main "$@"
