#!/bin/bash
set -e

# Dev entrypoint - Force override Dockerfile ENV vars with docker-compose environment vars
echo "=== Dev Entrypoint Debug Info ==="
echo "POSTGRES_USER from compose: $POSTGRES_USER"
echo "POSTGRES_PASSWORD from compose: $POSTGRES_PASSWORD" 
echo "POSTGRES_DB from compose: $POSTGRES_DB"
echo "PGUSER from Dockerfile: $PGUSER"
echo "PGPASSWORD from Dockerfile: $PGPASSWORD"
echo "PGDATABASE from Dockerfile: $PGDATABASE"
echo "================================="

# Force override the Dockerfile ENV with docker-compose values
unset PGUSER PGPASSWORD PGDATABASE PGHOST PGPORT
export PGUSER="$POSTGRES_USER"
export PGPASSWORD="$POSTGRES_PASSWORD"
export PGHOST="postgres"
export PGPORT="5432"
export PGDATABASE="$POSTGRES_DB"

echo "=== After Override ==="
echo "PGUSER: $PGUSER"
echo "PGHOST: $PGHOST"
echo "PGPORT: $PGPORT"
echo "PGDATABASE: $PGDATABASE"
echo "======================"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
echo "Connection details: host=$PGHOST port=$PGPORT user=$PGUSER db=$PGDATABASE"

until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"
do
  echo "PostgreSQL is unavailable - sleeping 2s"
  sleep 2
done

echo "PostgreSQL is up - executing database initialization"

# Check if this is the first run by looking for migration status
# Use persistent volume to track migrations across container restarts
MIGRATION_STATUS_FILE="/app/data/.migration_status"
MIGRATIONS_DIR="/app/migrations"

# Function to check if migration has been applied
is_migration_applied() {
    local migration_file=$1
    if [ -f "$MIGRATION_STATUS_FILE" ]; then
        grep -q "^${migration_file}:applied:" "$MIGRATION_STATUS_FILE"
    else
        return 1  # Not applied if status file doesn't exist
    fi
}

# Function to mark migration as applied
mark_migration_applied() {
    local migration_file=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Create status file if it doesn't exist
    if [ ! -f "$MIGRATION_STATUS_FILE" ]; then
        mkdir -p "$(dirname "$MIGRATION_STATUS_FILE")"
        echo "# Migration Status - Auto-generated" > "$MIGRATION_STATUS_FILE"
    fi

    # Update or add the migration status
    if grep -q "^${migration_file}:" "$MIGRATION_STATUS_FILE"; then
        sed -i "s/^${migration_file}:.*/${migration_file}:applied:${timestamp}/" "$MIGRATION_STATUS_FILE"
    else
        echo "${migration_file}:applied:${timestamp}" >> "$MIGRATION_STATUS_FILE"
    fi

    echo "Marked migration as applied: $migration_file"
}

# Run migrations only if they haven't been applied
echo "Checking for pending migrations..."

if [ -d "$MIGRATIONS_DIR" ]; then
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration_file" ]; then
            migration_name=$(basename "$migration_file")

            if ! is_migration_applied "$migration_name"; then
                echo "Applying migration: $migration_name"
                echo "Using database: $PGDATABASE"
                if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$migration_file"; then
                    mark_migration_applied "$migration_name"
                    echo "Migration applied successfully: $migration_name"
                else
                    echo "Migration failed: $migration_name"
                    echo "Database connection details:"
                    echo "  Host: $PGHOST"
                    echo "  Port: $PGPORT"
                    echo "  User: $PGUSER"
                    echo "  Database: $PGDATABASE"
                    exit 1
                fi
            else
                echo "Migration already applied: $migration_name"
            fi
        fi
    done
    echo "All migrations processed!"
else
    echo "No migrations directory found, skipping migrations"
fi

# Start the application
echo "Starting the application..."
exec "$@"
