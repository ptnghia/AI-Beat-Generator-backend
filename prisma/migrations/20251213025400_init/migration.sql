-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `quotaRemaining` INTEGER NOT NULL DEFAULT 0,
    `lastUsed` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_key_key`(`key`),
    INDEX `api_keys_status_lastUsed_idx`(`status`, `lastUsed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beat_templates` (
    `id` VARCHAR(191) NOT NULL,
    `categoryName` VARCHAR(191) NOT NULL,
    `genre` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NOT NULL,
    `useCase` VARCHAR(191) NOT NULL,
    `tags` JSON NOT NULL,
    `basePrompt` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsed` DATETIME(3) NULL,
    `xmlChecksum` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `beat_templates_categoryName_key`(`categoryName`),
    INDEX `beat_templates_genre_style_mood_idx`(`genre`, `style`, `mood`),
    INDEX `beat_templates_lastUsed_idx`(`lastUsed`),
    INDEX `beat_templates_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beats` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `genre` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NOT NULL,
    `useCase` VARCHAR(191) NOT NULL,
    `tags` JSON NOT NULL,
    `description` TEXT NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `basePrompt` TEXT NOT NULL,
    `normalizedPrompt` TEXT NOT NULL,
    `conceptData` JSON NOT NULL,
    `apiKeyUsed` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `beats_name_key`(`name`),
    INDEX `beats_genre_style_mood_idx`(`genre`, `style`, `mood`),
    INDEX `beats_createdAt_idx`(`createdAt`),
    INDEX `beats_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompt_records` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `basePrompt` TEXT NOT NULL,
    `normalizedPrompt` TEXT NOT NULL,
    `conceptData` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `apiKeyUsed` VARCHAR(191) NOT NULL,
    `executionResult` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prompt_records_templateId_createdAt_idx`(`templateId`, `createdAt`),
    INDEX `prompt_records_executionResult_idx`(`executionResult`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `execution_logs` (
    `id` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `context` JSON NULL,
    `stackTrace` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `execution_logs_level_createdAt_idx`(`level`, `createdAt`),
    INDEX `execution_logs_service_createdAt_idx`(`service`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_summaries` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `beatsCreated` INTEGER NOT NULL DEFAULT 0,
    `beatsSucceeded` INTEGER NOT NULL DEFAULT 0,
    `beatsFailed` INTEGER NOT NULL DEFAULT 0,
    `errorRate` DOUBLE NOT NULL DEFAULT 0,
    `activeApiKeys` INTEGER NOT NULL DEFAULT 0,
    `exhaustedApiKeys` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_summaries_date_key`(`date`),
    INDEX `daily_summaries_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `beats` ADD CONSTRAINT `beats_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `beat_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beats` ADD CONSTRAINT `beats_apiKeyUsed_fkey` FOREIGN KEY (`apiKeyUsed`) REFERENCES `api_keys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prompt_records` ADD CONSTRAINT `prompt_records_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `beat_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prompt_records` ADD CONSTRAINT `prompt_records_apiKeyUsed_fkey` FOREIGN KEY (`apiKeyUsed`) REFERENCES `api_keys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
