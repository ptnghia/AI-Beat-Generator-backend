# Quick Start Guide

Hướng dẫn nhanh để bắt đầu với Automated Beat Generation System.

## 🚀 Setup (5 Phút)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

Cần config:
- `DATABASE_URL` - MySQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `SUNO_API_KEYS` - Suno API keys (comma-separated)

### 3. Setup Database
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Import Data
```bash
# Import API keys to database
npx ts-node scripts/import-api-keys.ts

# Sync beat catalog
npx ts-node scripts/sync-catalog.ts
```

### 5. Start Server
```bash
npm run dev:api
```

Server chạy tại: http://localhost:3000

---

## 📖 Common Commands

### Development
```bash
npm run dev              # Start development server
npm run dev:api          # Start API server only
npm test                 # Run tests
```

### Database
```bash
npx prisma studio        # Open database GUI
npx ts-node scripts/check-database.ts    # Check database health
npx ts-node scripts/backup-database.ts   # Backup database
```

### Utilities
```bash
npx ts-node scripts/check-api-keys.ts    # Verify API keys
npx ts-node scripts/quick-api-test.ts    # Test API endpoints
npx ts-node scripts/verify-beat-files.ts # Verify beat files
```

---

## 🧪 Test API

### Get All Beats
```bash
curl http://localhost:3000/api/beats
```

### Get Beat by ID
```bash
curl http://localhost:3000/api/beats/BEAT_ID
```

### Get Statistics
```bash
curl http://localhost:3000/api/stats
```

### Filter Beats
```bash
curl "http://localhost:3000/api/beats?category=lofi&page=1&limit=10"
```

---

## 📚 Documentation

- **[README.md](README.md)** - Main documentation
- **[docs/API.md](docs/API.md)** - API documentation
- **[docs/BEATSTARS_GUIDE.md](docs/BEATSTARS_GUIDE.md)** - BeatStars guide
- **[docs/README.md](docs/README.md)** - All documentation

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### API Key Error
```bash
# Verify API keys
npx ts-node scripts/check-api-keys.ts
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

---

## 🎯 Next Steps

1. ✅ Setup complete
2. ⏭️ Read [API Documentation](docs/API.md)
3. ⏭️ Test API endpoints
4. ⏭️ Review [Spec Documents](.kiro/specs/automated-beat-generation/)
5. ⏭️ Start generating beats!

---

**Need help?** Check [docs/README.md](docs/README.md) for all documentation.
