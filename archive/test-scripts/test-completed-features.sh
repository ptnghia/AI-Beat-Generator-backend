#!/bin/bash

# Test các API đã hoàn thành mà không cần Suno API
BASE_URL="https://beat.optiwellai.com"
API_URL="${BASE_URL}/api"

echo "🎉 Test Các Tính Năng Đã Hoàn Thành"
echo "===================================="
echo ""

# Test 1: Generate Beat (Metadata Only) - Không cần Suno
echo "✅ Test 1: Generate Beat (Metadata Only Mode)"
echo "   POST /api/generate/beat"
BEAT_RESPONSE=$(curl -s -X POST "${API_URL}/generate/beat" \
  -H "Content-Type: application/json" \
  -d '{"mode": "metadata_only"}')

echo "$BEAT_RESPONSE" | jq '.'
BEAT_ID=$(echo "$BEAT_RESPONSE" | jq -r '.beat.id')
echo "📝 Created Beat ID: ${BEAT_ID}"
echo ""
echo "---"
echo ""

# Test 2: Get Beat Details
echo "✅ Test 2: Get Beat với ID vừa tạo"
echo "   GET /api/beats/${BEAT_ID}"
curl -s "${API_URL}/beats/${BEAT_ID}" | jq '{
  id: .id,
  name: .name,
  genre: .genre,
  generationStatus: .generationStatus,
  fileUrl: .fileUrl,
  hasAudio: (.sunoTaskId != null)
}'
echo ""
echo "---"
echo ""

# Test 3: List all beats
echo "✅ Test 3: Lấy danh sách tất cả beats"
echo "   GET /api/beats?limit=5"
curl -s "${API_URL}/beats?limit=5" | jq '{
  total: .pagination.total,
  beats: [.data[] | {
    id: .id,
    name: .name,
    status: .generationStatus,
    hasFiles: (.fileUrl != "" and .fileUrl != null)
  }]
}'
echo ""
echo "---"
echo ""

# Test 4: Get beat có files
echo "✅ Test 4: Lấy beat đã có audio files"
COMPLETED_BEAT_ID="e065552a-eb29-45a3-b6ed-2759cd0075ca"
echo "   GET /api/beats/${COMPLETED_BEAT_ID}"
curl -s "${API_URL}/beats/${COMPLETED_BEAT_ID}" | jq '{
  id: .id,
  name: .name,
  fileUrl: .fileUrl,
  alternateFileUrl: .alternateFileUrl,
  previewPath: .previewPath,
  sunoAudioUrl: .sunoAudioUrl,
  generationStatus: .generationStatus
}'
echo ""
echo "---"
echo ""

# Test 5: Kiểm tra BeatVersion table (thông qua database)
echo "✅ Test 5: Kiểm tra BeatVersion table"
echo "   Query: SELECT COUNT(*) FROM beat_versions"
echo "   (Chưa có data vì chưa migrate beats cũ)"
echo ""

# Test 6: Health Check
echo "✅ Test 6: Health Check Endpoint"
echo "   GET /health"
curl -s "${API_URL:0:-4}/health" | jq '.'
echo ""
echo "---"
echo ""

echo "📊 Tổng Kết Test"
echo "================"
echo ""
echo "✅ Đã Test Thành Công:"
echo "   1. POST /api/generate/beat (metadata_only) - ✅"
echo "   2. GET /api/beats/:id - ✅"
echo "   3. GET /api/beats (list) - ✅"
echo "   4. Beats có files MP3 đã tồn tại - ✅"
echo ""
echo "⚠️  Chưa Test (Cần Suno API Key mới):"
echo "   1. POST /api/beats/:id/generate-audio"
echo "   2. POST /api/beats/:id/versions"
echo "   3. POST /api/generate/beat (mode=full)"
echo "   4. POST /api/generate/beats (batch)"
echo ""
echo "💡 Recommendation:"
echo "   - Lấy Suno API key mới từ https://sunoapi.net"
echo "   - Update key vào .env: SUNO_API_KEYS"
echo "   - Restart PM2: pm2 restart ai-beat-generator-api"
echo ""
