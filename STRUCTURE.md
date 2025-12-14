# Project Structure

> Clean and organized folder structure for AI Beat Generator Backend

**Last Updated**: December 14, 2025

---

## 📁 Root Directory

```
AI-Beat-Generator-backend/
├── README.md                 # Main project documentation
├── DEPLOYMENT_GUIDE.md       # Production deployment guide
├── PM2_GUIDE.md             # PM2 process management guide
│
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
├── .dockerignore           # Docker ignore rules
│
├── package.json            # NPM dependencies
├── package-lock.json       # NPM lock file
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest test configuration
├── ecosystem.config.js    # PM2 configuration
│
├── Dockerfile             # Docker container definition
├── docker-compose.yml     # Docker compose configuration
├── deploy.sh              # Deployment script
│
├── beat_catalog.xml       # Beat templates catalog
└── project-info.json      # Project metadata
```

---

## 📂 Source Code

```
src/
├── index.ts               # Application entry point
│
├── api/                   # API layer
│   └── routes/           # Express route handlers
│       ├── beats.routes.ts
│       ├── beat-actions.routes.ts
│       ├── generate.routes.ts
│       ├── callbacks.routes.ts
│       └── ...
│
├── services/             # Business logic layer
│   ├── music.service.ts
│   ├── wav-conversion.service.ts
│   ├── file.service.ts
│   ├── logging.service.ts
│   └── ...
│
├── repositories/         # Data access layer
│   ├── beat.repository.ts
│   └── ...
│
├── config/              # Configuration modules
│   ├── database.config.ts
│   ├── suno.config.ts
│   └── ...
│
├── types/               # TypeScript type definitions
│   └── ...
│
└── utils/               # Utility functions
    └── ...
```

---

## 🗄️ Database

```
prisma/
├── schema.prisma        # Database schema definition
└── migrations/          # Database migration history
    └── YYYYMMDD_*.sql
```

---

## 🧪 Tests

```
tests/
├── setup.ts            # Test setup and configuration
├── unit/               # Unit tests
│   └── *.test.ts
└── property/           # Property-based tests
    └── *.test.ts
```

---

## 📜 Scripts

```
scripts/
├── README.md                      # Scripts documentation
├── analyze-beat.ts               # Beat analysis utility
├── backup-database.ts            # Database backup
├── restore-database.ts           # Database restore
├── check-database.ts             # Database health check
├── verify-beat-files.ts          # File verification
├── test-suno-api.ts             # Suno API testing
├── test-wav-conversion.ts       # WAV conversion testing
└── ...
```

---

## 📚 Documentation

```
docs/
├── INDEX.md                       # Documentation index
├── README.md                      # Documentation overview
│
├── API_REFERENCE.md              # Complete API documentation
├── FRONTEND_GUIDE.md             # Frontend integration guide
├── FRONTEND_API.md               # API endpoint details
│
├── WEBHOOK_GUIDE.md              # Webhook integration
├── CALLBACK_STRATEGY.md          # Callback routing logic
├── WEBHOOK_BEATVERSION_GUIDE.md  # BeatVersion webhook guide
├── DATABASE_LOGIC_REVIEW.md      # Database schema review
│
├── STORAGE_GUIDE.md              # File storage strategy
├── WAV_CONVERSION_GUIDE.md       # WAV conversion workflow
├── BACKUP_PROCEDURES.md          # Backup procedures
│
├── COMMERCIAL_OPTIMIZATION.md    # Cost optimization
├── BEATSTARS_GUIDE.md           # BeatStars integration
├── ROADMAP_FRONTEND.md          # Frontend roadmap
│
├── SUNO_API_SUMMARY.md          # Suno API overview
├── SUNO_API_OLD_VS_NEW.md       # API version comparison
├── SUNO_PROMPT_GUIDE.md         # Prompt engineering
└── SUNO_COVER_ANALYSIS.md       # Cover art analysis
```

---

## 📦 Output Files

```
output/
├── beats/                 # MP3 files (organized by date)
│   └── YYYY-MM/
│       └── DD/
│           ├── beat-id.mp3
│           └── beat-id_alt.mp3
│
├── beats-wav/            # WAV files (on-demand)
│   └── YYYY-MM/
│       └── DD/
│           └── beat-id.wav
│
├── covers/               # Cover art images
│   └── beat-id.png
│
└── previews/            # 30-second previews (optional)
    └── beat-id_preview.mp3
```

---

## 📋 Logs

```
logs/
├── error.log            # Error logs
├── combined.log         # All logs
└── pm2-*.log           # PM2 process logs
```

---

## 🗃️ Archive

```
archive/
├── test-scripts/        # Old test scripts
│   ├── check-production-ready.sh
│   ├── check-system.sh
│   ├── test-api.sh
│   └── ...
│
└── old-docs/           # Archived documentation
    ├── API_ENDPOINTS.md
    ├── PROJECT_STATUS.md
    ├── WEEK5_SUMMARY.md
    └── ...
```

---

## 🔨 Build Output

```
dist/                   # Compiled JavaScript (generated)
├── index.js
├── api/
├── services/
└── ...

node_modules/          # NPM dependencies (not in git)
```

---

## 📊 Key Files Description

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies and scripts |
| `tsconfig.json` | TypeScript compiler options |
| `jest.config.js` | Jest testing configuration |
| `ecosystem.config.js` | PM2 process manager config |
| `.env` | Environment variables (local) |
| `.env.example` | Environment template |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `DEPLOYMENT_GUIDE.md` | Production deployment steps |
| `PM2_GUIDE.md` | PM2 usage and monitoring |
| `docs/API_REFERENCE.md` | Complete REST API docs |
| `docs/FRONTEND_GUIDE.md` | Frontend integration |

### Data Files

| File | Purpose |
|------|---------|
| `beat_catalog.xml` | Beat generation templates |
| `project-info.json` | Project metadata |
| `prisma/schema.prisma` | Database schema |

---

## 🗂️ Important Directories

### `/src/` - Source Code
All TypeScript source code organized in layers (API, Services, Repositories)

### `/docs/` - Documentation
Complete technical and API documentation for developers

### `/scripts/` - Utility Scripts
Standalone scripts for maintenance, testing, and administration

### `/output/` - Generated Files
All generated audio files, covers, and previews organized by date

### `/archive/` - Archived Content
Old scripts and documentation kept for reference

### `/dist/` - Build Output
Compiled JavaScript (generated by `npm run build`)

---

## 🚫 Ignored Files

Files not tracked in Git (see `.gitignore`):
- `node_modules/` - NPM dependencies
- `dist/` - Build output
- `.env` - Environment variables
- `output/` - Generated files
- `logs/` - Log files
- `backups/` - Database backups

---

## 📝 Clean Organization Benefits

1. **Clear Separation**: Code, docs, tests, and output are clearly separated
2. **Easy Navigation**: Logical folder structure for quick file location
3. **Version Control**: Only essential files tracked in Git
4. **Archive System**: Old files preserved but out of the way
5. **Documentation Hub**: All docs centralized in `/docs/`
6. **Script Library**: Utility scripts organized in `/scripts/`

---

## 🔄 Maintenance

### Regular Cleanup
```bash
# Remove old logs
rm logs/*.log

# Clean build output
rm -rf dist/

# Prune old output files (older than 30 days)
find output/ -type f -mtime +30 -delete
```

### Archive Old Files
```bash
# Move old test scripts to archive
mv *.sh archive/test-scripts/

# Move old documentation to archive
mv *_SUMMARY.md archive/old-docs/
```

---

**Maintained by**: AI Beat Generator Team  
**Last Cleanup**: December 14, 2025
