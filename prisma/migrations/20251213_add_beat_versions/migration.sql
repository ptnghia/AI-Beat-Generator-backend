-- CreateTable
CREATE TABLE "beat_versions" (
    "id" TEXT NOT NULL,
    "beat_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'suno', -- 'suno', 'upload', 'suno_retry'
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Audio files
    "file_url" TEXT, -- Local MP3 file path (if downloaded)
    "wav_url" TEXT, -- Local WAV file path (if converted)
    "cover_art_path" TEXT, -- Cover image path
    
    -- Suno URLs (primary source)
    "suno_audio_url" TEXT, -- Direct audio URL from Suno CDN
    "suno_image_url" TEXT, -- Cover image URL from Suno
    "suno_stream_url" TEXT, -- Streaming audio URL
    "suno_audio_id" TEXT, -- Suno audio ID
    "suno_task_id" TEXT, -- Suno task ID
    
    -- Metadata
    "duration" DOUBLE PRECISION,
    "model_name" TEXT, -- Suno model (e.g., "chirp-v3-5")
    "bpm" INTEGER, -- Detected BPM
    "musical_key" TEXT, -- Musical key
    
    -- File management
    "files_downloaded" BOOLEAN NOT NULL DEFAULT false, -- True if files downloaded locally
    "wav_conversion_status" TEXT DEFAULT 'not_started', -- 'not_started', 'processing', 'completed', 'failed'
    "wav_task_id" TEXT, -- WAV conversion task ID
    
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beat_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "beat_versions_beat_id_idx" ON "beat_versions"("beat_id");
CREATE INDEX "beat_versions_is_primary_idx" ON "beat_versions"("is_primary");
CREATE INDEX "beat_versions_status_idx" ON "beat_versions"("status");
CREATE UNIQUE INDEX "beat_versions_beat_id_version_number_key" ON "beat_versions"("beat_id", "version_number");

-- AddForeignKey
ALTER TABLE "beat_versions" ADD CONSTRAINT "beat_versions_beat_id_fkey" FOREIGN KEY ("beat_id") REFERENCES "beats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
