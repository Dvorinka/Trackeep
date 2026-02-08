# Trackeep Deployment Guide

## Flexible Deployment Options

Trackeep is designed to work in various deployment scenarios:

### 1. Local Development (localhost)
```bash
# Start with default settings
docker compose up -d

# Frontend will be available via nginx on port 80
# Backend API on port 8080
# Frontend automatically detects API URL: http://localhost:8080/api/v1
```

### 2. Home Network Deployment
```bash
# Set your HOST environment variable
export HOST=192.168.1.100:8080

# Or modify .env
echo "HOST=192.168.1.100:8080" >> .env

docker compose up -d

# Access from any device on your network
# Frontend: http://192.168.1.100
# API: http://192.168.1.100:8080/api/v1
```

### 3. Domain with Cloudflare/Reverse Proxy
```bash
# Set HOST to your domain
export HOST=yourdomain.com

# Configure CORS for your domain
export CORS_ALLOWED_ORIGINS=https://yourdomain.com

docker compose up -d

# Configure Cloudflare to proxy:
# - yourdomain.com → backend:8080
# - app.yourdomain.com → frontend:80
```

### 4. Production HTTPS
```bash
# Set production mode
export GIN_MODE=release
export HOST=yourdomain.com
export CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Use SSL certificates (via Traefik, Nginx, etc.)
docker compose up -d
```

## Environment Variables

### Core Configuration
- `PORT=8080` - Backend port only
- `GIN_MODE=debug|release` - Application mode
- `HOST=` - Auto-detection fallback (optional)
- `CORS_ALLOWED_ORIGINS=*` - Flexible CORS (restrict in production)

### Removed Variables
- ❌ `FRONTEND_PORT` - No longer needed
- ❌ `OAUTH_PORT` - Moved to oauth-service/.env
- ❌ `VITE_API_URL` - Auto-detected via /api/v1/config

### OAuth Service (Separate)
See `oauth-service/.env.example` for OAuth-specific configuration.

## API Detection

The frontend automatically detects the API URL by:
1. Calling `/api/v1/config` endpoint
2. Using the current request's scheme and host
3. Falling back to `HOST` environment variable
4. Final fallback to `localhost:8080`

## Port Management

- **Backend**: Fixed port 8080 (required for API)
- **Frontend**: No port mapping (uses nginx:80 internally)
- **OAuth**: Separate service on port 9090
- **Database**: Port 5432 (internal to Docker network)

This flexibility allows Trackeep to adapt to any deployment scenario while maintaining a consistent configuration approach.
