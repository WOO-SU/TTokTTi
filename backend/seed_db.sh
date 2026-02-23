#!/bin/bash
# backend/entrypoint.sh

set -e

echo "Waiting for MySQL database to be ready..."
# The compose healthcheck handles the container state, but this ensures Django can actually connect
while ! python manage.py dbshell -c "select 1;" > /dev/null 2>&1; do
    sleep 2
done
echo "Database is ready!"

echo "Applying database migrations..."
python manage.py migrate --noinput

if [ "$AUTO_SEED_DB" = "True" ]; then
    echo "Running automatic database seeding..."
    python manage.py seed_db
fi

# Execute the main command (e.g., python manage.py runserver)
exec "$@"