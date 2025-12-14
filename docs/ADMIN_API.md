# Admin & BeatStars API Reference

> Complete documentation for admin and BeatStars integration endpoints

**Last Updated**: December 14, 2025

---

## Table of Contents

- [Admin Beat Management](#admin-beat-management)
- [Admin API Key Management](#admin-api-key-management)
- [Admin System Logs](#admin-system-logs)
- [Admin Statistics](#admin-statistics)
- [BeatStars Export](#beatstars-export)
- [Authentication](#authentication)

---

## Authentication

All admin endpoints require JWT authentication.

### Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Getting a Token
```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-id",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Admin Beat Management

### Update Beat Metadata

**Endpoint:** `PATCH /api/admin/beats/:id`

**Authentication:** Required

**Body Parameters:**
```json
{
  "name": "Trap Dark Aggressive Beat",
  "genre": "Trap",
  "style": "Dark/Aggressive",
  "mood": "Intense",
  "useCase": "Gaming",
  "tags": ["trap", "dark", "aggressive", "808", "hi-hat", "snare", "bass", "melody", "hard", "drill"],
  "description": "A hard-hitting trap beat with dark and aggressive vibes...",
  "bpm": 140,
  "musicalKey": "C Minor",
  "pricing": {
    "mp3Lease": 25,
    "wavLease": 49,
    "trackout": 99,
    "exclusive": 499
  }
}
```

**Validation Rules:**
- `tags`: Must contain 10-15 items (BeatStars requirement)
- `description`: Minimum 200 characters (BeatStars requirement)
- `bpm`: Must be between 60 and 200
- `name`: Must be unique

**Success Response (200):**
```json
{
  "success": true,
  "message": "Beat updated successfully",
  "beat": {
    "id": "beat-id",
    "name": "Trap Dark Aggressive Beat",
    "genre": "Trap",
    ...
  }
}
```

**Error Responses:**
- `400`: Validation error (invalid tags, description too short, etc.)
- `404`: Beat not found
- `409`: Beat name already exists

**Example:**
```bash
curl -X PATCH https://beat.optiwellai.com/api/admin/beats/beat-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["trap", "dark", "aggressive", "808", "hi-hat", "snare", "bass", "melody", "hard", "drill"],
    "bpm": 140
  }'
```

---

### Delete Beat

**Endpoint:** `DELETE /api/admin/beats/:id`

**Authentication:** Required

**Description:** Deletes a beat and all its versions (cascade delete)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Beat deleted successfully",
  "deletedBeat": {
    "id": "beat-id",
    "name": "Trap Dark Beat",
    "versionsDeleted": 3
  }
}
```

**Error Response:**
- `404`: Beat not found

**Example:**
```bash
curl -X DELETE https://beat.optiwellai.com/api/admin/beats/beat-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Admin API Key Management

### List API Keys

**Endpoint:** `GET /api/admin/keys`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "id": "key-id-1",
      "key": "sk_***************",
      "status": "active",
      "quotaRemaining": 450,
      "lastUsed": "2025-12-14T10:30:00Z",
      "createdAt": "2025-12-01T00:00:00Z",
      "updatedAt": "2025-12-14T10:30:00Z",
      "beatsGenerated": 50,
      "promptsUsed": 75
    }
  ]
}
```

**Example:**
```bash
curl https://beat.optiwellai.com/api/admin/keys \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Add API Key

**Endpoint:** `POST /api/admin/keys`

**Authentication:** Required (Super Admin only)

**Body Parameters:**
```json
{
  "key": "sk_your_suno_api_key_here",
  "quotaRemaining": 500
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "API key added successfully",
  "key": {
    "id": "new-key-id",
    "key": "sk_your_suno_api_key_here",
    "status": "active",
    "quotaRemaining": 500,
    "createdAt": "2025-12-14T11:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Invalid key or quota
- `403`: Super admin access required
- `409`: API key already exists

**Example:**
```bash
curl -X POST https://beat.optiwellai.com/api/admin/keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "sk_new_api_key",
    "quotaRemaining": 500
  }'
```

---

### Update API Key

**Endpoint:** `PATCH /api/admin/keys/:id`

**Authentication:** Required (Super Admin only)

**Body Parameters:**
```json
{
  "quotaRemaining": 1000,
  "status": "active"
}
```

**Valid Statuses:** `active`, `exhausted`, `error`

**Success Response (200):**
```json
{
  "success": true,
  "message": "API key updated successfully",
  "key": {
    "id": "key-id",
    "status": "active",
    "quotaRemaining": 1000,
    ...
  }
}
```

**Error Responses:**
- `400`: Invalid status or quota
- `403`: Super admin access required
- `404`: API key not found

**Example:**
```bash
curl -X PATCH https://beat.optiwellai.com/api/admin/keys/key-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quotaRemaining": 1000,
    "status": "active"
  }'
```

---

### Delete API Key

**Endpoint:** `DELETE /api/admin/keys/:id`

**Authentication:** Required (Super Admin only)

**Note:** Cannot delete API keys that have been used (have associated beats/prompts). Set status to "error" instead.

**Success Response (200):**
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete used API key
- `403`: Super admin access required
- `404`: API key not found

**Example:**
```bash
curl -X DELETE https://beat.optiwellai.com/api/admin/keys/key-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Admin System Logs

### Get Execution Logs

**Endpoint:** `GET /api/admin/logs`

**Authentication:** Required

**Query Parameters:**
- `level` (optional): Filter by log level (ERROR, WARN, INFO, DEBUG)
- `service` (optional): Filter by service name
- `startDate` (optional): ISO date string (e.g., 2025-12-01T00:00:00Z)
- `endDate` (optional): ISO date string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100, max: 500)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-id",
      "level": "ERROR",
      "service": "MusicService",
      "message": "Failed to generate music",
      "context": {
        "beatId": "beat-123",
        "error": "API timeout"
      },
      "stackTrace": "Error: API timeout\n  at ...",
      "createdAt": "2025-12-14T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 250,
    "totalPages": 3
  }
}
```

**Example:**
```bash
# Get error logs from last 24 hours
curl "https://beat.optiwellai.com/api/admin/logs?level=ERROR&startDate=2025-12-13T00:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get logs for specific service
curl "https://beat.optiwellai.com/api/admin/logs?service=MusicService&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Admin Statistics

### System Overview

**Endpoint:** `GET /api/admin/stats/overview`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "beats": {
      "total": 1250,
      "today": 45,
      "pending": 12,
      "completed": 1180,
      "failed": 58
    },
    "apiKeys": {
      "total": 5,
      "active": 4,
      "inactive": 1
    },
    "versions": {
      "total": 3200,
      "averagePerBeat": "2.56"
    },
    "distribution": {
      "genres": [
        { "genre": "Trap", "count": 450 },
        { "genre": "LoFi", "count": 320 },
        { "genre": "Afrobeats", "count": 280 }
      ],
      "moods": [
        { "mood": "Chill", "count": 380 },
        { "mood": "Aggressive", "count": 295 },
        { "mood": "Happy", "count": 270 }
      ]
    }
  }
}
```

**Example:**
```bash
curl https://beat.optiwellai.com/api/admin/stats/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## BeatStars Export

### Export to CSV

**Endpoint:** `GET /api/beatstars/export`

**Authentication:** Required

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `genre` (optional): Filter by genre
- `readyOnly` (optional): Only export ready beats (default: true)

**Description:** Exports beats to BeatStars-compatible CSV format for bulk upload.

**Response:** CSV file download

**CSV Format:**
```csv
Title,BPM,Musical Key,Genre,Style,Mood,Use Case,Tags,Description,MP3 Path,WAV Path,Cover Path,Price MP3 Lease,Price WAV Lease,Price Trackout,Price Exclusive,Created Date
"Trap Dark Beat",140,"C Minor","Trap","Dark/Aggressive","Intense","Gaming","trap, dark, aggressive, 808, hi-hat","A hard-hitting trap beat...","./output/beats/beat.mp3","./output/beats-wav/beat.wav","./output/covers/beat.png",25,49,99,499,"2025-12-14"
```

**Example:**
```bash
# Export all ready beats
curl https://beat.optiwellai.com/api/beatstars/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o beatstars_export.csv

# Export beats from date range
curl "https://beat.optiwellai.com/api/beatstars/export?startDate=2025-12-01&endDate=2025-12-14" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o beatstars_export.csv
```

---

### Check BeatStars Readiness

**Endpoint:** `GET /api/beatstars/ready-check`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Description:** Analyzes which beats are ready for BeatStars upload and what's missing.

**Response (200):**
```json
{
  "success": true,
  "summary": {
    "total": 100,
    "ready": 75,
    "notReady": 25,
    "missingWav": 12,
    "missingCover": 8,
    "missingTags": 5
  },
  "data": [
    {
      "id": "beat-id",
      "name": "Trap Dark Beat",
      "genre": "Trap",
      "mood": "Intense",
      "isReady": true,
      "readiness": {
        "hasMP3": true,
        "hasWav": true,
        "hasCover": true,
        "hasBPM": true,
        "hasKey": true,
        "hasValidTags": true,
        "hasValidDescription": true,
        "hasPricing": true
      },
      "missingItems": [],
      "metadata": {
        "bpm": 140,
        "musicalKey": "C Minor",
        "tagsCount": 12,
        "descriptionLength": 350
      }
    },
    {
      "id": "beat-id-2",
      "name": "LoFi Chill Beat",
      "isReady": false,
      "missingItems": ["WAV file", "Valid tags (8/10-15)"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Example:**
```bash
curl https://beat.optiwellai.com/api/beatstars/ready-check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Get Upload Checklist

**Endpoint:** `GET /api/beatstars/checklist/:id`

**Authentication:** Required

**Description:** Get detailed BeatStars upload checklist for a specific beat.

**Response (200):**
```json
{
  "success": true,
  "readyForUpload": true,
  "progress": {
    "completed": 7,
    "total": 7,
    "percentage": 100
  },
  "checklist": {
    "beatId": "beat-id",
    "beatName": "Trap Dark Beat",
    "items": [
      {
        "item": "Audio Files",
        "status": "complete",
        "details": {
          "mp3": "✅ Available",
          "wav": "✅ Available",
          "wavStatus": "completed"
        }
      },
      {
        "item": "Title Formula",
        "status": "complete",
        "details": {
          "title": "Trap Dark Beat",
          "length": 15
        }
      },
      {
        "item": "BPM & Key",
        "status": "complete",
        "details": {
          "bpm": 140,
          "musicalKey": "C Minor"
        }
      },
      {
        "item": "Tags (10-15 required)",
        "status": "complete",
        "details": {
          "count": 12,
          "tags": ["trap", "dark", "aggressive", ...],
          "valid": true
        }
      },
      {
        "item": "Description",
        "status": "complete",
        "details": {
          "length": 350,
          "minRequired": 200,
          "preview": "A hard-hitting trap beat with dark and aggressive vibes..."
        }
      },
      {
        "item": "License Pricing",
        "status": "complete",
        "details": {
          "mp3Lease": 25,
          "wavLease": 49,
          "trackout": 99,
          "exclusive": 499
        }
      },
      {
        "item": "Cover Art",
        "status": "complete",
        "details": {
          "path": "./output/covers/beat.png",
          "requiredSize": "3000x3000px"
        }
      }
    ],
    "metadata": {
      "genre": "Trap",
      "style": "Dark/Aggressive",
      "mood": "Intense",
      "useCase": "Gaming",
      "duration": 180.5,
      "model": "chirp-v3-5"
    }
  }
}
```

**Example:**
```bash
curl https://beat.optiwellai.com/api/beatstars/checklist/beat-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Responses

All endpoints use consistent error format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

---

## Rate Limiting

Admin endpoints are subject to rate limiting:
- **Rate Limit:** 100 requests per minute per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## Best Practices

1. **Always check readiness before export**
   ```bash
   # Check which beats are ready
   GET /api/beatstars/ready-check
   
   # Export only ready beats
   GET /api/beatstars/export?readyOnly=true
   ```

2. **Update metadata before generating audio**
   ```bash
   # Update metadata
   PATCH /api/admin/beats/:id
   
   # Then generate audio
   POST /api/beats/:id/generate-audio
   ```

3. **Use filters to minimize data transfer**
   ```bash
   # Get recent error logs only
   GET /api/admin/logs?level=ERROR&startDate=2025-12-13
   ```

4. **Validate BeatStars compliance**
   ```bash
   # Check specific beat
   GET /api/beatstars/checklist/:id
   
   # Fix issues
   PATCH /api/admin/beats/:id
   ```

---

## Changelog

### v2.0.0 (December 14, 2025)
- ✅ Added admin beat management endpoints (PATCH, DELETE)
- ✅ Added API key management (GET, POST, PATCH, DELETE)
- ✅ Added system logs endpoint
- ✅ Added admin statistics endpoint
- ✅ Added BeatStars export to CSV
- ✅ Added BeatStars readiness check
- ✅ Added BeatStars upload checklist

---

**Production API:** https://beat.optiwellai.com/api  
**Documentation:** /docs/ADMIN_API.md
