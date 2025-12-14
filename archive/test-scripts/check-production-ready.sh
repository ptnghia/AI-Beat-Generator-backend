#!/bin/bash

# Production Readiness Checklist
# Chạy script này để kiểm tra hệ thống trước khi production

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🎵 PRODUCTION READINESS CHECKLIST - QUICK CHECK    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 1. Check .env file
echo -e "${BLUE}1. Kiểm tra .env file...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}   ❌ .env file không tồn tại${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ .env file tồn tại${NC}"

# 2. Check API keys
echo ""
echo -e "${BLUE}2. Kiểm tra API keys...${NC}"

SUNO_KEY=$(grep "SUNO_API_KEYS" .env | cut -d'=' -f2 | tr -d '"')
if [ -z "$SUNO_KEY" ]; then
    echo -e "${RED}   ❌ SUNO_API_KEYS chưa cấu hình${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ SUNO_API_KEYS: ${SUNO_KEY:0:10}...${NC}"

GEMINI_KEY=$(grep "GEMINI_API_KEY" .env | cut -d'=' -f2 | tr -d '"')
if [ -z "$GEMINI_KEY" ]; then
    echo -e "${YELLOW}   ⚠️  GEMINI_API_KEY chưa cấu hình (sẽ dùng template)${NC}"
else
    echo -e "${GREEN}   ✅ GEMINI_API_KEY: ${GEMINI_KEY:0:15}...${NC}"
fi

# 3. Check generation mode
echo ""
echo -e "${BLUE}3. Kiểm tra mode...${NC}"

USE_MOCK=$(grep "USE_MOCK_MUSIC" .env | cut -d'=' -f2 | tr -d '"')
if [ "$USE_MOCK" = "true" ]; then
    echo -e "${RED}   ❌ USE_MOCK_MUSIC=true (đang dùng mock!)${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ USE_MOCK_MUSIC=false (production mode)${NC}"

GENERATION=$(grep "GENERATION_SUNO" .env | cut -d'=' -f2 | cut -d'#' -f1 | tr -d ' ' | tr -d '"')
if [ "$GENERATION" = "false" ]; then
    echo -e "${YELLOW}   ⚠️  GENERATION_SUNO=false (chỉ tạo database record)${NC}"
else
    echo -e "${GREEN}   ✅ GENERATION_SUNO=true (sẽ call Suno API)${NC}"
fi

# 4. Check database
echo ""
echo -e "${BLUE}4. Kiểm tra database...${NC}"
DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
if [ -z "$DB_URL" ]; then
    echo -e "${RED}   ❌ DATABASE_URL chưa cấu hình${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ DATABASE_URL configured${NC}"

# 5. Check directories
echo ""
echo -e "${BLUE}5. Kiểm tra directories...${NC}"
for dir in "output/beats" "output/beats-wav" "output/covers" "logs"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}   ✅ Tạo $dir${NC}"
    else
        echo -e "${GREEN}   ✅ $dir exists${NC}"
    fi
done

# 6. Check build
echo ""
echo -e "${BLUE}6. Kiểm tra build...${NC}"
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}   ⚠️  dist/ chưa có, cần build${NC}"
    echo -e "${BLUE}   Building...${NC}"
    npm run build > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Build thành công${NC}"
    else
        echo -e "${RED}   ❌ Build failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}   ✅ dist/ exists${NC}"
fi

# 7. Check node_modules
echo ""
echo -e "${BLUE}7. Kiểm tra dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${RED}   ❌ node_modules chưa có${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ node_modules exists${NC}"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Quick check PASSED!${NC}"
echo ""
echo "Next step: Run full production test"
echo ""
echo "  npm run test:production"
echo ""
echo "hoặc"
echo ""
echo "  npx ts-node scripts/production-readiness-test.ts"
echo ""
