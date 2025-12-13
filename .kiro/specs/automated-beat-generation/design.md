# Design Document - Automated Beat Generation System

## Overview

Hệ thống tạo beat nhạc tự động là một ứng dụng backend phức tạp được thiết kế để tự động hóa quy trình sản xuất nhạc không lời sử dụng AI. Hệ thống hoạt động theo workflow pipeline: Gemini API gợi ý concept → OpenAI API chuẩn hóa prompt → Suno API tạo nhạc → Gemini API tạo metadata. 

Kiến trúc được thiết kế để xử lý nhiều API key Suno đồng thời, tối ưu hóa việc sử dụng quota miễn phí, và đảm bảo sản xuất liên tục theo lịch trình. Hệ thống sử dụng MySQL để lưu trữ persistent data và cung cấp REST API để truy vấn.

**Công nghệ chính:**
- **Backend Framework:** Node.js với TypeScript (async/await pattern, type safety)
- **Database:** MySQL 8.0+ (relational data, ACID transactions)
- **Scheduler:** node-cron (cron-based scheduling)
- **AI APIs:** Google Gemini API, OpenAI API, Suno API
- **HTTP Client:** axios (với retry logic và timeout)
- **ORM:** Prisma (type-safe database access)
- **API Framework:** Express.js (REST endpoints)
- **Logging:** Winston (structured logging)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Beat Generator System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Scheduler  │─────▶│  Orchestrator│                     │
│  │  (node-cron) │      │   Service    │                     │
│  └──────────────┘      └───────┬──────┘                     │
│                                 │                             │
│         ┌───────────────────────┼───────────────────┐        │
│         ▼                       ▼                   ▼        │
│  ┌─────────────┐      ┌─────────────┐    ┌─────────────┐   │
│  │   Concept   │      │   Prompt    │    │  Metadata   │   │
│  │   Service   │      │   Service   │    │   Service   │   │
│  │  (Gemini)   │      │  (OpenAI)   │    │  (Gemini)   │   │
│  └──────┬──────┘      └──────┬──────┘    └──────┬──────┘   │
│         │                    │                   │           │
│         └────────────────────┼───────────────────┘           │
│                              ▼                               │
│                    ┌─────────────────┐                       │
│                    │  Music Service  │                       │
│                    │   (Suno API)    │                       │
│                    └────────┬────────┘                       │
│                             │                                │
│         ┌───────────────────┼───────────────────┐           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  API Key    │   │  Repository  │   │   Logging    │    │
│  │   Manager   │   │   Layer      │   │   Service    │    │
│  └─────────────┘   └──────┬───────┘   └──────────────┘    │
│                            │                                 │
│                            ▼                                 │
│                    ┌──────────────┐                         │
│                    │    MySQL     │                         │
│                    │   Database   │                         │
│                    └──────────────┘                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API Layer (Express)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Scheduler Service:**
- Trigger beat generation every 15 minutes
- Check system health before triggering
- Handle schedule conflicts (skip if previous job running)

**Orchestrator Service:**
- Coordinate the entire beat generation workflow
- Select beat template from catalog
- Call services in sequence: Concept → Prompt → Music → Metadata
- Handle errors and retries
- Update database with final results

**Concept Service:**
- Interface with Gemini API for concept suggestions
- Analyze trends based on Genre/Style/Mood
- Return creative direction for prompt enhancement

**Prompt Service:**
- Interface with OpenAI API
- Normalize and enhance prompts
- Generate additional tags
- Ensure prompt quality and consistency

**Music Service:**
- Interface with Suno API
- Manage job submission and polling
- Handle file download and storage
- Track generation status

**Metadata Service:**
- Interface with Gemini API for metadata generation
- Generate unique beat names
- Create management tags
- Write descriptive text

**API Key Manager:**
- Maintain pool of Suno API keys
- Implement round-robin selection
- Track quota usage per key
- Mark exhausted keys
- Provide health status

**Repository Layer:**
- Abstract database operations
- Implement CRUD operations for all entities
- Handle transactions
- Provide query methods

**Logging Service:**
- Structured logging with Winston
- Log levels: ERROR, WARN, INFO, DEBUG
- Daily log rotation
- Error tracking and alerting

**REST API Layer:**
- Express.js endpoints for beat queries
- Pagination support
- Rate limiting
- Authentication (optional for future)

## Components and Interfaces

### Core Interfaces

```typescript
// Beat Template from XML Catalog
interface BeatTemplate {
  id: string;
  categoryName: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  basePrompt: string;
}

// API Key Management
interface ApiKey {
  id: string;
  key: string;
  status: 'active' | 'exhausted' | 'error';
  quotaRemaining: number;
  lastUsed: Date;
  createdAt: Date;
}

// Beat Generation Job
interface BeatJob {
  id: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  conceptData?: ConceptData;
  normalizedPrompt?: string;
  sunoJobId?: string;
  metadata?: BeatMetadata;
  apiKeyUsed?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Concept from Gemini
interface ConceptData {
  suggestion: string;
  trendAnalysis: string;
  moodEnhancement: string;
}

// Beat Metadata
interface BeatMetadata {
  name: string;
  tags: string[];
  description: string;
}

// Final Beat Record
interface Beat {
  id: string;
  templateId: string;
  name: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  description: string;
  fileUrl: string;
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: ConceptData;
  apiKeyUsed: string;
  createdAt: Date;
}

// Prompt Storage
interface PromptRecord {
  id: string;
  templateId: string;
  version: number;
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: ConceptData;
  tags: string[];
  apiKeyUsed: string;
  executionResult: 'success' | 'failure';
  createdAt: Date;
}
```

### Service Interfaces

```typescript
interface IConceptService {
  generateConcept(template: BeatTemplate): Promise<ConceptData>;
}

interface IPromptService {
  normalizePrompt(basePrompt: string, concept: ConceptData): Promise<{
    normalizedPrompt: string;
    additionalTags: string[];
  }>;
}

interface IMusicService {
  generateMusic(prompt: string, apiKey: string): Promise<{
    jobId: string;
    fileUrl: string;
  }>;
  pollJobStatus(jobId: string): Promise<'processing' | 'completed' | 'failed'>;
}

interface IMetadataService {
  generateName(template: BeatTemplate, prompt: string): Promise<string>;
  generateTags(template: BeatTemplate, prompt: string): Promise<string[]>;
  generateDescription(template: BeatTemplate, prompt: string): Promise<string>;
}

interface IApiKeyManager {
  getNextAvailableKey(): Promise<ApiKey | null>;
  updateKeyQuota(keyId: string, remaining: number): Promise<void>;
  markKeyExhausted(keyId: string): Promise<void>;
  getAllKeysStatus(): Promise<ApiKey[]>;
}

interface IOrchestratorService {
  generateBeat(): Promise<Beat>;
}
```

## Data Models

### Database Schema (Prisma)

```prisma
model ApiKey {
  id              String   @id @default(uuid())
  key             String   @unique
  status          String   @default("active") // active, exhausted, error
  quotaRemaining  Int      @default(0)
  lastUsed        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  beats           Beat[]
  prompts         PromptRecord[]
  
  @@index([status, lastUsed])
}

model BeatTemplate {
  id            String   @id @default(uuid())
  categoryName  String
  genre         String
  style         String
  mood          String
  useCase       String
  tags          Json     // string[]
  basePrompt    String   @db.Text
  lastUsed      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  beats         Beat[]
  prompts       PromptRecord[]
  
  @@index([genre, style, mood])
  @@index([lastUsed])
}

model Beat {
  id                String   @id @default(uuid())
  templateId        String
  name              String   @unique
  genre             String
  style             String
  mood              String
  useCase           String
  tags              Json     // string[]
  description       String   @db.Text
  fileUrl           String
  basePrompt        String   @db.Text
  normalizedPrompt  String   @db.Text
  conceptData       Json     // ConceptData
  apiKeyUsed        String
  createdAt         DateTime @default(now())
  
  template          BeatTemplate @relation(fields: [templateId], references: [id])
  apiKey            ApiKey       @relation(fields: [apiKeyUsed], references: [id])
  
  @@index([genre, style, mood])
  @@index([createdAt])
  @@index([templateId])
}

model PromptRecord {
  id                String   @id @default(uuid())
  templateId        String
  version           Int
  basePrompt        String   @db.Text
  normalizedPrompt  String   @db.Text
  conceptData       Json     // ConceptData
  tags              Json     // string[]
  apiKeyUsed        String
  executionResult   String   // success, failure
  errorMessage      String?  @db.Text
  createdAt         DateTime @default(now())
  
  template          BeatTemplate @relation(fields: [templateId], references: [id])
  apiKey            ApiKey       @relation(fields: [apiKeyUsed], references: [id])
  
  @@index([templateId, createdAt])
  @@index([executionResult])
}

model ExecutionLog {
  id            String   @id @default(uuid())
  level         String   // ERROR, WARN, INFO, DEBUG
  service       String
  message       String   @db.Text
  context       Json?
  stackTrace    String?  @db.Text
  createdAt     DateTime @default(now())
  
  @@index([level, createdAt])
  @@index([service, createdAt])
}

model DailySummary {
  id                String   @id @default(uuid())
  date              DateTime @unique @db.Date
  beatsCreated      Int      @default(0)
  beatsSucceeded    Int      @default(0)
  beatsFailed       Int      @default(0)
  errorRate         Float    @default(0)
  activeApiKeys     Int      @default(0)
  exhaustedApiKeys  Int      @default(0)
  createdAt         DateTime @default(now())
  
  @@index([date])
}
```

### XML Catalog Parser and Sync

```typescript
interface CatalogParser {
  parseXML(filePath: string): Promise<BeatTemplate[]>;
  validateStructure(xml: string): boolean;
  watchForChanges(filePath: string, callback: (templates: BeatTemplate[]) => void): void;
}

interface CatalogSyncService {
  syncCatalogToDatabase(templates: BeatTemplate[]): Promise<SyncResult>;
  loadCatalogOnStartup(): Promise<void>;
  handleCatalogUpdate(templates: BeatTemplate[]): Promise<void>;
}

interface SyncResult {
  added: number;
  updated: number;
  unchanged: number;
  errors: string[];
}
```

### XML to Database Sync Strategy

**Initial Load (System Startup):**
1. Parse beat_catalog.xml file
2. Validate XML structure
3. For each row in XML:
   - Create unique ID based on categoryName (slug format)
   - Check if template exists in database by ID
   - If not exists: INSERT new record
   - If exists: UPDATE if any field changed
4. Mark templates not in XML as inactive (soft delete)
5. Log sync results

**Incremental Update (File Change Detected):**
1. Detect file modification via file watcher
2. Parse updated XML
3. Compare with current database state
4. Apply changes in transaction:
   - INSERT new templates
   - UPDATE modified templates
   - Mark removed templates as inactive
5. Rollback if any error occurs
6. Log sync results

**Data Mapping:**
```typescript
// XML Row to Database Record
function mapXMLRowToTemplate(row: XMLRow): BeatTemplate {
  return {
    id: generateSlug(row.categoryName), // e.g., "lofi-chill-study-beat"
    categoryName: row.categoryName,
    genre: row.genre,
    style: row.style,
    mood: row.mood,
    useCase: row.useCase,
    tags: row.tags.split(',').map(t => t.trim()),
    basePrompt: row.prompt,
    lastUsed: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Slug generation for consistent IDs
function generateSlug(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

**Sync Workflow:**
```
┌─────────────────┐
│  beat_catalog   │
│     .xml        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  File Watcher   │
│   (chokidar)    │
└────────┬────────┘
         │ onChange
         ▼
┌─────────────────┐
│  XML Parser     │
│  (xml2js)       │
└────────┬────────┘
         │ BeatTemplate[]
         ▼
┌─────────────────┐
│  Validator      │
│  (check schema) │
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│  Sync Service   │
│  (diff & merge) │
└────────┬────────┘
         │ SQL operations
         ▼
┌─────────────────┐
│  MySQL DB       │
│  beat_templates │
└─────────────────┘
```

**Database Schema Enhancement:**
```prisma
model BeatTemplate {
  id            String   @id // slug from categoryName
  categoryName  String   @unique
  genre         String
  style         String
  mood          String
  useCase       String
  tags          Json     // string[]
  basePrompt    String   @db.Text
  isActive      Boolean  @default(true) // soft delete flag
  lastUsed      DateTime?
  xmlChecksum   String?  // MD5 hash to detect changes
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  beats         Beat[]
  prompts       PromptRecord[]
  
  @@index([genre, style, mood])
  @@index([lastUsed])
  @@index([isActive])
}
```

**Change Detection:**
- Calculate MD5 checksum of each XML row
- Store checksum in database
- On sync, compare checksums to detect changes
- Only UPDATE records with different checksums

**Error Handling:**
- If XML is invalid: Keep existing database data, log error
- If partial sync fails: Rollback entire transaction
- If file is temporarily unavailable: Retry with exponential backoff
- If database is unavailable: Queue sync operation for retry


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection Analysis

After analyzing all acceptance criteria, several properties can be consolidated:
- Properties 3.1, 3.2, 3.3 about the AI workflow can be combined into one comprehensive workflow property
- Properties 5.1, 5.2, 5.3, 5.4 about metadata generation can be combined into one sequential workflow property
- Properties 7.2, 7.3, 7.5 about prompt storage fields are all checking the same invariant (completeness of stored data)
- Properties 9.1, 9.2, 9.3 about logging can be consolidated into comprehensive logging properties

### Core Properties

**Property 1: API Key Addition Persistence**
*For any* valid API key string, when added to the system, the key should exist in the database with status 'active' and be retrievable by its ID.
**Validates: Requirements 1.1**

**Property 2: Quota Update Consistency**
*For any* API key in the system, after checking quota with Suno API, the quota value in the database should match the value returned by the API.
**Validates: Requirements 1.2**

**Property 3: Exhausted Key State Transition**
*For any* API key with quota reaching zero, the key status should transition to 'exhausted' and should not be selected for subsequent operations.
**Validates: Requirements 1.3**

**Property 4: Round-Robin Key Selection**
*For any* set of N active API keys, after N consecutive selections, each key should have been selected exactly once.
**Validates: Requirements 1.5**

**Property 5: Catalog Reload on Change**
*For any* modification to the beat_catalog.xml file, the system should detect the change and reload all templates into the database within 5 seconds.
**Validates: Requirements 2.2**

**Property 6: XML Validation Before Parse**
*For any* XML input, if the structure is invalid, the parser should reject it before any database operations occur.
**Validates: Requirements 2.3**

**Property 7: Invalid Catalog Rollback**
*For any* invalid Beat Catalog update, the database should retain the previous valid template data unchanged.
**Validates: Requirements 2.4**

**Property 8: Beat Template Unique Identifiers**
*For any* set of beat templates in the database, all template IDs should be unique (no duplicates).
**Validates: Requirements 2.5**

**Property 8a: XML to Database Sync Completeness**
*For any* valid XML catalog with N beat templates, after sync completion, the database should contain exactly N active beat template records with matching data.
**Validates: Requirements 2.1**

**Property 8b: Sync Transaction Atomicity**
*For any* catalog sync operation, if any template fails to sync, all changes should be rolled back and the database should retain its previous state.
**Validates: Requirements 2.4**

**Property 8c: Template ID Consistency**
*For any* beat template with categoryName X, the generated ID should always be the same slug derived from X (deterministic slug generation).
**Validates: Requirements 2.5**

**Property 9: AI Workflow Sequential Execution**
*For any* beat template, the workflow should execute in order: Gemini concept generation → OpenAI prompt normalization → prompt storage, with each step receiving output from the previous step.
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 10: API Retry with Exponential Backoff**
*For any* API call that fails, the system should retry exactly 3 times with delays following exponential backoff pattern (e.g., 1s, 2s, 4s).
**Validates: Requirements 3.4**

**Property 11: Active Key Selection for Music Generation**
*For any* normalized prompt ready for music generation, the system should select an API key with status 'active' and quotaRemaining > 0.
**Validates: Requirements 4.1**

**Property 12: Job State Persistence**
*For any* Suno API job initiated, a record with jobId and status 'processing' should be created in the database before polling begins.
**Validates: Requirements 4.2**

**Property 13: Completed Job Data Storage**
*For any* successfully completed Suno job, the database should contain a beat record with non-empty fileUrl and status 'completed'.
**Validates: Requirements 4.3**

**Property 14: Rate Limit Key Rotation**
*For any* Suno API call that returns rate limit error, the system should select a different API key from the pool and retry the request.
**Validates: Requirements 4.4**

**Property 15: Job Polling Interval and Timeout**
*For any* Suno job being polled, status checks should occur at 10-second intervals and stop after 5 minutes (30 polls) if not completed.
**Validates: Requirements 4.5**

**Property 16: Metadata Generation Sequential Workflow**
*For any* completed beat, the system should call Gemini API three times in sequence (name → tags → description) and store all three results in the database.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 17: Beat Name Uniqueness**
*For any* beat name that already exists in the database, the system should append a numeric suffix (e.g., "-2", "-3") to ensure uniqueness.
**Validates: Requirements 5.5**

**Property 18: Schedule Interval Consistency**
*For any* 1-hour time window when the scheduler is active, exactly 4 beat generation jobs should be triggered (one every 15 minutes).
**Validates: Requirements 6.1**

**Property 19: Template Selection Recency Filter**
*For any* beat template selected by the scheduler, the template's lastUsed timestamp should be either null or older than 24 hours from current time.
**Validates: Requirements 6.2**

**Property 20: Concurrent Job Prevention**
*For any* time when a beat generation job is in 'processing' status, the scheduler should not start a new job until the current job reaches 'completed' or 'failed' status.
**Validates: Requirements 6.4**

**Property 21: Schedule Execution Logging**
*For any* scheduler execution, a log entry should be created with timestamp, selected template ID, and execution result.
**Validates: Requirements 6.5**

**Property 22: Prompt Storage Completeness**
*For any* prompt record in the database, all required fields should be non-null: version, basePrompt, normalizedPrompt, conceptData, apiKeyUsed, executionResult.
**Validates: Requirements 7.1, 7.2, 7.3, 7.5**

**Property 23: Prompt Query by Multiple Criteria**
*For any* prompt stored in the database, it should be retrievable by querying any of: templateId, genre, style, mood, or tags.
**Validates: Requirements 7.4**

**Property 24: Transaction Atomicity**
*For any* multi-step database operation, if any step fails, all changes should be rolled back and the database should remain in its previous consistent state.
**Validates: Requirements 8.2**

**Property 25: Parameterized Query Usage**
*For any* database query with user input, the query should use parameterized statements (no string concatenation of user data into SQL).
**Validates: Requirements 8.4**

**Property 26: Daily Backup Execution**
*For any* 24-hour period, exactly one database backup should be created at 00:00 UTC.
**Validates: Requirements 8.5**

**Property 27: API Call Logging Completeness**
*For any* external API call, a log entry should be created containing: timestamp, endpoint, request payload, response status, and execution time.
**Validates: Requirements 9.1**

**Property 28: Error Logging with Stack Trace**
*For any* error or exception, a log entry with level 'ERROR' should be created containing stack trace and context information.
**Validates: Requirements 9.2**

**Property 29: Quota Logging After Usage**
*For any* API key usage, a log entry should be created recording the key ID and remaining quota after the operation.
**Validates: Requirements 9.3**

**Property 30: Daily Summary Report Generation**
*For any* day, a summary report should be generated containing: total beats created, success count, failure count, error rate, and API key status counts.
**Validates: Requirements 9.4**

**Property 31: Error Rate Alert Threshold**
*For any* 1-hour sliding window, if error rate exceeds 20%, an alert notification should be triggered.
**Validates: Requirements 9.5**

**Property 32: Beat Query by Criteria**
*For any* REST API query with filters (genre, style, mood, tags), only beats matching all specified criteria should be returned.
**Validates: Requirements 10.1**

**Property 33: Pagination Default Page Size**
*For any* GET request to /api/beats without page size parameter, the response should contain exactly 20 items (or fewer if total is less than 20).
**Validates: Requirements 10.2**

**Property 34: Beat Detail Response Completeness**
*For any* GET request to /api/beats/:id with valid ID, the response should include: name, metadata, normalizedPrompt, and fileUrl.
**Validates: Requirements 10.3**

**Property 35: Stats Endpoint Accuracy**
*For any* GET request to /api/stats, the returned statistics should match the actual counts in the database (total beats, active keys, exhausted keys).
**Validates: Requirements 10.4**

**Property 36: Rate Limiting Enforcement**
*For any* IP address, the 101st request within a 60-second window should receive HTTP 429 (Too Many Requests) response.
**Validates: Requirements 10.5**

## Error Handling

### Error Categories and Strategies

**1. External API Errors**
- **Gemini API Failures:** Retry 3 times with exponential backoff. If all retries fail, use base prompt and log warning.
- **OpenAI API Failures:** Retry 3 times with exponential backoff. If all retries fail, use base prompt and log warning.
- **Suno API Failures:** 
  - Rate limit: Switch to next API key and retry immediately
  - Timeout: Mark job as failed after 5 minutes
  - Other errors: Retry 3 times, then mark job as failed

**2. Database Errors**
- **Connection Failures:** Retry connection with exponential backoff (max 5 attempts)
- **Transaction Failures:** Rollback all changes, log error, return error to caller
- **Constraint Violations:** Handle gracefully (e.g., duplicate name → add suffix)

**3. File System Errors**
- **XML Parse Errors:** Log detailed error, keep existing data, alert admin
- **File Watch Errors:** Log error, continue with existing data, attempt to re-establish watch

**4. Scheduler Errors**
- **Job Timeout:** Mark job as failed, log error, allow next scheduled job
- **Concurrent Job Attempt:** Skip current schedule, log info, wait for next interval

**5. Validation Errors**
- **Invalid API Key:** Reject with clear error message
- **Invalid Beat Template:** Skip template, log error, select another template
- **Invalid Query Parameters:** Return HTTP 400 with validation error details

### Error Recovery Mechanisms

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  errorHandler?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (errorHandler) errorHandler(error, attempt);
      
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}
```

### Circuit Breaker Pattern

For external APIs, implement circuit breaker to prevent cascading failures:

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
  timeout: number;
  lastFailureTime: Date;
}
```

## Testing Strategy

### Dual Testing Approach

This system requires both unit tests and property-based tests to ensure correctness:

**Unit Tests** verify specific examples and integration points:
- Specific XML parsing scenarios
- Database connection handling
- API endpoint responses
- Error handling for known edge cases

**Property-Based Tests** verify universal properties across all inputs:
- Round-robin key selection works for any number of keys
- Retry logic works for any API failure
- Transaction rollback works for any failure point
- Pagination works for any dataset size

### Property-Based Testing Framework

**Framework:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing examples

**Test Structure:**
```typescript
import fc from 'fast-check';

describe('Property Tests', () => {
  it('Property 1: API Key Addition Persistence', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 50 }), // API key generator
        async (apiKey) => {
          // Feature: automated-beat-generation, Property 1: API Key Addition Persistence
          const result = await apiKeyManager.addKey(apiKey);
          const retrieved = await apiKeyManager.getKey(result.id);
          
          expect(retrieved).toBeDefined();
          expect(retrieved.key).toBe(apiKey);
          expect(retrieved.status).toBe('active');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Framework:** Jest (JavaScript/TypeScript testing framework)

**Coverage Areas:**
- Service layer methods
- Repository CRUD operations
- API endpoint handlers
- Error handling paths
- XML parsing edge cases

**Example Unit Test:**
```typescript
describe('CatalogParser', () => {
  it('should parse valid XML catalog', async () => {
    const xml = `<?xml version="1.0"?>
      <Workbook>
        <Worksheet ss:Name="Beat Catalog">
          <Table>
            <Row>
              <Cell><Data ss:Type="String">Category Name</Data></Cell>
              <!-- ... -->
            </Row>
          </Table>
        </Worksheet>
      </Workbook>`;
    
    const templates = await catalogParser.parseXML(xml);
    expect(templates).toHaveLength(1);
    expect(templates[0]).toHaveProperty('categoryName');
  });
});
```

### Integration Testing

**Test Scenarios:**
1. End-to-end beat generation workflow (mocked external APIs)
2. Scheduler triggering and job execution
3. API key rotation under load
4. Database transaction rollback scenarios
5. REST API endpoints with various query parameters

### Test Data Generators

For property-based tests, create smart generators:

```typescript
// Generator for valid API keys
const apiKeyArb = fc.string({ 
  minLength: 32, 
  maxLength: 64,
  pattern: /^[A-Za-z0-9_-]+$/
});

// Generator for beat templates
const beatTemplateArb = fc.record({
  categoryName: fc.string({ minLength: 5, maxLength: 50 }),
  genre: fc.constantFrom('Lo-fi', 'Trap', 'Cinematic', 'Afrobeats'),
  style: fc.string({ minLength: 5, maxLength: 30 }),
  mood: fc.constantFrom('Chill', 'Dark', 'Happy', 'Sad'),
  useCase: fc.string({ minLength: 5, maxLength: 30 }),
  tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 3, maxLength: 10 }),
  basePrompt: fc.string({ minLength: 20, maxLength: 200 })
});

// Generator for quota values
const quotaArb = fc.integer({ min: 0, max: 500 });
```

### Mocking Strategy

**External API Mocks:**
- Mock Gemini API responses with realistic concept data
- Mock OpenAI API responses with normalized prompts
- Mock Suno API with job ID generation and polling simulation

**Database Mocks:**
- Use in-memory SQLite for fast unit tests
- Use Docker MySQL container for integration tests
- Reset database state between tests

### Test Execution

**Local Development:**
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:property      # Property-based tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Generate coverage report
```

**CI/CD Pipeline:**
- Run all tests on every commit
- Require 80% code coverage
- Run property tests with 200 iterations in CI
- Integration tests against real MySQL container

## Performance Considerations

### Scalability Targets

- **Beat Generation Rate:** 4 beats per hour (15-minute intervals)
- **API Response Time:** < 2 seconds for query endpoints
- **Database Query Time:** < 100ms for indexed queries
- **Concurrent API Calls:** Support up to 10 concurrent Gemini/OpenAI calls
- **API Key Pool Size:** Support 10-50 API keys

### Optimization Strategies

**1. Database Indexing**
- Index on (genre, style, mood) for fast filtering
- Index on created_at for time-based queries
- Index on status fields for active record filtering

**2. Connection Pooling**
- MySQL connection pool: 10-20 connections
- Reuse HTTP clients for API calls
- Keep-alive connections for external APIs

**3. Caching**
- Cache beat catalog in memory (reload on file change)
- Cache API key pool status (refresh every 5 minutes)
- Cache stats endpoint response (TTL: 1 minute)

**4. Async Processing**
- Use async/await for all I/O operations
- Parallel API calls where possible (e.g., multiple Gemini calls)
- Non-blocking scheduler implementation

**5. Rate Limiting**
- Implement token bucket algorithm for API rate limiting
- Per-IP tracking with Redis (optional) or in-memory Map
- Graceful degradation under high load

### Monitoring Metrics

**System Health:**
- Beat generation success rate
- Average beat generation time
- API key quota utilization
- Database connection pool usage

**Performance Metrics:**
- API response times (p50, p95, p99)
- Database query times
- External API call latencies
- Scheduler execution delays

**Business Metrics:**
- Total beats generated per day
- Beats by genre/style/mood distribution
- API key exhaustion rate
- Error rate by error type

## Deployment Architecture

### Infrastructure

**Application Server:**
- Node.js 18+ runtime
- PM2 process manager for auto-restart
- 2GB RAM minimum
- 2 CPU cores minimum

**Database:**
- MySQL 8.0+ server
- 20GB storage minimum
- Daily automated backups
- Replication for high availability (optional)

**File Storage:**
- Local filesystem for beat files (or S3-compatible storage)
- 100GB storage minimum for beat files
- CDN for beat file delivery (optional)

### Environment Configuration

```typescript
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  DATABASE_POOL_SIZE: number;
  
  // API Keys
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  
  // Suno API Keys (comma-separated)
  SUNO_API_KEYS: string;
  
  // Scheduler
  BEAT_GENERATION_INTERVAL: string; // cron expression
  
  // File Paths
  BEAT_CATALOG_PATH: string;
  BEAT_OUTPUT_DIR: string;
  
  // API Server
  PORT: number;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  LOG_FILE_PATH: string;
  
  // Monitoring
  ALERT_WEBHOOK_URL?: string;
  ERROR_RATE_THRESHOLD: number;
}
```

### Deployment Steps

1. **Database Setup:**
   - Create MySQL database
   - Run Prisma migrations
   - Seed initial data (if any)

2. **Application Deployment:**
   - Build TypeScript to JavaScript
   - Install production dependencies
   - Set environment variables
   - Start with PM2

3. **Initial Configuration:**
   - Upload beat_catalog.xml
   - Add Suno API keys via API or database
   - Verify scheduler is running
   - Test beat generation manually

4. **Monitoring Setup:**
   - Configure log aggregation
   - Set up alert webhooks
   - Create monitoring dashboards
   - Test alert notifications

### Maintenance Procedures

**Daily:**
- Check daily summary reports
- Verify backup completion
- Monitor API key quota status

**Weekly:**
- Review error logs
- Analyze beat generation patterns
- Update beat catalog if needed

**Monthly:**
- Database optimization (ANALYZE TABLE)
- Review and rotate old logs
- Update dependencies
- Performance tuning based on metrics
