#!/bin/bash
# Helper script to run docker-compose with production environment file

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.prod"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"

# Check if .env.prod exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env.prod file not found at $ENV_FILE"
    echo "Please create the .env.prod file with your production configuration."
    exit 1
fi

# Export environment variables from .env.prod
# This handles values with spaces and special characters properly
set -a
source "$ENV_FILE"
set +a

# Run docker-compose with the production file
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"

