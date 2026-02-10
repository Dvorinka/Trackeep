# Docker Deployment for Trackkeep Landing Page

## Quick Start

### Option 1: Using the Deployment Script (Recommended)

```bash
# Deploy the landing page
./deploy.sh deploy

# Or use Docker Compose
./deploy.sh compose

# For production with SSL
./deploy.sh ssl
```

### Option 2: Manual Docker Commands

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the landing page
http://localhost:8080
```

## Available Commands

```bash
./deploy.sh help          # Show all available commands
./deploy.sh build         # Build Docker image only
./deploy.sh run           # Run container only
./deploy.sh deploy        # Build and run container
./deploy.sh compose       # Deploy with Docker Compose
./deploy.sh ssl           # Deploy with SSL (Traefik)
./deploy.sh logs          # Show container logs
./deploy.sh health        # Perform health check
./deploy.sh stop          # Stop container
./deploy.sh cleanup       # Clean up containers and images
```

## Features

- **Multi-stage Docker build** for optimized image size
- **Nginx** with gzip compression and security headers
- **Health checks** with `/health` endpoint
- **SSL support** with Traefik and Let's Encrypt
- **Easy deployment** with automated scripts
- **Production ready** with security best practices

## Configuration

- **Port**: 8080 (can be changed in docker-compose.yml)
- **Health endpoint**: `/health`
- **SSL**: Optional with Traefik profile
- **Domain**: Configurable for SSL certificates

## Monitoring

```bash
# Check container status
docker-compose ps

# View logs
./deploy.sh logs

# Health check
./deploy.sh health
```

The landing page is now fully dockerized and ready for production deployment!
