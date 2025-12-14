# AI Beat Generator - Backend

AI-powered beat generation system using Suno API, with automated beat catalog management, cover art generation, and BeatStars optimization.

## Features

- 🎵 **Automated Beat Generation**: Scheduled beat creation using Suno API
- 🎨 **AI Cover Art**: Gemini-powered cover art generation with automatic fallback
- 📊 **Smart Catalog Management**: XML-based beat catalog with intelligent parsing
- 🔄 **WAV Conversion**: Automatic MP3 to WAV conversion for premium licenses
- 📈 **BeatStars Optimization**: SEO-optimized titles, tags, and descriptions
- 🗄️ **MySQL Database**: Prisma ORM with comprehensive schema
- 🔑 **API Key Management**: Multi-key rotation system with quota tracking
- 📝 **Comprehensive Logging**: Structured logging with file rotation
- 🛡️ **Admin Dashboard API**: JWT-authenticated admin endpoints
- ⚡ **RESTful API**: Clean API design with proper error handling

## Tech Stack

- **Node.js** + **TypeScript** + **Express**
- **MySQL** + **Prisma ORM**
- **Suno API** - Music generation
- **Google Gemini** - AI prompts and cover art
- **node-cron** - Scheduled tasks
- **Winston** - Logging
- **PM2** - Process management

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- Suno API keys
- Google Gemini API key

## Installation

```bash
# Clone repository
git clone https://github.com/ptnghia/AI-Beat-Generator-backend.git
cd AI-Beat-Generator-backend

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate deploy

# Create .env file (see .env.example)
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Create admin user
npm run setup-admin
```

## Environment Variables

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/beat_generator"

# API Keys
GEMINI_API_KEY="your-gemini-api-key"
SUNO_API_KEYS="key1,key2,key3"
SUNO_CALLBACK_URL="https://your-domain.com/webhook"

# Configuration
PORT=3000
BEAT_GENERATION_INTERVAL="*/15 * * * *"
USE_MOCK_MUSIC="false"
GENERATION_SUNO="true"
```

## Usage

### Development

```bash
# Start with PM2
npm run dev

# Start with ts-node
npm start

# Check logs
pm2 logs backend
```

### Production

```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit
```

## API Endpoints

### Public API

- `GET /health` - Health check
- `GET /api/beats` - List beats with filters
- `GET /api/beats/:id` - Get beat details
- `GET /api/stats` - System statistics

### Admin API (JWT Required)

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/beats` - Admin beat management
- `DELETE /api/admin/beats/:id` - Delete beat
- `GET /api/admin/api-keys` - API key management
- `GET /api/admin/logs` - System logs

See [API.md](docs/API.md) for full documentation.

## Scripts

```bash
# Database
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run migrations
npm run prisma:studio       # Open Prisma Studio

# Admin
npm run setup-admin         # Create admin user
npm run check-database      # Validate database

# Testing
npm run test:api            # Test API endpoints
npm run test:workflow       # Test full workflow
npm run test:suno           # Test Suno API

# Maintenance
npm run backup-database     # Backup database
npm run clean-invalid       # Clean invalid beats
npm run sync-catalog        # Sync XML catalog
```

## Project Structure

```
├── src/
│   ├── api/              # Express API routes
│   ├── config/           # Configuration files
│   ├── services/         # Business logic services
│   ├── repositories/     # Database access layer
│   ├── parsers/          # XML and data parsers
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
├── docs/                 # Documentation
└── output/               # Generated files
    ├── beats/            # MP3 files
    ├── beats-wav/        # WAV files
    ├── covers/           # Cover art
    └── previews/         # Preview clips
```

## Beat Generation Flow

1. **Catalog Parsing**: Read and parse `beat_catalog.xml`
2. **Concept Generation**: AI generates prompts using Gemini
3. **Music Generation**: Create beats via Suno API
4. **Cover Art**: Generate cover art using Gemini
5. **Database Storage**: Save beat metadata to MySQL
6. **WAV Conversion**: Convert MP3 to WAV for premium licenses
7. **BeatStars Optimization**: Generate SEO metadata

## Database Schema

- **Beats**: Core beat information
- **AdminUsers**: Admin authentication
- **ApiKeys**: Suno API key management
- **SystemLogs**: Application logging

See [prisma/schema.prisma](prisma/schema.prisma) for full schema.

## Monitoring

```bash
# Check system status
pm2 status

# View logs
pm2 logs backend --lines 100

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart backend
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run check-database

# Reset database
npx prisma migrate reset
```

### API Key Exhaustion
```bash
# Check API key status
npm run test:api-keys

# Add new keys to .env SUNO_API_KEYS
```

### Missing Beats
```bash
# Validate beat files
npm run verify-beat-files

# Clean invalid entries
npm run clean-invalid-beats
```

## Documentation

- [API Documentation](docs/API.md)
- [Setup Guide](docs/SETUP_COMPLETE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Suno API Guide](docs/SUNO_API_SUMMARY.md)
- [Storage Guide](docs/STORAGE_GUIDE.md)

## License

Private Project

## Author

Phan Thanh Nghia

## Support

For issues and questions, please open an issue on GitHub.
