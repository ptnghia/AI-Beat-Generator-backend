-- AlterTable
ALTER TABLE `beats` ADD COLUMN `sunoAudioId` VARCHAR(191) NULL,
    ADD COLUMN `sunoTaskId` VARCHAR(191) NULL,
    ADD COLUMN `wavConversionStatus` VARCHAR(191) NULL DEFAULT 'not_started',
    ADD COLUMN `wavTaskId` VARCHAR(191) NULL,
    ADD COLUMN `wavUrl` VARCHAR(191) NULL;
