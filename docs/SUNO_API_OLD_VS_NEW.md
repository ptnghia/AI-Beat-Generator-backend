# So Sánh Suno API: Phiên Bản Cũ vs Mới

## 📌 Tổng Quan

| Khía Cạnh | Phiên Bản Cũ | Phiên Bản Mới |
|-----------|---------------|---------------|
| **Base URL** | `https://api.sunoapi.org` | `https://api.sunoapi.org` |
| **Documentation** | https://old-docs.sunoapi.org/ | https://docs.sunoapi.org/ |
| **Authentication** | Bearer Token | Bearer Token |
| **Response Format** | JSON | JSON |

---

## 🎵 Generate Music Endpoint

### Endpoint Path

| Cũ | Mới |
|----|-----|
| ❓ Không rõ trong docs cũ | ✅ `/api/v1/generate` |

### Request Format

#### Phiên Bản Cũ (Theo Code Hiện Tại)
```typescript
// SAI - Code cũ trong dự án
POST /api/v1/gateway/generate/music
Headers: {
  'api-key': apiKey  // SAI!
}
Body: {
  title: "Beat Name",
  tags: "instrumental, beat",
  prompt: "description",
  mv: "chirp-v3-5",
  continue_clip_id: null,
  continue_at: null
}
```

#### Phiên Bản Mới (Đúng)
```typescript
// ĐÚNG - API mới
POST /api/v1/generate
Headers: {
  'Authorization': `Bearer ${apiKey}`  // ĐÚNG!
}
Body: {
  customMode: true,
  instrumental: true,
  model: "V4_5ALL",
  style: "instrumental, beat",
  title: "Beat Name",
  prompt: "description",
  callBackUrl: "https://callback-url.com"  // BẮT BUỘC
}
```

### Models

#### Phiên Bản Cũ
- `chirp-v3-5` (V3.5)
- `chirp-v4` (V4)

#### Phiên Bản Mới
- ✨ `V5` - Mới nhất, nhanh nhất
- ⭐ `V4_5ALL` - Cấu trúc bài hát tốt nhất
- 💎 `V4_5PLUS` - Âm thanh phong phú
- 🚀 `V4_5` - Prompt thông minh
- 🎵 `V4` - Vocal chất lượng cao

### Response Structure

#### Phiên Bản Cũ (Đoán Theo Code)
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "song_id": "xxx"
  }
}
```

#### Phiên Bản Mới (Đã Test)
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

## 📊 Check Status Endpoint

### Phiên Bản Cũ
```
Endpoint: ❓ Không rõ
```

### Phiên Bản Mới
```
GET /api/v1/generate/record-info?taskId={taskId}

Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "xxx",
    "status": "SUCCESS|PENDING|GENERATING|FAILED",
    "response": {
      "sunoData": [
        {
          "id": "uuid",
          "audioUrl": "https://...",
          "sourceAudioUrl": "https://cdn1.suno.ai/...",
          "imageUrl": "https://...",
          "title": "Song Title",
          "tags": "tags here",
          "duration": 278.92,
          "modelName": "chirp-auk-turbo"
        }
      ]
    }
  }
}
```

---

## 💰 Get Credits Endpoint

### Phiên Bản Cũ
```
GET /api/v1/get-credits
✅ Có trong docs
```

### Phiên Bản Mới
```
GET /api/v1/get-credits
❌ 404 Not Found (khi test)
⚠️ Có trong docs nhưng không hoạt động
```

---

## 🎼 Các Features Khác

| Feature | Cũ | Mới | Notes |
|---------|-----|-----|-------|
| Generate Music | ✅ | ✅ | Improved |
| Generate Lyrics | ✅ | ✅ | |
| Extend Music | ✅ | ✅ | |
| WAV Conversion | ✅ | ✅ | |
| Vocal Removal | ✅ | ✅ | |
| Music Video | ✅ | ✅ | |
| Upload & Cover | ❓ | ✅ | New |
| Upload & Extend | ❓ | ✅ | New |
| Add Vocals | ❓ | ✅ | New |
| Add Instrumental | ❓ | ✅ | New |
| Cover Music | ❓ | ✅ | New |
| Generate Persona | ❓ | ✅ | New |
| Boost Music Style | ❓ | ✅ | New |

---

## 🔄 Migration Guide

### Từ Code Cũ Sang Code Mới

#### 1. Update Base URL (Nếu Cần)
```typescript
// Giữ nguyên
private readonly SUNO_API_BASE = 'https://api.sunoapi.org';
```

#### 2. Fix Authentication
```typescript
// ❌ CŨ
headers: {
  'api-key': apiKey
}

// ✅ MỚI
headers: {
  'Authorization': `Bearer ${apiKey}`
}
```

#### 3. Update Generate Endpoint
```typescript
// ❌ CŨ
`${this.SUNO_API_BASE}/api/v1/gateway/generate/music`

// ✅ MỚI
`${this.SUNO_API_BASE}/api/v1/generate`
```

#### 4. Update Request Body
```typescript
// ❌ CŨ
{
  title: beatName || "Instrumental Beat",
  tags: tags || "instrumental, beat, music",
  prompt: prompt,
  mv: "chirp-v3-5",
  continue_clip_id: null,
  continue_at: null
}

// ✅ MỚI
{
  customMode: true,
  instrumental: true,
  model: "V4_5ALL",
  style: tags || "instrumental, beat, music",
  title: beatName || "Instrumental Beat",
  prompt: prompt,
  callBackUrl: process.env.CALLBACK_URL || "https://webhook.site/xxx"
}
```

#### 5. Update Response Parsing
```typescript
// ❌ CŨ
if (response.data.code !== 0) {
  throw new Error(response.data.msg);
}
const jobId = response.data.data?.song_id;

// ✅ MỚI
if (response.data.code !== 200) {
  throw new Error(response.data.msg);
}
const taskId = response.data.data.taskId;
```

#### 6. Update Status Check
```typescript
// ❌ CŨ (đoán)
const response = await axios.get(
  `${this.SUNO_API_BASE}/api/v1/check-status?song_id=${songId}`
);

// ✅ MỚI
const response = await axios.get(
  `${this.SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  }
);
```

#### 7. Update Track Data Access
```typescript
// ❌ CŨ (đoán)
const tracks = response.data.data || [];
const audioUrl = tracks[0]?.audio_url;

// ✅ MỚI
const tracks = response.data.data.response?.sunoData || [];
const audioUrl = tracks[0]?.audioUrl; // Camel case!
const imageUrl = tracks[0]?.imageUrl;
const duration = tracks[0]?.duration;
```

---

## 🎯 Key Differences

### 1. Authentication
- **Cũ (Sai):** `'api-key': apiKey`
- **Mới (Đúng):** `'Authorization': Bearer ${apiKey}`

### 2. Endpoint Structure
- **Cũ:** `/api/v1/gateway/generate/music`
- **Mới:** `/api/v1/generate`

### 3. Response Code
- **Cũ:** `code: 0` = success
- **Mới:** `code: 200` = success

### 4. Task ID Field
- **Cũ:** `song_id`
- **Mới:** `taskId`

### 5. Model Names
- **Cũ:** `chirp-v3-5`, `chirp-v4`
- **Mới:** `V4`, `V4_5`, `V4_5PLUS`, `V4_5ALL`, `V5`

### 6. Required Parameters
- **Cũ:** Không rõ về callBackUrl
- **Mới:** `callBackUrl` là **BẮT BUỘC**

### 7. Response Structure
- **Cũ:** Track data trong `data[]`
- **Mới:** Track data trong `response.sunoData[]`

### 8. Field Names
- **Cũ:** snake_case (`audio_url`, `image_url`)
- **Mới:** camelCase (`audioUrl`, `imageUrl`)

---

## 📝 Recommendations

### Ưu Tiên Cao
1. ✅ Fix authentication header ngay lập tức
2. ✅ Update endpoint path
3. ✅ Update response parsing
4. ✅ Add callBackUrl parameter

### Ưu Tiên Trung Bình
1. 🔄 Update model names sang V4_5ALL
2. 🔄 Implement callback endpoint handler
3. 🔄 Update error handling cho code 200

### Ưu Tiên Thấp
1. 📚 Update documentation
2. 🧪 Add more tests
3. 🎨 Optimize prompt generation

---

## ⚠️ Breaking Changes

### Không Tương Thích Ngược
1. Authentication header format khác hoàn toàn
2. Endpoint path khác
3. Response structure khác
4. Field names khác (snake_case → camelCase)
5. Success code khác (0 → 200)

### Cần Update Code
- ❌ Code cũ **KHÔNG THỂ** hoạt động với API mới
- ✅ Cần update toàn bộ integration code
- 🔧 Cần test lại toàn bộ flow

---

## 🚀 Quick Migration Checklist

- [ ] Update authentication header
- [ ] Change endpoint from `/gateway/generate/music` to `/generate`
- [ ] Add `callBackUrl` parameter
- [ ] Update request body format
- [ ] Change success code check from `0` to `200`
- [ ] Update response parsing (sunoData)
- [ ] Change field names from snake_case to camelCase
- [ ] Update model names
- [ ] Implement callback handler
- [ ] Update tests

---

## 🎓 Lessons Learned

1. **Always check documentation versions** - API có thể thay đổi đáng kể
2. **Test with real API keys** - Mock mode không phát hiện API changes
3. **Authentication matters** - Header format rất quan trọng
4. **Response structure can change** - Cần parse carefully
5. **callBackUrl is now required** - Không thể optional

---

## 📚 Resources

- **New Docs:** https://docs.sunoapi.org/
- **Old Docs:** https://old-docs.sunoapi.org/
- **Test Script:** `scripts/test-suno-api.ts`
- **Summary Doc:** `docs/SUNO_API_SUMMARY.md`
- **API Key Management:** https://sunoapi.org/api-key
