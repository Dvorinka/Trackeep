# Quick Start: Production Deployment

This guide will get Trackeep running in production in under 10 minutes.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker 24.0+ and Docker Compose 2.20+
- 4GB RAM minimum
- 20GB disk space
- Domain name (optional, for SSL)

## Step 1: Install Docker (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

## Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/Dvorinka/Trackeep.git
cd Trackeep

# Copy environment template
cp .env.example .env

# Generate secure keys
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "DB_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "DRAGONFLY_PASSWORD=$(openssl rand -base64 24)" >> .env

# Edit .env if needed
nano .env
```

## Step 3: Run Production Test

```bash
# Make test script executable
chmod +x test-production.sh

# Run tests
./test-production.sh
```

## Step 4: Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 5: Verify Deployment

```bash
# Check health
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","timestamp":"..."}

# Check frontend
curl http://localhost:80

# Should return HTML
```

## Step 6: Create Admin User

```bash
# Register first user (will be admin)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "YourSecurePassword123!",
    "fullName": "Admin User"
  }'
```

## Step 7: Access Application

Open your browser and navigate to:
- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:8080

Login with the credentials you just created.

## Optional: Configure SSL/TLS

### Using Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create configuration
sudo nano /etc/nginx/sites-available/trackeep
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
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
    }
    
    client_max_body_size 100M;
}
```

Enable and configure SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/trackeep /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Reload Nginx
sudo systemctl reload nginx
```

## Optional: Configure Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-trackeep.sh
```

Paste this script:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/trackeep"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /path/to/Trackeep/docker-compose.prod.yml exec -T postgres \
  pg_dump -U trackeep trackeep | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /path/to/Trackeep/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-trackeep.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-trackeep.sh") | crontab -
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check specific service
docker-compose -f docker-compose.prod.yml logs trackeep-backend

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Database connection failed

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify credentials in .env
cat .env | grep DB_
```

### Port already in use

```bash
# Check what's using the port
sudo lsof -i :8080
sudo lsof -i :80

# Change ports in .env
nano .env
# Update BACKEND_PORT and FRONTEND_PORT

# Restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### High memory usage

```bash
# Check container stats
docker stats

# Adjust memory limits in docker-compose.prod.yml
nano docker-compose.prod.yml

# Restart with new limits
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Backup database manually
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U trackeep trackeep > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U trackeep trackeep < backup_20260406.sql

# Clean up old images
docker system prune -a
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT_SECRET and ENCRYPTION_KEY
- [ ] Configured firewall (allow only 80, 443, 22)
- [ ] Enabled HTTPS with valid SSL certificate
- [ ] Set up automated backups
- [ ] Configured monitoring
- [ ] Reviewed CORS settings
- [ ] Enabled 2FA for admin account
- [ ] Set up log rotation
- [ ] Configured rate limiting

## Performance Tuning

### Database Optimization

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U trackeep trackeep

# Run VACUUM
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('trackeep'));

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Cache Optimization

```bash
# Check DragonflyDB stats
docker-compose -f docker-compose.prod.yml exec dragonfly redis-cli -a $DRAGONFLY_PASSWORD INFO

# Clear cache if needed
docker-compose -f docker-compose.prod.yml exec dragonfly redis-cli -a $DRAGONFLY_PASSWORD FLUSHALL
```

## Monitoring

### Check Service Health

```bash
# Backend health
curl http://localhost:8080/health

# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

### View Metrics

```bash
# Backend metrics (if enabled)
curl http://localhost:8080/metrics

# Database connections
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U trackeep trackeep -c "SELECT count(*) FROM pg_stat_activity;"
```

## Next Steps

1. **Configure AI Services** (optional)
   - Navigate to Settings → AI Services in the app
   - Add your API keys for desired AI providers

2. **Set Up Email** (optional)
   - Configure SMTP settings in .env
   - Test email functionality

3. **Customize Branding** (optional)
   - Update logo and colors
   - Modify frontend/src/assets/

4. **Enable Features** (optional)
   - GitHub integration
   - Browser extension
   - Mobile app

## Support

- **Documentation**: See PRODUCTION_DEPLOYMENT.md for detailed guide
- **Issues**: https://github.com/Dvorinka/Trackeep/issues
- **Email**: info@tdvorak.dev

## Quick Reference

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart trackeep-backend

# Check health
curl http://localhost:8080/health

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U trackeep trackeep > backup.sql

# Update application
git pull && docker-compose -f docker-compose.prod.yml build && \
docker-compose -f docker-compose.prod.yml up -d
```

---

**Congratulations!** 🎉 Trackeep is now running in production.

For detailed documentation, see:
- PRODUCTION_DEPLOYMENT.md - Complete deployment guide
- PRODUCTION_READY_SUMMARY.md - Production readiness summary
- CHANGELOG.md - Version history and changes
