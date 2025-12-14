# Automated Beat Generation System

Hệ thống tạo beat nhạc không lời tự động sử dụng AI, tích hợp Gemini API, OpenAI API và Suno API.

## Tính Năng Chính

- Tự động tạo beat mỗi 15 phút theo catalog đã định nghĩa
- Quản lý nhiều Suno API key với round-robin rotation
- AI-enhanced prompt generation và metadata creation
- REST API để truy vấn beats và thống kê
- BeatStars optimization với SEO descriptions, pricing tiers, và preview generation
- Comprehensive logging và monitoring

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Database:** MySQL 8.0+ với Prisma ORM
- **APIs:** Google Gemini, OpenAI, Suno
- **Testing:** Jest + fast-check (property-based testing)
- **Scheduler:** node-cron

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- API keys: Gemini, OpenAI, Suno

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env với API keys của bạn

# 3. Setup database
npx prisma generate
npx prisma migrate dev

# 4. Import API keys
npx ts-node scripts/import-api-keys.ts

# 5. Sync catalog
npx ts-node scripts/sync-catalog.ts

# 6. Start API server
npm run dev:api
```

## Development

```bash
# Start development server
npm run dev

# Start API server only
npm run dev:api

# Run tests
npm test

# Run specific test suites
npm run test:unit
npm run test:property

# Check database
npx ts-node scripts/check-database.ts
```

## Production

```bash
# Build
npm run build

# Start production server
npm start

# Start API server
npm run start:api
```

## Useful Scripts

```bash
# Database
npx prisma studio              # Open database GUI
npx ts-node scripts/backup-database.ts    # Backup database
npx ts-node scripts/restore-database.ts   # Restore database

# Utilities
npx ts-node scripts/check-api-keys.ts     # Verify API keys
npx ts-node scripts/analyze-beat.ts       # Analyze beat file
npx ts-node scripts/verify-beat-files.ts  # Verify all beats
npx ts-node scripts/quick-api-test.ts     # Quick API test
```

## Project Structure

```
src/
├── api/                # REST API endpoints
│   ├── routes/        # API routes
│   └── middleware/    # Express middleware
├── services/          # Business logic
├── repositories/      # Database access
├── parsers/           # XML parsing
├── utils/             # Utilities
└── types/             # TypeScript types

scripts/               # Utility scripts
docs/                  # Documentation
tests/                 # Test suites
prisma/                # Database schema & migrations
```

## Documentation

- [API Documentation](docs/API.md) - REST API endpoints
- [BeatStars Guide](docs/BEATSTARS_GUIDE.md) - BeatStars upload guide
- [Backup Procedures](docs/BACKUP_PROCEDURES.md) - Database backup guide
- [Spec Documents](.kiro/specs/automated-beat-generation/) - Complete specification

## API Endpoints

```bash
# Get all beats
GET /api/beats?page=1&limit=20&category=lofi

# Get beat by ID
GET /api/beats/:id

# Get statistics
GET /api/stats
```

See [API Documentation](docs/API.md) for details.

## Environment Variables

Key variables in `.env`:

```env
# Database
DATABASE_URL="mysql://user:pass@localhost:3306/beat_generator"

# API Keys
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"
SUNO_API_KEYS="key1,key2,key3"

# Configuration
USE_MOCK_MUSIC="false"
PORT=3000
BEAT_GENERATION_INTERVAL="*/15 * * * *"
```

## Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Property-based tests only
npm run test:property

# With coverage
npm run test:coverage
```

## License

MIT
