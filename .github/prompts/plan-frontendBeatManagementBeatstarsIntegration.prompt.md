# Plan: Hoàn Thiện Frontend cho Admin Beat Management & BeatStars Integration

## Mục Tiêu

Xây dựng hệ thống admin hoàn chỉnh để tạo và quản lý beat nhạc để bán trên BeatStars, với giao diện marketplace cho người mua.

## Tình Trạng Hiện Tại

### Backend Status: 9.4/10 - Production Ready ✅

**Hoàn chỉnh:**
- ✅ Multi-version beat support (2-6 versions per beat)
- ✅ BeatStars metadata 100% compliant
  - Title generator (formula-based)
  - BPM, Musical Key detection
  - Genre, Style, Mood, Tags (10-15), Description (800+ chars)
- ✅ File quality đúng chuẩn BeatStars
  - MP3 ~180-320kbps (Suno CDN)
  - WAV 44.1kHz 16-bit Stereo (on-demand conversion)
  - Cover Art 3000x3000px PNG
  - Preview 30s MP3 128kbps
- ✅ 18 services hoàn chỉnh
  - Generation, Conversion, Pricing, Export CSV
  - Lazy download strategy (CDN + local)
  - Dual-track support (2 audio per generation)
- ✅ RESTful API đầy đủ
  - Beat generation (full/metadata_only mode)
  - Version management (create, list, download)
  - WAV conversion (async with callbacks)
  - Webhook integration (Suno callbacks)
  - Admin authentication (JWT)
  - Statistics & monitoring

**Thiếu:**
- ⚠️ Stem separation (cho Trackout/Exclusive tiers)
- ⚠️ Content ID integration (DistroKid)
- ⚠️ License management system

### Frontend Status: 55% Complete ⚠️

**Hoàn chỉnh:**
- ✅ **Marketplace (Public)** - 100%
  - Browse beats catalog với advanced filters
  - Filter: genre, mood, musical key, BPM range, sort
  - Search functionality với URL state sync
  - Beat detail page với pricing comparison
  - Audio preview với waveform (WaveSurfer.js)
  - Shopping cart với persistence (Zustand + localStorage)
  - Multi-step checkout flow (Information → Payment → Review)
  - Related beats carousel
  - Social share buttons
  - Responsive design (mobile + desktop)

- ✅ **Admin Auth** - 100%
  - JWT login/logout
  - Protected routes
  - Token management
  - Auto-refresh handling

- ✅ **Admin Dashboard** - 90%
  - System statistics (Total Beats, API Keys, Beats Today, Uptime)
  - Genre/Mood distribution charts
  - Real-time stats via API

**Thiếu hoặc Chưa Hoàn Chỉnh:**
- ❌ **Admin Beat Generation UI** - 0%
  - Không có UI để trigger beat generation
  - Backend có: `POST /api/generate/beat`, `POST /api/generate/beats`
  
- ❌ **BeatStars Export Dashboard** - 0%
  - Không hiển thị BeatStars metadata
  - Không có export to CSV
  - Không có upload checklist

- ❌ **Beat Versions Management** - 0%
  - Không hiển thị multiple versions
  - Không có UI create new version
  - Không có version switcher

- ❌ **Pending Beats Management** - 0%
  - Không có UI để xem pending beats
  - Không có UI trigger audio generation

- ⚠️ **Admin Beat Edit** - 30%
  - UI có edit button nhưng chỉ là placeholder
  - Cần modal/form để edit metadata
  - Backend endpoint `PATCH /api/beats/:id` chưa rõ

- ❌ **WAV Conversion UI** - 0%
  - Không có button convert to WAV
  - Không hiển thị conversion status
  - Backend có: `POST /api/beats/:id/convert-to-wav`

- ❌ **File Download Management** - 0%
  - Không có UI download files từ CDN
  - Backend có: `POST /api/beats/:id/download`

- ⚠️ **Payment Integration** - 10%
  - Checkout UI ready nhưng chưa integrate Stripe
  - Cần implement actual payment processing

### Backend API Gaps Cần Xác Nhận

```
❓ DELETE /api/admin/beats/:id - Frontend gọi nhưng chưa rõ endpoint tồn tại?
❌ PATCH /api/beats/:id - Edit beat metadata (chưa implement?)
❌ GET /api/admin/keys - List API keys
❌ POST /api/admin/keys - Add new API key
❌ PATCH /api/admin/keys/:id - Update key quota
❌ DELETE /api/admin/keys/:id - Delete API key
❌ GET /api/admin/logs - System logs endpoint
```

## Kế Hoạch Triển Khai

### Priority 1: Core Admin Features (Week 1-2)

#### Step 1: Admin Beat Generation UI
**Trang mới:** `/admin/beats/generate`

**Features:**
- Form chọn beat template từ `beat_catalog.xml`
- Hiển thị 30+ categories (Trap, LoFi, Afrobeats, etc.)
- Radio buttons: Full Mode / Metadata Only
- Batch generation: Slider 1-10 beats
- Preview: Estimated time, API quota usage
- Generation queue với real-time status
- Status badges: Pending → Processing → Completed → Failed

**API Calls:**
```typescript
// Single beat
POST /api/generate/beat
{
  categoryName: "Trap – Dark/Aggressive",
  mode: "metadata_only" | "full"
}

// Batch
POST /api/generate/beats
{
  count: 5,
  mode: "metadata_only"
}
```

**UI Components:**
- TemplateSelector (grid/list view)
- GenerationModeToggle
- BatchCountSlider
- GenerationQueueTable
- StatusBadge component

**Technical:**
- Poll `GET /api/beats/:id` every 3s để update status
- WebSocket alternative nếu có Suno webhook
- Toast notifications khi generation complete/failed

---

#### Step 2: BeatStars Export Dashboard
**Trang mới:** `/admin/beats/beatstars`

**Features:**
- Beats table với BeatStars-specific columns
  - Cover preview (3000x3000)
  - BeatStars Title (formula-generated)
  - BPM, Musical Key
  - Genre, Mood
  - Tags count (10-15)
  - Description preview (truncated)
  - WAV Status badge (Available / Not Converted / Converting)
  - Files Status: ☁️ CDN Only / 💾 Downloaded
  
- Filters:
  - ✅ Ready to Upload (has WAV + cover + all metadata)
  - ⚠️ Missing WAV
  - ⚠️ Missing Cover
  - 📅 Date range

- Bulk Actions:
  - Select multiple beats
  - Bulk Convert to WAV
  - Bulk Download Files
  - Export Selected to CSV

- Per-beat Quick Actions:
  - 📋 Copy BeatStars Metadata (clipboard)
  - 🎵 Convert to WAV
  - 💾 Download Files
  - 📄 View Upload Checklist

**BeatStars Upload Checklist Modal:**
Per BEATSTARS_GUIDE.md section 9:
```
✅ Audio chuẩn (MP3/WAV) - Auto-check if files exist
✅ Title chuẩn công thức - Show generated title
✅ BPM / Key chính xác - Display values
✅ 10–15 tag - Show tag count + list
✅ Description ngắn gọn - Show description length
✅ License + giá - Show 4 tiers from pricing JSON
✅ Cover art đúng kích thước - Show 3000x3000 confirmation
```

**CSV Export Format:**
```csv
Title,BPM,Key,Genre,Mood,Tags,Description,MP3_Path,WAV_Path,Cover_Path,Price_MP3,Price_WAV,Price_Trackout,Price_Exclusive
```

**API Calls:**
```typescript
GET /api/beats?
  generationStatus=completed&
  wavConversionStatus=completed

POST /api/beats/:id/convert-to-wav
POST /api/beats/:id/download

// If backend has export service:
GET /api/beatstars/export?
  startDate=2025-01-01&
  endDate=2025-12-31&
  format=csv
```

**New Components:**
- BeatStarsTable
- BeatStarsFilters
- UploadChecklistModal
- MetadataCopyButton
- BulkActionToolbar

---

#### Step 3: Pending Beats Management
**Trang mới:** `/admin/beats/pending`

**Features:**
- Table: Beats với `generationStatus = 'pending'`
- Columns:
  - Name, Genre, Mood
  - Created Date
  - Template Used
  - Status: Metadata Only
  - Actions: Generate Audio button

- Bulk Actions:
  - Select all
  - Bulk Generate Audio

- Individual Actions:
  - Generate Audio (opens modal)
  - View Details
  - Edit Metadata (before generating audio)
  - Delete

**Generate Audio Modal:**
```
Beat: [Name]
Genre: [Genre] | Mood: [Mood] | BPM: [BPM]

Confirm audio generation?
This will use 1 API credit.

[Cancel] [Generate Audio]
```

**API Calls:**
```typescript
GET /api/beats/pending/list?page=1&limit=20

POST /api/beats/:id/generate-audio
// Response: { sunoTaskId, version: {...} }

// Poll for status
GET /api/beats/:id
// Check beat.generationStatus: pending → processing → completed
```

**Real-time Updates:**
- Poll every 5s for processing beats
- Update status badges live
- Show progress indicator
- Toast notification on completion

---

### Priority 2: Enhanced Features (Week 3-4)

#### Step 4: Beat Versions Management
**Location:** Enhanced `/admin/beats/[id]` detail page + public `/beats/[id]`

**Admin View Features:**
- Versions tab showing all beat versions
- Version card:
  - Version number + Primary badge
  - Audio player
  - Duration, Model Name (chirp-v3-5)
  - Created date
  - Source (suno, suno_retry, upload)
  - Files status: CDN / Downloaded
  - Actions: Set as Primary, Download, Delete

- Create New Version button
  - Opens modal: "Generate new version for [Beat Name]?"
  - Confirm → Call API → Show in queue

- Version Comparison:
  - Side-by-side audio players
  - Waveform comparison
  - Metadata diff

**Public Marketplace View:**
- Version switcher dropdown (if multiple versions)
- Play different versions
- Download different versions (after purchase)

**API Calls:**
```typescript
GET /api/beats/:id/versions
// Returns: [{ id, versionNumber, isPrimary, ... }]

POST /api/beats/:id/versions
{
  setPrimary: false
}

POST /api/beats/:id/download?versionNumber=2

PATCH /api/beats/:id/versions/:versionId
{
  isPrimary: true
}
```

**New Components:**
- VersionsTab
- VersionCard
- VersionComparison
- CreateVersionModal
- VersionSwitcher (public)

---

#### Step 5: Complete Beat Edit Modal
**Location:** `/admin/beats` table edit button

**Modal Features:**
- Tabs: Basic Info | BeatStars | Pricing | Files

**Tab 1: Basic Info**
```
Name: [Input]
Genre: [Select] - 30+ options
Style: [Select] - Dark, Melodic, etc.
Mood: [Select] - Chill, Happy, etc.
Use Case: [Select] - Advertising, Gaming, etc.
Tags: [TagInput] - Chip-style, add/remove
BPM: [Number] - Auto-detected, editable
Musical Key: [Select] - C Minor, etc.
```

**Tab 2: BeatStars Metadata** (Auto-generated, preview only)
```
BeatStars Title: [Auto-preview from formula]
BeatStars Tags: [Auto-generated list]
Description: [Textarea] - 800+ chars
```

**Tab 3: Pricing**
```
[Tier]          [Price]   [Features]
MP3 Lease       $25       100k streams, 1 video
WAV Lease       $49       500k streams, 2 videos
Trackout        $99       Unlimited, 3 videos
Exclusive       $499      Full rights
```

**Tab 4: Files**
```
MP3: ✅ Available (CDN) / 💾 Downloaded
WAV: [Convert] button / ✅ Available
Cover Art: ✅ 3000x3000px PNG
Preview: ✅ 30s MP3

[Download All Files] button
```

**API Calls:**
```typescript
GET /api/beats/:id
// Populate form

PATCH /api/beats/:id
{
  name, genre, style, mood, tags,
  bpm, musicalKey, description,
  pricing: [...]
}
```

**Validation:**
- Tags: 10-15 required for BeatStars
- Description: Min 200 chars
- BPM: 60-200 range
- Pricing: Tiers must be ascending

---

#### Step 6: WAV Conversion & File Management UI
**Location:** Beat detail page (admin) + BeatStars export page

**WAV Conversion:**
- Button: "Convert to WAV"
- Shows modal:
  ```
  Convert [Beat Name] to WAV?
  
  Quality: 44.1kHz, 16-bit Stereo
  Processing time: ~2-5 minutes
  
  [Cancel] [Convert]
  ```

- After triggering:
  - Status badge: Converting... (with spinner)
  - Disable convert button
  - Show progress via polling
  - Toast on completion

**File Download:**
- "Download Files" button dropdown:
  ```
  💿 Download MP3 (320kbps)
  🎵 Download WAV (44.1kHz)
  🖼️ Download Cover (3000x3000px)
  📦 Download All
  ```

- Shows download progress
- Files saved to local storage
- Updates file status: ☁️ → 💾

**File Status Display:**
```
Files:
☁️ MP3 on CDN (180kbps) - [Download]
💾 MP3 downloaded (320kbps) - [Open Folder]
⏳ WAV Converting... 45%
🖼️ Cover downloaded - [View]
```

**API Calls:**
```typescript
POST /api/beats/:id/convert-to-wav
{
  includeAlternate: true
}
// Response: { wavTaskId, status: "processing" }

// Poll for status
GET /api/beats/:id/wav-status
// Response: { wavConversionStatus, wavUrl }

POST /api/beats/:id/download?versionNumber=1
// Downloads: MP3, cover, WAV (if exists)
```

**New Components:**
- WavConversionButton
- WavStatusBadge
- FileDownloadMenu
- FileStatusList
- DownloadProgressBar

---

### Priority 3: Integration & Polish (Week 5-6)

#### Step 7: Payment Integration (Stripe)
**Location:** `/checkout` page

**Implementation:**
- Install `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Stripe Checkout Session flow:
  1. User clicks "Complete Purchase"
  2. Frontend → `POST /api/payments/create-checkout-session`
  3. Backend creates Stripe session → returns URL
  4. Redirect to Stripe Checkout
  5. Stripe redirects back → `/checkout/success?session_id=xxx`
  6. Verify payment → Deliver files

**Backend Endpoints Needed:**
```typescript
POST /api/payments/create-checkout-session
{
  items: [{ beatId, tier: "wav_lease", price: 49 }],
  email: "customer@example.com"
}

GET /api/payments/verify-session?session_id=xxx
```

**File Delivery:**
- Email with download links (expires in 7 days)
- Instant download page after payment
- License PDF generation

---

#### Step 8: Admin API Key & Logs Management
**Complete existing UI with backend endpoints**

**API Keys Page:** `/admin/keys`
- Need backend endpoints:
  ```typescript
  GET /api/admin/keys
  POST /api/admin/keys
  PATCH /api/admin/keys/:id
  DELETE /api/admin/keys/:id
  ```

**System Logs Page:** `/admin/logs`
- Need backend endpoint:
  ```typescript
  GET /api/admin/logs?
    level=ERROR&
    service=MusicService&
    startDate=xxx&
    limit=100
  ```

---

#### Step 9: Analytics & Reporting
**New page:** `/admin/analytics`

**Features:**
- Sales dashboard:
  - Revenue by tier (MP3/WAV/Trackout/Exclusive)
  - Sales by genre/mood
  - Best sellers
  - Revenue trends (chart)

- Generation stats:
  - Beats created per day
  - Success/failure rates
  - API quota usage
  - Average generation time

- BeatStars upload tracking:
  - Beats uploaded to BeatStars
  - Sales from BeatStars (manual entry or API)
  - External vs internal sales

---

### Priority 4: Advanced Features (Future)

#### Step 10: Bulk Operations & Automation
- Bulk beat generation (queue system)
- Scheduled generation (cron jobs)
- Auto-publish to BeatStars (API integration)
- Auto-pricing based on market data

#### Step 11: Content ID & Distribution
- DistroKid API integration
- YouTube Content ID setup
- Spotify/Apple Music distribution
- Version management for Content ID (20-30% difference rule)

#### Step 12: Stems & Trackout Support
- Stem separation service (Spleeter/Demucs)
- Trackout ZIP generation
- Exclusive tier full package

---

## Technical Stack

### Frontend (Already in use)
- Next.js 14 (App Router)
- TypeScript
- React Query (server state)
- Zustand (client state)
- shadcn/ui components
- Tailwind CSS
- WaveSurfer.js (audio)
- Axios (API client)

### New Dependencies Needed
- `@stripe/stripe-js` - Payment
- `react-csv` - CSV export
- `react-dropzone` - File uploads
- `recharts` - Analytics charts
- `date-fns` - Date formatting

---

## Backend API Requirements

### Must Implement
```typescript
PATCH /api/beats/:id - Edit beat metadata
DELETE /api/admin/beats/:id - Delete beat (confirm if exists)
GET /api/admin/keys - List API keys
POST /api/admin/keys - Add API key
PATCH /api/admin/keys/:id - Update key
DELETE /api/admin/keys/:id - Delete key
GET /api/admin/logs - Get system logs
POST /api/payments/create-checkout-session - Stripe
GET /api/payments/verify-session - Verify payment
```

### Nice to Have
```typescript
GET /api/beatstars/export - Export to CSV
POST /api/beats/bulk-convert-wav - Bulk WAV conversion
POST /api/beats/bulk-download - Bulk file download
GET /api/analytics/sales - Sales analytics
GET /api/analytics/generation - Generation stats
```

---

## Data Model Enhancements

### Database Schema (Already exists)
- `beats` table: All metadata ✅
- `beat_versions` table: Multi-version support ✅
- `pricing` JSON field: 4 tiers ✅
- BeatStars fields: `beatstarsTitle`, `beatstarsTags`, `beatstarsDescription` ✅

### New Tables Needed
```sql
-- For payment tracking
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  email VARCHAR,
  total DECIMAL,
  status VARCHAR, -- pending, completed, refunded
  stripeSessionId VARCHAR,
  createdAt TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  orderId UUID REFERENCES orders(id),
  beatId UUID REFERENCES beats(id),
  tier VARCHAR, -- mp3_lease, wav_lease, etc.
  price DECIMAL,
  licenseUrl VARCHAR -- PDF download link
);

-- For BeatStars upload tracking
CREATE TABLE beatstars_uploads (
  id UUID PRIMARY KEY,
  beatId UUID REFERENCES beats(id),
  beatstarsId VARCHAR, -- ID on BeatStars
  uploadedAt TIMESTAMP,
  status VARCHAR, -- draft, published, sold
  externalSales INTEGER DEFAULT 0
);
```

---

## Testing Strategy

### Phase 1: Core Features
- [ ] Beat generation UI (single + batch)
- [ ] Pending beats list & audio generation
- [ ] BeatStars export dashboard
- [ ] CSV export functionality

### Phase 2: Version & Files
- [ ] Version creation & listing
- [ ] Version switcher (public)
- [ ] WAV conversion
- [ ] File download (CDN → local)

### Phase 3: Admin CRUD
- [ ] Beat edit modal (all tabs)
- [ ] Metadata validation
- [ ] API key management
- [ ] System logs viewer

### Phase 4: E2E Workflows
- [ ] Full beat lifecycle: Generate → Edit → Convert WAV → Export CSV → Upload BeatStars
- [ ] Buyer journey: Browse → Filter → Preview → Cart → Checkout → Payment → Download
- [ ] Multi-version workflow: Create → Compare → Set Primary → Download specific version

---

## Success Metrics

### Admin Efficiency
- Time to upload 1 beat to BeatStars: < 2 minutes (with CSV export)
- Batch generation: 10 beats in < 5 minutes (metadata_only)
- WAV conversion: < 5 minutes per beat

### Data Quality
- BeatStars metadata compliance: 100%
- File quality match: 100% (WAV 44.1kHz, Cover 3000x3000)
- Tag count: 10-15 per beat

### User Experience
- Page load time: < 2s
- Audio preview load: < 1s
- Search/filter response: < 500ms
- Mobile responsive: 100% pages

---

## Risks & Mitigations

### Technical Risks
1. **Backend API gaps**
   - Mitigation: Document required endpoints, prioritize implementation
   
2. **Suno API quota limits**
   - Mitigation: API key rotation, rate limiting, quota tracking dashboard

3. **Large file downloads**
   - Mitigation: CDN strategy, lazy loading, progress indicators

4. **Payment integration complexity**
   - Mitigation: Start with Stripe Checkout (hosted), migrate to embedded later

### Business Risks
1. **BeatStars platform changes**
   - Mitigation: Monitor BeatStars docs, flexible metadata system

2. **AI copyright concerns**
   - Mitigation: Clear "AI-assisted" labeling, no false copyright claims

3. **Market competition**
   - Mitigation: Focus on volume + quality, competitive pricing

---

## Timeline Estimate

**Week 1-2:** Steps 1-3 (Generation UI, BeatStars Export, Pending Beats)  
**Week 3-4:** Steps 4-6 (Versions, Edit Modal, WAV/Files)  
**Week 5-6:** Steps 7-8 (Payment, API Keys/Logs)  
**Week 7-8:** Step 9 + Testing (Analytics, E2E tests)  
**Week 9+:** Step 10-12 (Advanced features as needed)

**MVP (Minimum Viable Product):** Steps 1-3 + 5-6 = ~4 weeks

---

## Next Immediate Actions

1. **Backend Team:**
   - Verify `DELETE /api/admin/beats/:id` exists
   - Implement `PATCH /api/beats/:id` for edit
   - Implement API key management endpoints
   - Implement logs endpoint
   - Implement payment endpoints (Stripe)

2. **Frontend Team:**
   - Create admin beat generation page (Step 1)
   - Create BeatStars export dashboard (Step 2)
   - Create pending beats page (Step 3)
   - Design beat edit modal (Step 5)

3. **DevOps:**
   - Setup Stripe account (test mode)
   - Configure webhook URLs for Stripe
   - Setup file storage CDN (if not using Suno CDN)

4. **Testing:**
   - Manual testing plan for each step
   - E2E test scenarios
   - User acceptance criteria
