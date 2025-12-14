# AI Beat Generator - Backend

> Production-ready backend system for AI-powered music beat generation with multi-version support

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![PM2](https://img.shields.io/badge/PM2-Managed-orange.svg)](https://pm2.keymetrics.io/)

**Production URL**: https://beat.optiwellai.com  
**API Base**: https://beat.optiwellai.com/api

---

## 🎯 Features

### Core Capabilities
- ✅ **Automated Beat Generation** - AI-powered music creation via Suno API
- ✅ **Multi-Version Support** - Generate multiple variations of each beat
- ✅ **Lazy Download Strategy** - CDN URLs + optional local file storage
- ✅ **Dual-Track System** - 2 unique tracks per generation
- ✅ **Webhook Integration** - Async status updates from Suno API
- ✅ **On-Demand WAV Conversion** - Professional quality audio export
- ✅ **Batch Generation** - Create multiple beats in one request
- ✅ **Flexible Modes** - Metadata-only or full generation

### Technical Highlights
- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful endpoints with TypeScript
- **Deployment**: PM2 process manager on VPS
- **File Storage**: Local + Suno CDN hybrid approach
- **Queue System**: Scheduled tasks for automation
- **Logging**: Comprehensive service logging

---

## 📚 Documentation

**→ [Complete Documentation Index](docs/INDEX.md)**

### Quick Links
- **[API Reference](docs/API_REFERENCE.md)** - Complete REST API documentation
- **[Frontend Guide](docs/FRONTEND_GUIDE.md)** - Integration guide for frontend devs
- **[Webhook Guide](docs/WEBHOOK_GUIDE.md)** - Webhook callback handling
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment steps
- **[PM2 Guide](PM2_GUIDE.md)** - Process management with PM2

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 15.x
- Suno API key

### Installation

```bash
# Clone repository
git clone https://github.com/ptnghia/AI-Beat-Generator-backend.git
cd AI-Beat-Generator-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Database setup
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Start server
npm start
```

### Development Mode

```bash
# Run in development with hot reload
npm run dev
```

---

## 📡 API Overview

### Base URL
```
Production: https://beat.optiwellai.com/api
Development: http://localhost:3000/api
```

### Key Endpoints

#### Generate Beat
```bash
POST /api/generate/beat
{
  "categoryName": "Trap – Dark/Aggressive",
  "mode": "metadata_only"  # or "full"
}
```

#### Create New Version
```bash
POST /api/beats/:id/versions
{
  "setPrimary": false
}
```

#### Download Files
```bash
POST /api/beats/:id/download
```

#### Convert to WAV
```bash
POST /api/beats/:id/convert-to-wav
```

**→ See [API_REFERENCE.md](docs/API_REFERENCE.md) for complete documentation**

---

## 🏗️ Project Structure

```
AI-Beat-Generator-backend/
├── src/
│   ├── api/              # API routes and controllers
│   │   └── routes/       # Express route handlers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Database access layer
│   ├── config/           # Configuration files
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
├── tests/                # Test files
├── docs/                 # Documentation
├── output/               # Generated files
│   ├── beats/            # MP3 files (by date)
│   ├── beats-wav/        # WAV files
│   └── covers/           # Cover art images
├── logs/                 # Application logs
└── dist/                 # Compiled JavaScript
```

---

## 🗄️ Database Schema

### Main Tables

**beats**
- Core beat metadata and first version info
- Links to template and API key
- Stores Suno CDN URLs and local file paths

**beat_versions**
- Multiple versions per beat
- Independent audio files and metadata
- Webhook routing via `sunoTaskId`

**beat_templates**
- Beat generation templates from XML catalog
- Genre, style, mood configurations

**api_keys**
- Suno API key management
- Quota tracking

**→ See [docs/README.md](docs/README.md) for schema details**

---

## 🔄 Workflow

### Beat Generation Flow

```
1. Frontend → POST /api/generate/beat (metadata_only)
   ↓
2. Backend creates Beat with status='pending'
   ↓
3. Frontend → POST /api/beats/:id/generate-audio
   ↓
4. Backend calls Suno API → gets taskId
   ↓
5. Backend creates BeatVersion (status='pending', sunoTaskId)
   ↓
6. Suno generates audio → calls webhook
   ↓
7. Webhook updates BeatVersion (status='completed', URLs, metadata)
   ↓
8. If 2 tracks → creates 2nd version automatically
   ↓
9. Frontend → POST /api/beats/:id/download (optional)
   ↓
10. Files downloaded from CDN to local storage
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start            # Run production build

# Database
npm run db:migrate   # Run migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio

# Testing
npm test             # Run tests
npm run test:watch   # Watch mode

# Maintenance
npm run backup       # Backup database
npm run restore      # Restore database
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Server
PORT=3000
NODE_ENV=production

# Suno API
SUNO_API_BASE_URL=https://suno-api.example.com
SUNO_API_KEY=your-api-key

# Webhooks
WEBHOOK_CALLBACK_URL=https://beat.optiwellai.com/api/callbacks/suno
```

**→ See [.env.example](.env.example) for complete list**

---

## 🚢 Deployment

### PM2 Production Deployment

```bash
# Build project
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs ai-beat-generator-api
pm2 monit

# Restart after updates
pm2 restart ai-beat-generator-api --update-env
```

**→ See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions**

### Docker Deployment

```bash
# Build image
docker build -t ai-beat-generator .

# Run container
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 📊 Monitoring

### PM2 Status
```bash
pm2 status                          # Process status
pm2 logs ai-beat-generator-api      # View logs
pm2 restart all --update-env        # Restart all
```

### Database Health
```bash
npm run db:check                    # Check connection
npm run backup:database             # Create backup
```

### API Health
```bash
curl https://beat.optiwellai.com/api/health
```

---

## 🔧 Configuration

### PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-beat-generator-api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Database Connection

```typescript
// src/config/database.config.ts
export const getDatabaseConfig = () => ({
  url: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 }
});
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- beat.test.ts

# Coverage report
npm run test:coverage
```

**Test files**: `tests/unit/` and `tests/property/`

---

## 📝 Changelog

### Version 2.0 (December 2025)
- ✅ Multi-version beat support
- ✅ Lazy download strategy (CDN + local)
- ✅ Dual-track automatic creation
- ✅ Webhook callback routing by taskId
- ✅ On-demand WAV conversion
- ✅ Batch generation API
- ✅ Flexible generation modes

### Version 1.0 (November 2025)
- ✅ Initial beat generation
- ✅ Suno API integration
- ✅ PostgreSQL database
- ✅ Basic file management

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🔗 Related Projects

- **[Frontend Repository](https://github.com/ptnghia/AI-Beat-Generator-Frontend)** - Next.js frontend application

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ptnghia/AI-Beat-Generator-backend/issues)
- **Documentation**: [docs/](docs/)
- **API Reference**: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## 🎵 About

AI Beat Generator automates music beat creation using advanced AI technology. The system generates professional-quality beats across multiple genres, styles, and moods, with support for multiple versions and flexible download options.

**Key Technologies**:
- Suno API for music generation
- PostgreSQL for data persistence
- Express.js for REST API
- Prisma ORM for database access
- PM2 for process management
- TypeScript for type safety

---

**Made with ❤️ using TypeScript, Node.js, and AI**
