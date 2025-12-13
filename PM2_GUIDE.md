# 🚀 Quản lý Frontend & Backend với PM2

## Giới thiệu
PM2 được cài đặt để quản lý cả backend và frontend một cách dễ dàng. PM2 sẽ tự động restart khi có lỗi, giúp bạn quản lý logs và monitor processes hiệu quả.

## Cấu hình
File `ecosystem.config.js` chứa cấu hình cho cả 2 services:
- **Backend**: Chạy ở port 3000
- **Frontend**: Chạy ở port 3001

## Các lệnh PM2 cơ bản

### Khởi động tất cả services
```bash
pm2 start ecosystem.config.js
```

### Xem trạng thái
```bash
pm2 status
```

### Xem logs
```bash
# Tất cả logs
pm2 logs

# Logs của backend
pm2 logs backend

# Logs của frontend
pm2 logs frontend

# 100 dòng cuối
pm2 logs --lines 100
```

### Restart services
```bash
# Restart tất cả
pm2 restart all

# Restart riêng backend
pm2 restart backend

# Restart riêng frontend
pm2 restart frontend
```

### Dừng services
```bash
# Dừng tất cả
pm2 stop all

# Dừng backend
pm2 stop backend

# Dừng frontend
pm2 stop frontend
```

### Xóa services khỏi PM2
```bash
# Xóa tất cả
pm2 delete all

# Xóa backend
pm2 delete backend

# Xóa frontend
pm2 delete frontend
```

### Reload (zero-downtime restart)
```bash
pm2 reload all
```

### Monitoring
```bash
# Xem dashboard real-time
pm2 monit

# Xem thông tin chi tiết
pm2 show backend
pm2 show frontend
```

### Logs persistence
```bash
# Lưu cấu hình hiện tại
pm2 save

# Khởi động PM2 cùng hệ thống (tự động start khi reboot)
pm2 startup

# Hủy startup
pm2 unstartup
```

## Cấu trúc logs
Logs được lưu trong thư mục `/logs`:
- `backend-out.log` - Backend output logs
- `backend-error.log` - Backend error logs  
- `frontend-out.log` - Frontend output logs
- `frontend-error.log` - Frontend error logs

## Workflow phát triển

### 1. Khởi động lần đầu
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 2. Làm việc hàng ngày
```bash
# Xem trạng thái
pm2 status

# Xem logs real-time
pm2 logs --lines 50

# Restart khi cần
pm2 restart all
```

### 3. Debug
```bash
# Xem logs chi tiết
pm2 logs backend --lines 200
pm2 logs frontend --lines 200

# Xem thông tin process
pm2 show backend
pm2 show frontend
```

### 4. Tạm dừng làm việc
```bash
pm2 stop all
```

### 5. Tiếp tục làm việc
```bash
pm2 start all
# hoặc
pm2 restart all
```

## Troubleshooting

### Backend không khởi động được
1. Kiểm tra DATABASE_URL trong `.env`
2. Đảm bảo MySQL đang chạy
3. Xem logs: `pm2 logs backend --lines 100`

### Frontend không khởi động được
1. Kiểm tra port 3001 có bị chiếm không
2. Xem logs: `pm2 logs frontend --lines 100`
3. Thử xóa `.next` folder và restart: `rm -rf frontend/.next && pm2 restart frontend`

### Port đã bị sử dụng
```bash
# Kiểm tra port 3000
lsof -i :3000

# Kiểm tra port 3001
lsof -i :3001

# Kill process nếu cần
kill -9 <PID>
```

## URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Backend Health**: http://localhost:3000/health

## Tips hữu ích

### Xem tất cả trong một màn hình
```bash
pm2 monit
```

### Xóa logs cũ
```bash
pm2 flush
```

### Xem CPU & Memory usage
```bash
pm2 status
```

### Auto-restart khi file thay đổi (không khuyến khích trong dev)
Thay đổi `watch: true` trong `ecosystem.config.js`

### Export logs
```bash
pm2 logs --out logs/combined.log
```

## Sự khác biệt so với npm run dev

| Feature | npm run dev | PM2 |
|---------|-------------|-----|
| Auto restart khi crash | ❌ | ✅ |
| Logs management | ❌ | ✅ |
| Process monitoring | ❌ | ✅ |
| Background running | ❌ | ✅ |
| Quản lý nhiều apps | Khó | ✅ Dễ |
| Resource monitoring | ❌ | ✅ |

## Lưu ý quan trọng

1. **Development**: PM2 hoàn hảo cho development với nhiều services
2. **Production**: PM2 cũng tốt cho production với cluster mode
3. **Hot reload**: Frontend vẫn có hot reload như bình thường
4. **Backend**: Backend sẽ auto-restart khi có thay đổi (ts-node-dev)
5. **Logs**: Tất cả logs được lưu vào file, dễ dàng debug

## Lệnh nhanh

```bash
# Start everything
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Restart all
pm2 restart all

# Stop all
pm2 stop all
```

---

**Tạo bởi**: AI Music Project  
**Ngày**: December 13, 2025
