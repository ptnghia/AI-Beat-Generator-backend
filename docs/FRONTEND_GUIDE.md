# Frontend Integration Guide

## Quick Start for Frontend Developers

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: TBD

### No Authentication Required (Yet)
All endpoints are currently public. Future versions will require API keys.

---

## Essential Endpoints

### 1. List Beats (with filters)
```
GET /api/beats?genre=Trap&limit=20&page=1
```

**Response**:
```json
{
  "data": [/* array of beats */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### 2. Get Beat Details
```
GET /api/beats/:id
```

### 3. System Stats
```
GET /api/stats
```

---

## Beat Object Structure

```typescript
interface Beat {
  // Basic Info
  id: string;
  name: string;
  genre: string;
  style?: string;
  mood?: string;
  
  // Audio Metadata
  bpm?: number;              // e.g., 120
  musicalKey?: string;       // e.g., "F Minor"
  
  // Files (relative paths)
  filePath: string;          // Full beat MP3
  coverArtPath?: string;     // 3000x3000px PNG
  previewPath?: string;      // 30-second preview MP3
  
  // SEO & Marketing
  tags: string[];            // ["dark trap", "atmospheric", ...]
  beatstarsTitle?: string;   // Optimized title for BeatStars
  beatstarsTags?: string[];  // SEO tags
  beatstarsDescription?: string;  // Markdown description
  
  // Pricing
  pricing?: Array<{
    tier: string;           // "MP3" | "WAV" | "Premium" | "Exclusive"
    price: number;          // USD
    description: string;
    features?: string[];
  }>;
  
  // Timestamps
  createdAt: string;         // ISO 8601
  updatedAt: string;
}
```

---

## Frontend Implementation Examples

### React Component: Beat Card

```tsx
import { useState, useEffect } from 'react';

interface Beat {
  id: string;
  name: string;
  genre: string;
  bpm?: number;
  musicalKey?: string;
  coverArtPath?: string;
  previewPath?: string;
  pricing?: Array<{tier: string; price: number}>;
}

function BeatCard({ beat }: { beat: Beat }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="beat-card">
      {/* Cover Art */}
      <img 
        src={`http://localhost:3000/${beat.coverArtPath}`}
        alt={beat.name}
        width={300}
        height={300}
      />
      
      {/* Beat Info */}
      <h3>{beat.name}</h3>
      <p>{beat.genre} • {beat.bpm} BPM • {beat.musicalKey}</p>
      
      {/* Preview Player */}
      <audio ref={audioRef} src={`http://localhost:3000/${beat.previewPath}`} />
      <button onClick={togglePlay}>
        {playing ? '⏸ Pause' : '▶️ Play Preview'}
      </button>
      
      {/* Pricing */}
      {beat.pricing && (
        <div className="pricing">
          {beat.pricing.map(tier => (
            <span key={tier.tier}>
              {tier.tier}: ${tier.price}
            </span>
          ))}
        </div>
      )}
      
      {/* Download */}
      <a href={`http://localhost:3000/${beat.filePath}`} download>
        ⬇️ Download Full Beat
      </a>
    </div>
  );
}
```

### React Hook: Fetch Beats

```tsx
import { useState, useEffect } from 'react';

interface BeatFilters {
  genre?: string;
  mood?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

function useBeats(filters: BeatFilters = {}) {
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchBeats() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.genre) params.append('genre', filters.genre);
        if (filters.mood) params.append('mood', filters.mood);
        if (filters.tags) params.append('tags', filters.tags.join(','));
        params.append('page', String(filters.page || 1));
        params.append('limit', String(filters.limit || 20));

        const response = await fetch(`http://localhost:3000/api/beats?${params}`);
        if (!response.ok) throw new Error('Failed to fetch beats');
        
        const data = await response.json();
        setBeats(data.data);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBeats();
  }, [filters.genre, filters.mood, filters.page, filters.limit]);

  return { beats, loading, error, pagination };
}

// Usage
function BeatList() {
  const { beats, loading, error, pagination } = useBeats({ 
    genre: 'Trap', 
    limit: 10 
  });

  if (loading) return <div>Loading beats...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {beats.map(beat => (
        <BeatCard key={beat.id} beat={beat} />
      ))}
      {pagination && (
        <div>Page {pagination.page} of {pagination.totalPages}</div>
      )}
    </div>
  );
}
```

### Vue 3 Component

```vue
<template>
  <div class="beats-gallery">
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else class="beat-grid">
      <div v-for="beat in beats" :key="beat.id" class="beat-card">
        <img :src="`http://localhost:3000/${beat.coverArtPath}`" :alt="beat.name" />
        <h3>{{ beat.name }}</h3>
        <p>{{ beat.genre }} • {{ beat.bpm }} BPM • {{ beat.musicalKey }}</p>
        <audio :src="`http://localhost:3000/${beat.previewPath}`" controls />
        <a :href="`http://localhost:3000/${beat.filePath}`" download>Download</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Beat {
  id: string;
  name: string;
  genre: string;
  bpm?: number;
  musicalKey?: string;
  coverArtPath?: string;
  previewPath?: string;
  filePath: string;
}

const beats = ref<Beat[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/beats?limit=20');
    if (!response.ok) throw new Error('Failed to fetch beats');
    const data = await response.json();
    beats.value = data.data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>
```

### Svelte Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let beats = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/beats?limit=20');
      const data = await res.json();
      beats = data.data;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p>Loading beats...</p>
{:else if error}
  <p>Error: {error}</p>
{:else}
  <div class="beat-grid">
    {#each beats as beat (beat.id)}
      <div class="beat-card">
        <img src="http://localhost:3000/{beat.coverArtPath}" alt={beat.name} />
        <h3>{beat.name}</h3>
        <p>{beat.genre} • {beat.bpm} BPM • {beat.musicalKey}</p>
        <audio src="http://localhost:3000/{beat.previewPath}" controls />
        <a href="http://localhost:3000/{beat.filePath}" download>Download</a>
      </div>
    {/each}
  </div>
{/if}
```

---

## Key Features to Implement

### 1. Audio Player
- Play 30-second previews
- Show waveform visualization
- Volume control
- Progress bar

### 2. Filtering & Search
- Filter by: Genre, Style, Mood, BPM range, Musical key
- Search by: Beat name, tags
- Sort by: Date, BPM, Popularity

### 3. Beat Details Page
- Full metadata display
- Pricing tiers
- Download options (MP3, WAV, Stems)
- Related beats

### 4. Shopping Cart
- Add beats to cart
- Select license type
- Checkout integration

### 5. Dashboard (Admin)
- System stats
- Beat generation status
- API key management
- Recent beats

---

## File Serving

All files are served statically from the backend:

```typescript
// Cover art: 3000x3000px PNG
<img src="http://localhost:3000/output/covers/beat-123.png" />

// Preview: 30-second MP3
<audio src="http://localhost:3000/output/previews/beat-123_preview.mp3" />

// Full beat: Complete MP3
<a href="http://localhost:3000/output/beats/2025-12/13/beat-123.mp3" download>
```

**Note**: In production, use CDN (CloudFront, Cloudflare) for better performance.

---

## Error Handling

```typescript
async function fetchBeats() {
  try {
    const response = await fetch('http://localhost:3000/api/beats');
    
    // Check HTTP status
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Network error or server error
    console.error('Failed to fetch beats:', error);
    // Show user-friendly message
    alert('Failed to load beats. Please try again later.');
  }
}
```

---

## CORS Configuration

Backend is already configured with CORS enabled for all origins in development.

For production, update backend CORS config:

```typescript
// src/api/server.ts
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  methods: ['GET', 'POST'],
  credentials: true
}));
```

---

## Rate Limiting

Frontend should handle 429 responses:

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    
    if (response.status === 429) {
      // Rate limited, wait and retry
      const retryAfter = response.headers.get('Retry-After') || '60';
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Rate limit exceeded');
}
```

---

## Pagination Best Practices

```typescript
function BeatListWithPagination() {
  const [page, setPage] = useState(1);
  const { beats, pagination } = useBeats({ page, limit: 20 });

  return (
    <div>
      {/* Beats grid */}
      <div className="beat-grid">
        {beats.map(beat => <BeatCard key={beat.id} beat={beat} />)}
      </div>

      {/* Pagination controls */}
      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        
        <span>Page {page} of {pagination?.totalPages}</span>
        
        <button 
          disabled={!pagination?.hasMore} 
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Recommended Tech Stack

### Frontend Framework
- **React 18+** (most popular, huge ecosystem)
- **Next.js 14+** (if you need SSR/SSG)
- **Vue 3** (easier learning curve)
- **Svelte** (best performance)

### UI Libraries
- **Tailwind CSS** (utility-first styling)
- **shadcn/ui** (beautiful React components)
- **Headless UI** (unstyled accessible components)
- **Radix UI** (primitive components)

### Audio Player
- **Howler.js** (cross-browser audio)
- **WaveSurfer.js** (waveform visualization)
- **React Player** (video + audio player)

### State Management
- **Zustand** (simple, modern)
- **React Query** (server state)
- **Redux Toolkit** (complex apps)

### HTTP Client
- **fetch API** (native, simple)
- **axios** (more features)
- **React Query** (with caching)

---

## Example: Full Beat Marketplace Page

```tsx
import { useState } from 'react';
import { useBeats } from './hooks/useBeats';
import BeatCard from './components/BeatCard';
import Filters from './components/Filters';
import Pagination from './components/Pagination';

export default function BeatMarketplace() {
  const [filters, setFilters] = useState({
    genre: '',
    mood: '',
    bpmMin: 60,
    bpmMax: 200,
    page: 1,
    limit: 24
  });

  const { beats, loading, error, pagination } = useBeats(filters);

  return (
    <div className="marketplace">
      <header>
        <h1>AI Beat Marketplace</h1>
        <p>{pagination?.total || 0} beats available</p>
      </header>

      <aside className="filters">
        <Filters filters={filters} onChange={setFilters} />
      </aside>

      <main>
        {loading && <div>Loading beats...</div>}
        {error && <div>Error: {error}</div>}
        
        {!loading && !error && (
          <>
            <div className="beat-grid">
              {beats.map(beat => (
                <BeatCard 
                  key={beat.id} 
                  beat={beat}
                  onAddToCart={() => console.log('Add to cart:', beat.id)}
                />
              ))}
            </div>

            <Pagination 
              current={pagination.page}
              total={pagination.totalPages}
              onChange={(page) => setFilters({...filters, page})}
            />
          </>
        )}
      </main>
    </div>
  );
}
```

---

## Need Help?

- **Backend API Docs**: See `/docs/API.md`
- **Deployment Guide**: See `/DEPLOYMENT.md`
- **GitHub Issues**: [Create an issue]

**Ready to build!** 🚀
