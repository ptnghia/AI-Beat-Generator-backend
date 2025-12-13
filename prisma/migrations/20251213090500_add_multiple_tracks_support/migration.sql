-- Add support for multiple tracks and manual uploads
ALTER TABLE `beats` 
ADD COLUMN `alternateFileUrl` VARCHAR(191) NULL COMMENT 'Second MP3 track from Suno (if available)',
ADD COLUMN `alternateAudioId` VARCHAR(191) NULL COMMENT 'Second audio ID for WAV conversion',
ADD COLUMN `generationStatus` VARCHAR(191) NOT NULL DEFAULT 'pending' COMMENT 'pending, completed, failed',
ADD COLUMN `filesUploaded` BOOLEAN NOT NULL DEFAULT false COMMENT 'True if files manually uploaded';

-- Index for finding incomplete beats
CREATE INDEX `idx_generation_status` ON `beats`(`generationStatus`);
