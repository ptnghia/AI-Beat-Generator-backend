# Khuyến Nghị Tasks Tiếp Theo
## Automated Beat Generation System

**Ngày:** 13/12/2024  
**Trạng thái hiện tại:** 70% Complete  
**Mục tiêu:** Hoàn thiện MVP trong 1-2 tuần

---

## 🎯 Lộ Trình Hoàn Thiện MVP

### Phase 1: Core API & Testing (1 tuần - 8-11 giờ)

Đây là **MUST HAVE** để có thể launch MVP và sử dụng hệ thống.

---

## 🔴 PRIORITY 1: REST API Endpoints (Task 11)

**Thời gian ước tính:** 3-4 giờ  
**Độ ưu tiên:** CRITICAL  
**Blocking:** Không có API = không thể sử dụng hệ thống

### Mục Tiêu
Tạo REST API để truy vấn beats và system statistics, cho phép external applications integrate với hệ thống.

### Tasks Chi Tiết

#### 11.1 Setup Express.js Server (30 phút)
```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export default app;
```

**Deliverables:**
- [ ] Express server setup
- [ ] Basic middleware (cors, helmet, json)
- [ ] Health check endpoint
- [ ] Error handling middleware

#### 11.2 Implement Beat Query Endpoint (1 giờ)
```typescript
// GET /api/beats
// Query params: genre, style, mood, tags, page, limit

interface BeatQueryParams {
  genre?: string;
  style?: string;
  mood?: string;
  tags?: string; // comma-separated
  page?: number;
  limit?: number;
}

// Response
interface BeatQueryResponse {
  data: Beat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Deliverables:**
- [ ] BeatRepository với query methods
- [ ] GET /api/beats endpoint
- [ ] Filtering by genre, style, mood, tags
- [ ] Pagination (default 20 items)
- [ ] Response formatting

#### 11.3 Implement Beat Detail Endpoint (30 phút)
```typescript
// GET /api/beats/:id
// Returns complete beat information

interface BeatDetailResponse {
  id: string;
  name: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  description: string;
  fileUrl: string;
  coverArtPath?: string;
  previewPath?: string;
  musicalKey?: string;
  pricing?: PricingTier[];
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: ConceptData;
  createdAt: Date;
}
```

**Deliverables:**
- [ ] GET /api/beats/:id endpoint
- [ ] Complete beat data retrieval
- [ ] 404 handling for not found
- [ ] Response formatting

#### 11.4 Implement Stats Endpoint (30 phút)
```typescript
// GET /api/stats
// Returns system statistics

interface StatsResponse {
  beats: {
    total: number;
    byGenre: Record<string, number>;
    byMood: Record<string, number>;
    recentCount: number; // last 24h
  };
  apiKeys: {
    total: number;
    active: number;
    exhausted: number;
  };
  system: {
    uptime: string;
    lastBeatGenerated?: Date;
    totalBeatsToday: number;
  };
}
```

**Deliverables:**
- [ ] GET /api/stats endpoint
- [ ] Beat statistics aggregation
- [ ] API key status summary
- [ ] System health metrics

#### 11.5 Add Middleware (1 giờ)
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('API Error', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Request logging
app.use((req, res, next) => {
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });
  next();
});
```

**Deliverables:**
- [ ] Rate limiting (100 req/min per IP)
- [ ] Error handling middleware
- [ ] Request logging middleware
- [ ] CORS configuration

#### 11.6 Testing (30 phút)
**Deliverables:**
- [ ] Property test: Beat query by criteria
- [ ] Property test: Pagination default page size
- [ ] Property test: Beat detail response completeness
- [ ] Property test: Stats endpoint accuracy
- [ ] Property test: Rate limiting enforcement
- [ ] Manual testing với Postman/curl

### Acceptance Criteria
- [ ] All 3 endpoints working
- [ ] Filtering và pagination working
- [ ] Rate limiting enforced
- [ ] Error handling working
- [ ] All property tests passing
- [ ] API documented

---

## 🔴 PRIORITY 2: Final Checkpoint (Task 13)

**Thời gian ước tính:** 2-3 giờ  
**Độ ưu tiên:** HIGH  
**Blocking:** Cần validate trước deployment

### Mục Tiêu
Kiểm tra toàn bộ hệ thống, đảm bảo tất cả tests pass và system hoạt động đúng.

### Tasks Chi Tiết

#### 13.1 Run All Test Suites (1 giờ)
```bash
# Unit tests
npm run test:unit

# Property-based tests
npm run test:property

# Integration tests (if any)
npm run test:integration

# All tests
npm test
```

**Checklist:**
- [ ] All unit tests passing
- [ ] All 36 property tests passing (100+ iterations each)
- [ ] No failing tests
- [ ] Code coverage > 80%

#### 13.2 Manual Testing (1 giờ)
**Test Scenarios:**

1. **XML Catalog Sync**
   - [ ] Modify beat_catalog.xml
   - [ ] Verify file watcher detects change
   - [ ] Verify database updated
   - [ ] Verify rollback on error

2. **Beat Generation Workflow** (Mock Mode)
   - [ ] Select template
   - [ ] Generate concept
   - [ ] Normalize prompt
   - [ ] Generate metadata
   - [ ] Store in database
   - [ ] Verify all fields populated

3. **API Key Management**
   - [ ] Add new API key
   - [ ] Verify round-robin selection
   - [ ] Mark key as exhausted
   - [ ] Verify key rotation

4. **Scheduler**
   - [ ] Start scheduler
   - [ ] Verify 15-minute intervals
   - [ ] Verify template selection
   - [ ] Verify concurrent job prevention
   - [ ] Stop scheduler

5. **REST API Endpoints**
   - [ ] GET /api/beats (with filters)
   - [ ] GET /api/beats/:id
   - [ ] GET /api/stats
   - [ ] Verify rate limiting
   - [ ] Verify error handling

6. **BeatStars Features**
   - [ ] Generate professional title
   - [ ] Detect musical key
   - [ ] Generate optimized tags
   - [ ] Generate cover art
   - [ ] Generate SEO description
   - [ ] Generate pricing tiers

#### 13.3 Bug Fixes (30 phút - 1 giờ)
- [ ] Fix any bugs found during testing
- [ ] Re-run tests after fixes
- [ ] Document known issues

#### 13.4 Performance Validation (30 phút)
**Metrics to Check:**
- [ ] Beat generation time < 5 minutes
- [ ] Metadata generation < 1 second
- [ ] Cover art generation < 2 seconds
- [ ] Database queries < 100ms
- [ ] API response time < 500ms

### Acceptance Criteria
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] System validated

---

## 🔴 PRIORITY 3: Deployment Configuration (Task 14)

**Thời gian ước tính:** 3-4 giờ  
**Độ ưu tiên:** HIGH  
**Blocking:** Cần để deploy lên production

### Mục Tiêu
Tạo deployment configuration và documentation để có thể deploy hệ thống lên production.

### Tasks Chi Tiết

#### 14.1 Create Dockerfile (30 phút)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
```

**Deliverables:**
- [ ] Dockerfile created
- [ ] Multi-stage build (optional)
- [ ] Health check configured
- [ ] .dockerignore file

#### 14.2 Create docker-compose.yml (30 phút)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@db:3306/beat_generator
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SUNO_API_KEY=${SUNO_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./output:/app/output
      - ./logs:/app/logs

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=beat_generator
      - MYSQL_USER=beatgen
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

**Deliverables:**
- [ ] docker-compose.yml created
- [ ] MySQL service configured
- [ ] Environment variables configured
- [ ] Volumes for persistence
- [ ] Health checks configured

#### 14.3 Write Deployment Guide (1 giờ)
**File:** `DEPLOYMENT_GUIDE.md`

**Sections:**
1. Prerequisites
   - Docker & Docker Compose
   - Node.js (for local dev)
   - MySQL (if not using Docker)

2. Environment Setup
   - Copy .env.example to .env
   - Configure API keys
   - Configure database

3. Database Setup
   - Run migrations
   - Seed initial data (optional)

4. Running with Docker
   - Build images
   - Start services
   - Check logs
   - Stop services

5. Running Locally
   - Install dependencies
   - Run migrations
   - Start server

6. Health Checks
   - Check /health endpoint
   - Check database connection
   - Check API keys

7. Troubleshooting
   - Common issues
   - Log locations
   - Debug commands

**Deliverables:**
- [ ] DEPLOYMENT_GUIDE.md created
- [ ] Step-by-step instructions
- [ ] Troubleshooting section
- [ ] Examples and screenshots

#### 14.4 Document API Endpoints (1 giờ)
**File:** `API_DOCUMENTATION.md`

**Sections:**
1. Overview
   - Base URL
   - Authentication (if any)
   - Rate limiting

2. Endpoints
   - GET /api/beats
   - GET /api/beats/:id
   - GET /api/stats
   - GET /health

3. Request/Response Examples
   - cURL examples
   - Response formats
   - Error responses

4. Query Parameters
   - Filtering options
   - Pagination
   - Sorting

5. Error Codes
   - 400 Bad Request
   - 404 Not Found
   - 429 Too Many Requests
   - 500 Internal Server Error

**Deliverables:**
- [ ] API_DOCUMENTATION.md created
- [ ] All endpoints documented
- [ ] Request/response examples
- [ ] Error codes documented

#### 14.5 Create Maintenance Guide (30 phút)
**File:** `MAINTENANCE_GUIDE.md`

**Sections:**
1. Database Backup/Restore
2. Log Rotation
3. API Key Rotation
4. System Updates
5. Performance Monitoring
6. Troubleshooting

**Deliverables:**
- [ ] MAINTENANCE_GUIDE.md created
- [ ] Backup procedures
- [ ] Update procedures
- [ ] Monitoring guide

#### 14.6 Deployment Verification (30 phút)
**Test Checklist:**
- [ ] Docker build successful
- [ ] Docker compose up successful
- [ ] Database migrations applied
- [ ] Health check passing
- [ ] API endpoints accessible
- [ ] Scheduler running
- [ ] Logs being written

### Acceptance Criteria
- [ ] Dockerfile working
- [ ] docker-compose.yml working
- [ ] Deployment guide complete
- [ ] API documentation complete
- [ ] Maintenance guide complete
- [ ] Deployment verified

---

## 🟡 PRIORITY 4: Enhanced Logging (Task 10) - OPTIONAL

**Thời gian ước tính:** 2-3 giờ  
**Độ ưu tiên:** MEDIUM  
**Note:** Có thể skip nếu cần launch nhanh

### Mục Tiêu
Nâng cấp logging system với daily reports, error monitoring, và alerting.

### Tasks Chi Tiết

#### 10.1 Daily Summary Reports (1 giờ)
```typescript
// src/services/daily-summary.service.ts
interface DailySummary {
  date: Date;
  beatsCreated: number;
  beatsSucceeded: number;
  beatsFailed: number;
  errorRate: number;
  activeApiKeys: number;
  exhaustedApiKeys: number;
  topGenres: Array<{ genre: string; count: number }>;
  averageGenerationTime: number;
}

class DailySummaryService {
  async generateDailySummary(): Promise<DailySummary> {
    // Aggregate data from last 24 hours
    // Store in daily_summaries table
    // Send email/notification (optional)
  }
}
```

**Deliverables:**
- [ ] DailySummaryService created
- [ ] Daily aggregation logic
- [ ] Store in database
- [ ] Schedule at 00:00 UTC

#### 10.2 Error Rate Monitoring (1 giờ)
```typescript
// src/services/error-monitor.service.ts
class ErrorMonitorService {
  private errorCount = 0;
  private totalRequests = 0;
  
  trackRequest(success: boolean) {
    this.totalRequests++;
    if (!success) this.errorCount++;
    
    // Check error rate every hour
    if (this.totalRequests >= 100) {
      const errorRate = this.errorCount / this.totalRequests;
      if (errorRate > 0.2) {
        this.sendAlert('Error rate exceeded 20%');
      }
      this.reset();
    }
  }
  
  private sendAlert(message: string) {
    // Send email, Slack, or webhook
  }
}
```

**Deliverables:**
- [ ] ErrorMonitorService created
- [ ] Error rate tracking
- [ ] Alert threshold (20%)
- [ ] Alert mechanism (email/webhook)

#### 10.3 Quota Logging (30 phút)
```typescript
// After each API key usage
logger.info('API Key Usage', {
  keyId: apiKey.id,
  quotaBefore: quotaBefore,
  quotaAfter: quotaAfter,
  quotaUsed: quotaBefore - quotaAfter,
  operation: 'beat_generation',
  timestamp: new Date()
});
```

**Deliverables:**
- [ ] Quota logging after each usage
- [ ] Track quota changes
- [ ] Alert on low quota

### Acceptance Criteria
- [ ] Daily reports generated
- [ ] Error monitoring active
- [ ] Quota logging working
- [ ] Alerts configured

---

## 🟡 PRIORITY 5: Admin Endpoints (Task 12) - OPTIONAL

**Thời gian ước tính:** 2 giờ  
**Độ ưu tiên:** MEDIUM  
**Note:** Có thể quản lý qua database trực tiếp

### Mục Tiêu
Tạo admin API endpoints để quản lý API keys qua HTTP.

### Tasks Chi Tiết

#### 12.1 Admin Authentication (30 phút)
```typescript
// src/api/middleware/admin-auth.ts
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};
```

**Deliverables:**
- [ ] Admin authentication middleware
- [ ] API key validation
- [ ] 401 handling

#### 12.2 Admin Endpoints (1.5 giờ)
```typescript
// POST /api/admin/keys
// GET /api/admin/keys
// DELETE /api/admin/keys/:id
// PUT /api/admin/keys/:id/refresh
```

**Deliverables:**
- [ ] POST /api/admin/keys - Add key
- [ ] GET /api/admin/keys - List keys
- [ ] DELETE /api/admin/keys/:id - Remove key
- [ ] PUT /api/admin/keys/:id/refresh - Refresh quota
- [ ] All endpoints protected by auth

### Acceptance Criteria
- [ ] All admin endpoints working
- [ ] Authentication working
- [ ] Integration tests passing

---

## 🟢 PRIORITY 6: FFmpeg Preview Generation - OPTIONAL

**Thời gian ước tính:** 2-3 giờ  
**Độ ưu tiên:** LOW  
**Note:** Có hướng dẫn chi tiết trong code

### Mục Tiêu
Replace mock preview generation với actual FFmpeg processing.

### Tasks Chi Tiết

#### 6.1 Install FFmpeg (15 phút)
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

#### 6.2 Install Node.js Dependencies (15 phút)
```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
npm install node-id3
```

#### 6.3 Implement FFmpeg Processing (2 giờ)
```typescript
// Replace mock implementation in preview-generator.service.ts
import ffmpeg from 'fluent-ffmpeg';
import NodeID3 from 'node-id3';

async generatePreview(originalFilePath: string, beatName: string, producerName: string): Promise<PreviewResult> {
  return new Promise((resolve, reject) => {
    const previewPath = this.getPreviewPath(originalFilePath);
    
    ffmpeg(originalFilePath)
      .setStartTime(0)
      .setDuration(this.config.duration)
      .audioBitrate(this.config.bitrate)
      .audioFilters('volume=0.8')
      .on('end', () => {
        // Add ID3 tags
        const tags = {
          title: `${beatName} (Preview)`,
          artist: producerName,
          comment: {
            language: 'eng',
            text: this.config.watermarkText
          }
        };
        
        NodeID3.write(tags, previewPath);
        
        resolve({
          success: true,
          previewPath,
          originalPath: originalFilePath,
          duration: this.config.duration,
          bitrate: this.config.bitrate,
          fileSize: fs.statSync(previewPath).size
        });
      })
      .on('error', (err) => reject(err))
      .save(previewPath);
  });
}
```

**Deliverables:**
- [ ] FFmpeg installed
- [ ] Dependencies installed
- [ ] Mock implementation replaced
- [ ] Tests with real audio files

### Acceptance Criteria
- [ ] Preview generation working
- [ ] 30-second clips created
- [ ] 128kbps quality
- [ ] ID3 tags added
- [ ] Tests passing

---

## 📊 Timeline Summary

### Week 1: Core Completion
| Day | Tasks | Hours |
|-----|-------|-------|
| Day 1-2 | Task 11: REST API | 3-4h |
| Day 3 | Task 13: Testing | 2-3h |
| Day 4-5 | Task 14: Deployment | 3-4h |

**Total:** 8-11 giờ

### Week 2: Optional Enhancements
| Day | Tasks | Hours |
|-----|-------|-------|
| Day 1 | Task 10: Logging | 2-3h |
| Day 2 | Task 12: Admin API | 2h |
| Day 3 | FFmpeg Preview | 2-3h |

**Total:** 6-8 giờ

---

## ✅ Success Criteria

### MVP Launch Ready
- [x] Core services implemented (Tasks 1-9)
- [x] BeatStars optimization complete (Tasks 15-16)
- [ ] REST API working (Task 11)
- [ ] All tests passing (Task 13)
- [ ] Deployment ready (Task 14)

### Production Ready
- [ ] Enhanced logging (Task 10)
- [ ] Admin endpoints (Task 12)
- [ ] FFmpeg preview (Task 6)
- [ ] Suno API resolved
- [ ] Integration tests complete

---

## 🎯 Recommended Action Plan

### This Week (Must Do)
1. **Start Task 11** - REST API Endpoints (3-4h)
2. **Complete Task 13** - Final Checkpoint (2-3h)
3. **Complete Task 14** - Deployment (3-4h)

### Next Week (Should Do)
4. **Task 10** - Enhanced Logging (2-3h)
5. **Task 12** - Admin Endpoints (2h)
6. **FFmpeg** - Preview Generation (2-3h)

### Future (Nice to Have)
7. Complete Repository Layer
8. Integration Test Suite
9. Advanced Features (Task 17)

---

**Tổng thời gian để MVP:** 8-11 giờ  
**Tổng thời gian để Production:** 14-19 giờ  
**Khuyến nghị:** Focus vào Tasks 11, 13, 14 trước để có MVP working
