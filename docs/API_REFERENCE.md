# AI Beat Generator - API Reference

> Complete REST API documentation for frontend integration

**Production URL**: `https://beat.optiwellai.com/api`  
**Version**: 2.0 (Multi-Version Support)  
**Last Updated**: December 14, 2025

---

## 📑 Table of Contents

1. [Beat Management](#beat-management)
2. [Beat Generation](#beat-generation)
3. [Beat Versions](#beat-versions)
4. [File Downloads](#file-downloads)
5. [WAV Conversion](#wav-conversion)
6. [Webhooks](#webhooks)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)

---

## 🎵 Beat Management

### 1.1 Query Beats

```http
GET /api/beats
```

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `genre` | string | Filter by genre (Trap, LoFi, etc.) | - |
| `style` | string | Filter by style (Dark, Melodic, etc.) | - |
| `mood` | string | Filter by mood (Aggressive, Calm, etc.) | - |
| `tags` | string | Comma-separated tags | - |
| `musicalKey` | string | Musical key (C Minor, F# Major, etc.) | - |
| `generationStatus` | string | pending, processing, completed, failed | - |
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max: 100) | 20 |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "f81570f8-eaa0-4e28-8372-db417fd559d1",
      "name": "Summer Cruise Type Beat – Happy Nostalgic",
      "genre": "LoFi",
      "style": "Melodic",
      "mood": "Happy",
      "useCase": "Advertising",
      "tags": ["summer", "nostalgic", "upbeat"],
      "description": "Happy nostalgic lofi beat...",
      "bpm": 85,
      "musicalKey": "C Major",
      "duration": 180.5,
      "modelName": "chirp-v3-5",
      "generationStatus": "completed",
      "filesUploaded": false,
      "createdAt": "2025-12-13T10:30:00.000Z",
      
      "sunoAudioUrl": "https://cdn1.suno.ai/abc123.mp3",
      "sunoImageUrl": "https://cdn1.suno.ai/image_abc123.png",
      "sunoStreamUrl": "https://cdn1.suno.ai/abc123_stream.mp3",
      
      "fileUrl": "output/beats/2025-12/13/f81570f8.mp3",
      "coverArtPath": "output/covers/f81570f8.png",
      "wavUrl": null,
      "wavConversionStatus": "not_started"
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

---

### 1.2 Get Beat by ID

```http
GET /api/beats/:id
```

**Parameters**:
- `id` (path) - Beat UUID

**Response** `200 OK`:
```json
{
  "id": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "name": "Summer Cruise Type Beat – Happy Nostalgic",
  "genre": "LoFi",
  "style": "Melodic",
  "mood": "Happy",
  "useCase": "Advertising",
  "tags": ["summer", "nostalgic", "upbeat"],
  "description": "Happy nostalgic lofi beat perfect for summer ads",
  "basePrompt": "Create a happy nostalgic lofi beat...",
  "normalizedPrompt": "summer cruise happy nostalgic lofi melodic...",
  
  "bpm": 85,
  "musicalKey": "C Major",
  "duration": 180.5,
  "modelName": "chirp-v3-5",
  
  "sunoAudioUrl": "https://cdn1.suno.ai/abc123.mp3",
  "sunoImageUrl": "https://cdn1.suno.ai/image_abc123.png",
  "sunoStreamUrl": "https://cdn1.suno.ai/abc123_stream.mp3",
  "sunoAudioId": "abc123",
  "sunoTaskId": "task-abc-123",
  
  "fileUrl": "output/beats/2025-12/13/f81570f8.mp3",
  "coverArtPath": "output/covers/f81570f8.png",
  "previewPath": null,
  "wavUrl": null,
  
  "generationStatus": "completed",
  "wavConversionStatus": "not_started",
  "filesUploaded": false,
  
  "createdAt": "2025-12-13T10:30:00.000Z",
  
  "versions": [
    {
      "id": "version-uuid-1",
      "versionNumber": 1,
      "isPrimary": true,
      "status": "completed",
      "source": "suno",
      "duration": 180.5,
      "sunoAudioUrl": "https://cdn1.suno.ai/abc123.mp3",
      "filesDownloaded": true,
      "createdAt": "2025-12-13T10:30:00.000Z"
    }
  ]
}
```

**Error** `404 Not Found`:
```json
{
  "error": "Beat not found",
  "beatId": "invalid-uuid"
}
```

---

### 1.3 List Pending Beats

```http
GET /api/beats/pending/list
```

**Query Parameters**:
- `page` (optional) - Page number, default: 1
- `limit` (optional) - Items per page, default: 20

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "aefcc62a-c0b3-4a9a-86ba-74cdd2ec2763",
      "name": "Nocturnal Vibes Type Beat – Dark/Atmospheric",
      "genre": "Trap",
      "style": "Dark",
      "mood": "Atmospheric",
      "generationStatus": "pending",
      "createdAt": "2025-12-13T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

## 🎼 Beat Generation

### 2.1 Generate Beat (Metadata Only)

```http
POST /api/generate/beat
```

**Request Body**:
```json
{
  "categoryName": "Trap – Dark/Aggressive",
  "mode": "metadata_only"
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categoryName` | string | Yes | Template category name from beat_catalog.xml |
| `mode` | string | No | "full" or "metadata_only" (default: "full") |

**Response** `200 OK`:
```json
{
  "success": true,
  "mode": "metadata_only",
  "beat": {
    "id": "new-uuid",
    "name": "Energy Surge Type Beat – Dark Aggressive",
    "genre": "Trap",
    "style": "Dark",
    "mood": "Aggressive",
    "generationStatus": "pending",
    "filesUploaded": false,
    "createdAt": "2025-12-14T10:00:00.000Z"
  },
  "message": "Beat metadata created. Use POST /beats/:id/generate-audio to generate audio files."
}
```

**Error** `400 Bad Request`:
```json
{
  "error": "Template not found",
  "categoryName": "Invalid Category"
}
```

---

### 2.2 Generate Beat (Full Mode with Audio)

```http
POST /api/generate/beat
```

**Request Body**:
```json
{
  "categoryName": "LoFi – Melodic/Calm",
  "mode": "full"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "mode": "full",
  "beat": {
    "id": "new-uuid",
    "name": "Sunset Dreams Type Beat – Melodic Calm",
    "genre": "LoFi",
    "style": "Melodic",
    "mood": "Calm",
    "generationStatus": "processing",
    "sunoTaskId": "task-xyz-789",
    "createdAt": "2025-12-14T10:00:00.000Z"
  },
  "version": {
    "id": "version-uuid",
    "versionNumber": 1,
    "isPrimary": true,
    "status": "pending",
    "sunoTaskId": "task-xyz-789"
  },
  "message": "Beat generation started. Files will be ready via webhook callback."
}
```

---

### 2.3 Batch Generate Beats

```http
POST /api/generate/beats
```

**Request Body**:
```json
{
  "count": 5,
  "mode": "metadata_only"
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `count` | integer | Yes | Number of beats to generate (max: 10) |
| `mode` | string | No | "full" or "metadata_only" |

**Response** `200 OK`:
```json
{
  "success": true,
  "mode": "metadata_only",
  "count": 5,
  "beats": [
    {
      "id": "uuid-1",
      "name": "Beat 1",
      "genre": "Trap",
      "generationStatus": "pending"
    },
    {
      "id": "uuid-2",
      "name": "Beat 2",
      "genre": "LoFi",
      "generationStatus": "pending"
    }
  ],
  "message": "5 beats created successfully"
}
```

---

## 🎚️ Beat Versions

### 3.1 Generate Audio for Pending Beat

```http
POST /api/beats/:id/generate-audio
```

**Description**: Generate audio files for a beat that only has metadata.

**Parameters**:
- `id` (path) - Beat UUID

**Response** `200 OK`:
```json
{
  "success": true,
  "beatId": "aefcc62a-c0b3-4a9a-86ba-74cdd2ec2763",
  "version": {
    "id": "version-uuid",
    "versionNumber": 1,
    "sunoAudioUrl": null,
    "sunoImageUrl": null,
    "duration": null,
    "modelName": null
  }
}
```

**Error** `400 Bad Request`:
```json
{
  "error": "Beat already has audio",
  "message": "Use POST /beats/:id/versions to create a new version"
}
```

---

### 3.2 Create New Version

```http
POST /api/beats/:id/versions
```

**Description**: Generate a new version of an existing beat with different audio.

**Parameters**:
- `id` (path) - Beat UUID

**Request Body** (optional):
```json
{
  "setPrimary": false
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "beatId": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "version": {
    "id": "new-version-uuid",
    "versionNumber": 2,
    "isPrimary": false,
    "status": "pending",
    "sunoTaskId": "task-new-version",
    "filesDownloaded": false,
    "createdAt": "2025-12-14T11:00:00.000Z"
  },
  "message": "New version generation started. Webhook will update when ready."
}
```

---

### 3.3 List Beat Versions

```http
GET /api/beats/:id/versions
```

**Response** `200 OK`:
```json
{
  "beatId": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "versions": [
    {
      "id": "version-1-uuid",
      "versionNumber": 1,
      "isPrimary": true,
      "status": "completed",
      "source": "suno",
      "duration": 180.5,
      "bpm": 85,
      "musicalKey": "C Major",
      "modelName": "chirp-v3-5",
      "sunoAudioUrl": "https://cdn1.suno.ai/abc123.mp3",
      "sunoImageUrl": "https://cdn1.suno.ai/image_abc123.png",
      "fileUrl": "output/beats/2025-12/13/version1.mp3",
      "filesDownloaded": true,
      "createdAt": "2025-12-13T10:30:00.000Z"
    },
    {
      "id": "version-2-uuid",
      "versionNumber": 2,
      "isPrimary": false,
      "status": "completed",
      "source": "suno_retry",
      "duration": 182.3,
      "modelName": "chirp-v3-5",
      "sunoAudioUrl": "https://cdn1.suno.ai/def456.mp3",
      "filesDownloaded": false,
      "createdAt": "2025-12-14T11:00:00.000Z"
    }
  ]
}
```

---

## 📥 File Downloads

### 4.1 Download Beat Files (Lazy Download)

```http
POST /api/beats/:id/download
```

**Description**: Download and save Suno CDN files to local storage (MP3 + cover art).

**Parameters**:
- `id` (path) - Beat UUID

**Query Parameters** (optional):
- `versionNumber` (integer) - Specific version to download

**Response** `200 OK`:
```json
{
  "success": true,
  "beatId": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "filesDownloaded": {
    "primary": {
      "audio": "output/beats/2025-12/13/f81570f8.mp3",
      "cover": "output/covers/f81570f8.png"
    },
    "alternate": {
      "audio": "output/beats/2025-12/13/f81570f8_alt.mp3",
      "cover": null
    }
  },
  "versions": [
    {
      "versionNumber": 1,
      "filesDownloaded": true
    }
  ]
}
```

**Error** `400 Bad Request`:
```json
{
  "error": "Beat generation not completed",
  "generationStatus": "pending"
}
```

---

## 🎧 WAV Conversion

### 5.1 Convert to WAV

```http
POST /api/beats/:id/convert-to-wav
```

**Description**: Convert MP3 to high-quality WAV (44.1kHz, 16-bit).

**Parameters**:
- `id` (path) - Beat UUID

**Request Body** (optional):
```json
{
  "includeAlternate": true
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "beatId": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "wavConversion": {
    "status": "processing",
    "taskId": "wav-task-123",
    "message": "WAV conversion started. Use webhook or poll GET /beats/:id to check status."
  }
}
```

**Error** `400 Bad Request`:
```json
{
  "error": "No audio files available for conversion",
  "beatId": "uuid"
}
```

---

### 5.2 Get WAV Status

```http
GET /api/beats/:id/wav-status
```

**Response** `200 OK`:
```json
{
  "beatId": "f81570f8-eaa0-4e28-8372-db417fd559d1",
  "wavConversionStatus": "completed",
  "wavUrl": "output/beats-wav/2025-12/13/f81570f8.wav",
  "wavTaskId": "wav-task-123"
}
```

---

## 🔔 Webhooks

### 6.1 Suno Audio Callback

```http
POST /api/callbacks/suno
```

**Description**: Webhook endpoint for Suno API to notify when audio generation completes.

**Callback URL**: `https://beat.optiwellai.com/api/callbacks/suno`

**Request Body** (from Suno):
```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "taskId": "task-abc-123",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "audio-id-1",
          "audio_url": "https://cdn1.suno.ai/abc123.mp3",
          "image_url": "https://cdn1.suno.ai/image_abc123.png",
          "stream_audio_url": "https://cdn1.suno.ai/abc123_stream.mp3",
          "title": "Generated Beat",
          "tags": "trap dark aggressive",
          "duration": 180.5,
          "model_name": "chirp-v3-5"
        },
        {
          "id": "audio-id-2",
          "audio_url": "https://cdn1.suno.ai/def456.mp3",
          "duration": 182.3,
          "model_name": "chirp-v3-5"
        }
      ]
    }
  }
}
```

**Webhook Logic**:
1. Find `BeatVersion` by `sunoTaskId`
2. Update version with metadata (URLs, duration, model)
3. If 2 tracks exist, create alternate version
4. Update Beat status to "completed"

**Response** `200 OK`:
```json
{
  "status": "received",
  "taskId": "task-abc-123",
  "message": "Callback processed successfully"
}
```

---

### 6.2 WAV Conversion Callback

```http
POST /api/callbacks/suno/wav
```

**Description**: Webhook for WAV conversion completion.

**Request Body** (from Suno):
```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "taskId": "wav-task-123",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "wav-audio-id",
          "audio_url": "https://cdn1.suno.ai/converted.wav"
        }
      ]
    }
  }
}
```

---

## 📊 Data Models

### Beat Model

```typescript
interface Beat {
  id: string;
  templateId: string;
  name: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  description: string;
  basePrompt: string;
  normalizedPrompt: string;
  
  // Audio metadata
  bpm: number | null;
  musicalKey: string | null;
  duration: number | null;
  modelName: string | null;
  
  // Suno URLs (CDN)
  sunoAudioUrl: string | null;
  sunoImageUrl: string | null;
  sunoStreamUrl: string | null;
  sunoAudioId: string | null;
  sunoTaskId: string | null;
  
  // Local files (lazy download)
  fileUrl: string;              // Always set (path)
  coverArtPath: string | null;
  previewPath: string | null;
  wavUrl: string | null;
  
  // Alternate track (track 2 from Suno)
  alternateFileUrl: string | null;
  alternateSunoAudioUrl: string | null;
  alternateDuration: number | null;
  
  // Status
  generationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  wavConversionStatus: 'not_started' | 'processing' | 'completed' | 'failed';
  filesUploaded: boolean;
  
  createdAt: string;
  
  // Relations
  versions?: BeatVersion[];
}
```

### BeatVersion Model

```typescript
interface BeatVersion {
  id: string;
  beatId: string;
  versionNumber: number;        // 1, 2, 3...
  source: 'suno' | 'upload' | 'suno_retry';
  isPrimary: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Suno URLs (always available)
  sunoAudioUrl: string | null;
  sunoImageUrl: string | null;
  sunoStreamUrl: string | null;
  sunoAudioId: string | null;
  sunoTaskId: string | null;    // For webhook routing
  
  // Local files (optional, lazy download)
  fileUrl: string | null;
  coverArtPath: string | null;
  wavUrl: string | null;
  
  // Metadata
  duration: number | null;
  modelName: string | null;
  bpm: number | null;
  musicalKey: string | null;
  
  // File management
  filesDownloaded: boolean;
  wavConversionStatus: 'not_started' | 'processing' | 'completed' | 'failed';
  
  createdAt: string;
  updatedAt: string;
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional context",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input or request |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error or Suno API error |

### Common Errors

**Suno API Errors**:
```json
{
  "error": "Error",
  "message": "You do not have access permissions"
}
```
→ Suno API key exhausted or invalid

**Beat Not Found**:
```json
{
  "error": "Beat not found",
  "beatId": "invalid-uuid"
}
```

**Invalid Generation Mode**:
```json
{
  "error": "Invalid mode",
  "message": "Mode must be 'full' or 'metadata_only'"
}
```

---

## 🔄 Workflow Examples

### Example 1: Create Beat → Generate Audio → Download

```bash
# 1. Create beat metadata only
POST /api/generate/beat
{
  "categoryName": "Trap – Dark/Aggressive",
  "mode": "metadata_only"
}

# Response: beatId = "abc-123"

# 2. Generate audio for beat
POST /api/beats/abc-123/generate-audio

# Response: sunoTaskId = "task-xyz"

# 3. Wait for webhook callback (Suno → /api/callbacks/suno)
# BeatVersion will be updated with audio URLs

# 4. Download files to local storage
POST /api/beats/abc-123/download

# Files saved to output/beats/ and output/covers/
```

### Example 2: Create Multiple Versions

```bash
# 1. Create beat with audio (full mode)
POST /api/generate/beat
{
  "categoryName": "LoFi – Melodic/Calm",
  "mode": "full"
}

# beatId = "def-456", version 1 created

# 2. Create version 2 (different audio)
POST /api/beats/def-456/versions
{ "setPrimary": false }

# version 2 created with new sunoTaskId

# 3. Create version 3
POST /api/beats/def-456/versions

# 4. List all versions
GET /api/beats/def-456/versions

# Returns versions 1, 2, 3 (possibly 4, 5, 6 if dual-track)
```

---

## 📝 Notes

### Lazy Download Strategy
- Suno URLs are **always available** immediately after generation
- Local files are **optional** - download only when needed
- Use `POST /beats/:id/download` to save files locally
- `filesDownloaded` flag indicates if local files exist

### Multi-Track Support
- Suno API returns 2 tracks per generation
- Track 1 → Primary version (has `sunoTaskId`)
- Track 2 → Alternate version (`sunoTaskId = null`)
- Both tracks share same webhook callback

### Version Routing
- Each version has unique `sunoTaskId` (except track 2)
- Webhook finds version by `sunoTaskId`
- Track 2 created in same callback, no separate routing needed

### WAV Conversion
- On-demand only (not automatic)
- 44.1kHz, 16-bit WAV format
- Async process via Suno API
- Check status via `wavConversionStatus` field

---

**For more details, see**:
- [Frontend Guide](FRONTEND_GUIDE.md)
- [Callback Strategy](../CALLBACK_STRATEGY.md)
- [Webhook Integration](WEBHOOK_GUIDE.md)
