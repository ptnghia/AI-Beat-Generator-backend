#!/bin/bash

# Test new API fields
# This script verifies that the updated API endpoints return all new fields

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "🎵 Testing New Beat API Fields"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Get a sample beat
echo -e "${YELLOW}Fetching sample beat...${NC}"
BEAT_ID=$(curl -s "$BASE_URL/api/beats?limit=1" | jq -r '.data[0].id')

if [ -z "$BEAT_ID" ] || [ "$BEAT_ID" = "null" ]; then
    echo -e "${RED}❌ No beats found in database${NC}"
    echo "Please generate some beats first."
    exit 1
fi

echo -e "${GREEN}✅ Found beat: $BEAT_ID${NC}"
echo ""

# Test new fields in GET /api/beats/:id
echo -e "${YELLOW}Testing GET /api/beats/$BEAT_ID${NC}"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/beats/$BEAT_ID")

# Check for new audio metadata fields
echo "Audio Metadata Fields:"
echo "  • bpm:         $(echo "$RESPONSE" | jq -r '.bpm')"
echo "  • duration:    $(echo "$RESPONSE" | jq -r '.duration') seconds"
echo "  • musicalKey:  $(echo "$RESPONSE" | jq -r '.musicalKey')"
echo ""

# Check for Suno integration fields
echo "Suno Integration Fields:"
echo "  • modelName:      $(echo "$RESPONSE" | jq -r '.modelName')"
echo "  • sunoAudioUrl:   $(echo "$RESPONSE" | jq -r '.sunoAudioUrl // "null"' | cut -c1-50)..."
echo "  • sunoImageUrl:   $(echo "$RESPONSE" | jq -r '.sunoImageUrl // "null"' | cut -c1-50)..."
echo "  • sunoStreamUrl:  $(echo "$RESPONSE" | jq -r '.sunoStreamUrl // "null"' | cut -c1-50)..."
echo "  • sunoTaskId:     $(echo "$RESPONSE" | jq -r '.sunoTaskId')"
echo "  • sunoAudioId:    $(echo "$RESPONSE" | jq -r '.sunoAudioId')"
echo ""

# Check for alternate track fields
echo "Alternate Track Fields:"
echo "  • alternateFileUrl:      $(echo "$RESPONSE" | jq -r '.alternateFileUrl // "null"')"
echo "  • alternateDuration:     $(echo "$RESPONSE" | jq -r '.alternateDuration') seconds"
echo "  • alternateModelName:    $(echo "$RESPONSE" | jq -r '.alternateModelName')"
echo "  • alternateSunoAudioUrl: $(echo "$RESPONSE" | jq -r '.alternateSunoAudioUrl // "null"' | cut -c1-50)..."
echo ""

# Check for WAV conversion fields
echo "WAV Conversion Fields:"
echo "  • wavUrl:              $(echo "$RESPONSE" | jq -r '.wavUrl // "null"')"
echo "  • wavConversionStatus: $(echo "$RESPONSE" | jq -r '.wavConversionStatus')"
echo "  • wavTaskId:           $(echo "$RESPONSE" | jq -r '.wavTaskId // "null"')"
echo ""

# Check for status fields
echo "Status Fields:"
echo "  • generationStatus: $(echo "$RESPONSE" | jq -r '.generationStatus')"
echo "  • filesUploaded:    $(echo "$RESPONSE" | jq -r '.filesUploaded')"
echo ""

# Test new fields in GET /api/beats (list)
echo -e "${YELLOW}Testing GET /api/beats (list endpoint)${NC}"
echo ""

LIST_RESPONSE=$(curl -s "$BASE_URL/api/beats?limit=1")
FIRST_BEAT=$(echo "$LIST_RESPONSE" | jq -r '.data[0]')

echo "First beat from list contains:"
echo "  • bpm:               $(echo "$FIRST_BEAT" | jq -r '.bpm')"
echo "  • duration:          $(echo "$FIRST_BEAT" | jq -r '.duration') seconds"
echo "  • modelName:         $(echo "$FIRST_BEAT" | jq -r '.modelName')"
echo "  • generationStatus:  $(echo "$FIRST_BEAT" | jq -r '.generationStatus')"
echo ""

# Count total fields returned
TOTAL_FIELDS=$(echo "$RESPONSE" | jq 'keys | length')
echo -e "${GREEN}✅ Total fields in response: $TOTAL_FIELDS${NC}"
echo ""

# List all available fields
echo "All available fields:"
echo "$RESPONSE" | jq -r 'keys | .[]' | while read field; do
    echo "  • $field"
done
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ API field verification complete${NC}"
echo -e "${GREEN}=========================================${NC}"
