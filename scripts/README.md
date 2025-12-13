# Scripts Documentation

Thư mục này chứa các utility scripts để quản lý và vận hành hệ thống Beat Generator.

## Available Scripts

### 1. Import API Keys

Import Suno API keys từ file `.env` vào database.

```bash
npm run import:keys
```

**Chức năng:**
- Đọc `SUNO_API_KEYS` từ file `.env`
- Kiểm tra keys đã tồn tại trong database
- Thêm keys mới với quota mặc định (500 per key)
- Bỏ qua keys đã tồn tại
- Hiển thị summary và statistics

**Output:**
```
🔑 Starting API Keys Import...
✅ Database connected
📋 Found 3 Suno API keys in .env
✅ Key 1/3: Added successfully (8311a177...) - Quota: 500
✅ Key 2/3: Added successfully (6fcf9556...) - Quota: 500
✅ Key 3/3: Added successfully (0687cc67...) - Quota: 500

📊 Import Summary:
   ✅ Added: 3
   ⏭️  Skipped (already exists): 0
   📝 Total keys in database: 3
```

**Khi nào sử dụng:**
- Lần đầu setup hệ thống
- Khi thêm Suno API keys mới vào `.env`
- Khi cần reset và re-import keys

---

### 2. Check API Keys Status

Kiểm tra trạng thái của tất cả API keys trong database.

```bash
npm run check:keys
```

**Chức năng:**
- Hiển thị danh sách tất cả API keys
- Hiển thị status (active/exhausted/error)
- Hiển thị quota remaining
- Hiển thị last used timestamp
- Hiển thị statistics tổng hợp

**Output:**
```
🔍 Checking API Keys Status...
📋 Total API Keys: 3

🟢 Key 1:
   ID: 0eb6b398-f2ae-45fb-a9fa-79dea72fc328
   Key: 0687cc6781b6...04a0
   Status: active
   Quota Remaining: 500
   Last Used: Never
   Created: 12/13/2025, 10:14:51 AM

📈 Statistics:
   Total Keys: 3
   🟢 Active: 3
   🔴 Exhausted: 0
   🟡 Error: 0
   💰 Total Quota Remaining: 1500

✅ Active keys available: Yes
```

**Khi nào sử dụng:**
- Kiểm tra quota còn lại
- Debug khi beat generation fails
- Monitor API key health
- Trước khi chạy production

---

## API Key Management Workflow

### Initial Setup

1. **Thêm API keys vào `.env`:**
   ```env
   SUNO_API_KEYS="key1,key2,key3"
   ```

2. **Import vào database:**
   ```bash
   npm run import:keys
   ```

3. **Verify import thành công:**
   ```bash
   npm run check:keys
   ```

### Regular Monitoring

**Hàng ngày:**
```bash
npm run check:keys
```

Kiểm tra:
- Có keys nào exhausted không?
- Total quota còn bao nhiêu?
- Có keys nào bị error không?

### Refresh Quota

Khi keys hết quota, bạn có thể:

1. **Thêm keys mới vào `.env`**
2. **Re-import:**
   ```bash
   npm run import:keys
   ```

Hoặc sử dụng API endpoint (khi đã implement):
```bash
curl -X PUT http://localhost:3000/api/admin/keys/{keyId}/refresh \
  -H "Content-Type: application/json" \
  -d '{"quota": 500}'
```

---

## Troubleshooting

### Keys không được import

**Vấn đề:** Script chạy nhưng không thêm keys

**Giải pháp:**
1. Kiểm tra format trong `.env`:
   ```env
   SUNO_API_KEYS="key1,key2,key3"
   ```
2. Đảm bảo không có khoảng trắng thừa
3. Kiểm tra keys đã tồn tại chưa: `npm run check:keys`

### Database connection failed

**Vấn đề:** Cannot connect to MySQL

**Giải pháp:**
1. Kiểm tra MySQL đang chạy (XAMPP)
2. Verify `DATABASE_URL` trong `.env`
3. Test connection: `npx ts-node test-db-connection.ts`

### Duplicate key error

**Vấn đề:** Key already exists

**Giải pháp:**
- Script tự động skip duplicate keys
- Không cần làm gì, đây là behavior bình thường

---

## Advanced Usage

### Custom Quota

Để thay đổi default quota khi import, edit file `scripts/import-api-keys.ts`:

```typescript
const defaultQuota = 1000; // Change from 500 to 1000
```

### Batch Operations

Import nhiều lần an toàn:
```bash
npm run import:keys  # Lần 1
# Thêm keys mới vào .env
npm run import:keys  # Lần 2 - chỉ add keys mới
```

---

## Related Commands

```bash
# Database management
npm run prisma:studio        # Open Prisma Studio GUI
npm run prisma:migrate       # Run migrations

# Testing
npm test                     # Run all tests
npm run test:unit           # Unit tests only

# Development
npm run dev                  # Start dev server
```

---

## Notes

- Scripts sử dụng TypeScript và chạy qua `ts-node`
- Tất cả scripts tự động load `.env` file
- Database connection được quản lý tự động (connect/disconnect)
- Logs được ghi vào console và Winston logger
