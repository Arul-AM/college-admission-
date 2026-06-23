#!/bin/bash

echo "============================================"
echo " College Admission Management System Setup"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/4] Setting up Backend...${NC}"
cd backend
cp .env.example .env
npm install
echo ""

echo -e "${BLUE}[2/4] Running database migrations...${NC}"
npm run db:migrate
echo ""

echo -e "${BLUE}[3/4] Seeding database with initial data...${NC}"
npm run db:seed
echo ""

echo -e "${BLUE}[4/4] Setting up Frontend...${NC}"
cd ../frontend
cp .env.example .env
npm install
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} ✅ Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}To start the application:${NC}"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && npm start"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo -e "${YELLOW}Default login:${NC} admin / Admin@123"
echo "============================================"
