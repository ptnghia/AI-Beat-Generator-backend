# 🎵 Beat API - New Fields Quick Reference

## 📋 All 34 Beat Response Fields

### Core Fields (Existing)
```typescript
id: string                    // Beat UUID
templateId: string            // Template UUID
name: string                  // Beat name
genre: string                 // Genre (e.g., "Trap", "Lo-fi")
style: string                 // Style variant
mood: string                  // Mood description
useCase: string              // Primary use case
tags: string[]               // Tags array
description: string          // SEO description
fileUrl: string              // Primary MP3 file path
basePrompt: string           // Original prompt
normalizedPrompt: string     // Processed prompt
conceptData: object          // AI concept data
apiKeyUsed: string          // API key UUID
coverArtPath: string | null  // Cover art path
previewPath: string | null   // Preview file path
pricing: object | null       // Pricing data
createdAt: string           // ISO timestamp
```

### ✨ New Audio Metadata
```typescript
bpm: number | null           // Beats per minute (e.g., 120)
duration: number | null      // Track length in seconds (e.g., 198.44)
musicalKey: string | null    // Musical key (e.g., "C Major", "D Minor")
```

### ✨ New Suno Integration
```typescript
modelName: string | null     // Model used (e.g., "chirp-v3-5", "chirp-v4")
sunoAudioUrl: string | null  // Direct CDN audio URL
sunoImageUrl: string | null  // Cover image URL from Suno
sunoStreamUrl: string | null // Streaming audio URL
sunoTaskId: string | null    // Generation task ID
sunoAudioId: string | null   // Audio ID (for WAV conversion)
```

### ✨ New Alternate Track (Track 2)
```typescript
alternateFileUrl: string | null      // Second track MP3 path
alternateAudioId: string | null      // Second track audio ID
alternateDuration: number | null     // Second track duration
alternateModelName: string | null    // Model for second track
alternateSunoAudioUrl: string | null // CDN URL for track 2
alternateSunoImageUrl: string | null // Image URL for track 2
alternateSunoStreamUrl: string | null // Stream URL for track 2
```

### ✨ New WAV Conversion
```typescript
wavUrl: string | null              // WAV file path (44.1kHz 16-bit)
wavConversionStatus: string | null // 'not_started' | 'processing' | 'completed' | 'failed'
wavTaskId: string | null           // WAV conversion task ID
```

### ✨ New Status Tracking
```typescript
generationStatus: string    // 'pending' | 'completed' | 'failed'
filesUploaded: boolean      // true if manually uploaded, false if generated
```

---

## 🚀 Quick Usage Examples

### Display BPM and Duration
```typescript
function BeatInfo({ beat }: { beat: Beat }) {
  return (
    <div>
      {beat.bpm && <span>{beat.bpm} BPM</span>}
      {beat.duration && <span>{formatTime(beat.duration)}</span>}
      {beat.musicalKey && <span>{beat.musicalKey}</span>}
    </div>
  );
}
```

### Show Model Quality
```typescript
function QualityBadge({ modelName }: { modelName?: string }) {
  const quality = modelName === 'chirp-v4' ? 'Premium' : 'Standard';
  return <span className="badge">{quality}</span>;
}
```

### Alternate Track Player
```typescript
function TrackSelector({ beat }: { beat: Beat }) {
  const [track, setTrack] = useState(1);
  
  return (
    <div>
      <button onClick={() => playAudio(beat.fileUrl)}>Track 1</button>
      {beat.alternateFileUrl && (
        <button onClick={() => playAudio(beat.alternateFileUrl)}>
          Track 2
          {beat.alternateDuration && ` (${formatTime(beat.alternateDuration)})`}
        </button>
      )}
    </div>
  );
}
```

### Status Indicators
```typescript
function StatusIndicator({ beat }: { beat: Beat }) {
  return (
    <div className="status">
      {/* Generation Status */}
      <span className={`badge ${beat.generationStatus}`}>
        {beat.generationStatus}
      </span>
      
      {/* WAV Status */}
      {beat.wavConversionStatus !== 'not_started' && (
        <span className={`badge ${beat.wavConversionStatus}`}>
          WAV: {beat.wavConversionStatus}
        </span>
      )}
      
      {/* Upload Indicator */}
      {beat.filesUploaded && (
        <span className="badge uploaded">Manually Uploaded</span>
      )}
    </div>
  );
}
```

---

## 🔍 API Query Examples

### Get All Fields
```bash
curl https://beat.optiwellai.com/api/beats/BEAT_ID | jq
```

### Get Specific New Fields
```bash
curl https://beat.optiwellai.com/api/beats/BEAT_ID | jq '{bpm, duration, musicalKey, modelName}'
```

### List Beats with Key Metadata
```bash
curl https://beat.optiwellai.com/api/beats | jq '.data[] | {name, bpm, duration, musicalKey}'
```

### Check Status Fields
```bash
curl https://beat.optiwellai.com/api/beats/BEAT_ID | jq '{generationStatus, wavConversionStatus, filesUploaded}'
```

---

## 📊 Field Availability

| Field | Always Present | Can Be Null | Notes |
|-------|---------------|-------------|-------|
| `bpm` | ✓ | ✓ | May be null for older beats |
| `duration` | ✓ | ✓ | Always present for Suno-generated beats |
| `musicalKey` | ✓ | ✓ | Detected by Suno API |
| `modelName` | ✓ | ✓ | e.g., "chirp-v3-5" or "chirp-v4" |
| `sunoAudioUrl` | ✓ | ✓ | CDN URL, may expire |
| `alternateFileUrl` | ✓ | ✓ | Only if 2 tracks were generated |
| `wavUrl` | ✓ | ✓ | Only after WAV conversion |
| `generationStatus` | ✓ | ✗ | Always has a value |
| `filesUploaded` | ✓ | ✗ | Boolean, defaults to false |

---

## 🎯 Common Use Cases

### 1. Display Beat Duration
```typescript
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Usage
{beat.duration && <span>{formatDuration(beat.duration)}</span>}
```

### 2. Filter by BPM Range
```typescript
const beats = allBeats.filter(beat => 
  beat.bpm && beat.bpm >= 120 && beat.bpm <= 140
);
```

### 3. Sort by Duration
```typescript
const sortedBeats = [...beats].sort((a, b) => 
  (a.duration || 0) - (b.duration || 0)
);
```

### 4. Check Conversion Readiness
```typescript
const canConvertToWav = (beat: Beat) => {
  return beat.sunoAudioId && beat.wavConversionStatus === 'not_started';
};
```

---

## 📱 Responsive Display

### Mobile Card
```tsx
<div className="beat-card-mobile">
  <h3>{beat.name}</h3>
  <div className="meta-row">
    {beat.bpm && <span className="bpm">{beat.bpm}</span>}
    {beat.duration && <span>{formatDuration(beat.duration)}</span>}
  </div>
  {beat.musicalKey && <span className="key-badge">{beat.musicalKey}</span>}
</div>
```

### Desktop Card
```tsx
<div className="beat-card-desktop">
  <h3>{beat.name}</h3>
  <div className="metadata-grid">
    <div>BPM: {beat.bpm || 'N/A'}</div>
    <div>Duration: {beat.duration ? formatDuration(beat.duration) : 'N/A'}</div>
    <div>Key: {beat.musicalKey || 'N/A'}</div>
    <div>Model: {beat.modelName || 'N/A'}</div>
  </div>
  {beat.alternateFileUrl && (
    <div className="tracks">
      <button>Track 1</button>
      <button>Track 2</button>
    </div>
  )}
</div>
```

---

## ✅ Migration Checklist

- [ ] Update TypeScript interfaces to include new fields
- [ ] Add display components for BPM, duration, musical key
- [ ] Implement alternate track player
- [ ] Add status indicators for generation/conversion
- [ ] Update filters to support BPM range and musical key
- [ ] Add sorting options for duration and BPM
- [ ] Test with null values for backward compatibility
- [ ] Update analytics to track new metrics

---

**Quick Reference Version:** 1.0  
**Last Updated:** December 13, 2025  
**Total Fields:** 34  
**New Fields:** 17
