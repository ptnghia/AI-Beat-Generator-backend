# Project Structure

## Root Files

- `beat_catalog.xml` - Beat template definitions (Category, Genre, Style, Mood, Use-case, Tags, Prompts)
- `.kiro/specs/automated-beat-generation/` - Complete specification documents (requirements, design, tasks)

## Expected Directory Structure

```
src/
├── services/           # Business logic layer
│   ├── orchestrator.service.ts    # Main workflow coordinator
│   ├── concept.service.ts         # Gemini API for concepts
│   ├── prompt.service.ts          # OpenAI API for prompts
│   ├── music.service.ts           # Suno API for music generation
│   ├── metadata.service.ts        # Gemini API for metadata
│   ├── apikey-manager.service.ts  # API key pool management
│   ├── catalog-sync.service.ts    # XML to database sync
│   ├── scheduler.service.ts       # Cron-based automation
│   └── logging.service.ts         # Winston logging wrapper
│
├── repositories/       # Database access layer
│   ├── apikey.repository.ts
│   ├── beat-template.repository.ts
│   ├── beat.repository.ts
│   ├── prompt.repository.ts
│   └── execution-log.repository.ts
│
├── api/               # REST API endpoints
│   ├── routes/
│   │   ├── beats.routes.ts        # GET /api/beats, /api/beats/:id
│   │   ├── stats.routes.ts        # GET /api/stats
│   │   └── admin.routes.ts        # Admin endpoints for API keys
│   ├── middleware/
│   │   ├── rate-limiter.ts        # 100 req/min per IP
│   │   ├── error-handler.ts       # Global error handling
│   │   └── request-logger.ts      # Request/response logging
│   └── server.ts                  # Express app setup
│
├── parsers/           # XML and data parsing
│   └── catalog-parser.ts          # Parse beat_catalog.xml
│
├── utils/             # Shared utilities
│   ├── retry.util.ts              # Exponential backoff retry
│   ├── circuit-breaker.util.ts    # Circuit breaker pattern
│   └── slug.util.ts               # Generate slugs from names
│
├── types/             # TypeScript interfaces
│   ├── beat.types.ts
│   ├── api.types.ts
│   └── config.types.ts
│
└── index.ts           # Application entry point

prisma/
├── schema.prisma      # Database schema definition
└── migrations/        # Database migration history

tests/
├── unit/              # Unit tests for individual functions
├── property/          # Property-based tests (fast-check)
└── integration/       # End-to-end workflow tests

config/
├── database.config.ts
├── api.config.ts
└── scheduler.config.ts
```

## Key Conventions

### File Naming
- Services: `*.service.ts`
- Repositories: `*.repository.ts`
- Routes: `*.routes.ts`
- Tests: `*.test.ts` (unit), `*.property.test.ts` (property-based)

### Database Schema
- All tables use UUID primary keys
- Timestamps: `createdAt`, `updatedAt` (auto-managed by Prisma)
- Soft deletes: Use `isActive` boolean flag
- JSON fields for arrays and complex objects (tags, conceptData)

### Service Dependencies
- Services depend on repositories, not directly on Prisma
- Orchestrator coordinates multiple services
- No circular dependencies between services

### Error Handling
- All async operations wrapped in try-catch
- Errors logged with context and stack trace
- External API calls use retry logic
- Database operations use transactions for multi-step changes

### Configuration
- Environment variables for all secrets and API keys
- Separate config files for different concerns
- No hardcoded credentials in code
