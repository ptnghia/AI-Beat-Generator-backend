#!/bin/bash

# Check System Configuration
# Kiểm tra hệ thống đang chạy chế độ nào

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       🎵 BEAT GENERATOR - SYSTEM CHECK 🎵            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 1. API Key Configuration
echo -e "${BOLD}1. API KEY CONFIGURATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env
SUNO_KEY=$(grep "^SUNO_API_KEYS=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
if [ -n "$SUNO_KEY" ]; then
    KEY_COUNT=$(echo "$SUNO_KEY" | tr ',' '\n' | wc -l)
    echo -e "${GREEN}✅ .env API Key:${NC} ${SUNO_KEY:0:15}... (${KEY_COUNT} key(s))"
else
    echo -e "${RED}❌ .env API Key: NOT FOUND${NC}"
fi

# Check database
DB_KEY_COUNT=$(PGPASSWORD=BeatGen2024Secure psql -U beat_gen_user -d ai_beat_generator -t -c "SELECT COUNT(*) FROM api_keys WHERE status='active';" 2>/dev/null | tr -d ' ')

if [ -n "$DB_KEY_COUNT" ] && [ "$DB_KEY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Database API Keys:${NC} $DB_KEY_COUNT active key(s)"
    
    # Show key details
    echo ""
    PGPASSWORD=BeatGen2024Secure psql -U beat_gen_user -d ai_beat_generator -c "SELECT substring(key, 1, 15) || '...' as key, status, quota_remaining, last_used FROM api_keys ORDER BY created_at;" 2>/dev/null
else
    echo -e "${RED}❌ Database API Keys: NONE${NC}"
fi

echo ""

# 2. API Key Manager Strategy
echo -e "${BOLD}2. API KEY MANAGER STRATEGY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "Priority: Database → Environment" src/services/apikey-manager.service.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Strategy: Single key (Database → .env fallback)${NC}"
    echo "   - Cache TTL: 1 minute"
    echo "   - Simple selection (no round-robin)"
else
    echo -e "${YELLOW}⚠️  Strategy: Multi-key round-robin${NC}"
    echo "   - Needs update to single-key mode"
fi

echo ""

# 3. Beat Generation Mode
echo -e "${BOLD}3. BEAT GENERATION MODE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if scheduler is enabled in code
if grep -q "beatScheduler.start()" src/index.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Auto Mode: ENABLED in code${NC}"
    AUTO_ENABLED=true
else
    echo -e "${RED}❌ Auto Mode: DISABLED in code${NC}"
    echo "   (Scheduler not started in src/index.ts)"
    AUTO_ENABLED=false
fi

# Check scheduler config
INTERVAL=$(grep "^BEAT_GENERATION_INTERVAL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
if [ -n "$INTERVAL" ]; then
    echo -e "   Interval: ${BLUE}${INTERVAL}${NC}"
else
    echo -e "   Interval: ${YELLOW}*/15 * * * * (default)${NC}"
fi

# Check if process is running
if pgrep -f "node.*dist/index.js" > /dev/null; then
    echo -e "${GREEN}✅ Scheduler Process: RUNNING${NC}"
else
    echo -e "${YELLOW}⚠️  Scheduler Process: NOT RUNNING${NC}"
fi

echo ""

# Check API server
if pgrep -f "node.*dist/api/index.js" > /dev/null; then
    echo -e "${GREEN}✅ API Server: RUNNING (port 4000)${NC}"
else
    echo -e "${YELLOW}⚠️  API Server: NOT RUNNING${NC}"
fi

echo ""

# Check manual generation endpoint
if grep -q "POST.*generate.*beat" src/api/routes/*.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Manual API: Available${NC}"
else
    echo -e "${RED}❌ Manual API: NOT AVAILABLE${NC}"
    echo "   (No POST /api/beats/generate endpoint)"
fi

echo ""

# 4. Current Mode Summary
echo -e "${BOLD}4. CURRENT MODE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$AUTO_ENABLED" = true ]; then
    echo -e "${GREEN}📅 AUTOMATIC MODE${NC}"
    echo "   Beats are generated automatically by scheduler"
    echo ""
    echo "   How to run:"
    echo "   $ npm run dev"
else
    echo -e "${YELLOW}📞 WEBHOOK/CALLBACK ONLY${NC}"
    echo "   Beats created only via:"
    echo "   - POST /api/beats/:id/retry-generation"
    echo "   - Test scripts (npm run test:production)"
    echo ""
    echo "   ⚠️  No automatic generation!"
    echo "   ⚠️  No manual POST /generate endpoint!"
fi

echo ""

# 5. Database Status
echo -e "${BOLD}5. DATABASE STATUS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BEAT_COUNT=$(PGPASSWORD=BeatGen2024Secure psql -U beat_gen_user -d ai_beat_generator -t -c "SELECT COUNT(*) FROM beats;" 2>/dev/null | tr -d ' ')
TEMPLATE_COUNT=$(PGPASSWORD=BeatGen2024Secure psql -U beat_gen_user -d ai_beat_generator -t -c "SELECT COUNT(*) FROM beat_templates WHERE is_active=true;" 2>/dev/null | tr -d ' ')

if [ -n "$BEAT_COUNT" ]; then
    echo -e "${GREEN}✅ Beats:${NC} $BEAT_COUNT"
else
    echo -e "${RED}❌ Beats: Cannot connect to database${NC}"
fi

if [ -n "$TEMPLATE_COUNT" ]; then
    echo -e "${GREEN}✅ Templates:${NC} $TEMPLATE_COUNT active"
else
    echo -e "${RED}❌ Templates: Cannot connect to database${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Recommendations
echo -e "${BOLD}💡 RECOMMENDATIONS${NC}"
echo ""

if [ "$DB_KEY_COUNT" -eq 0 ] && [ -n "$SUNO_KEY" ]; then
    echo -e "${YELLOW}⚠️  Import .env key to database:${NC}"
    echo "   $ npx ts-node scripts/import-api-keys.ts"
    echo ""
fi

if [ "$AUTO_ENABLED" = false ]; then
    echo -e "${YELLOW}⚠️  Enable auto beat generation:${NC}"
    echo "   Add to src/index.ts after line 35:"
    echo "   "
    echo "   import { SchedulerService } from './services/scheduler.service';"
    echo "   import { OrchestratorService } from './services/orchestrator.service';"
    echo "   "
    echo "   const beatScheduler = new SchedulerService("
    echo "     getPrismaClient(),"
    echo "     new OrchestratorService(),"
    echo "     loggingService"
    echo "   );"
    echo "   beatScheduler.start();"
    echo ""
fi

if ! pgrep -f "node.*dist/api/index.js" > /dev/null; then
    echo -e "${YELLOW}⚠️  Start API server:${NC}"
    echo "   $ npm run start:api"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
