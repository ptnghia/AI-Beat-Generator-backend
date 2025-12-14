import express, { Request, Response } from 'express';
import { getPrismaClient } from '../../config/database.config';
import { loggingService } from '../../services/logging.service';
import { MusicService } from '../../services/music.service';
import { wavConversionService } from '../../services/wav-conversion.service';
import { beatRepository } from '../../repositories/beat.repository';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * Webhook endpoint để nhận callback từ Suno API
 * 
 * Suno API sẽ gọi endpoint này khi:
 * - TEXT_SUCCESS: Lyrics đã được tạo
 * - FIRST_SUCCESS: Bài nhạc đầu tiên đã hoàn thành
 * - SUCCESS: Tất cả bài nhạc đã hoàn thành
 * - FAILED: Task thất bại
 */

interface SunoCallbackData {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'FAILED';
    response?: {
      sunoData?: Array<{
        id: string;
        audio_url: string;  // Note: Suno uses snake_case
        source_audio_url: string;
        stream_audio_url?: string;
        source_stream_audio_url?: string;
        image_url: string;
        source_image_url?: string;
        title: string;
        tags: string;
        duration: number;
        model_name: string;
      }>;
    };
    errorMessage?: string;
  };
}

/**
 * POST /api/callbacks/suno
 * Nhận callback từ Suno API khi music generation hoàn thành hoặc có update
 */
router.post('/suno', async (req: Request, res: Response) => {
  try {
    const callbackData: SunoCallbackData = req.body;

    loggingService.info('Suno callback received', {
      service: 'SunoCallbackRoute',
      taskId: callbackData.data?.taskId,
      status: callbackData.data?.status,
      code: callbackData.code
    });

    // Validate callback data
    if (!callbackData.data || !callbackData.data.taskId) {
      loggingService.warn('Invalid callback data - missing taskId', {
        service: 'SunoCallbackRoute',
        body: req.body
      });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid callback data'
      });
    }

    const { taskId, status, response, errorMessage } = callbackData.data;

    // Find beat by taskId (stored in fileUrl temporarily or in a separate field)
    // Note: Cần có cách track taskId -> beatId, có thể dùng field mới hoặc cache
    
    switch (status) {
      case 'TEXT_SUCCESS':
        loggingService.info('Music text generation completed', {
          service: 'SunoCallbackRoute',
          taskId
        });
        // Có thể update status field nếu có
        break;

      case 'FIRST_SUCCESS':
        loggingService.info('First track completed', {
          service: 'SunoCallbackRoute',
          taskId
        });
        // Có thể download track đầu tiên ngay
        if (response?.sunoData && response.sunoData.length > 0) {
          const firstTrack = response.sunoData[0];
          loggingService.info('First track available', {
            service: 'SunoCallbackRoute',
            taskId,
            audioUrl: firstTrack.audio_url,
            duration: firstTrack.duration
          });
        }
        break;

      case 'SUCCESS':
        loggingService.info('All tracks completed', {
          service: 'SunoCallbackRoute',
          taskId,
          trackCount: response?.sunoData?.length || 0
        });

        // Extract and save metadata from Suno response (supports 2 tracks)
        if (response?.sunoData && response.sunoData.length > 0) {
          try {
            const track1 = response.sunoData[0];
            const track2 = response.sunoData.length > 1 ? response.sunoData[1] : null;

            // Strategy: Tìm BeatVersion theo sunoTaskId (vì mỗi lần gọi có taskId riêng)
            const existingVersions = await prisma.beatVersion.findMany({
              where: { sunoTaskId: taskId },
              include: { beat: true }
            });

            if (existingVersions.length > 0) {
              // Case 1: Đã có BeatVersion với taskId này (từ API tạo version)
              // Update version hiện tại với metadata từ track 1
              const version = existingVersions[0];
              
              await prisma.beatVersion.update({
                where: { id: version.id },
                data: {
                  status: 'completed',
                  sunoAudioUrl: track1.audio_url || track1.source_audio_url,
                  sunoImageUrl: track1.image_url || track1.source_image_url,
                  sunoStreamUrl: track1.stream_audio_url || track1.source_stream_audio_url,
                  duration: track1.duration,
                  modelName: track1.model_name
                }
              });

              // Update beat chính nếu đây là version primary
              if (version.isPrimary) {
                await prisma.beat.update({
                  where: { id: version.beatId },
                  data: {
                    duration: track1.duration,
                    modelName: track1.model_name,
                    sunoAudioUrl: track1.audio_url || track1.source_audio_url,
                    sunoImageUrl: track1.image_url || track1.source_image_url,
                    sunoStreamUrl: track1.stream_audio_url || track1.source_stream_audio_url,
                    generationStatus: 'completed'
                  }
                });
              }

              loggingService.info('BeatVersion updated from webhook', {
                service: 'SunoCallbackRoute',
                versionId: version.id,
                versionNumber: version.versionNumber,
                beatId: version.beatId,
                taskId
              });

              // Nếu có track 2, tạo alternate version
              if (track2 && existingVersions.length === 1) {
                const nextVersionNumber = await prisma.beatVersion.count({
                  where: { beatId: version.beatId }
                }) + 1;

                // Track 2 KHÔNG lưu sunoTaskId để tránh conflict với track 1
                // sunoTaskId chỉ dùng để route webhook callback, track 2 được tạo cùng lúc với track 1
                await prisma.beatVersion.create({
                  data: {
                    beatId: version.beatId,
                    versionNumber: nextVersionNumber,
                    source: 'suno',
                    isPrimary: false,
                    status: 'completed',
                    sunoTaskId: null,  // KHÔNG lưu taskId cho track 2 (tránh conflict routing)
                    sunoAudioId: track2.id,
                    sunoAudioUrl: track2.audio_url || track2.source_audio_url,
                    sunoImageUrl: track2.image_url || track2.source_image_url,
                    sunoStreamUrl: track2.stream_audio_url || track2.source_stream_audio_url,
                    duration: track2.duration,
                    modelName: track2.model_name,
                    filesDownloaded: false
                  }
                });

                loggingService.info('Alternate BeatVersion created from webhook', {
                  service: 'SunoCallbackRoute',
                  versionNumber: nextVersionNumber,
                  beatId: version.beatId,
                  taskId
                });
              }

            } else {
              // Case 2: Chưa có BeatVersion, tìm beat theo sunoTaskId (old flow)
              const beats = await prisma.beat.findMany({
                where: { sunoTaskId: taskId },
                include: { versions: true }
              });

              if (beats.length > 0) {
                const beat = beats[0];
                
                // Update beat chính với metadata
                await prisma.beat.update({
                  where: { id: beat.id },
                  data: {
                    duration: track1.duration,
                    modelName: track1.model_name,
                    sunoAudioUrl: track1.audio_url || track1.source_audio_url,
                    sunoImageUrl: track1.image_url || track1.source_image_url,
                    sunoStreamUrl: track1.stream_audio_url || track1.source_stream_audio_url,
                    generationStatus: 'completed',
                    // Track 2 metadata
                    alternateDuration: track2?.duration,
                    alternateModelName: track2?.model_name,
                    alternateSunoAudioUrl: track2 ? (track2.audio_url || track2.source_audio_url) : null,
                    alternateSunoImageUrl: track2 ? (track2.image_url || track2.source_image_url) : null,
                    alternateSunoStreamUrl: track2 ? (track2.stream_audio_url || track2.source_stream_audio_url) : null
                  }
                });

                // Tạo BeatVersion cho track 1 (primary)
                await prisma.beatVersion.create({
                  data: {
                    beatId: beat.id,
                    versionNumber: 1,
                    source: 'suno',
                    isPrimary: true,
                    status: 'completed',
                    sunoTaskId: taskId,
                    sunoAudioId: track1.id,
                    sunoAudioUrl: track1.audio_url || track1.source_audio_url,
                    sunoImageUrl: track1.image_url || track1.source_image_url,
                    sunoStreamUrl: track1.stream_audio_url || track1.source_stream_audio_url,
                    duration: track1.duration,
                    modelName: track1.model_name,
                    filesDownloaded: false
                  }
                });

                loggingService.info('BeatVersion created for track 1 (legacy flow)', {
                  service: 'SunoCallbackRoute',
                  beatId: beat.id,
                  taskId,
                  audioId: track1.id
                });

                // Tạo BeatVersion cho track 2 nếu có
                if (track2) {
                  await prisma.beatVersion.create({
                    data: {
                      beatId: beat.id,
                      versionNumber: 2,
                      source: 'suno',
                      isPrimary: false,
                      status: 'completed',
                      sunoTaskId: null,  // Track 2 KHÔNG lưu taskId (tránh conflict)
                      sunoAudioId: track2.id,
                      sunoAudioUrl: track2.audio_url || track2.source_audio_url,
                      sunoImageUrl: track2.image_url || track2.source_image_url,
                      sunoStreamUrl: track2.stream_audio_url || track2.source_stream_audio_url,
                      duration: track2.duration,
                      modelName: track2.model_name,
                      filesDownloaded: false
                    }
                  });

                  loggingService.info('BeatVersion created for track 2 (legacy flow)', {
                    service: 'SunoCallbackRoute',
                    beatId: beat.id,
                    taskId,
                    audioId: track2.id
                  });
                }
              } else {
                loggingService.warn('Beat/Version not found for taskId', {
                  service: 'SunoCallbackRoute',
                  taskId
                });
              }
            }

          } catch (updateError) {
            loggingService.error('Failed to update beat/version with Suno metadata', {
              service: 'SunoCallbackRoute',
              taskId,
              error: updateError instanceof Error ? updateError.message : String(updateError)
            });
          }
        }
        break;

      case 'FAILED':
        loggingService.error('Music generation failed', {
          service: 'SunoCallbackRoute',
          taskId,
          errorMessage
        });
        // TODO: Update beat status to failed
        break;

      default:
        loggingService.warn('Unknown callback status', {
          service: 'SunoCallbackRoute',
          taskId,
          status
        });
    }

    // Always respond with success to Suno
    res.status(200).json({
      status: 'received',
      taskId,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    loggingService.error('Error processing Suno callback', {
      service: 'SunoCallbackRoute',
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    });

    // Still return 200 to Suno to avoid retries
    res.status(200).json({
      status: 'error',
      message: 'Error processing callback'
    });
  }
});

/**
 * POST /api/callbacks/suno/wav
 * Webhook endpoint for WAV conversion callbacks
 * 
 * Suno API calls this when WAV conversion completes
 */
router.post('/suno/wav', async (req: Request, res: Response) => {
  try {
    const callbackData = req.body;

    loggingService.info('WAV conversion callback received', {
      service: 'WavCallbackRoute',
      taskId: callbackData.data?.taskId,
      status: callbackData.data?.status,
      code: callbackData.code
    });

    // Validate callback data
    if (!callbackData.data || !callbackData.data.taskId) {
      loggingService.warn('Invalid WAV callback data - missing taskId', {
        service: 'WavCallbackRoute',
        body: req.body
      });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid callback data'
      });
    }

    const { taskId: wavTaskId, status, response } = callbackData.data;

    // Find beat by wavTaskId
    const beats = await prisma.beat.findMany({
      where: { wavTaskId }
    });

    if (beats.length === 0) {
      loggingService.warn('Beat not found for WAV taskId', {
        service: 'WavCallbackRoute',
        wavTaskId
      });
      return res.status(200).json({
        status: 'received',
        message: 'Beat not found but acknowledged'
      });
    }

    const beat = beats[0];

    if (status === 'SUCCESS' && response?.sunoData && response.sunoData.length > 0) {
      const wavData = response.sunoData[0];
      const wavUrl = wavData.audioUrl;

      loggingService.info('WAV conversion completed', {
        service: 'WavCallbackRoute',
        beatId: beat.id,
        wavTaskId,
        wavUrl
      });

      try {
        // Download WAV file
        const localPath = await wavConversionService.downloadWavFile(wavUrl, beat.id);
        const relativePath = wavConversionService.getRelativePath(localPath);

        // Update beat record
        await beatRepository.updateBeat(beat.id, {
          wavUrl: relativePath,
          wavConversionStatus: 'completed'
        });

        loggingService.info('WAV file downloaded and saved', {
          service: 'WavCallbackRoute',
          beatId: beat.id,
          localPath: relativePath
        });

      } catch (error) {
        loggingService.error('Failed to download WAV file', {
          service: 'WavCallbackRoute',
          beatId: beat.id,
          wavTaskId,
          error: error instanceof Error ? error.message : String(error)
        });

        // Update status to failed
        await beatRepository.updateBeat(beat.id, {
          wavConversionStatus: 'failed'
        });
      }

    } else if (status === 'FAILED') {
      loggingService.error('WAV conversion failed', {
        service: 'WavCallbackRoute',
        beatId: beat.id,
        wavTaskId
      });

      // Update status to failed
      await beatRepository.updateBeat(beat.id, {
        wavConversionStatus: 'failed'
      });
    }

    res.status(200).json({
      status: 'received',
      wavTaskId,
      message: 'WAV callback processed successfully'
    });

  } catch (error) {
    loggingService.error('Error processing WAV callback', {
      service: 'WavCallbackRoute',
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    });

    res.status(200).json({
      status: 'error',
      message: 'Error processing callback'
    });
  }
});

/**
 * GET /api/callbacks/suno/test
 * Test endpoint để verify webhook đang hoạt động
 */
router.get('/suno/test', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Suno webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

export default router;
