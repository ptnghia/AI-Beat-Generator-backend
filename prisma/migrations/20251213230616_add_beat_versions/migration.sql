/*
  Warnings:

  - You are about to drop the column `beat_id` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `cover_art_path` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `files_downloaded` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `is_primary` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `model_name` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `musical_key` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `suno_audio_id` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `suno_audio_url` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `suno_image_url` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `suno_stream_url` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `suno_task_id` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `version_number` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `wav_conversion_status` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `wav_task_id` on the `beat_versions` table. All the data in the column will be lost.
  - You are about to drop the column `wav_url` on the `beat_versions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[beatId,versionNumber]` on the table `beat_versions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `beatId` to the `beat_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `beat_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `versionNumber` to the `beat_versions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "beat_versions" DROP CONSTRAINT "beat_versions_beat_id_fkey";

-- DropIndex
DROP INDEX "beat_versions_beat_id_idx";

-- DropIndex
DROP INDEX "beat_versions_beat_id_version_number_key";

-- DropIndex
DROP INDEX "beat_versions_is_primary_idx";

-- AlterTable
ALTER TABLE "beat_versions" DROP COLUMN "beat_id",
DROP COLUMN "cover_art_path",
DROP COLUMN "created_at",
DROP COLUMN "file_url",
DROP COLUMN "files_downloaded",
DROP COLUMN "is_primary",
DROP COLUMN "model_name",
DROP COLUMN "musical_key",
DROP COLUMN "suno_audio_id",
DROP COLUMN "suno_audio_url",
DROP COLUMN "suno_image_url",
DROP COLUMN "suno_stream_url",
DROP COLUMN "suno_task_id",
DROP COLUMN "updated_at",
DROP COLUMN "version_number",
DROP COLUMN "wav_conversion_status",
DROP COLUMN "wav_task_id",
DROP COLUMN "wav_url",
ADD COLUMN     "beatId" TEXT NOT NULL,
ADD COLUMN     "coverArtPath" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "filesDownloaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modelName" TEXT,
ADD COLUMN     "musicalKey" TEXT,
ADD COLUMN     "sunoAudioId" TEXT,
ADD COLUMN     "sunoAudioUrl" TEXT,
ADD COLUMN     "sunoImageUrl" TEXT,
ADD COLUMN     "sunoStreamUrl" TEXT,
ADD COLUMN     "sunoTaskId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "versionNumber" INTEGER NOT NULL,
ADD COLUMN     "wavConversionStatus" TEXT DEFAULT 'not_started',
ADD COLUMN     "wavTaskId" TEXT,
ADD COLUMN     "wavUrl" TEXT;

-- CreateIndex
CREATE INDEX "beat_versions_beatId_idx" ON "beat_versions"("beatId");

-- CreateIndex
CREATE INDEX "beat_versions_isPrimary_idx" ON "beat_versions"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "beat_versions_beatId_versionNumber_key" ON "beat_versions"("beatId", "versionNumber");

-- AddForeignKey
ALTER TABLE "beat_versions" ADD CONSTRAINT "beat_versions_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
