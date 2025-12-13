# WAV Conversion Service - User Guide

> On-demand MP3 to WAV conversion for BeatStars professional sales

---

## 📖 Overview

WAV Conversion Service cho phép convert beat MP3 sang WAV format (44.1kHz 16-bit) **chỉ khi cần thiết** (on-demand). Điều này giúp:

- ✅ Tiết kiệm storage (WAV files lớn gấp ~10x MP3)
- ✅ Tiết kiệm Suno API credits (chỉ convert khi có buyer)
- ✅ Support BeatStars WAV Lease ($49) và Exclusive License ($499)
- ✅ Professional audio quality không mất mát

---

## 🏗️ Architecture

### Workflow

```
User Request → API Endpoint → Suno WAV API → Webhook Callback → Download & Save
     ↓              ↓               ↓                ↓                   ↓
  Beat ID    Submit Job      Processing       Update Status       Local File
              ↓
         Update DB (processing)
```

### Components

1. **WavConversionService** - Core conversion logic
2. **API Endpoints**:
   - `POST /api/beats/:id/convert-wav` - Trigger conversion
   - `GET /api/beats/:id/wav-status` - Check status
3. **Webhook**: `POST /api/callbacks/suno/wav` - Handle completion
4. **Database**: Track conversion status per beat

---

## 🚀 Usage

### 1. Via API (Recommended)

#### Request WAV Conversion

```bash
# Trigger conversion for a specific beat
curl -X POST http://localhost:3000/api/beats/{beatId}/convert-wav

# Response (202 Accepted):
{
  "status": "processing",
  "message": "WAV conversion started",
  "wavTaskId": "5c79****be8e",
  "estimatedTime": "2-5 minutes"
}
```

#### Check Conversion Status

```bash
# Check status
curl http://localhost:3000/api/beats/{beatId}/wav-status

# Response:
{
  "beatId": "62941129-91ef-4608-aa9a-3dc47c142f40",
  "wavConversionStatus": "completed",
  "wavTaskId": "5c79****be8e",
  "wavUrl": "output/beats-wav/2025-12/13/62941129-91ef-4608-aa9a-3dc47c142f40.wav"
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `not_started` | Chưa request conversion |
| `processing` | Đang convert (2-5 phút) |
| `completed` | Hoàn thành, file sẵn sàng |
| `failed` | Conversion thất bại |

---

### 2. Via Test Script

```bash
# Test full conversion workflow
npx ts-node scripts/test-wav-conversion.ts
```

Output:
```
=============================================================
🎵 TEST WAV CONVERSION SERVICE 🎵
=============================================================

📝 Finding a beat for WAV conversion...

✅ Found beat for conversion:
  Beat ID: 62941129-91ef-4608-aa9a-3dc47c142f40
  Name: Vibe Track
  MP3 Path: output/beats/2025-12/13/e43e6555a63e0d2a97a997715f99c0a3.mp3
  Suno Task ID: e43e6555a63e0d2a97a997715f99c0a3
  Suno Audio ID: 6d488253-baba-4847-8853-ba61ad599628

📤 Submitting WAV conversion request...

✅ WAV conversion submitted:
  WAV Task ID: wav-12345

⏳ Polling for completion (this may take 2-5 minutes)...

  Attempt 1/60: processing
  Attempt 2/60: processing
  ...
  Attempt 15/60: SUCCESS

📥 Downloading WAV file...

✅ WAV file saved:
  Local Path: /Users/.../output/beats-wav/2025-12/13/62941129....wav
  Relative Path: output/beats-wav/2025-12/13/62941129....wav

=============================================================
✨ WAV Conversion Test PASSED! ✨
=============================================================

📊 Summary:
  Beat: Vibe Track
  MP3: output/beats/2025-12/13/e43e6555a63e0d2a97a997715f99c0a3.mp3
  WAV: output/beats-wav/2025-12/13/62941129....wav
  Conversion Time: 150 seconds
```

---

## 📁 File Structure

### Storage Organization

```
output/
├── beats/              # MP3 files (320kbps)
│   └── 2025-12/
│       └── 13/
│           └── {taskId}.mp3
│
└── beats-wav/          # WAV files (44.1kHz 16-bit) - on-demand
    └── 2025-12/
        └── 13/
            └── {beatId}.wav
```

### File Naming

- **MP3**: Named by Suno `taskId` (generation task)
- **WAV**: Named by `beatId` (database record)

---

## 🔧 Configuration

### Environment Variables

```env
# WAV conversion settings
WAV_OUTPUT_DIR="./output/beats-wav"
SUNO_WAV_CALLBACK_URL="https://your-domain.com/api/callbacks/suno/wav"

# Suno API (reuse existing)
SUNO_API_KEYS="key1,key2,key3"
```

### Webhook Setup

Suno sẽ gọi webhook khi conversion hoàn thành:

```
POST https://your-domain.com/api/callbacks/suno/wav

Body:
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "wav-task-id",
    "status": "SUCCESS",
    "response": {
      "sunoData": [{
        "id": "audio-id",
        "audioUrl": "https://musicfile.api.box/...wav"
      }]
    }
  }
}
```

System sẽ:
1. Download WAV file
2. Save to local storage
3. Update database `wavUrl` và `wavConversionStatus`

---

## 💰 BeatStars Integration

### Use Cases

| License Type | Price | File Required | When to Convert |
|-------------|-------|---------------|-----------------|
| **MP3 Lease** | $25 | MP3 only | ❌ No conversion |
| **WAV Lease** | $49 | WAV only | ✅ Convert on purchase |
| **Trackout** | $99 | MP3 + WAV + Stems | ✅ Convert on purchase |
| **Exclusive** | $499 | All files | ✅ Convert on purchase |

### Workflow Example

```typescript
// When user purchases WAV Lease
app.post('/purchase', async (req, res) => {
  const { beatId, licenseType } = req.body;
  
  // If license requires WAV
  if (licenseType === 'wav_lease' || licenseType === 'exclusive') {
    // Check if WAV already exists
    const beat = await beatRepository.getBeatById(beatId);
    
    if (!beat.wavUrl) {
      // Trigger conversion
      await fetch(`http://localhost:3000/api/beats/${beatId}/convert-wav`, {
        method: 'POST'
      });
      
      // Notify user (conversion takes 2-5 minutes)
      return res.json({
        status: 'processing',
        message: 'Your WAV file is being prepared. You will receive an email when ready.'
      });
    }
    
    // WAV already exists, deliver immediately
    return res.json({
      status: 'ready',
      downloadUrl: beat.wavUrl
    });
  }
});
```

---

## 📊 Database Schema

```prisma
model Beat {
  // ... existing fields
  
  // WAV conversion (on-demand)
  wavUrl              String?  // Local WAV file path
  wavConversionStatus String?  @default("not_started")
  wavTaskId           String?  // Suno WAV task ID
  sunoTaskId          String?  // Original generation task ID
  sunoAudioId         String?  // Audio ID for conversion
}
```

---

## 🧪 Testing

### Test Scenarios

1. **Fresh Conversion** - Beat chưa có WAV
2. **Already Converted** - Beat đã có WAV
3. **Conversion In Progress** - Request duplicate
4. **Missing Suno IDs** - Beat không có taskId/audioId
5. **Conversion Failed** - Suno API error

### Test Script

```bash
# Generate a beat first
npx ts-node scripts/test-orchestrator.ts

# Then test conversion
npx ts-node scripts/test-wav-conversion.ts
```

---

## ⚠️ Important Notes

### Storage Considerations

- WAV files ~10x lớn hơn MP3
- 1 beat MP3 (320kbps, 3 min) = ~7 MB
- Same beat WAV (44.1kHz 16-bit) = ~60-70 MB
- **Không tạo sẵn WAV** để tiết kiệm storage

### API Credits

- Mỗi conversion tốn 1 API call
- Convert **chỉ khi có buyer** yêu cầu WAV
- WAV URL from Suno có thời hạn 15 ngày

### Quality

- WAV format: 44.1kHz, 16-bit, stereo
- Lossless audio (không mất chất lượng)
- Phù hợp cho BeatStars WAV Lease

---

## 🔍 Troubleshooting

### Issue: "Beat is missing Suno task/audio IDs"

**Cause**: Beat được tạo trước khi có WAV support

**Solution**: 
- Chỉ convert được beats mới (có `sunoTaskId` và `sunoAudioId`)
- Re-generate beat bằng orchestrator mới

### Issue: Conversion timeout

**Cause**: Suno API quá tải hoặc network issues

**Solution**:
- Retry sau 5-10 phút
- Check Suno API status
- Verify webhook URL accessible

### Issue: WAV file download failed

**Cause**: Disk space, permissions, hoặc URL expired

**Solution**:
- Check disk space: `df -h`
- Check permissions: `chmod 755 output/beats-wav`
- Suno WAV URLs expire sau 15 ngày

---

## 📈 Performance

### Conversion Times

| File Length | Conversion Time | Download Time | Total |
|------------|-----------------|---------------|-------|
| 2 minutes | ~2-3 minutes | ~10 seconds | ~3 min |
| 3 minutes | ~3-4 minutes | ~15 seconds | ~4 min |
| 4+ minutes | ~4-5 minutes | ~20 seconds | ~5 min |

### Optimization Tips

1. **Batch Processing**: Queue multiple conversions
2. **Cache Strategy**: Keep popular beats in WAV
3. **Cleanup**: Delete old WAV files not purchased
4. **CDN**: Use CDN for WAV delivery if high demand

---

## 🎯 Next Steps

1. ✅ WAV Conversion - **DONE**
2. 🔲 BPM Detection - Analyze audio for BeatStars
3. 🔲 Preview Generator - 30-second clips
4. 🔲 Stems Separation - For Trackout License
5. 🔲 Automated Upload - BeatStars API integration

---

## 📞 Support

- Documentation: `/docs/COMMERCIAL_OPTIMIZATION.md`
- API Docs: `https://docs.sunoapi.org/suno-api/convert-to-wav-format`
- Logs: `./logs/app.log`

---

> **Best Practice**: Chỉ convert WAV khi có buyer yêu cầu để tối ưu storage và API credits. MP3 320kbps đủ cho preview và MP3 Lease.
