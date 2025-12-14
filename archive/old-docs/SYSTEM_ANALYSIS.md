# Phân Tích Hệ Thống Beat Generator

## 1. Cơ Chế API Key Management

### Hiện Tại: Round-Robin với Multi-Key Support

**File**: `src/services/apikey-manager.service.ts`

**Cơ chế**:
```typescript
async getNextAvailableKey(): Promise<ApiKey | null> {
  // 1. Lấy TẤT CẢ active keys có quota > 0
  const activeKeys = await this.prisma.apiKey.findMany({
    where: {
      status: 'active',
      quotaRemaining: { gt: 0 }
    },
    orderBy: { lastUsed: 'asc' } // Ưu tiên key ít dùng nhất
  });

  // 2. ROUND-ROBIN: Xoay vòng qua các keys
  this.lastUsedKeyIndex = (this.lastUsedKeyIndex + 1) % activeKeys.length;
  const selectedKey = activeKeys[this.lastUsedKeyIndex];
  
  // 3. Update lastUsed timestamp
  await this.prisma.apiKey.update({
    where: { id: selectedKey.id },
    data: { lastUsed: new Date() }
  });
}
```

**Vấn đề**:
- ❌ Thiết kế cho nhiều keys
- ❌ Round-robin không cần thiết khi chỉ có 1 key
- ❌ Không ưu tiên database trước .env

### Nên Thay Đổi: Single Key Priority (Database > Env)

**Logic mới**:
1. **Ưu tiên database**: Lấy key từ database trước
2. **Fallback .env**: Nếu database không có, dùng key từ .env
3. **Simple selection**: Không cần round-robin
4. **Cache key**: Giảm database queries

---

## 2. Chế Độ Tạo Beat

### Hệ Thống Có 2 Chế Độ

#### A. 🤖 **Tự Động (Scheduler Mode)** ✅ ĐANG BẬT

**File**: `src/services/scheduler.service.ts`

**Cấu hình**:
```env
BEAT_GENERATION_INTERVAL="*/15 * * * *"  # Mỗi 15 phút
```

**Cách chạy**:
```bash
npm run dev  # Chạy src/index.ts
```

**Luồng hoạt động**:
```
┌─────────────────────────────────────────────┐
│  1. Cron runs every 15 minutes             │
│     Schedule: */15 * * * *                  │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  2. Select template                         │
│     - Chưa dùng trong 24h                   │
│     - Random nếu tất cả đã dùng             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  3. Generate beat                           │
│     orchestrator.generateBeat(templateId)   │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  4. Update template.lastUsed                │
└─────────────────────────────────────────────┘
```

**Code**:
```typescript
// scheduler.service.ts:32
start(): void {
  this.cronJob = cron.schedule('*/15 * * * *', async () => {
    await this.executeScheduledJob();
  });
}

private async executeScheduledJob(): Promise<void> {
  selectedTemplate = await this.selectTemplate();
  const beat = await this.orchestrator.generateBeat(selectedTemplate.id);
  await this.prisma.beatTemplate.update({
    where: { id: selectedTemplate.id },
    data: { lastUsed: new Date() }
  });
}
```

**Trạng thái hiện tại**:
- ✅ Scheduler KHÔNG chạy vì không start trong `src/index.ts`
- ⚠️  File `src/index.ts` chỉ start backup scheduler
- ⚠️  Beat generation scheduler KHÔNG được khởi động

**Kiểm tra**:
```bash
# index.ts lines 33-35
backupSchedulerService.start();  # ✅ Chạy
# beatSchedulerService.start();  # ❌ KHÔNG có
```

#### B. 📞 **Thủ Công (API Mode)** ❌ KHÔNG CÓ

**Không có endpoint POST để tạo beat thủ công!**

**Available endpoints**:
```
GET  /api/beats              - List beats
GET  /api/beats/:id          - Get one beat
POST /api/beats/:id/upload   - Upload manual files
POST /api/beats/:id/retry-generation - Retry failed generation
```

**Missing endpoint**:
```
POST /api/beats/generate     - ❌ KHÔNG CÓ
```

---

## 3. Entry Points

### Hiện Tại Có 2 Entry Points Riêng Biệt

#### A. `src/index.ts` - Main Scheduler
**Chức năng**:
- ✅ Connect database
- ✅ Load beat catalog
- ✅ Start backup scheduler (daily 00:00 UTC)
- ❌ KHÔNG start beat generation scheduler

**Run**:
```bash
npm run dev
# hoặc
node dist/index.js
```

#### B. `src/api/index.ts` - API Server
**Chức năng**:
- ✅ Start Express server on port 4000
- ✅ REST API endpoints
- ✅ Webhooks (callbacks)
- ❌ KHÔNG có beat generation logic

**Run**:
```bash
npm run start:api
# hoặc
node dist/api/index.js
```

---

## 4. Kết Luận

### Hệ Thống Hiện Tại

| Aspect | Status | Note |
|--------|--------|------|
| **API Key Manager** | 🟡 Multi-key | Thiết kế cho nhiều keys, đang dùng 1 |
| **Auto Generation** | ❌ Tắt | Scheduler service chưa được start |
| **Manual Generation** | ❌ Không có | Không có POST /generate endpoint |
| **API Server** | ✅ Chạy | Port 4000, chỉ query endpoints |
| **Beat Creation** | ⚠️  Webhook only | Chỉ qua callback từ Suno |

### Cách Tạo Beat Hiện Tại

**Chỉ có 1 cách**: Manual webhook testing
```bash
# Test qua script
npm run test:production
```

**Production**: Beat chỉ được tạo qua:
1. Retry failed generation: `POST /api/beats/:id/retry-generation`
2. Test scripts: `npm run test:workflow`

### Khuyến Nghị

#### 1. Fix API Key Manager
- ✅ Đơn giản hóa: Single key only
- ✅ Priority: Database → Env fallback
- ✅ Remove round-robin logic

#### 2. Chọn Chế Độ Production

**Option A: Tự động (Recommended)**
- Enable scheduler trong `src/index.ts`
- Chạy `npm run dev`
- Beat tự tạo mỗi 15 phút

**Option B: Thủ công**
- Tạo endpoint `POST /api/beats/generate`
- Gọi API khi cần
- Flexible hơn

**Option C: Hybrid**
- Có cả scheduler và API
- Best of both worlds
