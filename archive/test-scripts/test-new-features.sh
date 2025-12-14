#!/bin/bash

# API Testing Script for New Features
# Test all new endpoints for multi-version beat support

BASE_URL="https://beat.optiwellai.com"
API_URL="${BASE_URL}/api"

echo "🧪 Testing New Beat Generation Features"
echo "========================================"
echo ""

# Test 1: Generate Single Beat (Metadata Only)
echo "1️⃣ Test: Generate Beat (Metadata Only Mode)"
echo "   POST /api/generate/beat"
curl -X POST "${API_URL}/generate/beat" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "metadata_only"
  }' | jq .
echo ""
echo "---"
echo ""

# Save beat ID for subsequent tests
BEAT_ID=$(curl -s -X POST "${API_URL}/generate/beat" \
  -H "Content-Type: application/json" \
  -d '{"mode": "metadata_only"}' | jq -r '.beat.id')

echo "Generated Beat ID: ${BEAT_ID}"
echo ""

# Test 2: Generate Audio for Existing Beat
echo "2️⃣ Test: Generate Audio for Metadata-Only Beat"
echo "   POST /api/beats/${BEAT_ID}/generate-audio"
curl -X POST "${API_URL}/beats/${BEAT_ID}/generate-audio" \
  -H "Content-Type: application/json" | jq .
echo ""
echo "---"
echo ""

# Test 3: Create New Version
echo "3️⃣ Test: Create New Version"
echo "   POST /api/beats/${BEAT_ID}/versions"
curl -X POST "${API_URL}/beats/${BEAT_ID}/versions" \
  -H "Content-Type: application/json" \
  -d '{
    "setPrimary": false
  }' | jq .
echo ""
echo "---"
echo ""

# Test 4: Download Files (Lazy Download)
echo "4️⃣ Test: Download Files from Suno URLs"
echo "   POST /api/beats/${BEAT_ID}/download"
curl -X POST "${API_URL}/beats/${BEAT_ID}/download" \
  -H "Content-Type: application/json" | jq .
echo ""
echo "---"
echo ""

# Test 5: Batch Generation
echo "5️⃣ Test: Batch Beat Generation"
echo "   POST /api/generate/beats"
curl -X POST "${API_URL}/generate/beats" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full",
    "count": 3
  }' | jq .
echo ""
echo "---"
echo ""

# Test 6: Get Beat with Versions
echo "6️⃣ Test: Get Beat with All Versions"
echo "   GET /api/beats/${BEAT_ID}"
curl -X GET "${API_URL}/beats/${BEAT_ID}" | jq .
echo ""
echo "---"
echo ""

echo "✅ Testing Complete!"
echo ""
echo "📋 Summary:"
echo "   - Generated beat ID: ${BEAT_ID}"
echo "   - Tested 6 endpoints"
echo "   - Check responses above for success"
echo ""
echo "🔍 Next Steps:"
echo "   1. Verify beat in database: SELECT * FROM beats WHERE id = ${BEAT_ID};"
echo "   2. Check versions: SELECT * FROM beat_versions WHERE beat_id = ${BEAT_ID};"
echo "   3. Verify files downloaded: ls output/beats/"
echo ""
