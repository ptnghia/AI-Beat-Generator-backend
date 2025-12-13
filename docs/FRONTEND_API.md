# Frontend API Documentation

> REST API endpoints for beat generation management

**Base URL**: `http://localhost:3000/api`

---

## 📋 **Beat Management APIs**

### 1. Query Beats
```http
GET /api/beats
```

**Query Parameters**:
- `genre` - Filter by genre
- `style` - Filter by style
- `mood` - Filter by mood
- `tags` - Comma-separated tags
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Energy Track",
      "genre": "Trap",
      "style": "Dark",
      "fileUrl": "output/beats/2025-12/13/uuid.mp3"
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

---

### 2. Get Beat Details
```http
GET /api/beats/:id
```

**Response**:
```json
{
  "id": "uuid",
  "name": "Energy Track",
  "genre": "Trap",
  "style": "Dark",
  "mood": "Aggressive",
  "description": "High-energy trap beat...",
  "fileUrl": "output/beats/2025-12/13/uuid.mp3",
  "alternateFileUrl": "output/beats/2025-12/13/uuid_alt.mp3",
  "wavUrl": "output/beats-wav/2025-12/13/uuid.wav",
  "coverArtPath": "output/covers/uuid.png",
  "generationStatus": "completed",
  "wavConversionStatus": "completed",
  "sunoTaskId": "task123",
  "sunoAudioId": "audio123"
}
```

---

## 🔄 **Generation Management APIs**

### 3. List Pending Beats
```http
GET /api/beats/pending/list?page=1&limit=20
```

**Purpose**: Get beats that need music generation

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pending Beat",
      "genre": "Trap",
      "style": "Dark",
      "mood": "Aggressive",
      "generationStatus": "pending",
      "createdAt": "2025-12-13T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Use Case**: Display list of beats that need generation

---

### 4. Retry Music Generation
```http
POST /api/beats/:id/retry-generation
```

**Purpose**: Generate music for a beat without files

**Prerequisites**:
- Beat must have `normalizedPrompt` in database
- Beat should have `generationStatus = 'pending'` or no `fileUrl`

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Music generation completed",
  "beatId": "uuid",
  "beatName": "Energy Track",
  "files": {
    "primary": "output/beats/2025-12/13/taskid.mp3",
    "alternate": "output/beats/2025-12/13/taskid_alt.mp3"
  },
  "sunoTaskId": "task123",
  "sunoAudioId": "audio123"
}
```

**Response (Error - Already Has Files)**:
```json
{
  "error": "Bad Request",
  "message": "Beat already has music files",
  "currentStatus": "completed",
  "fileUrl": "output/beats/2025-12/13/uuid.mp3"
}
```

**Frontend Usage**:
```javascript
async function retryGeneration(beatId) {
  const response = await fetch(`/api/beats/${beatId}/retry-generation`, {
    method: 'POST'
  });
  const data = await response.json();
  
  if (data.status === 'success') {
    alert('Music generated successfully!');
    // Refresh beat details
  }
}
```

---

## 🎨 **Enhancement APIs**

### 5. List Enhanceable Beats
```http
GET /api/beats/enhanceable/list?page=1&limit=20
```

**Purpose**: Get beats that can have WAV/Cover added

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Beat Name",
      "genre": "Trap",
      "style": "Dark",
      "sunoTaskId": "task123",
      "sunoAudioId": "audio123",
      "wavUrl": null,
      "coverArtPath": null,
      "canGenerateWav": true,
      "canGenerateCover": true,
      "createdAt": "2025-12-13T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

### 6. Enhance Beat (WAV + Cover)
```http
POST /api/beats/:id/enhance
Content-Type: application/json
```

**Body**:
```json
{
  "generateWav": true,
  "generateCover": true
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Enhancement request processed",
  "beatId": "uuid",
  "beatName": "Energy Track",
  "wav": {
    "status": "success",
    "path": "output/beats-wav/2025-12/13/uuid.wav",
    "taskId": "wav-task123"
  },
  "cover": {
    "status": "processing",
    "taskId": "cover-task456",
    "message": "Cover generation submitted, will be ready in 30-60 seconds via webhook"
  }
}
```

**Possible WAV/Cover Status**:
- `success` - Generated successfully
- `already_exists` - File already exists
- `processing` - Generation in progress (cover only)
- `failed` - Generation failed
- `impossible` - Missing required IDs

**Frontend Usage**:
```javascript
async function enhanceBeat(beatId, options = {}) {
  const response = await fetch(`/api/beats/${beatId}/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generateWav: options.wav ?? true,
      generateCover: options.cover ?? true
    })
  });
  const data = await response.json();
  
  if (data.wav?.status === 'success') {
    console.log('WAV ready:', data.wav.path);
  }
  
  if (data.cover?.status === 'processing') {
    console.log('Cover generating, check back in 1 minute');
  }
}
```

---

## 📁 **File Management APIs**

### 7. Check File Status
```http
GET /api/beats/:id/files
```

**Response**:
```json
{
  "status": "success",
  "beatId": "uuid",
  "beatName": "Energy Track",
  "files": {
    "mp3": {
      "exists": true,
      "path": "output/beats/2025-12/13/uuid.mp3",
      "size": 7340032
    },
    "alternateMp3": {
      "exists": true,
      "path": "output/beats/2025-12/13/uuid_alt.mp3",
      "size": 7234098
    },
    "wav": {
      "exists": true,
      "path": "output/beats-wav/2025-12/13/uuid.wav",
      "status": "completed",
      "size": 62914560
    },
    "cover": {
      "exists": true,
      "path": "output/covers/uuid.png",
      "size": 1048576
    },
    "generationStatus": "completed",
    "filesUploaded": false
  }
}
```

---

### 8. Upload Files
```http
POST /api/beats/:id/upload
Content-Type: multipart/form-data
```

**Form Data**:
- `mp3` - MP3 file (optional)
- `wav` - WAV file (optional)
- `cover` - Cover image PNG/JPG (optional)

**Response**:
```json
{
  "status": "success",
  "message": "Files uploaded successfully",
  "beatId": "uuid",
  "uploadedFiles": {
    "mp3": "output/beats/2025-12/13/uuid.mp3",
    "wav": "output/beats-wav/2025-12/13/uuid.wav",
    "cover": "output/covers/uuid.png"
  }
}
```

**Frontend Usage (with FormData)**:
```javascript
async function uploadFiles(beatId, files) {
  const formData = new FormData();
  
  if (files.mp3) formData.append('mp3', files.mp3);
  if (files.wav) formData.append('wav', files.wav);
  if (files.cover) formData.append('cover', files.cover);
  
  const response = await fetch(`/api/beats/${beatId}/upload`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

// Usage
const fileInput = document.getElementById('mp3-input');
await uploadFiles(beatId, { 
  mp3: fileInput.files[0] 
});
```

---

## 🎵 **WAV Conversion APIs**

### 9. Request WAV Conversion
```http
POST /api/beats/:id/convert-wav
```

**Response**:
```json
{
  "status": "processing",
  "message": "WAV conversion started",
  "wavTaskId": "wav-task123",
  "estimatedTime": "2-5 minutes"
}
```

---

### 10. Check WAV Status
```http
GET /api/beats/:id/wav-status
```

**Response**:
```json
{
  "beatId": "uuid",
  "wavConversionStatus": "completed",
  "wavTaskId": "wav-task123",
  "wavUrl": "output/beats-wav/2025-12/13/uuid.wav"
}
```

---

## 🔧 **Frontend Integration Examples**

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function BeatManager() {
  const [pendingBeats, setPendingBeats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load pending beats
  useEffect(() => {
    fetch('/api/beats/pending/list')
      .then(res => res.json())
      .then(data => setPendingBeats(data.data));
  }, []);

  // Retry generation
  const handleRetry = async (beatId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/beats/${beatId}/retry-generation`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        alert('Music generated!');
        // Refresh list
      }
    } catch (error) {
      alert('Generation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Pending Beats ({pendingBeats.length})</h2>
      {pendingBeats.map(beat => (
        <div key={beat.id}>
          <h3>{beat.name}</h3>
          <p>{beat.genre} - {beat.style}</p>
          <button 
            onClick={() => handleRetry(beat.id)}
            disabled={loading}
          >
            Generate Music
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### Vue Component Example

```vue
<template>
  <div>
    <h2>Enhanceable Beats</h2>
    <div v-for="beat in beats" :key="beat.id">
      <h3>{{ beat.name }}</h3>
      <button 
        v-if="beat.canGenerateWav" 
        @click="enhance(beat.id, { wav: true })"
      >
        Generate WAV
      </button>
      <button 
        v-if="beat.canGenerateCover" 
        @click="enhance(beat.id, { cover: true })"
      >
        Generate Cover
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      beats: []
    };
  },
  mounted() {
    this.loadBeats();
  },
  methods: {
    async loadBeats() {
      const res = await fetch('/api/beats/enhanceable/list');
      const data = await res.json();
      this.beats = data.data;
    },
    async enhance(beatId, options) {
      const res = await fetch(`/api/beats/${beatId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateWav: options.wav ?? false,
          generateCover: options.cover ?? false
        })
      });
      const data = await res.json();
      alert('Enhancement requested!');
    }
  }
};
</script>
```

---

## 📊 **API Workflow Diagrams**

### Retry Generation Flow
```
Frontend                    API                     Services
   |                        |                          |
   |--POST /retry---------->|                          |
   |                        |--Get Beat Details------->|
   |                        |<-------------------------|
   |                        |--Generate Music--------->|
   |                        |    (MusicService)        |
   |                        |<-------------------------|
   |                        |--Download MP3s---------->|
   |                        |<-------------------------|
   |                        |--Update Database-------->|
   |                        |<-------------------------|
   |<-----200 Success-------|                          |
```

### Enhancement Flow
```
Frontend                    API                     Services
   |                        |                          |
   |--POST /enhance-------->|                          |
   |  {wav:true,cover:true} |                          |
   |                        |--WAV Conversion--------->|
   |                        |<----WAV Ready------------|
   |                        |--Cover Request---------->|
   |                        |<----Task ID (async)------|
   |<-----200 Success-------|                          |
   |                        |                          |
   |  (wait 1 minute)       |                          |
   |                        |<----Webhook Callback-----|
   |                        |  (Cover ready)           |
```

---

## 🎯 **Best Practices**

### Error Handling
```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Loading States
```javascript
const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState('');

async function retryWithProgress(beatId) {
  setIsLoading(true);
  setProgress('Requesting generation...');
  
  try {
    const data = await safeApiCall(`/api/beats/${beatId}/retry-generation`, {
      method: 'POST'
    });
    
    setProgress('Music generated! Files ready.');
    return data;
  } finally {
    setIsLoading(false);
  }
}
```

### Pagination
```javascript
function usePagination(endpoint, limit = 20) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    fetch(`${endpoint}?page=${page}&limit=${limit}`)
      .then(res => res.json())
      .then(result => {
        setData(result.data);
        setTotal(result.pagination.total);
      });
  }, [page, endpoint, limit]);
  
  return { data, page, setPage, total };
}
```

---

## 📞 **Support**

- **API Base**: `http://localhost:3000/api`
- **Health Check**: `GET /health`
- **Routes**: `/src/api/routes/beat.routes.ts`, `/src/api/routes/upload.routes.ts`
- **Documentation**: This file

---

> **Note**: All endpoints return JSON. Use `Content-Type: application/json` for POST requests (except file uploads which use `multipart/form-data`).
