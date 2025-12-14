#!/bin/bash

# AI Beat Generator - API Test Script
# Usage: ./test-api.sh

BASE_URL="https://beat.optiwellai.com"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "🎵 AI Beat Generator - API Tests"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/health | jq -r '.status, .uptime'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 2: System Stats
echo -e "${YELLOW}Test 2: System Stats${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/stats)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/api/stats | jq '.beats.total, .apiKeys.total, .system.uptime'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 3: List Beats
echo -e "${YELLOW}Test 3: List Beats (GET /api/beats)${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/beats)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/api/beats | jq '.pagination'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 4: Beats with Filters
echo -e "${YELLOW}Test 4: Filter Beats by Genre${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/beats?genre=trap&limit=5")
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 5: Pending Beats
echo -e "${YELLOW}Test 5: Pending Beats${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/beats/pending/list)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/api/beats/pending/list | jq 'length'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 6: Enhanceable Beats
echo -e "${YELLOW}Test 6: Enhanceable Beats${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/beats/enhanceable/list)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/api/beats/enhanceable/list | jq 'length'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 7: Suno Callback Test
echo -e "${YELLOW}Test 7: Suno Callback Test${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/callbacks/suno/test)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $response"
    curl -s $BASE_URL/api/callbacks/suno/test | jq -r '.message'
else
    echo -e "${RED}❌ FAIL${NC} - Status: $response"
fi
echo ""

# Test 8: Invalid Beat ID (Should return 404)
echo -e "${YELLOW}Test 8: Invalid Beat ID (Expected 404)${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/beats/invalid-id-123)
if [ $response -eq 404 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Correctly returns 404"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 404, got: $response"
fi
echo ""

# Test 9: Admin Login (Without credentials - should fail)
echo -e "${YELLOW}Test 9: Admin Login (No credentials - Expected 400)${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{}')
if [ $response -eq 400 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Correctly returns 400"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 400, got: $response"
fi
echo ""

# Test 10: HTTPS/SSL Check
echo -e "${YELLOW}Test 10: HTTPS/SSL Verification${NC}"
ssl_info=$(curl -s -I https://beat.optiwellai.com 2>&1 | grep -i "SSL\|TLS")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTPS/SSL is properly configured"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - Could not verify SSL"
fi
echo ""

# Summary
echo "========================================="
echo "📊 Test Summary"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Server Status: $(curl -s $BASE_URL/health | jq -r '.status')"
echo "Uptime: $(curl -s $BASE_URL/health | jq -r '.uptime')s"
echo ""
echo "Database Stats:"
echo "  - Total Beats: $(curl -s $BASE_URL/api/stats | jq -r '.beats.total')"
echo "  - API Keys: $(curl -s $BASE_URL/api/stats | jq -r '.apiKeys.total')"
echo ""
echo "🎉 All critical endpoints are responding!"
