 # Webhook Setup và Testing Guide

## 🔔 Suno API Callback Webhook

### Tổng Quan

Dự án đã implement webhook endpoint để nhận callbacks từ Suno API khi music generation hoàn thành hoặc có update.

---

## 📍 Endpoint

### Local Development
```
POST http://localhost:3000/api/callbacks/suno
```

### Production
```
POST https://your-domain.com/api/callbacks/suno
```

---

## 🔧 Setup

### 1. Cập nhật .env với Callback URL

**Development (dùng ngrok hoặc localtunnel):**
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy HTTPS URL từ ngrok (e.g., https://abc123.ngrok.io)
# Update .env
SUNO_CALLBACK_URL="https://abc123.ngrok.io/api/callbacks/suno"
```

**Production:**
```bash
SUNO_CALLBACK_URL="https://your-domain.com/api/callbacks/suno"
```

### 2. Start API Server
```bash
npm run dev:api
```

### 3. Test Webhook
```bash
npx ts-node scripts/test-webhook.ts
```

---

## 📨 Callback Data Format

### TEXT_SUCCESS
Được gọi khi lyrics/text đã được generate:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "a2d0d44500f02c381b8799682da4dc39",
    "status": "TEXT_SUCCESS",
    "response": {}
  }
}
```

### FIRST_SUCCESS
Được gọi khi track đầu tiên hoàn thành:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "a2d0d44500f02c381b8799682da4dc39",
    "status": "FIRST_SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "35ad7978-1d63-4e28-ae59-962a2b0c18a2",
          "audioUrl": "https://musicfile.api.box/xxx.mp3",
          "sourceAudioUrl": "https://cdn1.suno.ai/xxx.mp3",
          "imageUrl": "https://musicfile.api.box/xxx.jpeg",
          "title": "Beat Title",
          "tags": "instrumental, beat",
          "duration": 180.5,
          "modelName": "chirp-auk-turbo"
        }
      ]
    }
  }
}
```

### SUCCESS
Được gọi khi TẤT CẢ tracks hoàn thành (thường 2 tracks):
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "a2d0d44500f02c381b8799682da4dc39",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "35ad7978-1d63-4e28-ae59-962a2b0c18a2",
          "audioUrl": "https://musicfile.api.box/xxx.mp3",
          "duration": 278.92
        },
        {
          "id": "130e3eee-8b01-4a44-a626-7b9bb007bf84",
          "audioUrl": "https://musicfile.api.box/yyy.mp3",
          "duration": 217.52
        }
      ]
    }
  }
}
```

### FAILED
Được gọi khi generation thất bại:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "a2d0d44500f02c381b8799682da4dc39",
    "status": "FAILED",
    "errorMessage": "Generation failed due to..."
  }
}
```

---

## 🔄 Callback Flow

```
Suno API
   ↓
   📨 TEXT_SUCCESS callback
   ↓
   📨 FIRST_SUCCESS callback (track 1 ready)
   ↓
   📨 SUCCESS callback (all tracks ready)
   ↓
Your Server (/api/callbacks/suno)
   ↓
   ✅ Log event
   ✅ Download audio file
   ✅ Update database
   ↓
   📤 Return 200 OK
```

---

## 💻 Implementation

### File: src/api/routes/callbacks.ts

```typescript
router.post('/suno', async (req, res) => {
  const { taskId, status, response } = req.body.data;
  
  switch (status) {
    case 'TEXT_SUCCESS':
      // Text/lyrics generated
      break;
      
    case 'FIRST_SUCCESS':
      // First track ready - có thể download ngay
      break;
      
    case 'SUCCESS':
      // All tracks ready - download và save
      const track = response.sunoData[0];
      await musicService.downloadAndSaveFile(
        track.audioUrl,
        taskId
      );
      break;
      
    case 'FAILED':
      // Handle failure
      break;
  }
  
  res.json({ status: 'received' });
});
```

---

## 🧪 Testing

### Manual Test với curl
```bash
# Test health
curl http://localhost:3000/api/callbacks/suno/test

# Test SUCCESS callback
curl -X POST http://localhost:3000/api/callbacks/suno \
  -H "Content-Type: application/json" \
  -d '{
    "code": 200,
    "msg": "success",
    "data": {
      "taskId": "test-123",
      "status": "SUCCESS",
      "response": {
        "sunoData": [{
          "id": "test-id",
          "audioUrl": "https://example.com/test.mp3",
          "duration": 180
        }]
      }
    }
  }'
```

### Automated Test Script
```bash
npx ts-node scripts/test-webhook.ts
```

Output mong đợi:
```
🧪 Testing Suno Webhook Endpoint

1️⃣ Testing webhook health check...
✅ Health check: { status: 'ok', message: '...' }

2️⃣ Testing TEXT_SUCCESS callback...
✅ TEXT_SUCCESS response: { status: 'received', ... }

3️⃣ Testing SUCCESS callback with audio...
✅ SUCCESS response: { status: 'received', ... }

4️⃣ Testing FAILED callback...
✅ FAILED response: { status: 'received', ... }

✅ All webhook tests completed!
```

---

## 🔐 Security

### Best Practices

1. **Verify Request Origin**
   - Check Suno IP hoặc signature nếu có
   - Add authentication token

2. **Rate Limiting**
   - Webhook endpoint nên bỏ qua rate limit
   - Đã implement: callback routes không có rate limit

3. **Idempotency**
   - Handle duplicate callbacks
   - Track processed taskIds

4. **Error Handling**
   - Always return 200 OK
   - Log errors cho monitoring

---

## 📊 Monitoring

### Check Logs
```bash
tail -f logs/app.log | grep "SunoCallbackRoute"
```

### Log Format
```json
{
  "level": "info",
  "service": "SunoCallbackRoute",
  "message": "Suno callback received",
  "taskId": "a2d0d44500f02c381b8799682da4dc39",
  "status": "SUCCESS",
  "timestamp": "2025-12-13T14:30:00Z"
}
```

---

## 🚀 Production Setup

### Using ngrok (Development/Testing)
```bash
# Start ngrok
ngrok http 3000

# Get public URL
# https://abc123.ngrok.io

# Update Suno API callBackUrl
SUNO_CALLBACK_URL="https://abc123.ngrok.io/api/callbacks/suno"
```

### Using Production Server
```bash
# Deploy to your server
# Configure domain with SSL

# Update .env
SUNO_CALLBACK_URL="https://api.yourdomain.com/api/callbacks/suno"

# Test
curl https://api.yourdomain.com/api/callbacks/suno/test
```

---

## ⚠️ Important Notes

### 1. Polling vs Callbacks
- **Với callback:** Không cần poll, Suno tự gọi webhook
- **Không có callback:** Phải poll `/generate/record-info` mỗi 10s

### 2. Callback Reliability
- Suno có thể retry nếu webhook fail
- Always return 200 OK
- Process async nếu operation lâu

### 3. Task ID Tracking
- Cần track taskId → beatId mapping
- Có thể dùng cache (Redis) hoặc database field
- Current implementation: Log taskId, cần enhance

---

## 🛠️ TODO / Enhancements

### High Priority
- [ ] Add taskId field to Beat model
- [ ] Track taskId → beatId mapping
- [ ] Update beat record khi callback SUCCESS
- [ ] Handle duplicate callbacks (idempotency)

### Medium Priority
- [ ] Add webhook authentication/signature
- [ ] Implement retry logic for failed downloads
- [ ] Add metrics/monitoring
- [ ] Cache taskId mapping (Redis)

### Low Priority
- [ ] Support multiple tracks (hiện tại chỉ lấy track đầu)
- [ ] Webhook configuration UI
- [ ] Test coverage

---

## 📝 Summary

**✅ Đã hoàn thành:**
1. ✅ Tạo webhook endpoint `/api/callbacks/suno`
2. ✅ Handle tất cả status: TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS, FAILED
3. ✅ Auto download audio khi SUCCESS
4. ✅ Logging đầy đủ
5. ✅ Test script
6. ✅ Health check endpoint

**🎯 Sẵn sàng:**
- Webhook đã hoạt động
- Có thể nhận callbacks từ Suno
- Auto download và log events
- Test script ready

**🔜 Next:**
- Setup ngrok cho development
- Test với real Suno callbacks
- Enhance taskId tracking
