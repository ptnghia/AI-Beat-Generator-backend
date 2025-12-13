# Suno AI Prompt Guide - Instrumental Beats (2025)

## 🎯 Mục Tiêu Kép

1. **Suno AI**: Tạo nhạc không lời (instrumental) chất lượng cao
2. **BeatStars SEO**: Optimize metadata để bán beat dễ dàng

---

## 📝 Suno Prompt Structure cho Instrumental

### Best Practices từ Research

**✅ Công thức prompt hiệu quả:**
```
[Genre] [SubGenre], [BPM] bpm, [Key], [Instruments], [Mood descriptors], [Style elements], instrumental only, no vocals
```

**❌ Tránh:**
- Mô tả mơ hồ: "a beautiful emotional song"
- Quá chi tiết (Suno sẽ bị overload)
- Không specify "no vocals" (sẽ tự động thêm vocals)

---

## 🎵 Suno Prompt Templates

### 1. Hip Hop / Trap Beat
```
Dark Trap Hip Hop, 140 bpm, F minor, heavy 808 bass, detuned synths, 
minimalist piano, atmospheric strings, menacing hi-hats, sub-bass drops, 
moody and aggressive, instrumental only, no vocals
```

**Breakdown:**
- Genre: `Dark Trap Hip Hop`
- BPM: `140 bpm` (critical for Suno timing)
- Key: `F minor` (sets harmonic foundation)
- Instruments: `808 bass, synths, piano, strings, hi-hats`
- Mood: `moody, aggressive`
- **Critical**: `instrumental only, no vocals`

### 2. Chill R&B Beat
```
Melodic R&B Soul, 85 bpm, C major, smooth electric piano, warm bass guitar, 
soft drums, ambient pads, reverb-heavy guitar licks, romantic and mellow, 
instrumental only, no vocals
```

### 3. Drill Beat
```
UK Drill, 140 bpm, D# minor, sliding 808s, dark piano melody, aggressive hi-hats, 
hard-hitting snares, menacing atmosphere, cold and dark, instrumental only, no vocals
```

### 4. Lo-Fi Hip Hop
```
Lo-fi Hip Hop Chill, 75 bpm, G major, dusty vinyl samples, mellow piano chords, 
soft jazz drums, warm bass, tape hiss, nostalgic and relaxed, instrumental only, no vocals
```

### 5. Boom Bap
```
90s Boom Bap Hip Hop, 93 bpm, E minor, dusty drum breaks, deep bass, 
vinyl crackle, jazz samples, trumpet stabs, classic and raw, instrumental only, no vocals
```

---

## 🎹 Critical Elements cho Instrumental

### 1. Metatags trong Lyrics Field (Suno Custom Mode)

**Structure Tags:**
```
[Intro]
[Verse]
[Chorus]
[Bridge]
[Drop]
[Outro]
```

**Instrumental Tags:**
```
[Instrumental Break]
[Beat Switch]
[808 Drop]
[Melody Section]
```

**Negative Prompts (tránh vocals):**
```
In lyrics field:
[Instrumental]
No vocals
No singing
No rap
Instrumental only
```

### 2. Key Specifications

**Phải include:**
- ✅ BPM số chính xác: `140 bpm` (không viết "fast" hay "slow")
- ✅ Musical Key: `F minor`, `C major`, `D# minor`
- ✅ Tempo descriptors: `half-time rhythm`, `double-time hi-hats`

**Tránh:**
- ❌ "Fast tempo" → dùng `140 bpm`
- ❌ "Dark key" → dùng `F minor`
- ❌ Không specify BPM/Key → Suno random

---

## 🔧 Optimization Strategy

### Dual-Purpose Prompt System

**Step 1: Suno Generation Prompt (Technical)**
```typescript
// Optimized for Suno API
const sunoPrompt = `
${genre} ${subGenre}, ${bpm} bpm, ${key}, 
${instruments.join(', ')}, 
${mood}, ${style},
instrumental only, no vocals
`;
```

**Step 2: BeatStars Metadata (Marketing)**
```typescript
// Optimized for SEO & Discovery
const beatstarsTitle = `${vibe} Type Beat – ${mood}`;
const beatsarsTags = [
  `${mood} ${genre} beat`,
  `${tempo} ${style} beat`,
  `${instrument} beat`,
  `${bpm} bpm ${genre}`,
  `${key} beat`
];
```

---

## 📊 Examples: Suno vs BeatStars

### Example 1: Dark Trap Beat

**Suno Prompt:**
```
Dark Trap Hip Hop, 140 bpm, F minor, heavy 808 bass, detuned synths, 
minimalist piano, atmospheric strings, menacing hi-hats, reversed vocals effects, 
sub-bass drops, sparse drums, moody and aggressive, instrumental only, no vocals
```

**BeatStars Title:**
```
Midnight Streets Type Beat – Dark Trap
```

**BeatStars Tags:**
```
dark trap beat
140 bpm trap
f minor beat
808 trap beat
dark hip hop instrumental
melodic trap beat
sad trap beat
moody trap instrumental
aggressive trap beat
type beat
```

**BeatStars Description:**
```
Dark trap instrumental perfect for aggressive rap, street storytelling, and moody vibes.
BPM: 140 | Key: F Minor
Instant download after purchase.
```

---

### Example 2: Chill R&B Beat

**Suno Prompt:**
```
Melodic R&B Soul, 85 bpm, C major, smooth Fender Rhodes electric piano, 
warm Moog bass, soft brushed drums, lush string pads, ambient guitar reverb, 
romantic atmosphere, mellow and emotional, instrumental only, no vocals
```

**BeatStars Title:**
```
Sunset Dreams Type Beat – Chill R&B Soul
```

**BeatStars Tags:**
```
chill r&b beat
melodic r&b instrumental
85 bpm r&b
c major beat
smooth r&b beat
soul beat
romantic r&b instrumental
mellow rnb beat
emotional r&b beat
type beat
```

**BeatStars Description:**
```
Smooth melodic R&B beat perfect for romantic vocals, late-night sessions, and soulful vibes.
BPM: 85 | Key: C Major
Instant download after purchase.
```

---

## 🎛️ Advanced Techniques

### 1. Preventing Vocals

**Most Effective Methods:**
1. Add `instrumental only, no vocals` at end of prompt
2. In lyrics field: `[Instrumental]` metatag
3. Negative prompt: `no singing, no rap, no words`
4. Specify instruments explicitly (fills "vocal space")

### 2. Better 808 Control
```
Heavy 808 bass: sub-bass focused, distorted 808 slides, 
gliding 808 patterns, punchy 808 hits
```

### 3. Atmospheric Elements
```
Ambient pads, reverb tails, atmospheric drones, vinyl crackle, 
tape saturation, lo-fi texture
```

### 4. Rhythm Complexity
```
half-time rhythm, syncopated hi-hats, triplet patterns, 
double-time drums, off-beat snares
```

---

## 🚫 Common Mistakes

| ❌ Wrong | ✅ Right |
|---------|---------|
| "Fast trap beat" | "140 bpm trap" |
| "Dark mood" | "F minor, dark atmosphere" |
| "Heavy bass" | "Heavy 808 bass, sub-bass drops" |
| "No words" (too vague) | "instrumental only, no vocals" |
| "Emotional" | "melancholic, nostalgic, introspective" |
| Generic instruments | Specific: "Fender Rhodes, Moog bass, Roland TR-808" |

---

## 📐 Prompt Length Guidelines

**Optimal:** 150-250 characters
- Suno works best with concise, specific prompts
- Too short → vague results
- Too long → Suno ignores parts

**Formula:**
```
[30 chars: Genre + BPM + Key] + 
[80 chars: Instruments] + 
[40 chars: Mood/Style] + 
[20 chars: "instrumental only, no vocals"]
= ~170 characters
```

---

## 🎯 Quality Checklist

**Before sending to Suno:**
- [ ] BPM specified as number
- [ ] Musical key specified (e.g., "C minor")
- [ ] At least 3-5 specific instruments
- [ ] Mood descriptors included
- [ ] Ends with "instrumental only, no vocals"
- [ ] Under 250 characters
- [ ] No artist names or copyrighted terms

**After generation (for BeatStars):**
- [ ] Title follows "[Vibe] Type Beat – [Mood]" format
- [ ] 10-15 SEO tags
- [ ] Description includes BPM & Key
- [ ] All files ready (MP3, WAV, Cover)

---

## 💡 Pro Tips

1. **Instrument Specificity = Better Results**
   - ✅ "Fender Rhodes, Moog bass, Roland TR-808"
   - ❌ "Piano, bass, drums"

2. **Use Musical Terms**
   - ✅ "half-time rhythm, syncopated hi-hats"
   - ❌ "interesting drum pattern"

3. **Key Determines Mood**
   - Minor keys: Dark, sad, emotional (F minor, C# minor)
   - Major keys: Happy, uplifting, bright (C major, G major)

4. **BPM Ranges by Genre**
   - Trap: 130-150 bpm
   - R&B: 60-90 bpm
   - Drill: 138-145 bpm
   - Lo-fi: 70-90 bpm
   - Boom Bap: 85-95 bpm

5. **Avoid Vocal Triggers**
   - Don't use: "vocal melody", "singing", "rap flow"
   - Use: "melodic instruments", "instrumental lead"

---

## 🔄 Workflow Integration

```
User selects template
    ↓
Gemini: Generate creative concept
    ↓
GPT-4o mini: Build Suno prompt (technical, optimized for generation)
    ↓
Suno API: Generate music with optimized prompt
    ↓
BPM/Key Detection: Extract actual BPM & Key from audio
    ↓
GPT-4o mini: Generate BeatStars metadata (title, tags, description)
    ↓
Save beat with dual metadata:
  - Suno prompt (technical)
  - BeatStars metadata (marketing)
```

---

## 📊 Testing Results (Based on Community Feedback)

**Success Rate by Prompt Style:**
- Specific instruments + BPM + Key: 95% success
- Generic descriptions only: 60% success
- "No vocals" explicitly stated: 90% instrumental
- No "no vocals" statement: 40% instrumental

**Quality Factors:**
- BPM accuracy: Critical for usability
- Key detection: Important for buyer filters
- Instrument clarity: Affects marketability

---

> **Remember:** Suno prompt = Technical specification, BeatStars metadata = Marketing copy. Keep them separate but aligned!
