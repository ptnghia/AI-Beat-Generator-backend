# Documentation

Tài liệu hướng dẫn cho Automated Beat Generation System.

## 📚 Available Documents

### API Documentation
- **[API.md](API.md)** - REST API endpoints, request/response formats, examples
- **[FRONTEND_API.md](FRONTEND_API.md)** - Frontend integration guide with React examples
- **[API_UPDATES.md](API_UPDATES.md)** - New fields migration guide (Dec 2025)
- **[API_UPDATE_SUMMARY.md](API_UPDATE_SUMMARY.md)** - Complete update summary with verification results
- **[API_FIELDS_REFERENCE.md](API_FIELDS_REFERENCE.md)** - Quick reference for all 34 beat response fields

### Guides
- **[BEATSTARS_GUIDE.md](BEATSTARS_GUIDE.md)** - Hướng dẫn upload beats lên BeatStars
- **[BACKUP_PROCEDURES.md](BACKUP_PROCEDURES.md)** - Quy trình backup và restore database
- **[STORAGE_GUIDE.md](STORAGE_GUIDE.md)** - File storage and organization guide
- **[WAV_CONVERSION_GUIDE.md](WAV_CONVERSION_GUIDE.md)** - WAV conversion implementation guide
- **[WEBHOOK_GUIDE.md](WEBHOOK_GUIDE.md)** - Webhook integration guide

### Specifications
- **[Spec Documents](../.kiro/specs/automated-beat-generation/)** - Complete requirements, design, and tasks
  - `requirements.md` - User stories và acceptance criteria
  - `design.md` - System architecture và correctness properties
  - `tasks.md` - Implementation task list

## 🚀 Quick Links

### Getting Started
1. Read main [README.md](../README.md) for setup
2. Check [API.md](API.md) for API usage
3. Review spec documents for system design

### Common Tasks
- **Upload to BeatStars:** See [BEATSTARS_GUIDE.md](BEATSTARS_GUIDE.md)
- **Backup Database:** See [BACKUP_PROCEDURES.md](BACKUP_PROCEDURES.md)
- **API Integration:** See [API.md](API.md)

## 📖 Documentation Structure

```
docs/
├── README.md                    # This file
├── API.md                       # REST API documentation
├── BEATSTARS_GUIDE.md          # BeatStars upload guide
└── BACKUP_PROCEDURES.md        # Database backup guide

.kiro/specs/automated-beat-generation/
├── requirements.md             # System requirements
├── design.md                   # System design
└── tasks.md                    # Implementation tasks
```

## 🔧 Maintenance

### Updating Documentation

When making changes to the system:
1. Update relevant docs in `docs/`
2. Update spec documents if requirements change
3. Update main README.md if setup changes

### Documentation Standards

- Use Vietnamese for user-facing docs
- Use English for code comments
- Include examples for all APIs
- Keep docs up-to-date with code

## 📞 Support

For questions or issues:
1. Check relevant documentation first
2. Review spec documents for design decisions
3. Check scripts/README.md for utility scripts
