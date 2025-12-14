# Phân Tích: File *_temp.wav Từ Đâu Có

**Ngày:** 13/12/2025  
**Vấn đề:** File `*_temp.wav` bị bỏ quên sau khi detect BPM

---

## 🔍 Nguồn Gốc File `*_temp.wav`

### Từ Đâu Tạo Ra?

File `*_temp.wav` được tạo ra bởi **BPM Detection Service** trong file:
- **File:** [`src/services/bpm-detection.service.ts`](../src/services/bpm-detection.service.ts)
- **Function:** `convertToWav()` (line 195)
- **Mục đích:** Convert MP3 sang WAV để phân tích BPM chính xác hơn

### Code Tạo File

```typescript
private async convertToWav(audioFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wavPath = audioFilePath.replace(/\.[^.]+$/, '_temp.wav');
    
    ffmpeg(audioFilePath)
      .output(wavPath)
      .audioFrequency(44100)
      .audioChannels(1)
      .on('end', () => resolve(wavPath))
      .on('error', (err) => reject(err))
      .run();
  });
}
```

### Khi Nào Được Gọi?

1. **Orchestrator Service** gọi BPM detection sau khi download beat
2. BPM detection service convert MP3 → WAV để phân tích
3. File `jobId.mp3` → `jobId_temp.wav`

---

## ⚠️ Vấn Đề Phát Hiện

### File Không Được Cleanup Đúng Cách

Trong method `detectWithEssentia()`:

```typescript
// ✅ CÓ cleanup
const wavPath = audioFilePath.endsWith('.wav') 
  ? audioFilePath 
  : await this.convertToWav(audioFilePath);

// ... detect BPM ...

// ✅ CLEANUP TEMP FILE
if (wavPath !== audioFilePath) {
  fs.unlinkSync(wavPath);  // Xóa file temp
}
```

**NHƯNG:** Khi Essentia fail và fallback sang các method khác, file temp không được cleanup!

### Luồng Thực Tế

```
1. detectBPM() được gọi
   ↓
2. Thử detectWithEssentia() → FAIL (vì không có Python/Essentia)
   ↓
3. Fallback sang detectWithSoX() → FAIL (không implement)
   ↓
4. Fallback sang estimateBPM() → SUCCESS
   ↓
5. File *_temp.wav vẫn còn ở đĩa! ❌
```

---

## 📊 Kiểm Tra Thực Tế

### File Temp Hiện Tại

```bash
$ ls -lh output/beats/2025-12/13/*_temp.wav
-rw-rw-r-- 1 lifetechadmin lifetechadmin 20M Dec 13 21:37 32c30c9beab304330456b3adc2bd6973_temp.wav
```

**Kích thước:** 20 MB (lớn!)  
**Lý do:** File WAV không nén, 44.1kHz mono

### Vấn Đề

- ❌ File temp không được xóa
- ❌ Tốn dung lượng đĩa (20 MB/beat)
- ❌ Tích lũy theo thời gian
- ❌ Không cần thiết sau khi detect BPM xong

---

## ✅ Giải Pháp

### Option 1: Cleanup Trong detectBPM() (Recommended)

Cleanup file temp ở top-level function để đảm bảo luôn xóa:

```typescript
async detectBPM(audioFilePath: string): Promise<BPMDetectionResult> {
  const startTime = Date.now();
  let tempWavPath: string | null = null;

  try {
    // ... existing detection logic ...
    
    // Try Essentia
    try {
      const result = await this.detectWithEssentia(audioFilePath);
      return result;
    } catch (essentiaError) {
      // Store temp file path for cleanup
      tempWavPath = audioFilePath.replace(/\.[^.]+$/, '_temp.wav');
    }
    
    // ... other methods ...
    
  } finally {
    // ✅ ALWAYS cleanup temp file
    if (tempWavPath && fs.existsSync(tempWavPath)) {
      try {
        fs.unlinkSync(tempWavPath);
        loggingService.info('Cleaned up temp WAV file', {
          service: 'BPMDetectionService',
          tempFile: tempWavPath
        });
      } catch (cleanupError) {
        loggingService.warn('Failed to cleanup temp WAV', {
          service: 'BPMDetectionService',
          error: cleanupError
        });
      }
    }
  }
}
```

### Option 2: Script Cleanup Định Kỳ

Tạo script xóa file temp cũ:

```bash
#!/bin/bash
# cleanup-temp-wav.sh

find output/beats -name "*_temp.wav" -mtime +1 -delete
echo "Cleaned up old temp WAV files"
```

Thêm vào crontab:
```
0 3 * * * /path/to/cleanup-temp-wav.sh
```

### Option 3: Không Convert WAV

Vì hiện tại đang dùng `estimateBPM()` (không cần WAV), có thể skip conversion:

```typescript
// Nếu không có Essentia/SoX, không cần convert WAV
if (!this.hasEssentiaInstalled() && !this.hasSoXInstalled()) {
  return this.estimateBPM(audioFilePath); // Skip conversion
}
```

---

## 🎯 Khuyến Nghị

### Ngắn Hạn
1. ✅ **Xóa file temp hiện tại:**
   ```bash
   find output/beats -name "*_temp.wav" -delete
   ```

2. ✅ **Fix code để cleanup tự động** (Option 1)

### Dài Hạn
1. Cân nhắc cài đặt Essentia để BPM detection chính xác hơn
2. Hoặc tắt BPM detection nếu không cần thiết
3. Thêm monitoring để phát hiện file temp bị bỏ quên

---

## 📝 Chi Tiết Kỹ Thuật

### Tại Sao Convert Sang WAV?

- **MP3:** Lossy compression, khó phân tích chính xác
- **WAV:** Raw audio data, phù hợp cho signal processing
- **Essentia/SoX:** Yêu cầu WAV input để phân tích BPM

### Kích Thước File

```
MP3 (320kbps, 3 min):  ~7 MB
WAV (44.1kHz mono, 3 min): ~20 MB

Chênh lệch: ~13 MB/beat
```

Với 100 beats → **1.3 GB lãng phí!**

---

## 🔧 Implementation

Xem PR/commit để fix vấn đề này.

**Ưu tiên:** HIGH  
**Tác động:** Tiết kiệm storage, tránh file rác  
**Effort:** LOW (1 hour)

---

**Tóm tắt:** File `*_temp.wav` là file tạm được tạo ra khi detect BPM, nhưng không được cleanup đúng cách. Cần fix code để tự động xóa sau khi sử dụng xong.
