#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Collect static files into STATIC_ROOT
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate