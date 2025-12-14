import { Router, Request, Response, NextFunction } from 'express';
import { MusicService } from '../../services/music.service';
import { beatRepository } from '../../repositories/beat.repository';
import { loggingService } from '../../services/logging.service';
import { getPrismaClient } from '../../config/database.config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const prisma = getPrismaClient();
const musicService = new MusicService();

/**
 * POST /api/beats/:id/generate-audio
 * Generate audio files for a beat that only has metadata
 */
router.post('/:id/generate-audio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { versionNumber } = req.body; // Optional: generate for specific version

    const beat = await prisma.beat.findUnique({
      where: { id },
      include: { versions: true }
    });

    if (!beat) {
      return res.status(404).json({
        error: 'Beat not found',
        beatId: id
      });
    }

    // Check if beat already has audio
    if (beat.sunoTaskId && beat.generationStatus === 'completed') {
      return res.status(400).json({
        error: 'Beat already has audio',
        message: 'Use POST /beats/:id/versions to create a new version'
      });
    }

    loggingService.info('Generating audio for existing beat', {
      service: 'BeatAudioAPI',
      beatId: id
    });

    // Generate music using Suno API
    const result = await musicService.generateMusic(
      beat.normalizedPrompt,
      beat.apiKeyUsed
    );

    // Create first version with pending status (webhook will update)
    const version = await prisma.beatVersion.create({
      data: {
        beatId: id,
        versionNumber: 1,
        source: 'suno',
        isPrimary: true,
        status: 'pending',  // Webhook will update to completed
        sunoTaskId: result.jobId,
        sunoAudioId: result.audioId,
        filesDownloaded: false
      }
    });

    // Update beat with Suno data
    await prisma.beat.update({
      where: { id },
      data: {
        sunoTaskId: result.jobId,
        sunoAudioId: result.audioId,
        generationStatus: 'processing'  // Webhook will update to completed
      }
    });

    loggingService.info('Audio generated successfully', {
      service: 'BeatAudioAPI',
      beatId: id,
      versionId: version.id
    });

    res.json({
      success: true,
      beatId: id,
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        sunoAudioUrl: version.sunoAudioUrl,
        sunoImageUrl: version.sunoImageUrl,
        duration: version.duration,
        modelName: version.modelName
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/beats/:id/versions
 * Create a new version of audio for existing beat
 */
router.post('/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { setPrimary = false } = req.body;

    const beat = await prisma.beat.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });

    if (!beat) {
      return res.status(404).json({
        error: 'Beat not found',
        beatId: id
      });
    }

    const nextVersionNumber = beat.versions.length > 0
      ? beat.versions[0].versionNumber + 1
      : 1;

    loggingService.info('Creating new beat version', {
      service: 'BeatVersionAPI',
      beatId: id,
      versionNumber: nextVersionNumber
    });

    // Generate music using Suno API
    const result = await musicService.generateMusic(
      beat.normalizedPrompt,
      beat.apiKeyUsed
    );

    // Create new version with pending status (webhook will update)
    const version = await prisma.beatVersion.create({
      data: {
        beatId: id,
        versionNumber: nextVersionNumber,
        source: 'suno_retry',
        isPrimary: setPrimary,
        status: 'pending',  // Webhook will update to completed
        sunoTaskId: result.jobId,
        sunoAudioId: result.audioId,
        filesDownloaded: false
      }
    });

    // If setPrimary, update other versions
    if (setPrimary) {
      await prisma.beatVersion.updateMany({
        where: {
          beatId: id,
          id: { not: version.id }
        },
        data: { isPrimary: false }
      });
    }

    loggingService.info('New version created successfully', {
      service: 'BeatVersionAPI',
      beatId: id,
      versionId: version.id,
      versionNumber: nextVersionNumber
    });

    res.json({
      success: true,
      beatId: id,
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        isPrimary: version.isPrimary,
        sunoAudioUrl: version.sunoAudioUrl,
        sunoImageUrl: version.sunoImageUrl,
        duration: version.duration,
        modelName: version.modelName
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/beats/:id/download
 * Download and store files locally from Suno URLs
 */
router.post('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { versionId, downloadMP3 = true, downloadCover = true } = req.body;

    const beat = await prisma.beat.findUnique({
      where: { id },
      include: { versions: true }
    });

    if (!beat) {
      return res.status(404).json({
        error: 'Beat not found',
        beatId: id
      });
    }

    // Find version to download
    let version = beat.versions.find(v => v.isPrimary);
    if (versionId) {
      version = beat.versions.find(v => v.id === versionId);
    }

    if (!version) {
      return res.status(404).json({
        error: 'Version not found',
        message: 'No primary version available'
      });
    }

    if (version.filesDownloaded) {
      return res.status(400).json({
        error: 'Files already downloaded',
        versionId: version.id
      });
    }

    loggingService.info('Downloading files for beat version', {
      service: 'BeatDownloadAPI',
      beatId: id,
      versionId: version.id
    });

    const downloadResults: any = {};

    // Download MP3
    if (downloadMP3 && version.sunoAudioUrl) {
      try {
        const mp3Response = await axios.get(version.sunoAudioUrl, {
          responseType: 'arraybuffer',
          timeout: 60000
        });

        const mp3Dir = process.env.BEAT_OUTPUT_DIR || './output/beats';
        if (!fs.existsSync(mp3Dir)) {
          fs.mkdirSync(mp3Dir, { recursive: true });
        }

        const mp3Filename = `${beat.name.replace(/[^a-zA-Z0-9-]/g, '_')}_v${version.versionNumber}.mp3`;
        const mp3Path = path.join(mp3Dir, mp3Filename);

        fs.writeFileSync(mp3Path, Buffer.from(mp3Response.data));

        await prisma.beatVersion.update({
          where: { id: version.id },
          data: { fileUrl: mp3Path }
        });

        downloadResults.mp3 = {
          success: true,
          path: mp3Path,
          size: mp3Response.data.byteLength
        };

      } catch (error) {
        downloadResults.mp3 = {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        };
      }
    }

    // Download cover image
    if (downloadCover && version.sunoImageUrl) {
      try {
        const imageResponse = await axios.get(version.sunoImageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const coverDir = process.env.COVER_OUTPUT_DIR || './output/covers';
        if (!fs.existsSync(coverDir)) {
          fs.mkdirSync(coverDir, { recursive: true });
        }

        const coverFilename = `${beat.name.replace(/[^a-zA-Z0-9-]/g, '_')}_v${version.versionNumber}.png`;
        const coverPath = path.join(coverDir, coverFilename);

        fs.writeFileSync(coverPath, Buffer.from(imageResponse.data));

        await prisma.beatVersion.update({
          where: { id: version.id },
          data: { coverArtPath: coverPath }
        });

        downloadResults.cover = {
          success: true,
          path: coverPath,
          size: imageResponse.data.byteLength
        };

      } catch (error) {
        downloadResults.cover = {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        };
      }
    }

    // Mark as downloaded if at least one file succeeded
    if (downloadResults.mp3?.success || downloadResults.cover?.success) {
      await prisma.beatVersion.update({
        where: { id: version.id },
        data: { filesDownloaded: true }
      });
    }

    loggingService.info('Files downloaded', {
      service: 'BeatDownloadAPI',
      beatId: id,
      versionId: version.id,
      results: downloadResults
    });

    res.json({
      success: true,
      beatId: id,
      versionId: version.id,
      downloads: downloadResults
    });

  } catch (error) {
    next(error);
  }
});

export default router;
