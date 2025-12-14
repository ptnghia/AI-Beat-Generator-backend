# 🎵 AI Beat Generator - API Documentation

**Base URL**: `https://beat.optiwellai.com`  
**Alternative**: `http://localhost:4000`

---

## ✅ Public Endpoints

### Health Check
```bash
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-13T21:08:17.966Z",
  "uptime": 201.072996085
}
```

### Statistics
```bash
GET /api/stats
```
**Response:**
```json
{
  "beats": {
    "total": 0,
    "byGenre": {},
    "byMood": {},
    "recentCount": 0
  },
  "apiKeys": {
    "total": 0,
    "active": 0,
    "exhausted": 0
  },
  "system": {
    "uptime": "213s",
    "lastBeatGenerated": null,
    "totalBeatsToday": 0
  }
}
```

---

## 🎵 Beat Management Endpoints

### List Beats
```bash
GET /api/beats?page=1&limit=20&genre=trap&mood=energetic
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `genre` (optional): Filter by genre
- `mood` (optional): Filter by mood
- `style` (optional): Filter by style

**Response:**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### Get Beat Details
```bash
GET /api/beats/:id
```

### Get Pending Beats (No Files)
```bash
GET /api/beats/pending/list
```

### Get Enhanceable Beats
```bash
GET /api/beats/enhanceable/list
```

### Retry Beat Generation
```bash
POST /api/beats/:id/retry-generation
```

### Convert Beat to WAV
```bash
POST /api/beats/:id/convert-wav
```

### Check WAV Conversion Status
```bash
GET /api/beats/:id/wav-status
```

### Enhance Beat
```bash
POST /api/beats/:id/enhance
Content-Type: application/json

{
  "enhancementType": "mastering",
  "options": {}
}
```

---

## 📤 File Upload Endpoints

### Upload Beat Files
```bash
POST /api/upload/:id/upload
Content-Type: multipart/form-data

Form Data:
- primaryFile: MP3/WAV file (required)
- alternateFile: MP3/WAV file (optional)
- coverArt: PNG/JPG image (optional)
- preview: MP3 preview file (optional)
```

### Get Beat Files
```bash
GET /api/upload/:id/files
```

**Response:**
```json
{
  "beatId": "xxx",
  "beatName": "Trap Beat #1",
  "files": {
    "primary": {
      "exists": true,
      "url": "/beats/trap-beat-1.mp3",
      "size": 5242880
    },
    "alternate": null,
    "coverArt": null,
    "preview": null,
    "wav": null
  }
}
```

---

## 🔐 Admin Authentication

### Login
```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "xxx",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Get Current User
```bash
GET /api/admin/me
Authorization: Bearer <token>
```

### Change Password
```bash
POST /api/admin/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

### List Admin Users
```bash
GET /api/admin/users
Authorization: Bearer <token>
```

---

## 🔔 Webhook Callbacks (Suno Integration)

### Suno Music Generation Callback
```bash
POST /api/callbacks/suno
Content-Type: application/json

{
  "jobId": "xxx",
  "status": "completed",
  "data": {}
}
```

### Suno WAV Conversion Callback
```bash
POST /api/callbacks/suno/wav
Content-Type: application/json

{
  "taskId": "xxx",
  "status": "completed",
  "wavUrl": "https://..."
}
```

### Test Callback
```bash
GET /api/callbacks/suno/test
```

---

## 🧪 Testing Examples

### cURL Examples

**Test Health:**
```bash
curl https://beat.optiwellai.com/health
```

**Get Stats:**
```bash
curl https://beat.optiwellai.com/api/stats
```

**List Beats:**
```bash
curl https://beat.optiwellai.com/api/beats
```

**Get Beat by ID:**
```bash
curl https://beat.optiwellai.com/api/beats/xxx-beat-id
```

**Admin Login:**
```bash
curl -X POST https://beat.optiwellai.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

**Upload Beat File:**
```bash
curl -X POST https://beat.optiwellai.com/api/upload/xxx-beat-id/upload \
  -F "primaryFile=@beat.mp3" \
  -F "coverArt=@cover.png"
```

---

## 📊 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 🔒 Security Headers

The API includes security headers via Helmet.js:
- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-DNS-Prefetch-Control

---

## ⚡ Rate Limiting

Default rate limits:
- Window: 60 seconds
- Max Requests: 100 per window

Configure via environment variables:
```env
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads use multipart/form-data
- Admin endpoints require JWT authentication
- Pagination is available on list endpoints
- All responses return JSON

---

**Last Updated**: December 13, 2024  
**API Version**: 1.0.0  
**Production URL**: https://beat.optiwellai.com
