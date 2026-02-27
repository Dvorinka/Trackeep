# Trackeep Auto-Update System

This system provides automated daily updates for Trackeep using Docker pulls from GitHub Container Registry.

## Overview

The auto-update system pulls specific tagged images daily:
- `ghcr.io/dvorinka/trackeep/backend:main-aef1e39`
- `ghcr.io/dvorinka/trackeep/frontend:main-aef1e39`

## Files Created

### 1. Production Docker Compose
- **File**: `docker-compose.prod.yml`
- **Purpose**: Uses pre-built images instead of local builds
- **Images**: Uses the specific tagged versions you specified

### 2. Auto-Update Script
- **File**: `scripts/auto-update.sh`
- **Purpose**: Main script that performs the update process
- **Features**:
  - Checks for new images
  - Creates automatic backups
  - Updates services safely
  - Health checks after update
  - Comprehensive logging

### 3. Cron Setup Script
- **File**: `scripts/setup-auto-update.sh`
- **Purpose**: Sets up daily cron job at 2 AM
- **Schedule**: Daily at 2:00 AM
- **Alternative**: Can be run manually

### 4. SystemD Service Setup
- **File**: `scripts/setup-systemd-update.sh`
- **Purpose**: Alternative to cron using systemd timers
- **Schedule**: Daily with randomized delay (up to 1 hour)
- **Benefits**: More reliable than cron, better logging

## Quick Start

### Option 1: Cron Setup (Recommended for simplicity)
```bash
# Setup daily auto-update at 2 AM
sudo ./scripts/setup-auto-update.sh

# Check status
./scripts/setup-auto-update.sh status

# Test manually
./scripts/setup-auto-update.sh test

# Remove later if needed
sudo ./scripts/setup-auto-update.sh remove
```

### Option 2: SystemD Setup (More robust)
```bash
# Install systemd service
sudo ./scripts/setup-systemd-update.sh

# Check status
./scripts/setup-systemd-update.sh status

# Test manually
sudo ./scripts/setup-systemd-update.sh test

# Remove later if needed
sudo ./scripts/setup-systemd-update.sh remove
```

### Option 3: Manual Execution
```bash
# Run auto-update manually
./scripts/auto-update.sh

# View logs
tail -f /var/log/trackeep-auto-update.log
```

## Configuration

### Image Tags
The system is configured to pull these specific images:
- Backend: `ghcr.io/dvorinka/trackeep/backend:main-aef1e39`
- Frontend: `ghcr.io/dvorinka/trackeep/frontend:main-aef1e39`

To update to different tags, edit these files:
1. `docker-compose.prod.yml` - Update image tags
2. `scripts/auto-update.sh` - Update BACKEND_IMAGE and FRONTEND_IMAGE variables

### Schedule Options

**Cron Schedule** (setup-auto-update.sh):
- Default: Daily at 2:00 AM
- Location: User's crontab
- Edit with: `crontab -e`

**SystemD Schedule** (setup-systemd-update.sh):
- Default: Daily with randomized delay
- Location: systemd timer
- More reliable than cron
- Better logging integration

## Features

### Safety Features
- ✅ Pre-update backups (database, config files)
- ✅ Health checks after update
- ✅ Rollback capability from backups
- ✅ Comprehensive logging
- ✅ Error handling and recovery

### Update Process
1. Check Docker daemon status
2. Pull latest images (compare with current)
3. Create backup if updates available
4. Stop and recreate services
5. Wait for health checks
6. Clean up old images
7. Log all actions

### Backup Strategy
- Automatic backup before each update
- Database dump (PostgreSQL)
- Configuration files (.env, docker-compose files)
- Timestamped backup directories
- Location: `./backups/auto-update-YYYYMMDD_HHMMSS/`

## Monitoring

### Logs
- **Location**: `/var/log/trackeep-auto-update.log`
- **View**: `tail -f /var/log/trackeep-auto-update.log`
- **SystemD**: `journalctl -u trackeep-auto-update.service -f`

### Status Commands
```bash
# Cron status
crontab -l | grep trackeep

# SystemD status
systemctl status trackeep-auto-update.timer
systemctl list-timers trackeep-auto-update.timer

# Manual check
./scripts/auto-update.sh
```

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```
   ❌ Docker is not running. Aborting update.
   ```
   **Solution**: Start Docker daemon

2. **Permission denied**
   ```
   ❌ Permission denied
   ```
   **Solution**: Use sudo for setup scripts

3. **Image pull failed**
   ```
   ❌ Failed to pull backend image
   ```
   **Solution**: Check internet connection and registry access

4. **Service not healthy**
   ```
   ⚠️ Backend health check timed out
   ```
   **Solution**: Check service logs with `docker compose logs`

### Manual Recovery
```bash
# Check what's running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs

# Manual restart
docker compose -f docker-compose.prod.yml restart

# Restore from backup
./backups/auto-update-YYYYMMDD_HHMMSS/
```

## Customization

### Change Update Frequency
**Cron**: Edit crontab entry
```bash
crontab -e
# Change "0 2 * * *" to desired schedule
# Examples:
# "0 */6 * * *"  - Every 6 hours
# "0 2 * * 1"    - Weekly on Monday
# "0 2 1 * *"    - Monthly on 1st
```

**SystemD**: Edit timer file
```bash
sudo systemctl edit trackeep-auto-update.timer
# Change OnCalendar=daily to desired schedule
```

### Change Images
1. Edit `docker-compose.prod.yml`
2. Edit `scripts/auto-update.sh` (BACKEND_IMAGE, FRONTEND_IMAGE)
3. Restart services: `docker compose -f docker-compose.prod.yml up -d`

### Add Notifications
Edit `scripts/auto-update.sh` to add email/webhook notifications in the success/failure sections.

## Security Considerations

- ✅ Images pulled from trusted GitHub Container Registry
- ✅ Specific tags prevent unexpected updates
- ✅ Backups created before changes
- ✅ Health checks prevent broken deployments
- ⚠️ Ensure proper file permissions on backup directory
- ⚠️ Monitor log file size (add log rotation if needed)

## Comparison with Original Update System

| Feature | Original File-Based | New Docker-Based |
|---------|-------------------|------------------|
| Update Method | Download & extract files | Docker pull & recreate |
| Safety | Moderate | High (atomic updates) |
| Rollback | Manual | Automatic from backup |
| Speed | Slower (file operations) | Faster (Docker layers) |
| Reliability | Lower (file permissions) | Higher (container isolation) |
| Logging | Basic | Comprehensive |
| Scheduling | Not implemented | Cron/SystemD available |

## Migration from Original System

If you were using the original file-based update system:

1. **Backup current setup**:
   ```bash
   cp docker-compose.yml docker-compose.backup.yml
   ```

2. **Switch to production compose**:
   ```bash
   docker compose down
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **Setup auto-update**:
   ```bash
   sudo ./scripts/setup-auto-update.sh
   ```

4. **Test manually**:
   ```bash
   ./scripts/auto-update.sh
   ```

5. **Monitor first automatic update**:
   ```bash
   tail -f /var/log/trackeep-auto-update.log
   ```

## Support

For issues or questions:
1. Check logs: `/var/log/trackeep-auto-update.log`
2. Run manual test: `./scripts/auto-update.sh`
3. Check service status: `docker compose -f docker-compose.prod.yml ps`
4. Review this README for troubleshooting steps
