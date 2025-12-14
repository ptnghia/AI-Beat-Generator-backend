#!/bin/bash
# AI Beat Generator - Deployment Script
# Project ID: 40 | Port: 4000

set -e

PROJECT_DIR="/home/lifetechadmin/opt/AI-Beat-Generator-backend"
LOG_DIR="$PROJECT_DIR/logs"
ENV_FILE="$PROJECT_DIR/.env.production"

echo "🎵 AI Beat Generator - Deployment Script"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create necessary directories
echo -e "${YELLOW}Creating necessary directories...${NC}"
mkdir -p "$LOG_DIR"
mkdir -p "$PROJECT_DIR/output/beats"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production with required configuration"
    exit 1
fi

# Check database connection
echo -e "${YELLOW}Checking database connection...${NC}"
cd "$PROJECT_DIR"

# Run Prisma migration
echo -e "${YELLOW}Running Prisma migrations...${NC}"
npm run prisma:generate
npm run prisma:migrate

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Check if build was successful
if [ ! -d "$PROJECT_DIR/dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Start with PM2
echo -e "${YELLOW}Starting services with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services running:"
echo "  - API Server: http://localhost:4000"
echo "  - Health Check: http://localhost:4000/health"
echo ""
echo "Useful commands:"
echo "  pm2 status                    # Check status"
echo "  pm2 logs ai-beat-generator-api # View API logs"
echo "  pm2 logs ai-beat-generator-scheduler # View scheduler logs"
echo "  pm2 restart all               # Restart all services"
echo "  pm2 stop all                  # Stop all services"
echo ""
