#!/bin/bash

# Backup script for Trackeep PostgreSQL database
# This script is designed to run as a cron job

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-trackeep}"
DB_USER="${POSTGRES_USER:-trackeep}"
DB_HOST="${POSTGRES_HOST:-postgres}"
BACKUP_DIR="${BACKUP_PATH:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/trackeep_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$BACKUP_DIR/backup.log"
}

log "Starting database backup"

# Create the backup
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    log "Backup created successfully: $BACKUP_FILE"
    
    # Compress the backup
    if gzip "$BACKUP_FILE"; then
        BACKUP_FILE="$BACKUP_FILE.gz"
        log "Backup compressed successfully: $BACKUP_FILE"
    else
        log "Warning: Failed to compress backup file"
    fi
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    
else
    log "ERROR: Failed to create database backup"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "trackeep_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "trackeep_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "trackeep_backup_*.sql*" -type f | wc -l)
log "Cleanup complete. $BACKUP_COUNT backups retained"

log "Backup process completed successfully"
