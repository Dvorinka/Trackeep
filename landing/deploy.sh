#!/bin/bash

# Trackkeep Landing Page - Docker Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="trackeep-landing"
CONTAINER_NAME="trackeep-landing-container"
PORT="8080"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_info "Docker and Docker Compose are installed"
}

# Build the Docker image
build_image() {
    log_info "Building Docker image..."
    docker build -t $IMAGE_NAME .
    log_info "Docker image built successfully"
}

# Run the container
run_container() {
    log_info "Starting container..."
    
    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        log_warn "Container $CONTAINER_NAME already exists. Stopping and removing..."
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
    fi
    
    # Run new container
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:80 \
        --restart unless-stopped \
        $IMAGE_NAME
    
    log_info "Container started successfully"
    log_info "Landing page is available at: http://localhost:$PORT"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for container to start
    sleep 5
    
    # Check if container is running
    if ! docker ps --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        log_error "Container is not running"
        exit 1
    fi
    
    # Check health endpoint
    if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
        log_info "Health check passed"
    else
        log_warn "Health check failed, but container is running"
    fi
}

# Show logs
show_logs() {
    log_info "Showing container logs (press Ctrl+C to exit)..."
    docker logs -f $CONTAINER_NAME
}

# Stop container
stop_container() {
    log_info "Stopping container..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    log_info "Container stopped and removed"
}

# Clean up
cleanup() {
    log_info "Cleaning up..."
    
    # Stop and remove container
    stop_container
    
    # Remove image
    if docker images --format 'table {{.Repository}}' | grep -q "^$IMAGE_NAME$"; then
        docker rmi $IMAGE_NAME 2>/dev/null || true
        log_info "Docker image removed"
    fi
    
    log_info "Cleanup completed"
}

# Deploy with Docker Compose
deploy_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Stop existing services
    docker-compose down 2>/dev/null || true
    
    # Build and start services
    docker-compose up -d --build
    
    log_info "Deployment completed"
    log_info "Landing page is available at: http://localhost:8080"
}

# Deploy with SSL (Traefik)
deploy_ssl() {
    log_info "Deploying with SSL (Traefik)..."
    
    # Create letsencrypt directory if it doesn't exist
    mkdir -p letsencrypt
    
    # Stop existing services
    docker-compose --profile ssl down 2>/dev/null || true
    
    # Build and start services with SSL profile
    docker-compose --profile ssl up -d --build
    
    log_info "SSL deployment completed"
    log_info "Landing page is available at: https://trackeep.org"
    log_info "Traefik dashboard: http://localhost:8081"
}

# Show help
show_help() {
    echo "Trackkeep Landing Page - Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build           Build Docker image"
    echo "  run             Run container"
    echo "  deploy          Build and run container"
    echo "  compose         Deploy with Docker Compose"
    echo "  ssl             Deploy with SSL (Traefik)"
    echo "  logs            Show container logs"
    echo "  health          Perform health check"
    echo "  stop            Stop container"
    echo "  cleanup         Stop container and remove image"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy       # Build and run container"
    echo "  $0 compose      # Deploy with Docker Compose"
    echo "  $0 ssl          # Deploy with SSL"
    echo "  $0 logs         # Show logs"
    echo "  $0 cleanup      # Clean up everything"
}

# Main script
main() {
    case "${1:-help}" in
        "build")
            check_docker
            build_image
            ;;
        "run")
            check_docker
            run_container
            ;;
        "deploy")
            check_docker
            build_image
            run_container
            health_check
            ;;
        "compose")
            check_docker
            deploy_compose
            ;;
        "ssl")
            check_docker
            deploy_ssl
            ;;
        "logs")
            show_logs
            ;;
        "health")
            health_check
            ;;
        "stop")
            stop_container
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
