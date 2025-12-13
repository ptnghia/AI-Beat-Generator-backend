# API Documentation
## Automated Beat Generation System

**Version:** 1.0  
**Base URL:** `http://localhost:3000`  
**Last Updated:** 13/12/2024

---

## 📋 Overview

REST API cho hệ thống tạo beat tự động. API cung cấp endpoints để query beats, xem chi tiết beat, và lấy thống kê hệ thống.

### Features

- ✅ Query beats với filtering và pagination
- ✅ Get beat details by ID
- ✅ System statistics
- ✅ Rate limiting (100 req/min per IP)
- ✅ Error handling
- ✅ Request logging

---

## 🔐 Authentication

Hiện tại API không yêu cầu authentication. Tất cả endpoints đều public.

---

## 🚦 Rate Limiting

- **Window:** 1 minute
- **Max Requests:** 100 requests per IP
- **Response:** 429 Too Many Requests

```json
{
  "error": "Too many requests from this IP, please try again later"
}
```

---

## 📡 Endpoints

### 1. Health Check

Kiểm tra trạng thái server.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-13T06:08:44.397Z",
  "uptime": 85.001679375
}
```

**Status Codes:**
- `200 OK` - Server đang hoạt động

---

### 2. Query Beats

Lấy danh sách beats với filtering và pagination.

**Endpoint:** `GET /api/beats`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `genre` | string | No | Filter by genre | `Drill`, `Lo-fi`, `Trap` |
| `style` | string | No | Filter by style | `UK Drill`, `Lofi Girl Style` |
| `mood` | string | No | Filter by mood | `Dark / Aggressive`, `Chill / Focus` |
| `useCase` | string | No | Filter by use case | `Rap / Freestyle`, `Study / Vlog` |
| `tags` | string | No | Comma-separated tags | `lofi,chill,study` |
| `page` | number | No | Page number (default: 1) | `1`, `2`, `3` |
| `limit` | number | No | Items per page (default: 20, max: 100) | `10`, `20`, `50` |

**Example Requests:**

```bash
# Get all beats (default pagination)
curl http://localhost:3000/api/beats

# Get first 5 beats
curl http://localhost:3000/api/beats?limit=5

# Filter by genre
curl http://localhost:3000/api/beats?genre=Lo-fi

# Filter by multiple criteria
curl "http://localhost:3000/api/beats?genre=Drill&mood=Dark%20/%20Aggressive&limit=10"

# Filter by tags
curl "http://localhost:3000/api/beats?tags=lofi,chill,study"

# Pagination
curl http://localhost:3000/api/beats?page=2&limit=20
```

**Response:**

```json
{
  "data": [
    {
      "id": "f61618c2-e9a7-4d38-a240-2d11bb860e0e",
      "templateId": "tech-futuristic-corporate",
      "name": "Modern / Clean Electronic Beat",
      "genre": "Electronic",
      "style": "Digital Tech",
      "mood": "Modern / Clean",
      "useCase": "Product Video",
      "tags": [
        "tech",
        "futuristic",
        "digital",
        "corporate",
        "electronic"
      ],
      "description": "A Modern / Clean Electronic beat in Digital Tech style...",
      "fileUrl": "https://example.com/beats/job-1765603549108.mp3",
      "basePrompt": "futuristic tech corporate beat, 120 BPM...",
      "normalizedPrompt": "futuristic tech corporate beat...",
      "conceptData": {
        "suggestion": "Create a Modern / Clean Electronic beat...",
        "trendAnalysis": "Electronic is trending...",
        "moodEnhancement": "Emphasize Modern / Clean atmosphere..."
      },
      "apiKeyUsed": "ab38dfd4-2142-43d6-a5f8-21637661f9cf",
      "musicalKey": "D Minor",
      "coverArtPath": "output/covers/temp-1765603550720.png",
      "previewPath": null,
      "pricing": null,
      "createdAt": "2025-12-13T05:25:52.112Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 7,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 3. Get Beat by ID

Lấy chi tiết beat theo ID.

**Endpoint:** `GET /api/beats/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Beat UUID |

**Example Request:**

```bash
curl http://localhost:3000/api/beats/f61618c2-e9a7-4d38-a240-2d11bb860e0e
```

**Response:**

```json
{
  "id": "f61618c2-e9a7-4d38-a240-2d11bb860e0e",
  "templateId": "tech-futuristic-corporate",
  "name": "Modern / Clean Electronic Beat",
  "genre": "Electronic",
  "style": "Digital Tech",
  "mood": "Modern / Clean",
  "useCase": "Product Video",
  "tags": [
    "tech",
    "futuristic",
    "digital",
    "corporate",
    "electronic"
  ],
  "description": "A Modern / Clean Electronic beat in Digital Tech style...",
  "fileUrl": "https://example.com/beats/job-1765603549108.mp3",
  "basePrompt": "futuristic tech corporate beat, 120 BPM...",
  "normalizedPrompt": "futuristic tech corporate beat...",
  "conceptData": {
    "suggestion": "Create a Modern / Clean Electronic beat...",
    "trendAnalysis": "Electronic is trending...",
    "moodEnhancement": "Emphasize Modern / Clean atmosphere..."
  },
  "apiKeyUsed": "ab38dfd4-2142-43d6-a5f8-21637661f9cf",
  "musicalKey": "D Minor",
  "coverArtPath": "output/covers/temp-1765603550720.png",
  "previewPath": null,
  "pricing": null,
  "createdAt": "2025-12-13T05:25:52.112Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Beat not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 4. Get System Statistics

Lấy thống kê hệ thống.

**Endpoint:** `GET /api/stats`

**Example Request:**

```bash
curl http://localhost:3000/api/stats
```

**Response:**

```json
{
  "beats": {
    "total": 7,
    "byGenre": {
      "Afrobeats": 1,
      "Ambient": 1,
      "Drill": 1,
      "Electronic": 1,
      "Lo-fi": 2,
      "Synthwave": 1
    },
    "byMood": {
      "Calm / Sleep": 1,
      "Chill / Focus": 1,
      "Dark / Aggressive": 1,
      "Happy / Uplifting": 1,
      "Modern / Clean": 1,
      "Nostalgic / Cool": 1,
      "Warm / Chill": 1
    },
    "recentCount": 7
  },
  "apiKeys": {
    "total": 3,
    "active": 3,
    "exhausted": 0
  },
  "system": {
    "uptime": "57s",
    "lastBeatGenerated": "2025-12-13T05:25:52.112Z",
    "totalBeatsToday": 7
  }
}
```

**Response Fields:**

- `beats.total` - Tổng số beats
- `beats.byGenre` - Số beats theo genre
- `beats.byMood` - Số beats theo mood
- `beats.recentCount` - Số beats trong 24h qua
- `apiKeys.total` - Tổng số API keys
- `apiKeys.active` - Số keys đang active
- `apiKeys.exhausted` - Số keys đã hết quota
- `system.uptime` - Thời gian server chạy
- `system.lastBeatGenerated` - Thời gian beat cuối được tạo
- `system.totalBeatsToday` - Tổng beats hôm nay

**Status Codes:**
- `200 OK` - Success
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Page number must be >= 1"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Beat with ID xxx not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests from this IP, please try again later"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 📊 Response Formats

### Beat Object

```typescript
interface Beat {
  id: string;                    // UUID
  templateId: string;            // Template UUID
  name: string;                  // Beat name
  genre: string;                 // Genre (e.g., "Drill", "Lo-fi")
  style: string;                 // Style (e.g., "UK Drill")
  mood: string;                  // Mood (e.g., "Dark / Aggressive")
  useCase: string;               // Use case (e.g., "Rap / Freestyle")
  tags: string[];                // Tags array
  description: string;           // SEO description
  fileUrl: string;               // Audio file URL
  basePrompt: string;            // Original prompt
  normalizedPrompt: string;      // Normalized prompt
  conceptData: {                 // Concept data
    suggestion: string;
    trendAnalysis: string;
    moodEnhancement: string;
  };
  apiKeyUsed: string;            // API key UUID
  musicalKey: string | null;     // Musical key (e.g., "D Minor")
  coverArtPath: string | null;   // Cover art path
  previewPath: string | null;    // Preview path
  pricing: object | null;        // Pricing tiers
  createdAt: string;             // ISO 8601 timestamp
}
```

### Pagination Object

```typescript
interface Pagination {
  page: number;        // Current page
  limit: number;       // Items per page
  total: number;       // Total items
  totalPages: number;  // Total pages
}
```

---

## 🧪 Testing

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Get all beats
curl http://localhost:3000/api/beats

# Get beat by ID
curl http://localhost:3000/api/beats/YOUR_BEAT_ID

# Get stats
curl http://localhost:3000/api/stats

# Filter and paginate
curl "http://localhost:3000/api/beats?genre=Lo-fi&limit=5&page=1"
```

### Using Test Scripts

```bash
# Quick test
npm run test:api

# Comprehensive test
npx ts-node scripts/test-api-endpoints.ts
```

---

## 🚀 Starting the Server

### Development Mode

```bash
npm run dev:api
```

### Production Mode

```bash
npm run build
npm run start:api
```

---

## 📝 Notes

- Tất cả timestamps theo ISO 8601 format
- Tất cả responses trả về JSON
- Rate limiting áp dụng cho tất cả `/api/*` endpoints
- Tags filtering sử dụng OR logic (match any tag)
- Pagination mặc định: page=1, limit=20
- Maximum limit: 100 items per page

---

## 🔗 Related Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Project Assessment](PROJECT_COMPREHENSIVE_ASSESSMENT.md)
- [Task List](.kiro/specs/automated-beat-generation/tasks.md)

---

**API Version:** 1.0  
**Last Updated:** 13/12/2024  
**Status:** ✅ Production Ready

