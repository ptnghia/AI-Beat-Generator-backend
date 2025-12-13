# Hệ Thống Lưu Trữ Nhạc

## 📂 Nơi Lưu Trữ File Nhạc

### 1. Local File System (File .mp3)

#### Đường dẫn
```
./output/beats/YYYY-MM/DD/taskId.mp3
```

#### Ví dụ cụ thể
```
./output/beats/2025-12/13/a2d0d44500f02c381b8799682da4dc39.mp3
```

#### Cấu trúc thư mục
```
output/
└── beats/
    ├── 2025-12/
    │   ├── 13/
    │   │   ├── a2d0d44500f02c381b8799682da4dc39.mp3
    │   │   ├── b3e1e55611g13d492c9890793ea5ed40.mp3
    │   │   └── ...
    │   ├── 14/
    │   └── 15/
    └── 2025-11/
        └── ...
```

#### Environment Variable
```bash
BEAT_OUTPUT_DIR="./output/beats"
```

Có thể thay đổi trong file `.env` để lưu ở nơi khác.

---

### 2. Database (MySQL)

#### Bảng: `Beat`
Thông tin về file được lưu trong database:

```sql
CREATE TABLE Beat (
  id              VARCHAR(191) PRIMARY KEY,
  name            VARCHAR(191) UNIQUE NOT NULL,
  category        VARCHAR(191) NOT NULL,
  fileUrl         TEXT NOT NULL,           -- ⭐ Đường dẫn file local
  coverArtPath    TEXT,                     -- Đường dẫn cover art
  previewPath     TEXT,                     -- Đường dẫn preview (30s)
  ...
)
```

#### Ví dụ record trong database:
```json
{
  "id": "beat-123",
  "name": "Dark UK Drill Beat",
  "fileUrl": "./output/beats/2025-12/13/a2d0d44500f02c381b8799682da4dc39.mp3",
  "coverArtPath": "./output/covers/beat-123.png",
  "previewPath": "./output/previews/beat-123-preview.mp3",
  "duration": 180,
  "createdAt": "2025-12-13T14:15:00Z"
}
```

---

## 📁 Cấu Trúc Thư Mục Đầy Đủ

```
/Volumes/DataMacos/Dev/projects/ai-music/
├── output/
│   ├── beats/              ⭐ FILE NHẠC CHÍNH (.mp3)
│   │   ├── 2025-12/
│   │   │   ├── 13/
│   │   │   │   └── [taskId].mp3
│   │   │   ├── 14/
│   │   │   └── 15/
│   │   └── 2025-11/
│   │
│   ├── covers/             🎨 COVER ART (3000x3000px .png)
│   │   ├── beat-123.png
│   │   └── beat-456.png
│   │
│   └── previews/           🎵 PREVIEW (30 giây .mp3)
│       ├── beat-123-preview.mp3
│       └── beat-456-preview.mp3
│
├── logs/                   📋 LOG FILES
│   └── app.log
│
└── backups/                💾 DATABASE BACKUPS
    └── beat_generator_YYYYMMDD_HHMMSS.sql
```

---

## 🔄 Quy Trình Lưu File

### Khi Generate Beat Mới:

```
1. Suno API tạo nhạc
   ↓
2. Nhận URL từ Suno (CDN)
   https://cdn1.suno.ai/[id].mp3
   ↓
3. Download file về local
   MusicService.downloadAndSaveFile()
   ↓
4. Lưu vào: output/beats/YYYY-MM/DD/[taskId].mp3
   ↓
5. Lưu đường dẫn local vào database
   Beat.fileUrl = "./output/beats/2025-12/13/[taskId].mp3"
   ↓
6. (Optional) Tạo cover art
   output/covers/[beatId].png
   ↓
7. (Optional) Tạo preview 30s
   output/previews/[beatId]-preview.mp3
```

---

## 💾 Storage Details

### File Audio (.mp3)
- **Định dạng:** MP3
- **Chất lượng:** Tùy Suno API (thường 320kbps)
- **Độ dài:** 2-8 phút (tùy model)
- **Kích thước:** ~4-15 MB per file
- **Naming:** `[taskId].mp3` (UUID từ Suno)

### Cover Art (.png)
- **Định dạng:** PNG
- **Kích thước:** 3000x3000 pixels
- **Tối ưu cho:** BeatStars upload
- **Naming:** `[beatId].png`

### Preview (.mp3)
- **Độ dài:** 30 giây
- **Chất lượng:** 192kbps
- **Purpose:** BeatStars preview
- **Naming:** `[beatId]-preview.mp3`

---

## 🗂️ Database Schema

### Beat Table
```typescript
model Beat {
  id                     String   @id @default(uuid())
  name                   String   @unique
  
  // FILE PATHS
  fileUrl                String   @db.Text        // Local path to MP3
  coverArtPath           String?  @db.Text        // Local path to cover
  previewPath            String?  @db.Text        // Local path to preview
  
  // METADATA
  category               String
  genre                  String
  style                  String
  mood                   String
  useCase                String
  tags                   String   @db.Text
  
  // MUSIC INFO
  bpm                    Int?
  musicalKey             String?
  duration               Int?
  
  // PRICING (BeatStars)
  basicLicensePrice      Decimal  @db.Decimal(10,2)
  premiumLicensePrice    Decimal  @db.Decimal(10,2)
  unlimitedLicensePrice  Decimal  @db.Decimal(10,2)
  exclusiveLicensePrice  Decimal  @db.Decimal(10,2)
  
  // TIMESTAMPS
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

---

## ⚠️ Quan Trọng

### 1. Suno CDN Files (15 ngày)
- ⏰ Files trên Suno CDN chỉ lưu **15 ngày**
- 💾 **PHẢI download về local** ngay sau khi generate
- ✅ Code đã implement auto-download trong `MusicService`

### 2. Local Storage Management
```bash
# Disk space cho 1000 beats
1000 beats × 10 MB average = ~10 GB

# Nên có ít nhất 50 GB free space
```

### 3. Backup Strategy
```bash
# Backup database
npx ts-node scripts/backup-database.ts

# Backup files (manual)
tar -czf beats-backup-$(date +%Y%m%d).tar.gz output/beats/
```

---

## 🔍 Cách Truy Cập Files

### 1. Qua Database
```typescript
import { getPrismaClient } from './src/config/database.config';

const prisma = getPrismaClient();

// Get beat with file path
const beat = await prisma.beat.findUnique({
  where: { id: 'beat-123' }
});

console.log('File location:', beat.fileUrl);
// Output: ./output/beats/2025-12/13/a2d0d44500f02c381b8799682da4dc39.mp3
```

### 2. Qua API
```bash
# Get beat info
curl http://localhost:3000/api/beats/beat-123

# Response includes fileUrl
{
  "id": "beat-123",
  "name": "Dark UK Drill Beat",
  "fileUrl": "./output/beats/2025-12/13/[taskId].mp3",
  ...
}
```

### 3. Direct File Access
```bash
# Play file
open output/beats/2025-12/13/a2d0d44500f02c381b8799682da4dc39.mp3

# Copy file
cp output/beats/2025-12/13/[taskId].mp3 ~/Music/

# Check file size
ls -lh output/beats/2025-12/13/[taskId].mp3
```

---

## 📊 Monitoring Storage

### Check Disk Usage
```bash
# Total size of all beats
du -sh output/beats/

# Count number of files
find output/beats -name "*.mp3" | wc -l

# List largest files
du -h output/beats/**/*.mp3 | sort -rh | head -10
```

### Check Database Records
```sql
-- Count total beats
SELECT COUNT(*) FROM Beat;

-- Check recent beats
SELECT id, name, fileUrl, createdAt 
FROM Beat 
ORDER BY createdAt DESC 
LIMIT 10;

-- Check storage by month
SELECT 
  DATE_FORMAT(createdAt, '%Y-%m') as month,
  COUNT(*) as beats_count
FROM Beat
GROUP BY month
ORDER BY month DESC;
```

---

## 🛠️ Maintenance

### Clean Old Files (Cẩn thận!)
```bash
# Xóa files cũ hơn 90 ngày
find output/beats -name "*.mp3" -mtime +90 -delete

# Backup trước khi xóa
tar -czf beats-archive-$(date +%Y%m%d).tar.gz output/beats/
```

### Verify File Integrity
```bash
# Script để verify files
npx ts-node scripts/verify-beat-files.ts

# Checks:
# - File exists on disk
# - File size > 0
# - Database record matches
# - No corrupted files
```

---

## 📝 Configuration

### Thay đổi thư mục lưu trữ

**File:** `.env`
```bash
# Default
BEAT_OUTPUT_DIR="./output/beats"

# External drive
BEAT_OUTPUT_DIR="/Volumes/ExternalDrive/beats"

# Network storage
BEAT_OUTPUT_DIR="/mnt/nas/beats"
```

**Lưu ý:**
- Đường dẫn có thể là tương đối hoặc tuyệt đối
- Folder sẽ được tạo tự động nếu chưa tồn tại
- Cần quyền write access

---

## ✅ Best Practices

1. **Always Download Local**
   - Không dựa vào Suno CDN (15 days only)
   - Auto-download đã được implement

2. **Regular Backups**
   - Database: Weekly
   - Files: Monthly (hoặc sync to cloud)

3. **Monitor Disk Space**
   - Alert khi < 10 GB free
   - Clean up old files periodically

4. **Organize by Date**
   - Structure YYYY-MM/DD giúp dễ quản lý
   - Dễ archive theo tháng/năm

5. **Keep Database Sync**
   - fileUrl trong DB phải match file thực tế
   - Chạy verify script định kỳ

---

## 🎯 Summary

**Nhạc sau khi tạo được lưu:**

1. **📁 File hệ thống:** `./output/beats/YYYY-MM/DD/[taskId].mp3`
2. **💾 Database:** MySQL table `Beat` với `fileUrl` path
3. **🎨 Cover art:** `./output/covers/[beatId].png`
4. **🎵 Preview:** `./output/previews/[beatId]-preview.mp3`

**Tất cả được quản lý tự động bởi `OrchestratorService`.**
