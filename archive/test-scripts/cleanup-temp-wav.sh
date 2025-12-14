#!/bin/bash

# Script xóa các file *_temp.wav cũ
# Chạy thủ công hoặc thêm vào crontab

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "🧹 Cleanup Temp WAV Files"
echo "========================================="
echo ""

# Tìm tất cả file temp.wav
TEMP_FILES=$(find output/beats -name "*_temp.wav" 2>/dev/null)

if [ -z "$TEMP_FILES" ]; then
    echo -e "${GREEN}✅ Không có file temp.wav nào cần xóa${NC}"
    exit 0
fi

# Đếm số file
COUNT=$(echo "$TEMP_FILES" | wc -l)
echo -e "${YELLOW}Tìm thấy $COUNT file temp.wav${NC}"
echo ""

# Hiển thị danh sách
echo "Danh sách file sẽ xóa:"
echo "$TEMP_FILES" | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  • $file ($SIZE)"
done
echo ""

# Tính tổng dung lượng
TOTAL_SIZE=$(find output/beats -name "*_temp.wav" -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1)
echo -e "${YELLOW}Tổng dung lượng: $TOTAL_SIZE${NC}"
echo ""

# Xác nhận xóa
read -p "Xóa các file này? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Hủy bỏ."
    exit 0
fi

# Xóa files
echo ""
echo "Đang xóa..."
find output/beats -name "*_temp.wav" -delete 2>/dev/null

echo -e "${GREEN}✅ Đã xóa $COUNT file, tiết kiệm $TOTAL_SIZE${NC}"
echo ""

echo "========================================="
echo "💡 Khuyến nghị"
echo "========================================="
echo ""
echo "Thêm vào crontab để tự động cleanup:"
echo "  0 3 * * * /path/to/cleanup-temp-wav.sh"
echo ""
echo "Hoặc chạy sau khi build/deploy:"
echo "  npm run cleanup:temp"
echo ""
