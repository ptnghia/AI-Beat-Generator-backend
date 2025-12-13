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
        audioUrl: string;
        sourceAudioUrl: string;
        imageUrl: string;
        title: string;
        tags: string;
        duration: number;
        modelName: string;
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
            audioUrl: firstTrack.audioUrl,
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

        // Download và save file nếu có URL
        if (response?.sunoData && response.sunoData.length > 0) {
          const track = response.sunoData[0]; // Lấy track đầu tiên
          
          try {
            // Download file
            const musicService = new MusicService();
            const localPath = await musicService.downloadAndSaveFile(
              track.audioUrl,
              taskId
            );

            loggingService.info('Audio file downloaded from callback', {
              service: 'SunoCallbackRoute',
              taskId,
              localPath,
              duration: track.duration
            });

            // TODO: Update beat record với local path
            // Cần có cách map taskId -> beatId
            // Có thể thêm field taskId vào Beat model

          } catch (downloadError) {
            loggingService.error('Failed to download audio from callback', {
              service: 'SunoCallbackRoute',
              taskId,
              error: downloadError instanceof Error ? downloadError.message : String(downloadError)
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
