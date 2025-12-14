# Callback Strategy cho Multi-Version Beats

## 🎯 Vấn Đề

Mỗi lần gọi Suno API (tạo beat mới hoặc tạo version mới) sẽ sinh ra **taskId riêng**:

```typescript
// Lần 1: Tạo beat mới
POST /api/generate/beat
→ Suno API → taskId: "abc123"

// Lần 2: Tạo version mới cho beat đó
POST /api/beats/:id/versions  
→ Suno API → taskId: "xyz456"  // ← TaskId KHÁC!

// Lần 3: Tạo version thứ 3
POST /api/beats/:id/versions
→ Suno API → taskId: "def789"  // ← TaskId KHÁC nữa!
```

**Challenge**: Webhook callback nhận về taskId, cần xác định:
- Beat nào?
- Version nào?
- Update vào đâu?

---

## ✅ Giải Pháp: Dual Strategy

### Strategy 1: Tìm BeatVersion theo sunoTaskId (Ưu tiên)
```typescript
// Webhook nhận callback với taskId
const taskId = "xyz456";

// Tìm BeatVersion có sunoTaskId này
const existingVersions = await prisma.beatVersion.findMany({
  where: { sunoTaskId: taskId },
  include: { beat: true }
});

if (existingVersions.length > 0) {
  // ✅ Case 1: Đã có BeatVersion với taskId này
  // → Update version hiện tại với metadata từ Suno
  const version = existingVersions[0];
  
  await prisma.beatVersion.update({
    where: { id: version.id },
    data: {
      status: 'completed',
      sunoAudioUrl: track1.audio_url,
      sunoImageUrl: track1.image_url,
      duration: track1.duration,
      modelName: track1.model_name
    }
  });
  
  // Nếu là primary version, cập nhật beat chính
  if (version.isPrimary) {
    await prisma.beat.update({
      where: { id: version.beatId },
      data: { generationStatus: 'completed', ... }
    });
  }
}
```

### Strategy 2: Fallback cho Beat cũ (Legacy)
```typescript
else {
  // ❌ Không tìm thấy BeatVersion với taskId
  // → Tìm Beat theo sunoTaskId (old flow, beat chưa có versions)
  
  const beats = await prisma.beat.findMany({
    where: { sunoTaskId: taskId },
    include: { versions: true }
  });
  
  if (beats.length > 0) {
    const beat = beats[0];
    
    // Tạo BeatVersion mới cho beat cũ
    await prisma.beatVersion.create({
      data: {
        beatId: beat.id,
        versionNumber: 1,
        source: 'suno',
        isPrimary: true,
        status: 'completed',
        sunoTaskId: taskId,
        sunoAudioId: track1.id,
        sunoAudioUrl: track1.audio_url,
        duration: track1.duration,
        modelName: track1.model_name
      }
    });
  }
}
```

---

## 📊 Luồng Hoạt Động Chi Tiết

### Scenario A: Generate Beat Mới
```
1. User gọi API
   POST /api/generate/beat
   
2. API tạo Beat record (status=pending)
   
3. API gọi Suno với callback URL
   → Nhận taskId: "task-001"
   
4. API tạo BeatVersion ngay (status=pending)
   {
     beatId: "beat-123",
     versionNumber: 1,
     sunoTaskId: "task-001",  ← Lưu taskId
     status: "pending"
   }
   
5. Suno xử lý và gọi webhook
   POST /api/callbacks/suno
   {
     taskId: "task-001",
     status: "SUCCESS",
     response: { sunoData: [...] }
   }
   
6. Webhook tìm BeatVersion
   WHERE sunoTaskId = "task-001"
   → Tìm thấy version vừa tạo
   
7. Webhook update version
   UPDATE beat_versions SET
     status = 'completed',
     sunoAudioUrl = 'https://...',
     duration = 180,
     ...
   WHERE id = version.id
   
8. Webhook update beat (nếu isPrimary)
   UPDATE beats SET
     generationStatus = 'completed',
     ...
   WHERE id = beat-123
```

### Scenario B: Tạo Version Mới
```
1. User gọi API
   POST /api/beats/beat-123/versions
   
2. API tính nextVersionNumber
   SELECT MAX(versionNumber) FROM beat_versions
   WHERE beatId = 'beat-123'
   → nextVersionNumber = 3
   
3. API gọi Suno với callback URL
   → Nhận taskId: "task-002"  ← TaskId MỚI
   
4. API tạo BeatVersion ngay (status=pending)
   {
     beatId: "beat-123",
     versionNumber: 3,
     sunoTaskId: "task-002",  ← Lưu taskId MỚI
     status: "pending"
   }
   
5. Suno xử lý và gọi webhook
   POST /api/callbacks/suno
   {
     taskId: "task-002",  ← TaskId MỚI
     status: "SUCCESS",
     response: { sunoData: [...] }
   }
   
6. Webhook tìm BeatVersion
   WHERE sunoTaskId = "task-002"  ← Tìm theo taskId MỚI
   → Tìm thấy version 3 vừa tạo
   
7. Webhook update version 3
   UPDATE beat_versions SET
     status = 'completed',
     ...
   WHERE id = version-3.id
   
8. Beat.sunoTaskId VẪN LÀ "task-001" (không đổi)
   ✅ Đây là điểm mấu chốt: Beat lưu taskId đầu tiên,
      mỗi Version lưu taskId riêng của nó
```

---

## 🔑 Key Points

### 1. Mỗi Version = Một TaskId Riêng
```sql
SELECT id, "versionNumber", "sunoTaskId", status
FROM beat_versions
WHERE "beatId" = 'beat-123';

-- Result:
 id | versionNumber | sunoTaskId | status
----+---------------+------------+-----------
  1 | 1             | task-001   | completed
  2 | 2             | task-002   | completed
  3 | 3             | task-003   | completed
```

### 2. Beat.sunoTaskId ≠ Version.sunoTaskId
```typescript
// Beat chỉ lưu taskId của lần generate đầu tiên
beat.sunoTaskId = "task-001"  // Không đổi

// Mỗi version lưu taskId riêng
version1.sunoTaskId = "task-001"  // Khớp với beat
version2.sunoTaskId = "task-002"  // Khác beat
version3.sunoTaskId = "task-003"  // Khác beat
```

### 3. Callback Không Cần Biết Beat
```typescript
// Callback CHỈ cần taskId
// Tìm BeatVersion theo taskId
// BeatVersion tự có beatId → Tự biết beat nào

const version = await prisma.beatVersion.findFirst({
  where: { sunoTaskId: taskId },
  include: { beat: true }  // Auto-load beat
});

console.log(version.beatId);  // "beat-123"
console.log(version.beat.name);  // "Dark Trap Beat"
```

---

## 🧪 Testing

### Test 1: Generate Beat Mới
```bash
# Step 1: Tạo beat
curl -X POST "https://beat.optiwellai.com/api/generate/beat" \
  -H "Content-Type: application/json" \
  -d '{"mode": "metadata_only"}'
  
# Response: beatId = "beat-abc"

# Step 2: Generate audio
curl -X POST "https://beat.optiwellai.com/api/beats/beat-abc/generate-audio"

# Step 3: Kiểm tra BeatVersion đã tạo
SELECT * FROM beat_versions WHERE "beatId" = 'beat-abc';

# Expected:
# - versionNumber = 1
# - status = 'pending' (chờ webhook)
# - sunoTaskId = "task-xyz"

# Step 4: Giả lập webhook
curl -X POST "https://beat.optiwellai.com/api/callbacks/suno" \
  -H "Content-Type: application/json" \
  -d '{
    "code": 0,
    "data": {
      "taskId": "task-xyz",
      "status": "SUCCESS",
      "response": {
        "sunoData": [{
          "id": "audio-123",
          "audio_url": "https://cdn.suno.ai/test.mp3",
          "duration": 180,
          "model_name": "chirp-v3-5"
        }]
      }
    }
  }'

# Step 5: Verify version updated
SELECT status, "sunoAudioUrl", duration 
FROM beat_versions 
WHERE "beatId" = 'beat-abc';

# Expected:
# - status = 'completed'
# - sunoAudioUrl = 'https://cdn.suno.ai/test.mp3'
# - duration = 180
```

### Test 2: Tạo Version Mới
```bash
# Step 1: Tạo version 2
curl -X POST "https://beat.optiwellai.com/api/beats/beat-abc/versions" \
  -H "Content-Type: application/json" \
  -d '{"setPrimary": false}'

# Step 2: Kiểm tra version pending
SELECT * FROM beat_versions 
WHERE "beatId" = 'beat-abc' 
ORDER BY "versionNumber" DESC 
LIMIT 1;

# Expected:
# - versionNumber = 2
# - status = 'pending'
# - sunoTaskId = "task-def" (KHÁC task-xyz)

# Step 3: Webhook sẽ tự update version 2
# (giống test 1, step 4-5)
```

---

## 📝 Summary

### ✅ Điểm Mạnh

1. **Không cần callback riêng**: Một endpoint webhook duy nhất
2. **Tự động routing**: Tìm đúng version theo taskId
3. **Scalable**: Tạo bao nhiêu version cũng OK
4. **Backward compatible**: Hỗ trợ cả beat cũ (legacy)

### 🔄 Flow Diagram

```
API Request → Suno API (taskId: ABC)
              ↓
              Create BeatVersion (sunoTaskId=ABC, status=pending)
              ↓
         [Wait for Suno...]
              ↓
Webhook ← Suno Callback (taskId: ABC)
    ↓
    Find BeatVersion WHERE sunoTaskId=ABC
    ↓
    Update BeatVersion (status=completed, metadata...)
    ↓
    ✅ Done
```

### 🎯 Best Practices

1. **Always save taskId**: Khi tạo version, lưu `sunoTaskId` ngay
2. **Status = pending**: Đừng set `completed` ngay, để webhook update
3. **Trust the taskId**: Webhook dựa vào taskId để tìm version đúng
4. **No hardcode versionNumber**: Webhook không cần biết version số mấy

---

**Last Updated**: 2025-12-13  
**Status**: ✅ Implemented & Ready for Testing
