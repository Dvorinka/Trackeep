# Trackeep Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying Trackeep to production.

## Prerequisites

### System Requirements
- Docker 24.0+ and Docker Compose 2.20+
- PostgreSQL 15+
- DragonflyDB (Redis-compatible cache)
- 2GB+ RAM minimum (4GB+ recommended)
- 20GB+ disk space

### Required Environment Variables
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=trackeep
DB_PASSWORD=<strong-password>
DB_NAME=trackeep
DB_SSL_MODE=disable

# DragonflyDB (Cache)
DRAGONFLY_ADDR=dragonfly:6379
DRAGONFLY_PASSWORD=<strong-password>
DRAGONFLY_PORT=6379

# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>

# Server
BACKEND_PORT=8080
FRONTEND_PORT=80
GIN_MODE=release

# Optional: AI Features
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>

# Optional: Search
BRAVE_API_KEY=<your-key>

# Optional: GitHub Integration
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
```

## Deployment Steps

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/Dvorinka/Trackeep.git
cd Trackeep

# Copy environment template
cp .env.example .env

# Edit .env with your production values
nano .env
```

### 2. Generate Security Keys

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Add these to your .env file
```

### 3. Build and Deploy with Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Database Initialization

The database will auto-migrate on first startup. To verify:

```bash
# Check database connection
docker-compose -f docker-compose.prod.yml exec trackeep-backend /app/trackeep health

# View migration logs
docker-compose -f docker-compose.prod.yml logs trackeep-backend | grep migration
```

### 5. Create Admin User

```bash
# Access backend container
docker-compose -f docker-compose.prod.yml exec trackeep-backend sh

# Use the API to create first user (will be admin by default)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "SecurePassword123!",
    "fullName": "Admin User"
  }'
```

## Production Configuration

### Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 80;
    server_name trackeep.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name trackeep.example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/trackeep.crt;
    ssl_certificate_key /etc/ssl/private/trackeep.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy to frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size
    client_max_body_size 100M;
}
```

### Database Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-trackeep.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/trackeep"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /path/to/docker-compose.prod.yml exec -T postgres \
  pg_dump -U trackeep trackeep | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /path/to/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-trackeep.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-trackeep.sh" | crontab -
```

### Monitoring Setup

```bash
# Install monitoring tools
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# Access Grafana
# http://localhost:3000 (default: admin/admin)

# Access Prometheus
# http://localhost:9090
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET and ENCRYPTION_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (allow only 80, 443)
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable audit logging
- [ ] Set up monitoring and alerts
- [ ] Review and restrict API access
- [ ] Enable 2FA for admin accounts

## Performance Optimization

### Database Connection Pooling

```go
// Already configured in backend/config/database.go
sqlDB, _ := DB.DB()
sqlDB.SetMaxOpenConns(25)
sqlDB.SetMaxIdleConns(10)
sqlDB.SetConnMaxLifetime(time.Hour)
sqlDB.SetConnMaxIdleTime(10 * time.Minute)
```

### DragonflyDB Configuration

```yaml
# docker-compose.prod.yml
dragonfly:
  command: >
    dragonfly
    --requirepass=${DRAGONFLY_PASSWORD}
    --proactor_threads=4
    --maxmemory=2gb
    --maxmemory-policy=allkeys-lru
```

### Frontend Optimization

```bash
# Build optimized frontend
cd frontend
npm run build

# Verify build size
du -sh dist/
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs trackeep-backend

# Common issues:
# 1. Database connection failed - check DB_HOST, DB_PASSWORD
# 2. Port already in use - change BACKEND_PORT
# 3. Missing environment variables - check .env file
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U trackeep -d trackeep -c "SELECT version();"

# Reset database (WARNING: deletes all data)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Adjust memory limits in docker-compose.prod.yml
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check for migrations
docker-compose -f docker-compose.prod.yml logs trackeep-backend | grep migration
```

### Database Maintenance

```bash
# Vacuum database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U trackeep -d trackeep -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U trackeep -d trackeep -c "SELECT pg_size_pretty(pg_database_size('trackeep'));"
```

### Log Rotation

```bash
# Configure Docker log rotation
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  trackeep-backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### Load Balancer Configuration

```nginx
upstream trackeep_backend {
    least_conn;
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    location /api/ {
        proxy_pass http://trackeep_backend;
    }
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/Dvorinka/Trackeep/issues
- Documentation: https://github.com/Dvorinka/Trackeep/wiki

## License

See LICENSE file for details.
