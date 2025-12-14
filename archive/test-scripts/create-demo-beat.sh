#!/bin/bash

# Create Demo Beat for Testing
# This script demonstrates how to create a test beat

BASE_URL="https://beat.optiwellai.com"

echo "========================================="
echo "🎵 Create Demo Beat"
echo "========================================="
echo ""

# Step 1: Get available templates
echo "Step 1: Fetching available beat templates..."
TEMPLATES=$(curl -s "$BASE_URL/api/stats" | jq -r '.beats.total')
echo "Available templates: Check database"
echo ""

# Step 2: Get first template ID
echo "Step 2: Getting template ID from database..."
TEMPLATE_ID=$(PGPASSWORD=BeatGen2024Secure psql -h localhost -U beat_gen_user -d ai_beat_generator -t -c "SELECT id FROM beat_templates LIMIT 1;" | xargs)
echo "Template ID: $TEMPLATE_ID"
echo ""

# Step 3: Show what a beat creation would require
echo "Step 3: Beat creation requirements"
echo "----------------------------------------"
echo "To create a beat via API, you would need:"
echo ""
echo "1. API Key configured in database:"
echo "   INSERT INTO api_keys (id, key_name, api_key, provider, status)"
echo "   VALUES ('key-1', 'Demo Key', 'demo-key-123', 'suno', 'active');"
echo ""
echo "2. Template ID (from database): $TEMPLATE_ID"
echo ""
echo "3. POST request example:"
cat << 'EOF'
   curl -X POST https://beat.optiwellai.com/api/beats \
     -H "Content-Type: application/json" \
     -d '{
       "templateId": "lofi-chill-study-beat",
       "customizations": {
         "mood": "relaxing",
         "tempo": "slow"
       }
     }'
EOF
echo ""
echo ""

# Step 4: Show current database state
echo "Step 4: Current Database State"
echo "----------------------------------------"
echo ""
echo "Beat Templates:"
PGPASSWORD=BeatGen2024Secure psql -h localhost -U beat_gen_user -d ai_beat_generator -c \
  "SELECT COUNT(*) as total, string_agg(DISTINCT genre, ', ') as genres FROM beat_templates;"
echo ""

echo "API Keys:"
PGPASSWORD=BeatGen2024Secure psql -h localhost -U beat_gen_user -d ai_beat_generator -c \
  "SELECT COUNT(*) as total FROM api_keys;"
echo ""

echo "Beats:"
PGPASSWORD=BeatGen2024Secure psql -h localhost -U beat_gen_user -d ai_beat_generator -c \
  "SELECT COUNT(*) as total FROM beats;"
echo ""

echo "========================================="
echo "📝 Notes:"
echo "========================================="
echo "1. API keys need to be configured first"
echo "2. Beat generation requires Suno API integration"
echo "3. Manual beat upload is also possible via /api/upload endpoint"
echo ""
echo "To configure API keys, edit .env file:"
echo "  nano /home/lifetechadmin/opt/AI-Beat-Generator-backend/.env"
echo ""
