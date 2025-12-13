-- AlterTable
ALTER TABLE `beats` ADD COLUMN `bpm` INTEGER NULL;

-- RedefineIndex
CREATE INDEX `beats_generationStatus_idx` ON `beats`(`generationStatus`);
DROP INDEX `idx_generation_status` ON `beats`;
