-- AlterTable
ALTER TABLE "beats" ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "modelName" TEXT,
ADD COLUMN     "sunoAudioUrl" TEXT,
ADD COLUMN     "sunoImageUrl" TEXT,
ADD COLUMN     "sunoStreamUrl" TEXT;
