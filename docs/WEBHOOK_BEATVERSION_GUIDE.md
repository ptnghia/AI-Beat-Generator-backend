# Webhook Callback & BeatVersion Integration Guide

## 📋 Tổng Quan

Webhook callback từ Suno API đã được cập nhật để tự động tạo `BeatVersion` records khi nhận được response thành công.

**Updated**: 2025-12-13  
**Status**: ✅ Complete

---

## 🔄 Luồng Hoạt Động

### 1. Beat Generation Request
```typescript
// Orchestrator gọi Suno API với callback URL
const musicResult = await musicService.generateMusic(
  prompt,
  apiKey
);

// Suno nhận request với callback URL
{
  "callBackUrl": "https://beat.optiwellai.com/api/callbacks/suno",
  "customMode": true,
  "instrumental": true,
  "model": "V4_5ALL",
  "prompt": "Cinematic Ambient, 70 bpm...",
  "style": "instrumental, beat, music",
  "title": "Instrumental Beat"
}
```

### 2. Suno Processing
Suno API xử lý request và gửi callback với 4 trạng thái:

| Status | Description | Action |
|--------|-------------|--------|
| `TEXT_SUCCESS` | Lyrics generated | Log only |
| `FIRST_SUCCESS` | First track completed | Available for early download |
| `SUCCESS` | All tracks completed | **Create BeatVersions** |
| `FAILED` | Generation failed | Update status to failed |

### 3. Webhook Callback (SUCCESS)
Khi Suno hoàn thành, gọi webhook:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "taskId": "ab04050350270ec7edde525eebf49162",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "53eae581-5b96-4d8d-aa56-24cc691cc42f",
          "audio_url": "https://cdn1.suno.ai/53eae581.mp3",
          "stream_audio_url": "https://stream.suno.ai/53eae581",
          "image_url": "https://cdn2.suno.ai/image_53eae581.jpeg",
          "title": "Instrumental Beat",
          "tags": "instrumental, beat, music",
          "duration": 198.44,
          "model_name": "chirp-v3-5"
        },
        {
          "id": "9a4654cc-dd0b-4512-b3f9-7a732b46bd1e",
          "audio_url": "https://cdn1.suno.ai/9a4654cc.mp3",
          "stream_audio_url": "https://stream.suno.ai/9a4654cc",
          "image_url": "https://cdn2.suno.ai/image_9a4654cc.jpeg",
          "title": "Instrumental Beat (Alt)",
          "tags": "instrumental, beat, music",
          "duration": 198.44,
          "model_name": "chirp-v3-5"
        }
      ]
    }
  }
}
```

### 4. Webhook Processing Logic

```typescript
// File: src/api/routes/callbacks.ts
router.post('/suno', async (req, res) => {
  const { taskId, status, response } = req.body.data;
  
  if (status === 'SUCCESS' && response?.sunoData?.length > 0) {
    // 1. Tìm beat theo taskId
    const beats = await prisma.beat.findMany({
      where: { sunoTaskId: taskId },
      include: { versions: true }
    });
    
    const beat = beats[0];
    const track1 = response.sunoData[0];
    const track2 = response.sunoData[1]; // Nếu có
    
    // 2. Update beat chính với metadata
    await beatRepository.updateBeat(beat.id, {
      duration: track1.duration,
      modelName: track1.model_name,
      sunoAudioUrl: track1.audio_url,
      sunoImageUrl: track1.image_url,
      sunoStreamUrl: track1.stream_audio_url,
      generationStatus: 'completed'
    });
    
    // 3. Kiểm tra version đã tồn tại chưa
    const existingVersion = await prisma.beatVersion.findFirst({
      where: { beatId: beat.id, sunoTaskId: taskId }
    });
    
    // 4. Tạo BeatVersion cho track 1 (primary)
    if (!existingVersion) {
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
          sunoImageUrl: track1.image_url,
          sunoStreamUrl: track1.stream_audio_url,
          duration: track1.duration,
          modelName: track1.model_name,
          filesDownloaded: false  // Lazy download strategy
        }
      });
      
      // 5. Tạo BeatVersion cho track 2 (alternate)
      if (track2) {
        await prisma.beatVersion.create({
          data: {
            beatId: beat.id,
            versionNumber: 2,
            source: 'suno',
            isPrimary: false,
            status: 'completed',
            sunoTaskId: taskId,
            sunoAudioId: track2.id,
            sunoAudioUrl: track2.audio_url,
            sunoImageUrl: track2.image_url,
            sunoStreamUrl: track2.stream_audio_url,
            duration: track2.duration,
            modelName: track2.model_name,
            filesDownloaded: false
          }
        });
      }
    }
  }
  
  res.status(200).json({ status: 'received' });
});
```

---

## 🎯 Key Features

### 1. Automatic Version Creation
- ✅ Tự động tạo `BeatVersion` cho cả 2 tracks từ Suno
- ✅ Track 1 = Primary version (versionNumber: 1)
- ✅ Track 2 = Alternate version (versionNumber: 2)
- ✅ Không tạo duplicate nếu version đã tồn tại

### 2. Lazy Download Strategy
- ✅ Chỉ lưu URL từ Suno, không download ngay
- ✅ `filesDownloaded: false` mặc định
- ✅ Download sau khi user request qua `/api/beats/:id/download`

### 3. Metadata Synchronization
Webhook update cả beat chính VÀ tạo versions:

| Field | Beat Table | BeatVersion Table |
|-------|-----------|-------------------|
| `sunoTaskId` | ✅ | ✅ |
| `sunoAudioId` | ✅ | ✅ |
| `sunoAudioUrl` | ✅ | ✅ |
| `sunoImageUrl` | ✅ | ✅ |
| `sunoStreamUrl` | ✅ | ✅ |
| `duration` | ✅ | ✅ |
| `modelName` | ✅ | ✅ |
| `generationStatus` | ✅ completed | ✅ completed |
| `versionNumber` | ❌ | ✅ |
| `isPrimary` | ❌ | ✅ |
| `filesDownloaded` | ❌ | ✅ |

---

## 📊 Database Schema

### BeatVersion Table
```sql
CREATE TABLE "beat_versions" (
  "id" SERIAL PRIMARY KEY,
  "beatId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "source" TEXT NOT NULL,           -- 'suno', 'upload', 'suno_retry'
  "isPrimary" BOOLEAN DEFAULT false,
  "status" TEXT DEFAULT 'pending',
  
  -- Suno URLs (remote)
  "sunoTaskId" TEXT,
  "sunoAudioId" TEXT,
  "sunoAudioUrl" TEXT,
  "sunoImageUrl" TEXT,
  "sunoStreamUrl" TEXT,
  
  -- Local files (lazy download)
  "fileUrl" TEXT,
  "wavUrl" TEXT,
  "coverArtPath" TEXT,
  "filesDownloaded" BOOLEAN DEFAULT false,
  
  -- Metadata
  "duration" DOUBLE PRECISION,
  "modelName" TEXT,
  "bpm" INTEGER,
  "musicalKey" TEXT,
  
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT "beat_versions_beatId_versionNumber_key" 
    UNIQUE ("beatId", "versionNumber"),
  CONSTRAINT "beat_versions_beatId_fkey" 
    FOREIGN KEY ("beatId") 
    REFERENCES "beats"("id") 
    ON DELETE CASCADE
);
```

---

## 🧪 Testing Webhook

### 1. Manual Webhook Test
```bash
# Simulate Suno callback
curl -X POST "https://beat.optiwellai.com/api/callbacks/suno" \
  -H "Content-Type: application/json" \
  -d '{
    "code": 0,
    "msg": "success",
    "data": {
      "taskId": "test-task-123",
      "status": "SUCCESS",
      "response": {
        "sunoData": [
          {
            "id": "audio-id-1",
            "audio_url": "https://cdn1.suno.ai/test1.mp3",
            "stream_audio_url": "https://stream.suno.ai/test1",
            "image_url": "https://cdn2.suno.ai/test1.jpeg",
            "duration": 180,
            "model_name": "chirp-v3-5"
          },
          {
            "id": "audio-id-2",
            "audio_url": "https://cdn1.suno.ai/test2.mp3",
            "stream_audio_url": "https://stream.suno.ai/test2",
            "image_url": "https://cdn2.suno.ai/test2.jpeg",
            "duration": 180,
            "model_name": "chirp-v3-5"
          }
        ]
      }
    }
  }'
```

### 2. Check Versions Created
```sql
-- Kiểm tra versions đã tạo
SELECT 
  bv.id,
  bv."versionNumber",
  bv."isPrimary",
  bv.source,
  bv.status,
  bv."sunoAudioId",
  bv."filesDownloaded",
  b.name as beat_name
FROM beat_versions bv
JOIN beats b ON b.id = bv."beatId"
WHERE bv."sunoTaskId" = 'test-task-123'
ORDER BY bv."versionNumber";
```

Expected Result:
```
 id | versionNumber | isPrimary | source | status    | sunoAudioId | filesDownloaded | beat_name
----+---------------+-----------+--------+-----------+-------------+-----------------+----------
  1 | 1             | true      | suno   | completed | audio-id-1  | false           | Test Beat
  2 | 2             | false     | suno   | completed | audio-id-2  | false           | Test Beat
```

---

## 🔍 Verification Steps

### 1. Check Webhook Logs
```bash
pm2 logs ai-beat-generator-api --lines 50 | grep "SunoCallbackRoute"
```

Expected logs:
```
2025-12-13 23:35:32 [info]: Suno callback received
2025-12-13 23:35:32 [info]: All tracks completed
2025-12-13 23:35:32 [info]: BeatVersion created for track 1
2025-12-13 23:35:32 [info]: BeatVersion created for track 2
2025-12-13 23:35:32 [info]: Beat updated with Suno metadata
```

### 2. Query Beat with Versions
```typescript
GET /api/beats/:id?include=versions

// Response:
{
  "id": "beat-123",
  "name": "Test Beat",
  "generationStatus": "completed",
  "sunoAudioUrl": "https://cdn1.suno.ai/audio1.mp3",
  "versions": [
    {
      "id": 1,
      "versionNumber": 1,
      "isPrimary": true,
      "sunoAudioUrl": "https://cdn1.suno.ai/audio1.mp3",
      "filesDownloaded": false
    },
    {
      "id": 2,
      "versionNumber": 2,
      "isPrimary": false,
      "sunoAudioUrl": "https://cdn1.suno.ai/audio2.mp3",
      "filesDownloaded": false
    }
  ]
}
```

---

## 🚨 Error Handling

### Duplicate Prevention
```typescript
// Kiểm tra version đã tồn tại
const existingVersion = await prisma.beatVersion.findFirst({
  where: {
    beatId: beat.id,
    sunoTaskId: taskId
  }
});

if (!existingVersion) {
  // Tạo mới
}
```

### Unique Constraint Protection
```sql
-- Database constraint ngăn duplicate
CONSTRAINT "beat_versions_beatId_versionNumber_key" 
  UNIQUE ("beatId", "versionNumber")
```

---

## 📝 Summary

### What Happens When Suno Calls Webhook

1. **Webhook receives SUCCESS callback**
2. **Find beat** by `sunoTaskId`
3. **Update beat table** with metadata from track 1
4. **Check if versions exist** for this taskId
5. **Create BeatVersion #1** (primary) from track 1
6. **Create BeatVersion #2** (alternate) from track 2 (if exists)
7. **Set filesDownloaded = false** (lazy loading strategy)
8. **Respond 200 OK** to Suno

### Benefits

✅ **Automatic version tracking** - Không cần manual API calls  
✅ **Dual-track support** - Cả 2 tracks được lưu riêng  
✅ **Lazy download** - Tiết kiệm storage, download khi cần  
✅ **Data consistency** - Beat + Versions sync qua webhook  
✅ **No duplicates** - Unique constraint + existence check  

---

**Last Updated**: 2025-12-13  
**Next Steps**: Test với Suno API key mới để verify webhook hoạt động end-to-end
