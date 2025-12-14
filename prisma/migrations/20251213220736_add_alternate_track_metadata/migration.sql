-- AlterTable
ALTER TABLE "beats" ADD COLUMN     "alternateDuration" DOUBLE PRECISION,
ADD COLUMN     "alternateModelName" TEXT,
ADD COLUMN     "alternateSunoAudioUrl" TEXT,
ADD COLUMN     "alternateSunoImageUrl" TEXT,
ADD COLUMN     "alternateSunoStreamUrl" TEXT;
