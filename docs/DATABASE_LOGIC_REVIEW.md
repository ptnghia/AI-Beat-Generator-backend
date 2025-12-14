# Database & Logic Review - December 13, 2025

## 📊 Database Schema Review

### Bảng `beats`
- **Mục đích**: Lưu metadata beat chính và track đầu tiên
- **Quan hệ**: 1-to-many với `beat_versions`
- **Fields quan trọng**:
  - `sunoTaskId`: Lưu taskId của lần generation ĐẦU TIÊN
  - `generationStatus`: pending → processing → completed
  - `sunoAudioUrl`, `sunoImageUrl`, `sunoStreamUrl`: Metadata từ track 1
  - `alternateSunoAudioUrl`, `alternateSunoImageUrl`: Metadata từ track 2 (legacy)

### Bảng `beat_versions` 
- **Mục đích**: Lưu tất cả các version của 1 beat (multi-version support)
- **Quan hệ**: Many-to-1 với `beats`
- **Fields quan trọng**:
  - `sunoTaskId`: Lưu taskId riêng cho MỖI version
  - `versionNumber`: 1, 2, 3... (unique per beat)
  - `isPrimary`: true cho version chính
  - `status`: pending → completed (được webhook update)
  - `sunoAudioUrl`, `sunoImageUrl`: URLs từ Suno CDN

### Index Strategy
```sql
-- beat_versions indexes
CREATE INDEX beat_versions_beatId_idx ON beat_versions(beatId);
CREATE INDEX beat_versions_status_idx ON beat_versions(status);
CREATE UNIQUE INDEX beat_versions_beatId_versionNumber_key ON beat_versions(beatId, versionNumber);

-- beats indexes  
CREATE INDEX beats_generationStatus_idx ON beats(generationStatus);
CREATE INDEX beats_sunoTaskId_idx ON beats(sunoTaskId); -- CẦN THÊM
```

## 🔄 Callback Routing Logic

### Strategy: Dual-Strategy Routing

```typescript
// Webhook nhận callback với taskId từ Suno
taskId = "abc-123-xyz"

// Strategy 1: Tìm BeatVersion theo sunoTaskId (NEW FLOW)
const versions = await prisma.beatVersion.findMany({
  where: { sunoTaskId: taskId }
});

if (versions.length > 0) {
  // Tìm thấy version → update version đó
  // Track 1 → Update version hiện tại
  // Track 2 → Tạo version mới (KHÔNG lưu sunoTaskId)
} else {
  // Strategy 2: Tìm Beat theo sunoTaskId (LEGACY FLOW)
  const beats = await prisma.beat.findMany({
    where: { sunoTaskId: taskId }
  });
  
  if (beats.length > 0) {
    // Tìm thấy beat cũ → tạo BeatVersion cho nó
    // Track 1 → Version 1 (lưu sunoTaskId)
    // Track 2 → Version 2 (KHÔNG lưu sunoTaskId)
  }
}
```

### Key Rules:

1. **Track 1 (Primary)**: 
   - Luôn lưu `sunoTaskId` 
   - Dùng để route webhook callback
   - `isPrimary = true` cho version đầu tiên

2. **Track 2 (Alternate)**:
   - **KHÔNG** lưu `sunoTaskId` (set null)
   - Lý do: Tránh conflict khi webhook gọi lại
   - Được tạo cùng lúc với track 1 trong cùng 1 callback
   - `isPrimary = false`

3. **Webhook chỉ gọi 1 lần** với 1 taskId:
   - Callback chứa cả 2 tracks (nếu có)
   - Track 1 → Update version có sunoTaskId
   - Track 2 → Tạo version mới không có sunoTaskId

## 🐛 Bug Đã Fix

### Bug #1: Track 2 lưu cùng sunoTaskId
**Vấn đề:**
```typescript
// SAI ❌
await prisma.beatVersion.create({
  data: {
    versionNumber: 2,
    sunoTaskId: taskId,  // ← Conflict với track 1
    sunoAudioId: track2.id
  }
});
```

**Hậu quả:**
- Khi webhook gọi lại với cùng taskId
- `findMany({ where: { sunoTaskId: taskId } })` trả về 2 versions
- Logic không biết update version nào
- Có thể update nhầm hoặc tạo duplicate

**Giải pháp:**
```typescript
// ĐÚNG ✅
await prisma.beatVersion.create({
  data: {
    versionNumber: 2,
    sunoTaskId: null,  // Track 2 không lưu taskId
    sunoAudioId: track2.id
  }
});
```

## ✅ Logic Kiểm tra

### Test Case 1: New Beat + Audio Generation
```
1. POST /api/beats/:id/generate-audio
   → Tạo BeatVersion (version 1, isPrimary=true, status=pending, sunoTaskId=ABC)
   → Update Beat (sunoTaskId=ABC, generationStatus=processing)

2. Suno gọi callback với taskId=ABC
   → Tìm thấy BeatVersion có sunoTaskId=ABC
   → Update version: status=completed, metadata từ track 1
   → Nếu có track 2: Tạo version 2 (sunoTaskId=NULL)
   → Update Beat: generationStatus=completed
```

### Test Case 2: Create New Version
```
1. POST /api/beats/:id/versions
   → Tìm version cuối cùng: versionNumber=2
   → Tạo BeatVersion (version 3, isPrimary=false, status=pending, sunoTaskId=XYZ)
   → Beat.sunoTaskId vẫn giữ nguyên (ABC từ lần đầu)

2. Suno gọi callback với taskId=XYZ
   → Tìm thấy BeatVersion có sunoTaskId=XYZ (version 3)
   → Update chỉ version 3
   → Nếu có track 2: Tạo version 4 (sunoTaskId=NULL)
   → Beat.sunoTaskId vẫn là ABC (không đổi)
```

### Test Case 3: Legacy Beat (Không có BeatVersion)
```
Database State:
- Beat có sunoTaskId=OLD-123
- Chưa có BeatVersion nào

Callback với taskId=OLD-123:
→ Strategy 1: Không tìm thấy BeatVersion
→ Strategy 2: Tìm thấy Beat
→ Tạo version 1 từ track 1 (sunoTaskId=OLD-123)
→ Tạo version 2 từ track 2 (sunoTaskId=NULL)
```

## 📊 Database State - Current

```sql
-- Hiện tại có:
4 beats với generationStatus='completed' (có files)
3 beats với generationStatus='pending' (chưa có files)
0 beat_versions (bảng trống)

-- Sau khi sửa bug và test:
Beat 1:
  - sunoTaskId: "abc-123"
  - generationStatus: completed
  
  BeatVersion 1:
    - sunoTaskId: "abc-123" ← Route webhook
    - isPrimary: true
    - status: completed
  
  BeatVersion 2:
    - sunoTaskId: NULL ← Track 2, không route
    - isPrimary: false
    - status: completed
```

## 🎯 Validation Queries

### Kiểm tra routing conflict
```sql
-- Tìm các taskId bị duplicate (KHÔNG nên có)
SELECT "sunoTaskId", COUNT(*) 
FROM beat_versions 
WHERE "sunoTaskId" IS NOT NULL
GROUP BY "sunoTaskId" 
HAVING COUNT(*) > 1;

-- Kết quả mong muốn: 0 rows
```

### Kiểm tra beat có versions
```sql
SELECT 
  b.id,
  b.name,
  b."generationStatus",
  COUNT(v.id) as version_count,
  COUNT(CASE WHEN v."isPrimary" = true THEN 1 END) as primary_count
FROM beats b
LEFT JOIN beat_versions v ON v."beatId" = b.id
GROUP BY b.id, b.name, b."generationStatus"
ORDER BY b."createdAt" DESC;
```

### Kiểm tra webhook routing
```sql
-- Cho taskId cụ thể, kiểm tra routing
WITH task_id AS (SELECT 'abc-123' as id)
SELECT 
  'BeatVersion' as table_name,
  id,
  "versionNumber",
  "isPrimary",
  status
FROM beat_versions
WHERE "sunoTaskId" = (SELECT id FROM task_id)

UNION ALL

SELECT 
  'Beat' as table_name,
  id,
  NULL as "versionNumber",
  NULL as "isPrimary",
  "generationStatus" as status
FROM beats
WHERE "sunoTaskId" = (SELECT id FROM task_id);
```

## 📝 Migration Recommendation

### Thêm index cho sunoTaskId (tối ưu query)
```sql
CREATE INDEX IF NOT EXISTS beats_sunoTaskId_idx 
ON beats("sunoTaskId") 
WHERE "sunoTaskId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS beat_versions_sunoTaskId_idx 
ON beat_versions("sunoTaskId") 
WHERE "sunoTaskId" IS NOT NULL;
```

### Constraint recommendation
```sql
-- Đảm bảo mỗi beat chỉ có 1 primary version
-- (Không cần nếu logic app đã handle)
CREATE UNIQUE INDEX beat_versions_primary_unique
ON beat_versions("beatId")
WHERE "isPrimary" = true;
```

## 🔍 Summary

### ✅ Logic đúng:
1. **Routing webhook**: BeatVersion.sunoTaskId → Beat.sunoTaskId (fallback)
2. **Track 1**: Luôn lưu sunoTaskId để route
3. **Track 2**: NULL sunoTaskId để tránh conflict
4. **Status flow**: pending → completed (via webhook)
5. **Version numbering**: Sequential per beat
6. **Primary flag**: Chỉ version đầu tiên hoặc khi setPrimary=true

### ⚠️ Lưu ý:
1. Webhook chỉ gọi **1 lần** cho mỗi taskId
2. Callback chứa **cả 2 tracks** (nếu có)
3. Track 2 được tạo **trong cùng callback** với track 1
4. Beat.sunoTaskId **không đổi** sau lần generation đầu tiên
5. Mỗi lần tạo version mới → taskId mới → webhook callback mới

### 🚀 Next Steps:
1. Test với Suno API key mới
2. Verify webhook routing với real callbacks
3. Check database sau khi có version data
4. Monitor logs để đảm bảo không có duplicate routing
