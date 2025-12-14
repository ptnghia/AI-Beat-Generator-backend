-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "quotaRemaining" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beat_templates" (
    "id" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "basePrompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "xmlChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beat_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beats" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "basePrompt" TEXT NOT NULL,
    "normalizedPrompt" TEXT NOT NULL,
    "conceptData" JSONB NOT NULL,
    "apiKeyUsed" TEXT NOT NULL,
    "bpm" INTEGER,
    "musicalKey" TEXT,
    "coverArtPath" TEXT,
    "previewPath" TEXT,
    "pricing" JSONB,
    "alternateFileUrl" TEXT,
    "alternateAudioId" TEXT,
    "wavUrl" TEXT,
    "wavConversionStatus" TEXT DEFAULT 'not_started',
    "wavTaskId" TEXT,
    "sunoTaskId" TEXT,
    "sunoAudioId" TEXT,
    "generationStatus" TEXT NOT NULL DEFAULT 'pending',
    "filesUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_records" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "basePrompt" TEXT NOT NULL,
    "normalizedPrompt" TEXT NOT NULL,
    "conceptData" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "apiKeyUsed" TEXT NOT NULL,
    "executionResult" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "stackTrace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "beatsCreated" INTEGER NOT NULL DEFAULT 0,
    "beatsSucceeded" INTEGER NOT NULL DEFAULT 0,
    "beatsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeApiKeys" INTEGER NOT NULL DEFAULT 0,
    "exhaustedApiKeys" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_status_lastUsed_idx" ON "api_keys"("status", "lastUsed");

-- CreateIndex
CREATE UNIQUE INDEX "beat_templates_categoryName_key" ON "beat_templates"("categoryName");

-- CreateIndex
CREATE INDEX "beat_templates_genre_style_mood_idx" ON "beat_templates"("genre", "style", "mood");

-- CreateIndex
CREATE INDEX "beat_templates_lastUsed_idx" ON "beat_templates"("lastUsed");

-- CreateIndex
CREATE INDEX "beat_templates_isActive_idx" ON "beat_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "beats_name_key" ON "beats"("name");

-- CreateIndex
CREATE INDEX "beats_genre_style_mood_idx" ON "beats"("genre", "style", "mood");

-- CreateIndex
CREATE INDEX "beats_createdAt_idx" ON "beats"("createdAt");

-- CreateIndex
CREATE INDEX "beats_templateId_idx" ON "beats"("templateId");

-- CreateIndex
CREATE INDEX "beats_musicalKey_idx" ON "beats"("musicalKey");

-- CreateIndex
CREATE INDEX "beats_generationStatus_idx" ON "beats"("generationStatus");

-- CreateIndex
CREATE INDEX "prompt_records_templateId_createdAt_idx" ON "prompt_records"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_records_executionResult_idx" ON "prompt_records"("executionResult");

-- CreateIndex
CREATE INDEX "execution_logs_level_createdAt_idx" ON "execution_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "execution_logs_service_createdAt_idx" ON "execution_logs"("service", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_date_key" ON "daily_summaries"("date");

-- CreateIndex
CREATE INDEX "daily_summaries_date_idx" ON "daily_summaries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_username_idx" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "beats" ADD CONSTRAINT "beats_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "beat_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beats" ADD CONSTRAINT "beats_apiKeyUsed_fkey" FOREIGN KEY ("apiKeyUsed") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_records" ADD CONSTRAINT "prompt_records_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "beat_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_records" ADD CONSTRAINT "prompt_records_apiKeyUsed_fkey" FOREIGN KEY ("apiKeyUsed") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
