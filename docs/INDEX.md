# AI Beat Generator Backend - Documentation Index

## 📚 Documentation Overview

This folder contains comprehensive documentation for the AI Beat Generator backend system.

---

## 🎯 Quick Start

**New to the project?** Start here:
1. [README](README.md) - Project overview and features
2. [API Reference](API_REFERENCE.md) - Complete API documentation
3. [Frontend Guide](FRONTEND_GUIDE.md) - Frontend integration guide

---

## 📖 Core Documentation

### For Frontend Developers

| Document | Description |
|----------|-------------|
| **[API_REFERENCE.md](API_REFERENCE.md)** | Complete REST API documentation with examples |
| **[ADMIN_API.md](ADMIN_API.md)** ⭐ NEW | Admin & BeatStars API endpoints |
| **[FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)** | Frontend integration guide and best practices |
| **[FRONTEND_API.md](FRONTEND_API.md)** | Detailed API endpoint specifications |

### For Backend Developers

| Document | Description |
|----------|-------------|
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** ⭐ NEW | Latest backend implementation details |
| **[WEBHOOK_GUIDE.md](WEBHOOK_GUIDE.md)** | Webhook integration and callback handling |
| **[STORAGE_GUIDE.md](STORAGE_GUIDE.md)** | File storage and organization strategy |
| **[WAV_CONVERSION_GUIDE.md](WAV_CONVERSION_GUIDE.md)** | WAV conversion workflow |
| **[BACKUP_PROCEDURES.md](BACKUP_PROCEDURES.md)** | Database backup and restore procedures |

### Business & Strategy

| Document | Description |
|----------|-------------|
| **[COMMERCIAL_OPTIMIZATION.md](COMMERCIAL_OPTIMIZATION.md)** | Suno API optimization strategies |
| **[BEATSTARS_GUIDE.md](BEATSTARS_GUIDE.md)** | BeatStars marketplace integration |
| **[ROADMAP_FRONTEND.md](ROADMAP_FRONTEND.md)** | Frontend development roadmap |

### Technical Deep Dives

| Document | Description |
|----------|-------------|
| **[SUNO_API_SUMMARY.md](SUNO_API_SUMMARY.md)** | Suno API integration overview |
| **[SUNO_API_OLD_VS_NEW.md](SUNO_API_OLD_VS_NEW.md)** | API version comparison |
| **[SUNO_PROMPT_GUIDE.md](SUNO_PROMPT_GUIDE.md)** | Prompt engineering guide |
| **[SUNO_COVER_ANALYSIS.md](SUNO_COVER_ANALYSIS.md)** | Cover art generation analysis |

---

## 🚀 Quick Reference by Use Case

### "I want to integrate the frontend"
→ Start with [API_REFERENCE.md](API_REFERENCE.md)  
→ Then read [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)

### "I need to understand webhooks"
→ Read [WEBHOOK_GUIDE.md](WEBHOOK_GUIDE.md)

### "How does file storage work?"
→ Check [STORAGE_GUIDE.md](STORAGE_GUIDE.md)

### "How to optimize Suno API costs?"
→ See [COMMERCIAL_OPTIMIZATION.md](COMMERCIAL_OPTIMIZATION.md)

### "Database backup procedures?"
→ Follow [BACKUP_PROCEDURES.md](BACKUP_PROCEDURES.md)

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend App                        │
│              (Next.js / React / etc.)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend API Server                      │
│                  (Express + TypeScript)                  │
├─────────────────────────────────────────────────────────┤
│  • Beat Generation APIs                                  │
│  • Version Management                                    │
│  • File Download (Lazy)                                  │
│  • WAV Conversion                                        │
│  • Webhook Callbacks                                     │
└───────┬───────────────────────┬─────────────────────────┘
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  PostgreSQL  │        │  Suno API    │
│   Database   │        │   (Music)    │
└──────────────┘        └──────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────┐
        │               │ Suno CDN     │
        │               │ (Audio Files)│
        │               └──────────────┘
        ▼
┌──────────────┐
│ Local Files  │
│ (Optional)   │
└──────────────┘
```

---

## 🔑 Key Concepts

### 1. Multi-Version System
- Each beat can have multiple audio versions
- Version 1 is primary, others are alternatives
- Each version has independent metadata and files

### 2. Lazy Download Strategy
- Audio files stored on Suno CDN (always available)
- Local files downloaded only when needed
- Saves storage space and bandwidth

### 3. Dual-Track Support
- Suno API returns 2 tracks per generation
- Track 1 → Primary version
- Track 2 → Alternate version (auto-created)

### 4. Webhook-Driven Updates
- Beat generation is asynchronous
- Suno calls webhook when audio ready
- Status: pending → processing → completed

### 5. On-Demand WAV Conversion
- WAV files not created by default (large size)
- Convert MP3 to WAV only when requested
- 44.1kHz, 16-bit professional quality

---

## 📦 Database Schema

```
beats
├── id (UUID)
├── name, genre, style, mood
├── sunoTaskId (first generation)
├── generationStatus (pending/completed)
├── sunoAudioUrl (Suno CDN)
├── fileUrl (local path)
└── versions[] (relation)

beat_versions
├── id (UUID)
├── beatId (foreign key)
├── versionNumber (1, 2, 3...)
├── sunoTaskId (webhook routing)
├── isPrimary (boolean)
├── status (pending/completed)
├── sunoAudioUrl (Suno CDN)
└── filesDownloaded (boolean)
```

---

## 🛠️ Development Tools

### API Testing
- Production URL: `https://beat.optiwellai.com/api`
- Use Postman/Insomnia for testing
- See [API_REFERENCE.md](API_REFERENCE.md) for endpoints

### Database Access
```bash
PGPASSWORD=BeatGen2024Secure psql -U beat_gen_user -d ai_beat_generator
```

### Logs
```bash
pm2 logs ai-beat-generator-api
pm2 logs ai-beat-generator-scheduler
```

### Backup
```bash
npm run backup:database
npm run restore:database -- backups/backup-file.sql
```

---

## 📞 Support & Resources

- **Project Repository**: https://github.com/ptnghia/AI-Beat-Generator-backend
- **Frontend Repository**: https://github.com/ptnghia/AI-Beat-Generator-Frontend
- **Production URL**: https://beat.optiwellai.com
- **API Base URL**: https://beat.optiwellai.com/api

---

## 📝 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| API_REFERENCE.md | ✅ Complete | Dec 14, 2025 |
| ADMIN_API.md | ✅ Complete | Dec 14, 2025 |
| IMPLEMENTATION_SUMMARY.md | ✅ Complete | Dec 14, 2025 |
| FRONTEND_GUIDE.md | ✅ Complete | Dec 13, 2025 |
| WEBHOOK_GUIDE.md | ✅ Complete | Dec 13, 2025 |
| STORAGE_GUIDE.md | ✅ Complete | Nov 2025 |
| WAV_CONVERSION_GUIDE.md | ✅ Complete | Dec 2025 |
| BACKUP_PROCEDURES.md | ✅ Complete | Nov 2025 |
| COMMERCIAL_OPTIMIZATION.md | ✅ Complete | Nov 2025 |
| BEATSTARS_GUIDE.md | ✅ Complete | Nov 2025 |
| SUNO_API_SUMMARY.md | ✅ Complete | Dec 2025 |
| SUNO_PROMPT_GUIDE.md | ✅ Complete | Nov 2025 |

---

**Last Updated**: December 14, 2025  
**Version**: 2.0 (Multi-Version Support)
