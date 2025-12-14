#!/bin/bash

# Script kiểm tra tình trạng Track 2 trên production
# Kiểm tra xem có bao nhiêu beats có track 2 và metadata của chúng

BASE_URL="${BASE_URL:-https://beat.optiwellai.com}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "🎵 Kiểm Tra Trạng Thái Track 2"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Lấy tổng số beats
TOTAL_BEATS=$(curl -s "$BASE_URL/api/beats?limit=1" | jq -r '.pagination.total')
echo -e "${BLUE}Tổng số beats: $TOTAL_BEATS${NC}"
echo ""

# Lấy tất cả beats (hoặc số lượng lớn)
echo -e "${YELLOW}Đang lấy dữ liệu beats...${NC}"
ALL_BEATS=$(curl -s "$BASE_URL/api/beats?limit=100")

# Đếm beats có track 2
BEATS_WITH_TRACK2=$(echo "$ALL_BEATS" | jq '[.data[] | select(.alternateFileUrl != null)] | length')
echo -e "${GREEN}Số beats có Track 2: $BEATS_WITH_TRACK2${NC}"
echo ""

# Đếm beats có đầy đủ metadata track 2
BEATS_WITH_FULL_METADATA=$(echo "$ALL_BEATS" | jq '[.data[] | select(.alternateFileUrl != null and .alternateDuration != null)] | length')
echo -e "${GREEN}Số beats có đầy đủ metadata Track 2: $BEATS_WITH_FULL_METADATA${NC}"
echo ""

# Đếm beats thiếu metadata track 2
BEATS_MISSING_METADATA=$((BEATS_WITH_TRACK2 - BEATS_WITH_FULL_METADATA))
if [ $BEATS_MISSING_METADATA -gt 0 ]; then
    echo -e "${RED}Số beats thiếu metadata Track 2: $BEATS_MISSING_METADATA${NC}"
else
    echo -e "${GREEN}✅ Tất cả beats có Track 2 đều có đầy đủ metadata!${NC}"
fi
echo ""

# Hiển thị chi tiết một vài beats
echo "========================================="
echo "📊 Chi Tiết Một Số Beats"
echo "========================================="
echo ""

echo "$ALL_BEATS" | jq -r '.data[0:5] | .[] | "
\u001b[1m\(.name)\u001b[0m
  • Track 1: \(.duration // "N/A")s | Model: \(.modelName // "N/A")
  • Track 2: \(if .alternateFileUrl then "✅ Có" else "❌ Không" end)
    - File: \(.alternateFileUrl // "N/A")
    - Duration: \(.alternateDuration // "❌ NULL")s
    - Model: \(.alternateModelName // "❌ NULL")
    - Suno URL: \(if .alternateSunoAudioUrl then "✅" else "❌" end)
"'

echo ""
echo "========================================="
echo "📈 Thống Kê"
echo "========================================="
echo ""

# Tính phần trăm
if [ $TOTAL_BEATS -gt 0 ]; then
    PERCENT_WITH_TRACK2=$(echo "scale=1; $BEATS_WITH_TRACK2 * 100 / $TOTAL_BEATS" | bc)
    echo "Beats có Track 2: $BEATS_WITH_TRACK2/$TOTAL_BEATS ($PERCENT_WITH_TRACK2%)"
fi

if [ $BEATS_WITH_TRACK2 -gt 0 ]; then
    PERCENT_COMPLETE=$(echo "scale=1; $BEATS_WITH_FULL_METADATA * 100 / $BEATS_WITH_TRACK2" | bc)
    echo "Metadata đầy đủ: $BEATS_WITH_FULL_METADATA/$BEATS_WITH_TRACK2 ($PERCENT_COMPLETE%)"
fi

echo ""
echo "========================================="
echo "💡 Khuyến Nghị"
echo "========================================="
echo ""

if [ $BEATS_MISSING_METADATA -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Có $BEATS_MISSING_METADATA beats thiếu metadata Track 2${NC}"
    echo ""
    echo "Nguyên nhân:"
    echo "  • Beats được generate trước khi callback handler được update"
    echo "  • Callback không được gọi hoặc thất bại"
    echo ""
    echo "Giải pháp:"
    echo "  1. Beats mới sẽ tự động có đầy đủ metadata"
    echo "  2. Có thể tạo migration script để cập nhật beats cũ"
    echo "  3. Hoặc để beats cũ như vậy (không ảnh hưởng chức năng)"
else
    echo -e "${GREEN}✅ Hệ thống hoạt động hoàn hảo!${NC}"
    echo "Tất cả beats có track 2 đều có đầy đủ metadata"
fi

echo ""
echo "========================================="
