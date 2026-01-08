#!/bin/bash

# Zen Pipeline AI - Deployment Script
# This script handles the deployment of the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/pradeep1a/zen_pipeline"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

echo -e "${GREEN}=== Zen Pipeline AI Deployment ===${NC}"
echo "Started at: $(date)"

# Navigate to project directory
cd "$PROJECT_DIR" || { echo -e "${RED}Failed to navigate to project directory${NC}"; exit 1; }

# Pull latest code
echo -e "${YELLOW}Pulling latest code from repository...${NC}"
git pull origin master

# Stop existing containers gracefully
echo -e "${YELLOW}Stopping existing containers...${NC}"
sudo docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans || true

# Remove old images to save space (optional)
echo -e "${YELLOW}Cleaning up old images...${NC}"
sudo docker image prune -f || true

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
sudo docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 20

# Check container status
echo -e "${YELLOW}Checking container status...${NC}"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep zen-pipeline

# Health checks
echo -e "${YELLOW}Running health checks...${NC}"

# Backend health check
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6500/api/v1/ 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" != "000" ]; then
    echo -e "${GREEN}Backend is responding (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "${RED}Backend health check failed${NC}"
fi

# Frontend health check
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6501/ 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" != "000" ]; then
    echo -e "${GREEN}Frontend is responding (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}Frontend health check failed${NC}"
fi

# Database health check
DB_HEALTHY=$(sudo docker inspect --format='{{.State.Health.Status}}' zen-pipeline-db-prod 2>/dev/null || echo "unknown")
echo -e "Database status: ${GREEN}$DB_HEALTHY${NC}"

# Redis health check
REDIS_HEALTHY=$(sudo docker inspect --format='{{.State.Health.Status}}' zen-pipeline-redis-prod 2>/dev/null || echo "unknown")
echo -e "Redis status: ${GREEN}$REDIS_HEALTHY${NC}"

echo ""
echo -e "${GREEN}=== Deployment Completed ===${NC}"
echo "Finished at: $(date)"
echo ""
echo "Application URLs:"
echo "  Frontend: http://149.102.158.71:6501"
echo "  Backend:  http://149.102.158.71:6500/api/v1"
echo ""
