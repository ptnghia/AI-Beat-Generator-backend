# Tổng Quan Suno API và Dự Án AI Music

## 📋 Tổng Quan Dự Án

### Mục đích
Hệ thống tạo beat nhạc không lời tự động sử dụng AI, tích hợp Gemini API, OpenAI API và Suno API.

### Tính Năng Chính
- ✅ Tự động tạo beat mỗi 15 phút theo catalog đã định nghĩa
- ✅ Quản lý nhiều Suno API key với round-robin rotation
- ✅ AI-enhanced prompt generation và metadata creation
- ✅ REST API để truy vấn beats và thống kê
- ✅ BeatStars optimization với SEO descriptions, pricing tiers
- ⚠️ Suno API integration (đang sử dụng mock mode)

### Tech Stack
- **Runtime:** Node.js + TypeScript
- **Database:** MySQL 8.0+ với Prisma ORM
- **APIs:** 
  - Google Gemini (Metadata generation)
  - OpenAI (Prompt generation)
  - Suno (Music generation)
- **Testing:** Jest + fast-check
- **Scheduler:** node-cron

---

## 🎵 SUNO API - Chi Tiết

### Tài Liệu Chính Thức
- **Phiên bản mới:** https://docs.sunoapi.org/
- **Phiên bản cũ:** https://old-docs.sunoapi.org/

### Base URL
```
https://api.sunoapi.org
```

### Authentication
Tất cả requests yêu cầu Bearer Token:
```bash
Authorization: Bearer YOUR_API_KEY
```

### API Keys Hiện Tại
Dự án có 4 API keys (trong file `.env`):
```
SUNO_API_KEYS="adf334014ef9a52b459be11296cb9813,8311a177910fb2facaee46a4fc170493,6fcf955620e52ee43511900ee23ca6d8,0687cc6781b69f9f11eb2ac358ba04a0"
```

**✅ API Key được test thành công:** `adf334014ef9a52b459be11296cb9813`

---

## 🚀 Suno API Endpoints

### 1. Generate Music (Chính)

**Endpoint:** `POST /api/v1/generate`

**Đây là endpoint quan trọng nhất!** Mỗi request trả về **2 bài nhạc**.

#### Request Body - Non-Custom Mode (Đơn giản nhất)
```json
{
  "customMode": false,
  "instrumental": true,
  "model": "V4_5ALL",
  "prompt": "A peaceful piano instrumental with soft melodies",
  "callBackUrl": "https://your-server.com/callback"
}
```

#### Request Body - Custom Mode (Control chi tiết)
```json
{
  "customMode": true,
  "instrumental": true,
  "model": "V4_5ALL",
  "style": "Electronic, Ambient",
  "title": "My Beat Title",
  "prompt": "A calm and relaxing electronic ambient track",
  "callBackUrl": "https://your-server.com/callback"
}
```

#### Response
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "fdc3b773fbf142a9d473d96ab46ca43c"
  }
}
```

---

### 2. Check Task Status

**Endpoint:** `GET /api/v1/generate/record-info?taskId={taskId}`

#### Response Structure
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "fdc3b773fbf142a9d473d96ab46ca43c",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "35ad7978-1d63-4e28-ae59-962a2b0c18a2",
          "audioUrl": "https://musicfile.api.box/xxx.mp3",
          "sourceAudioUrl": "https://cdn1.suno.ai/xxx.mp3",
          "imageUrl": "https://musicfile.api.box/xxx.jpeg",
          "title": "Whispered Horizons",
          "tags": "soft, instrumental, peaceful, piano-driven",
          "duration": 278.92,
          "modelName": "chirp-auk-turbo"
        }
      ]
    }
  }
}
```

---

## 📊 Task Status Flow

```
PENDING → TEXT_SUCCESS → FIRST_SUCCESS → SUCCESS
```

1. **PENDING**: Task đang chờ xử lý
2. **TEXT_SUCCESS**: Text/lyrics đã được tạo
3. **FIRST_SUCCESS**: Bài nhạc đầu tiên hoàn thành (thường sau ~90-140 giây)
4. **SUCCESS**: Tất cả bài nhạc hoàn thành (thường sau ~150-180 giây)
5. **FAILED**: Task thất bại

---

## 🎼 Model Versions

| Model | Đặc điểm | Độ dài tối đa |
|-------|----------|---------------|
| **V5** | Mới nhất, nhanh nhất | 8 phút |
| **V4_5ALL** | Cấu trúc bài hát tốt nhất | 8 phút |
| **V4_5PLUS** | Âm thanh phong phú nhất | 8 phút |
| **V4_5** | Prompt thông minh, nhanh | 8 phút |
| **V4** | Chất lượng vocal tốt nhất | 4 phút |

**Khuyến nghị:** Dùng **V4_5ALL** cho beats instrumental.

---

## 💡 Tham Số Quan Trọng

### customMode (boolean)
- `false`: Chỉ cần `prompt`, lyrics tự động tạo
- `true`: Cần `style`, `title`, và `prompt` (nếu có vocals)

### instrumental (boolean)
- `true`: Nhạc không lời (instrumental only)
- `false`: Có vocals/lyrics

### callBackUrl (string) - **BẮT BUỘC**
- URL để nhận thông báo khi task hoàn thành
- Nếu không có server, dùng webhook.site để test

### Giới hạn độ dài

**Non-custom mode:**
- Prompt: 500 ký tự

**Custom mode:**
- Prompt: 3000 ký tự (V4), 5000 ký tự (V4_5+)
- Style: 200 ký tự (V4), 1000 ký tự (V4_5+)
- Title: 80 ký tự (V4/V4_5ALL), 100 ký tự (V4_5+)

---

## ⚠️ Lưu Ý Quan Trọng

### 1. File Storage
- ⏰ Files được lưu **15 ngày** sau đó tự động xóa
- 💾 Cần download và lưu vào storage của bạn
- 🔗 Download URLs có thể expire sớm hơn

### 2. Rate Limits
- 🚦 **20 requests mỗi 10 giây**
- ⏳ Vượt quá sẽ bị reject

### 3. Concurrency
- ⚡ API hỗ trợ high concurrency
- 🔄 Có thể submit nhiều tasks đồng thời

### 4. Response Time
- 📦 Stream URL: 30-40 giây
- 🎵 Download URL: 2-3 phút
- ✅ Full completion: 2.5-3 phút

---

## 🔧 Test Scripts

### Script Đã Tạo
File: `scripts/test-suno-api.ts`

### Cách Sử Dụng

```bash
# 1. Chỉ check credits (không hoạt động - endpoint 404)
npx ts-node scripts/test-suno-api.ts

# 2. Generate và check status
npx ts-node scripts/test-suno-api.ts --generate

# 3. Chạy full test (generate + wait completion)
npx ts-node scripts/test-suno-api.ts --full

# 4. Check status của task cụ thể
npx ts-node scripts/test-suno-api.ts --check <taskId>

# 5. Đợi task hoàn thành
npx ts-node scripts/test-suno-api.ts --wait <taskId>
```

### Test Result (Đã Chạy)
```
✅ API Key hoạt động: adf334014ef9a52b459be11296cb9813
✅ Generate music thành công
✅ Task hoàn thành sau ~150 giây
✅ Nhận được 2 bài nhạc:
   - Whispered Horizons (278.92s)
   - Whispered Horizons (217.52s)
```

---

## 🔨 Cần Cập Nhật Code

### music.service.ts
File hiện tại có vấn đề:
1. ❌ Endpoint cũ: `/api/v1/gateway/generate/music` (không đúng)
2. ❌ Header sai: `'api-key': apiKey` (phải là Bearer token)
3. ❌ Response structure cũ

### Cần update:

```typescript
// ❌ WRONG
const response = await axios.post(
  `${this.SUNO_API_BASE}/api/v1/gateway/generate/music`,
  { /* ... */ },
  {
    headers: {
      'api-key': apiKey, // SAI
      'Content-Type': 'application/json'
    }
  }
);

// ✅ CORRECT
const response = await axios.post(
  `${this.SUNO_API_BASE}/api/v1/generate`,
  {
    customMode: true,
    instrumental: true,
    model: "V4_5ALL",
    style: tags,
    title: beatName,
    prompt: prompt,
    callBackUrl: "https://your-server.com/callback"
  },
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`, // ĐÚNG
      'Content-Type': 'application/json'
    }
  }
);

// Response structure
if (response.data.code !== 200) {
  throw new Error(response.data.msg);
}
const taskId = response.data.data.taskId;

// Check status
const statusResponse = await axios.get(
  `${this.SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  }
);

// Get audio URLs
const tracks = statusResponse.data.data.response?.sunoData || [];
const audioUrl = tracks[0]?.audioUrl; // Lấy bài đầu tiên
```

---

## 📚 API Features Khác (Chưa Test)

### Extend Music
```
POST /api/v1/generate/extend
```
Extend existing music tracks

### Upload and Cover
```
POST /api/v1/upload-and-cover
```
Transform existing audio with new styles

### Separate Vocals
```
POST /api/v1/vocal-removal/generate
```
Tách vocals khỏi instrumental

### Generate Lyrics
```
POST /api/v1/lyrics
```
Generate lyrics riêng lẻ

### Music Video
```
POST /api/v1/music-video/generate
```
Tạo video từ nhạc

### WAV Conversion
```
POST /api/v1/wav-conversion/generate
```
Convert sang định dạng WAV

---

## 🎯 Next Steps Để Hoàn Thiện Dự Án

### 1. Fix music.service.ts (PRIORITY)
- [ ] Update endpoint từ `/gateway/generate/music` → `/generate`
- [ ] Fix authentication header
- [ ] Update response parsing (sunoData)
- [ ] Implement proper callback handling
- [ ] Add retry logic cho failed tasks

### 2. Implement Callback Endpoint
```typescript
// src/api/routes/suno-callback.ts
app.post('/api/callbacks/suno', async (req, res) => {
  const { code, data } = req.body;
  
  if (code === 200) {
    const tracks = data.response.sunoData;
    // Save to database
    // Download audio files
    // Update beat status
  }
  
  res.status(200).json({ status: 'received' });
});
```

### 3. File Management
- [ ] Download audio files from Suno URLs
- [ ] Save to local storage (`output/beats/`)
- [ ] Update database with local paths
- [ ] Cleanup expired files

### 4. Scheduler Service (Task 13)
- [ ] Implement cron-based generation
- [ ] Rotate API keys properly
- [ ] Handle rate limits
- [ ] Queue management

### 5. Testing
- [ ] Integration tests với real Suno API
- [ ] Test API key rotation
- [ ] Test error handling
- [ ] Test rate limiting

---

## 📞 Support

- **Email:** support@sunoapi.org
- **Docs:** https://docs.sunoapi.org/
- **Status:** Check API status page

---

## 🔐 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid parameters |
| 401 | Unauthorized |
| 404 | Not found |
| 405 | Rate limited |
| 413 | Content too large |
| 429 | Insufficient credits |
| 430 | Call frequency too high |
| 455 | System maintenance |
| 500 | Server error |

---

## 📊 Kết Luận Test

### ✅ Đã Xác Nhận
1. API key hoạt động tốt
2. Generate music endpoint hoạt động
3. Response structure đã rõ ràng
4. Task completion time: ~2.5-3 phút
5. Mỗi request trả về 2 bài nhạc

### ⚠️ Cần Fix
1. music.service.ts dùng endpoint/format cũ
2. Cần implement callback endpoint
3. Cần download và lưu files
4. Get credits endpoint không hoạt động (404)

### 🎯 Ready to Integrate
- Script test hoạt động tốt
- Đã hiểu rõ API structure
- Sẵn sàng update code chính
