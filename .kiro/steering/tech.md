# Technology Stack

## Core Technologies

- **Runtime:** Node.js with TypeScript (async/await, type safety)
- **Database:** MySQL 8.0+ with Prisma ORM
- **Scheduler:** node-cron for automated beat generation
- **API Framework:** Express.js for REST endpoints
- **HTTP Client:** axios with retry logic
- **Logging:** Winston with structured logging

## External APIs

- **Google Gemini API:** Concept generation and metadata creation
- **OpenAI API:** Prompt normalization and tag generation
- **Suno API:** Music generation (primary service)

## Key Libraries

- **xml2js:** XML catalog parsing
- **chokidar:** File system watching for catalog updates
- **fast-check:** Property-based testing
- **jest:** Unit and integration testing

## Testing Strategy

The project uses a dual testing approach:

1. **Property-Based Tests:** Verify universal properties across all inputs using fast-check (minimum 100 iterations per property)
2. **Unit Tests:** Test specific scenarios and edge cases using Jest
3. **Integration Tests:** End-to-end workflow testing with mocked APIs

## Common Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm test             # Run all tests (unit + property + integration)
npm run test:unit    # Run unit tests only
npm run test:property # Run property-based tests only
```

### Database
```bash
npx prisma migrate dev    # Create and apply new migration
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open database GUI
npx prisma db push        # Push schema changes without migration
```

### Production
```bash
npm start            # Start production server
npm run backup       # Manual database backup
npm run logs         # View application logs
```

## Architecture Patterns

- **Service Layer Pattern:** Business logic separated into focused services
- **Repository Pattern:** Database access abstracted through repositories
- **Circuit Breaker:** Resilience for external API calls
- **Retry with Exponential Backoff:** Automatic retry for transient failures
- **Round-Robin Load Balancing:** API key rotation for quota optimization
