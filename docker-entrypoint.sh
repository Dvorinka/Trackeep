#!/bin/sh

# All-in-one entrypoint for Trackeep
# Initializes and starts PostgreSQL, then backend + nginx

set -e

PGDATA=${PGDATA:-/var/lib/postgresql/data}

# Auto-generate DB_PASSWORD if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 32)
    echo "========================================"
    echo "WARNING: DB_PASSWORD was not set."
    echo "Auto-generated password: $DB_PASSWORD"
    echo "Set DB_PASSWORD explicitly to keep it stable across restarts."
    echo "========================================"
fi

DB_USER=${DB_USER:-trackeep}
DB_NAME=${DB_NAME:-trackeep}

# Initialize PostgreSQL if data directory is empty
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database cluster..."
    su -s /bin/sh postgres -c "initdb -D $PGDATA --auth-local=trust --auth-host=md5"

    # Allow local TCP connections
    echo "host all all 127.0.0.1/32 md5" >> "$PGDATA/pg_hba.conf"
    echo "host all all ::1/128 md5"     >> "$PGDATA/pg_hba.conf"

    # Start postgres temporarily to create user and database
    su -s /bin/sh postgres -c "pg_ctl -D $PGDATA -l /var/log/postgresql/server.log start"

    # Wait until postgres accepts connections
    echo "Waiting for PostgreSQL to accept connections..."
    for i in $(seq 1 30); do
        if su -s /bin/sh postgres -c "pg_isready -q"; then
            break
        fi
        sleep 1
    done

    # Create role and database
    su -s /bin/sh postgres -c "psql -c \"CREATE USER \\\"$DB_USER\\\" WITH PASSWORD '$DB_PASSWORD';\""
    su -s /bin/sh postgres -c "psql -c \"CREATE DATABASE \\\"$DB_NAME\\\" OWNER \\\"$DB_USER\\\";\""

    su -s /bin/sh postgres -c "pg_ctl -D $PGDATA stop"
    echo "PostgreSQL initialized."
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
su -s /bin/sh postgres -c "pg_ctl -D $PGDATA -l /var/log/postgresql/server.log start"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if su -s /bin/sh postgres -c "pg_isready -q"; then
        echo "PostgreSQL is ready."
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 1
done

# Backend connects to the bundled local PostgreSQL
export BACKEND_PORT=8081
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME="$DB_NAME"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"
export DB_SSL_MODE=disable
export JWT_SECRET=${JWT_SECRET:-}
export GIN_MODE=${GIN_MODE:-release}
export CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-*}

# Start backend in background
cd /app
echo "Starting Trackeep backend on port ${BACKEND_PORT}..."
./main &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if wget --no-verbose --tries=1 --spider http://localhost:8081/health 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Start nginx in foreground (keeps container alive)
echo "Starting nginx on port 8080..."
nginx -g "daemon off;"
