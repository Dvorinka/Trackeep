# Trackkeep Landing Page - Docker Deployment

This document explains how to deploy the Trackkeep landing page using Docker.

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The landing page will be available at `http://localhost:8080`

### 2. Build and Run with Docker

```bash
# Build the image
docker build -t trackeep-landing .

# Run the container
docker run -d -p 8080:80 --name trackeep-landing trackeep-landing

# View logs
docker logs trackeep-landing

# Stop the container
docker stop trackeep-landing
```

## Production Deployment with SSL

### Using Docker Compose with Traefik

```bash
# Start with SSL termination (Traefik)
docker-compose --profile ssl up -d

# Access Traefik dashboard
http://localhost:8081
```

### Environment Variables

Create a `.env` file for production:

```env
NODE_ENV=production
DOMAIN=trackeep.org
EMAIL=admin@trackeep.org
```

## Configuration

### Dockerfile

- **Multi-stage build**: Optimized for production with minimal image size
- **Nginx**: Serves static files with gzip compression and security headers
- **Health check**: Built-in health endpoint at `/health`

### Nginx Configuration

- **Port**: 80 (can be mapped to any port)
- **Compression**: Gzip enabled for static assets
- **Caching**: 1-year cache for static assets
- **Security**: Headers for XSS protection, content type options, etc.
- **Health endpoint**: `/health` for health checks

### Docker Compose

- **Service**: `trackeep-landing` on port 8080
- **Health check**: Every 30 seconds with curl
- **Restart policy**: `unless-stopped`
- **SSL**: Optional Traefik configuration for HTTPS

## Deployment Options

### 1. Simple Deployment

```bash
docker-compose up -d
```

### 2. Production with SSL

```bash
# Create letsencrypt directory
mkdir -p letsencrypt

# Start with SSL
docker-compose --profile ssl up -d
```

### 3. Custom Domain

Update the `docker-compose.yml` file with your domain:

```yaml
labels:
  - "traefik.http.routers.trackeep-landing.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.trackeep-landing.tls.certresolver=letsencrypt"
  - "traefik.http.routers.trackeep-landing.tls.certresolver.acme.email=your-email@domain.com"
```

## Monitoring

### Health Check

```bash
# Check health
curl http://localhost:8080/health

# Expected response: "healthy"
```

### Logs

```bash
# View application logs
docker-compose logs trackeep-landing

# View nginx logs
docker-compose exec trackeep-landing tail -f /var/log/nginx/access.log
docker-compose exec trackeep-landing tail -f /var/log/nginx/error.log
```

## Performance

### Image Size

- **Base image**: nginx:alpine (~20MB)
- **Final image**: ~50MB (including built assets)

### Build Time

- **Initial build**: ~2-3 minutes
- **Rebuild**: ~30 seconds (with Docker layer caching)

### Runtime Performance

- **Memory usage**: ~10-20MB
- **CPU usage**: Minimal (static file serving)
- **Response time**: <100ms for cached assets

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change the port mapping in docker-compose.yml
2. **Build failures**: Check Node.js version compatibility
3. **SSL issues**: Verify domain configuration and DNS records

### Debug Commands

```bash
# Check container status
docker-compose ps

# Inspect container
docker-compose exec trackeep-landing sh

# Test nginx configuration
docker-compose exec trackeep-landing nginx -t

# Reload nginx
docker-compose exec trackeep-landing nginx -s reload
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Landing Page
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -t trackeep-landing .
          docker push ${{ secrets.REGISTRY_URL }}/trackeep-landing
      - name: Deploy to production
        run: |
          docker-compose pull
          docker-compose up -d
```

## Security Considerations

- **Non-root user**: Nginx runs as non-root user
- **Minimal attack surface**: Only necessary packages installed
- **Security headers**: XSS protection, content type options, etc.
- **SSL/TLS**: Optional HTTPS with Let's Encrypt
- **Rate limiting**: Can be added via Nginx configuration

## Backup and Recovery

### Backup

```bash
# Export container
docker export trackeep-landing > trackeep-landing-backup.tar

# Backup nginx logs
docker cp trackeep-landing:/var/log/nginx ./logs-backup
```

### Recovery

```bash
# Import container
docker import trackeep-landing-backup.tar trackeep-landing:backup

# Restore with new container
docker run -d -p 8080:80 --name trackeep-landing-restored trackeep-landing:backup
```
