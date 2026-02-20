#!/bin/bash
set -e

# Helper function to ensure DB is ready before Django tries to touch it
wait_for_db() {
    echo "Waiting for MySQL database to be ready..."
    while ! python manage.py dbshell -c "select 1;" > /dev/null 2>&1; do
        sleep 2
    done
    echo "Database is ready!"
}

# Function to handle local development
run_dev() {
    echo "Starting Development Server..."
    wait_for_db
    
    echo "Applying migrations..."
    python manage.py migrate --noinput
    
    # Integrate our seeding logic purely for local dev
    if [ "$AUTO_SEED_DB" = "True" ]; then
        echo "Running automatic database seeding..."
        python manage.py seed_db
    fi

    exec python manage.py runserver 0.0.0.0:8000
}

# Function to handle the 'web' mode (Django)
run_web() {
    echo "Starting Web Server..."
    wait_for_db
    
    # Optional: Run migrations on startup (Convenient for simple apps, 
    # but for HA production, run this as a separate 'init container' or job)
    echo "Applying migrations..."
    python manage.py migrate --noinput
    
    echo "Collecting static files..."
    python manage.py collectstatic --noinput

    # Start Gunicorn (Production)
    # Adjust 'backend.wsgi' to match your actual folder name/structure
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --timeout 120
}

# Function to handle the 'worker' mode (Celery)
run_worker() {
    echo "Starting Celery Worker..."
    
    # Adjust 'backend' to your project name
    exec celery -A config worker \
        --loglevel=info \
        --concurrency=2
}

# Traffic Control Logic
case "$1" in
    "dev")
        run_dev
        ;;
    "web")
        run_web
        ;;
    "worker_risk")
        run_worker
        ;;
    *)
        # Fallback: If the user passes a different command (e.g. bash), run it
        exec "$@"
        ;;
esac