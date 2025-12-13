-- AlterTable
ALTER TABLE `beats` ADD COLUMN `musicalKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `beats_musicalKey_idx` ON `beats`(`musicalKey`);
