/**
 * Beat Routes
 * Handles beat query and detail endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { beatRepository } from '../../repositories/beat.repository';
import { loggingService } from '../../services/logging.service';
import { wavConversionService } from '../../services/wav-conversion.service';

const router = Router();

/**
 * GET /api/beats
 * Query beats with filtering and pagination
 * 
 * Query params:
 * - genre: Filter by genre
 * - style: Filter by style
 * - mood: Filter by mood
 * - useCase: Filter by use case
 * - tags: Comma-separated tags to filter by
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      genre,
      style,
      mood,
      useCase,
      tags,
      page,
      limit
    } = req.query;

    // Parse and validate pagination
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? Math.min(parseInt(limit as string), 100) : 20;

    if (pageNum < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Page number must be >= 1'
      });
    }

    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Limit must be between 1 and 100'
      });
    }

    // Parse tags
    const tagsArray = tags ? (tags as string).split(',').map(t => t.trim()) : undefined;

    // Query beats
    const result = await beatRepository.queryBeats({
      genre: genre as string,
      style: style as string,
      mood: mood as string,
      useCase: useCase as string,
      tags: tagsArray,
      page: pageNum,
      limit: limitNum
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/beats/:id
 * Get beat details by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Beat ID is required'
      });
    }

    const beat = await beatRepository.getBeatById(id);

    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    res.json(beat);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/beats/:id/convert-wav
 * Convert beat MP3 to WAV format (on-demand)
 * 
 * This endpoint triggers WAV conversion for a specific beat.
 * WAV files are only created when requested to save storage.
 * 
 * Response:
 * - 202: Conversion started (returns wavTaskId)
 * - 200: Already converted (returns existing wavUrl)
 * - 400: Missing required data
 * - 404: Beat not found
 */
router.post('/:id/convert-wav', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    loggingService.info('WAV conversion requested', {
      service: 'BeatRoutes',
      beatId: id
    });

    // Get beat details
    const beat = await beatRepository.getBeatById(id);
    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    // Check if already converted
    if (beat.wavConversionStatus === 'completed' && beat.wavUrl) {
      loggingService.info('WAV already exists', {
        service: 'BeatRoutes',
        beatId: id,
        wavUrl: beat.wavUrl
      });

      return res.status(200).json({
        status: 'completed',
        message: 'WAV file already exists',
        wavUrl: beat.wavUrl
      });
    }

    // Check if conversion is already in progress
    if (beat.wavConversionStatus === 'processing') {
      return res.status(202).json({
        status: 'processing',
        message: 'WAV conversion is already in progress',
        wavTaskId: beat.wavTaskId
      });
    }

    // Validate required data for conversion
    if (!beat.sunoTaskId || !beat.sunoAudioId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Beat is missing Suno task/audio IDs required for WAV conversion'
      });
    }

    // Submit conversion job
    const wavTaskId = await wavConversionService.submitConversion(
      beat.sunoTaskId,
      beat.sunoAudioId
    );

    // Update beat status
    await beatRepository.updateBeat(id, {
      wavConversionStatus: 'processing',
      wavTaskId
    });

    loggingService.info('WAV conversion started', {
      service: 'BeatRoutes',
      beatId: id,
      wavTaskId
    });

    res.status(202).json({
      status: 'processing',
      message: 'WAV conversion started',
      wavTaskId,
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    loggingService.error('WAV conversion request failed', {
      service: 'BeatRoutes',
      beatId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * GET /api/beats/:id/wav-status
 * Check WAV conversion status
 */
router.get('/:id/wav-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const beat = await beatRepository.getBeatById(id);
    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    res.json({
      beatId: id,
      wavConversionStatus: beat.wavConversionStatus || 'not_started',
      wavTaskId: beat.wavTaskId,
      wavUrl: beat.wavUrl
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/beats/:id/retry-generation
 * Retry music generation for a beat without files
 */
router.post('/:id/retry-generation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const beat = await beatRepository.getBeatById(id);
    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    // Check if already has files
    if (beat.fileUrl && beat.generationStatus === 'completed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Beat already has music files',
        currentStatus: beat.generationStatus,
        fileUrl: beat.fileUrl
      });
    }

    // Import services dynamically to avoid circular dependencies
    const { MusicService } = await import('../../services/music.service');
    const { ApiKeyManager } = await import('../../services/apikey-manager.service');
    
    const musicService = new MusicService();
    const apiKeyManager = new ApiKeyManager();

    // Get API key
    const apiKey = await apiKeyManager.selectKey();

    loggingService.info('Retrying music generation', {
      service: 'BeatRoutes',
      beatId: id,
      beatName: beat.name
    });

    // Generate music
    const result = await musicService.generateMusic(
      beat.normalizedPrompt,
      apiKey.key,
      beat.name
    );

    // Download files
    let localFilePath = result.fileUrl;
    let alternateLocalFilePath: string | undefined;

    if (result.fileUrl && result.fileUrl.startsWith('http')) {
      localFilePath = await musicService.downloadAndSaveFile(result.fileUrl, result.jobId);
    }

    if (result.alternateFileUrl && result.alternateFileUrl.startsWith('http')) {
      alternateLocalFilePath = await musicService.downloadAndSaveFile(
        result.alternateFileUrl,
        `${result.jobId}_alt`
      );
    }

    // Update beat record
    await beatRepository.updateBeat(id, {
      fileUrl: localFilePath,
      sunoTaskId: result.jobId,
      sunoAudioId: result.audioId,
      alternateFileUrl: alternateLocalFilePath,
      alternateAudioId: result.alternateAudioId,
      generationStatus: 'completed'
    });

    // Mark API key as used
    await apiKeyManager.markKeyUsed(apiKey.id);

    res.status(200).json({
      status: 'success',
      message: 'Music generation completed',
      beatId: id,
      beatName: beat.name,
      files: {
        primary: localFilePath,
        alternate: alternateLocalFilePath
      },
      sunoTaskId: result.jobId,
      sunoAudioId: result.audioId
    });

  } catch (error) {
    loggingService.error('Retry generation failed', {
      service: 'BeatRoutes',
      beatId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * POST /api/beats/:id/enhance
 * Generate WAV and/or Cover for existing beat with sunoTaskId
 * 
 * Body:
 * - generateWav: boolean (default: true)
 * - generateCover: boolean (default: true)
 */
router.post('/:id/enhance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { generateWav = true, generateCover = true } = req.body;

    const beat = await beatRepository.getBeatById(id);
    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    const results: any = {
      beatId: id,
      beatName: beat.name,
      wav: null,
      cover: null
    };

    // Generate WAV if requested and possible
    if (generateWav && beat.sunoAudioId) {
      if (beat.wavUrl) {
        results.wav = {
          status: 'already_exists',
          path: beat.wavUrl
        };
      } else {
        try {
          loggingService.info('Requesting WAV conversion', {
            service: 'BeatRoutes',
            beatId: id,
            audioId: beat.sunoAudioId
          });

          const wavResult = await wavConversionService.convertAndDownload(
            beat.sunoAudioId,
            id
          );

          await beatRepository.updateBeat(id, {
            wavUrl: wavResult.relativePath,
            wavConversionStatus: 'completed',
            wavTaskId: wavResult.wavTaskId
          });

          results.wav = {
            status: 'success',
            path: wavResult.relativePath,
            taskId: wavResult.wavTaskId
          };

        } catch (error) {
          results.wav = {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    } else if (generateWav && !beat.sunoAudioId) {
      results.wav = {
        status: 'impossible',
        reason: 'Beat missing sunoAudioId'
      };
    }

    // Generate Cover if requested and possible
    if (generateCover && beat.sunoTaskId) {
      if (beat.coverArtPath) {
        results.cover = {
          status: 'already_exists',
          path: beat.coverArtPath
        };
      } else {
        try {
          const axios = (await import('axios')).default;
          const SUNO_API_KEY = process.env.SUNO_API_KEYS?.split(',')[0];
          const SUNO_API_BASE = 'https://api.sunoapi.org';

          loggingService.info('Requesting cover generation', {
            service: 'BeatRoutes',
            beatId: id,
            taskId: beat.sunoTaskId
          });

          const response = await axios.post(
            `${SUNO_API_BASE}/api/v1/suno/cover/generate`,
            {
              taskId: beat.sunoTaskId,
              callBackUrl: process.env.SUNO_CALLBACK_URL || 'https://webhook.site/test'
            },
            {
              headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
                'Content-Type': 'application/json'
              },
              validateStatus: () => true
            }
          );

          if (response.data.code === 200) {
            results.cover = {
              status: 'processing',
              taskId: response.data.data.taskId,
              message: 'Cover generation submitted, will be ready in 30-60 seconds via webhook'
            };
          } else if (response.data.code === 400) {
            results.cover = {
              status: 'already_exists',
              message: 'Cover already generated for this beat'
            };
          } else {
            results.cover = {
              status: 'failed',
              error: response.data.msg
            };
          }

        } catch (error) {
          results.cover = {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    } else if (generateCover && !beat.sunoTaskId) {
      results.cover = {
        status: 'impossible',
        reason: 'Beat missing sunoTaskId'
      };
    }

    res.status(200).json({
      status: 'success',
      message: 'Enhancement request processed',
      ...results
    });

  } catch (error) {
    loggingService.error('Enhancement failed', {
      service: 'BeatRoutes',
      beatId: req.params.id,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * GET /api/beats/pending/list
 * List all beats with pending generation
 */
router.get('/pending/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    // Import prisma dynamically
    const { getPrismaClient } = await import('../../config/database.config');
    const prisma = getPrismaClient();

    const [beats, total] = await Promise.all([
      prisma.beat.findMany({
        where: {
          OR: [
            { fileUrl: '' },
            { fileUrl: null },
            { generationStatus: 'pending' }
          ]
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          name: true,
          genre: true,
          style: true,
          mood: true,
          generationStatus: true,
          createdAt: true
        }
      }),
      prisma.beat.count({
        where: {
          OR: [
            { fileUrl: '' },
            { fileUrl: null },
            { generationStatus: 'pending' }
          ]
        }
      })
    ]);

    res.json({
      data: beats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/beats/enhanceable/list
 * List beats that can be enhanced (have sunoTaskId but missing WAV/Cover)
 */
router.get('/enhanceable/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    const { getPrismaClient } = await import('../../config/database.config');
    const prisma = getPrismaClient();

    const [beats, total] = await Promise.all([
      prisma.beat.findMany({
        where: {
          sunoTaskId: { not: null },
          OR: [
            { wavUrl: null },
            { coverArtPath: null }
          ]
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          name: true,
          genre: true,
          style: true,
          sunoTaskId: true,
          sunoAudioId: true,
          wavUrl: true,
          coverArtPath: true,
          createdAt: true
        }
      }),
      prisma.beat.count({
        where: {
          sunoTaskId: { not: null },
          OR: [
            { wavUrl: null },
            { coverArtPath: null }
          ]
        }
      })
    ]);

    res.json({
      data: beats.map(beat => ({
        ...beat,
        canGenerateWav: !!beat.sunoAudioId && !beat.wavUrl,
        canGenerateCover: !!beat.sunoTaskId && !beat.coverArtPath
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    next(error);
  }
});

export { router as beatRoutes };
