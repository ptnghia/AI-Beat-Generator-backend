# 🎵 AI Beat Generator - Deployment Guide

## ✅ Đã hoàn thành

### 1. Cấu hình Project
- ✅ **Project ID**: 40 (API/Database Services range)
- ✅ **Port Range**: 4000-4099
- ✅ **Main API Port**: 4000
- ✅ **Admin Panel Port**: 4060
- ✅ **Monitoring Port**: 4070

### 2. Chuyển đổi Database
- ✅ Đã chuyển từ MySQL sang PostgreSQL
- ✅ Cập nhật `prisma/schema.prisma`: `provider = "postgresql"`
- ✅ Tạo database: `ai_beat_generator`
- ✅ Tạo user: `beat_gen_user` / `BeatGen2024Secure`
- ✅ Grant quyền cho user

### 3. Files đã tạo
- ✅ `project-info.json` - Metadata cho project manager
- ✅ `.env.production` - Production environment config
- ✅ `ecosystem.config.js` - PM2 configuration (updated)
- ✅ `deploy.sh` - Deployment script

---

## 🚀 Các bước triển khai tiếp theo

### Bước 1: Cài đặt Dependencies
```bash
cd /home/lifetechadmin/opt/AI-Beat-Generator-backend
npm install
```

**Lưu ý**: Quá trình này có thể mất 2-5 phút. Nếu gặp lỗi, thử:
```bash
# Xóa cache và cài lại
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Bước 2: Cấu hình API Keys
Chỉnh sửa file `.env.production`:
```bash
nano .env.production
```

Cập nhật các API keys thực:
```env
GEMINI_API_KEY="your-actual-gemini-api-key"
OPENAI_API_KEY="your-actual-openai-api-key"
SUNO_API_KEYS="key1,key2,key3"
JWT_SECRET="your-strong-secret-key"
```

### Bước 3: Chạy Prisma Migration
```bash
# Generate Prisma client
npm run prisma:generate

# Run migration để tạo tables
npm run prisma:migrate

# (Optional) Mở Prisma Studio để xem database
npm run prisma:studio
# Truy cập: http://localhost:5555
```

### Bước 4: Build TypeScript
```bash
npm run build
```

### Bước 5: Setup Admin User
```bash
npm run setup:admin
```

### Bước 6: Deploy với PM2
```bash
# Option 1: Sử dụng deploy script
./deploy.sh

# Option 2: Manual PM2 commands
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on reboot
```

### Bước 7: Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs ai-beat-generator-api --lines 50

# Test health endpoint
curl http://localhost:4000/health

# Test from external
curl http://36.50.27.10:4000/health
```

---

## 📊 Database Information

### Connection Details
```
Host: localhost
Port: 5432
Database: ai_beat_generator
User: beat_gen_user
Password: BeatGen2024Secure
```

### Connection String
```
postgresql://beat_gen_user:BeatGen2024Secure@localhost:5432/ai_beat_generator
```

### Useful PostgreSQL Commands
```bash
# Connect to database
sudo -u postgres psql ai_beat_generator

# List tables
\dt

# Describe table
\d beats

# Count records
SELECT COUNT(*) FROM beats;

# Exit
\q
```

---

## 🌐 Port Configuration

| Service | Port | Access | Purpose |
|---------|------|--------|---------|
| Main API | 4000 | Public | REST API endpoints |
| Admin Panel | 4060 | Admin | Management interface |
| Monitoring | 4070 | Internal | Health checks & metrics |
| Testing | 4080 | Dev | Test environment |

### Firewall Rules (if needed)
```bash
# Allow port 4000 for API
sudo ufw allow 4000/tcp

# Check status
sudo ufw status
```

---

## 📁 Directory Structure

```
AI-Beat-Generator-backend/
├── src/                    # Source code
│   ├── api/               # API server
│   ├── services/          # Business logic
│   ├── models/            # Data models
│   └── utils/             # Utilities
├── prisma/                # Database schema & migrations
├── output/                # Generated beats
│   └── beats/             # Beat files (MP3, WAV)
├── logs/                  # Application logs
├── dist/                  # Compiled JavaScript (after build)
├── .env.production        # Production environment
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
└── project-info.json      # Project metadata
```

---

## 🔧 PM2 Commands

```bash
# Status
pm2 status
pm2 info ai-beat-generator-api

# Logs
pm2 logs                              # All logs
pm2 logs ai-beat-generator-api       # API logs only
pm2 logs ai-beat-generator-scheduler # Scheduler logs only

# Control
pm2 restart all
pm2 stop all
pm2 delete all

# Monitoring
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

---

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Test Workflow
```bash
npm run test:workflow
```

### Full Validation
```bash
npm run validate
```

---

## 🔍 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U beat_gen_user -d ai_beat_generator
```

### Port Already in Use
```bash
# Check what's using port 4000
sudo lsof -i :4000
sudo netstat -tulpn | grep :4000

# Kill process if needed
sudo kill -9 <PID>
```

### Prisma Migration Issues
```bash
# Reset database (WARNING: Deletes all data)
npm run prisma:migrate -- reset

# Push schema without migration
npx prisma db push

# Generate client only
npm run prisma:generate
```

### Build Errors
```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

---

## 📈 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-13T20:45:00.000Z",
  "database": "connected",
  "apiKeys": 3
}
```

### Log Files
```bash
# API logs
tail -f logs/api-out.log
tail -f logs/api-error.log

# Scheduler logs
tail -f logs/scheduler-out.log
tail -f logs/scheduler-error.log
```

---

## 🔐 Security Checklist

- [ ] Change default JWT_SECRET in .env.production
- [ ] Update database password
- [ ] Add API keys for Gemini, OpenAI, Suno
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS if exposing publicly
- [ ] Enable rate limiting (already configured)
- [ ] Regular database backups

### Backup Database
```bash
npm run backup
```

### Restore Database
```bash
npm run restore
```

---

## 📞 Support & Commands

### Project Manager Integration
```bash
# Scan and register project
cd /home/lifetechadmin/opt/project-manager
./scripts/project-manager.sh scan

# List all projects
./scripts/project-manager.sh list

# View project info
./scripts/project-manager.sh info "AI Beat Generator"

# View ports
./scripts/port-manager.sh list
```

### Quick Reference
```bash
# Deploy
cd /home/lifetechadmin/opt/AI-Beat-Generator-backend
./deploy.sh

# Check status
pm2 status

# View logs
pm2 logs ai-beat-generator-api

# Restart
pm2 restart ai-beat-generator-api
```

---

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Add API keys**: Edit `.env.production`
3. **Run migrations**: `npm run prisma:migrate`
4. **Build project**: `npm run build`
5. **Create admin user**: `npm run setup:admin`
6. **Deploy**: `./deploy.sh`
7. **Test**: `curl http://localhost:4000/health`
8. **Monitor**: `pm2 logs`

---

**Project ID**: 40  
**Port Range**: 4000-4099  
**Database**: PostgreSQL (ai_beat_generator)  
**Status**: Ready for deployment  
**Last Updated**: December 13, 2024
