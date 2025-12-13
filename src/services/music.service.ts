import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';
import { sleep } from '../utils/retry.util';

export class MusicService {
  private circuitBreaker: CircuitBreaker;
  private readonly POLL_INTERVAL = 10000; // 10 seconds
  private readonly TIMEOUT = 300000; // 5 minutes
  private readonly SUNO_API_BASE = 'https://api.sunoapi.org'; // Updated to correct API
  private readonly USE_MOCK = process.env.USE_MOCK_MUSIC === 'true';
  private readonly GENERATION_SUNO = process.env.GENERATION_SUNO !== 'false'; // Default true

  constructor() {
    this.circuitBreaker = new CircuitBreaker('MusicService');
  }

  /**
   * Generate music using Suno API
   * Returns both tracks if available (Suno generates 2 versions)
   */
  async generateMusic(
    prompt: string, 
    apiKey: string, 
    beatName?: string, 
    tags?: string
  ): Promise<{ 
    jobId: string; 
    fileUrl: string; 
    audioId: string;
    alternateFileUrl?: string;
    alternateAudioId?: string;
  }> {
    const startTime = Date.now();

    try {
      // Check if generation is enabled
      if (!this.GENERATION_SUNO) {
        loggingService.info('Suno generation disabled, returning mock taskId', {
          service: 'MusicService',
          beatName
        });
        // Return mock data for database only
        return {
          jobId: `mock-${Date.now()}`,
          fileUrl: '',
          audioId: ''
        };
      }

      // Submit job
      const taskId = await this.submitJob(prompt, apiKey, beatName, tags);

      // Poll for completion
      const result = await this.pollJobStatus(taskId, apiKey);

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'MusicService',
        'generateMusic',
        { promptLength: prompt.length, beatName, tracksReturned: result.alternateFileUrl ? 2 : 1 },
        200,
        executionTime
      );

      return { 
        jobId: taskId, 
        fileUrl: result.fileUrl, 
        audioId: result.audioId,
        alternateFileUrl: result.alternateFileUrl,
        alternateAudioId: result.alternateAudioId
      };
    } catch (error) {
      loggingService.logError('MusicService', error as Error, {
        prompt: prompt.substring(0, 50),
        beatName
      });
      throw error;
    }
  }

  /**
   * Submit music generation job to Suno API
   * Updated to match official API documentation: https://docs.sunoapi.org/suno-api/generate-music
   */
  private async submitJob(
    prompt: string, 
    apiKey: string, 
    beatName?: string, 
    tags?: string
  ): Promise<string> {
    return await this.circuitBreaker.execute(async () => {
      return await withRetry(
        async () => {
          // Use mock if enabled or if real API fails
          if (this.USE_MOCK) {
            const jobId = `job-${Date.now()}`;
            
            loggingService.info('Music generation job submitted (MOCK)', {
              service: 'MusicService',
              jobId,
              promptLength: prompt.length,
              beatName,
              mode: 'mock'
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            return jobId;
          }

          try {
            // Call real Suno API with correct format (NEW API)
            const response = await axios.post(
              `${this.SUNO_API_BASE}/api/v1/generate`,
              {
                customMode: true,
                instrumental: true,
                model: "V4_5ALL",
                style: tags || "instrumental, beat, music",
                title: beatName || "Instrumental Beat",
                prompt: prompt,
                callBackUrl: process.env.SUNO_CALLBACK_URL || "https://webhook.site/unique-id"
              },
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`, // Correct Bearer token format
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            );

            // Check response code (NEW API uses 200 for success)
            if (response.data.code !== 200) {
              throw new Error(response.data.msg || 'Suno API error');
            }

            // Get taskId from correct response structure
            const taskId = response.data.data?.taskId;
            
            if (!taskId) {
              throw new Error('No taskId returned from Suno API');
            }

            loggingService.info('Music generation job submitted', {
              service: 'MusicService',
              taskId,
              promptLength: prompt.length,
              beatName
            });

            return taskId;
          } catch (error) {
            if (axios.isAxiosError(error)) {
              loggingService.error('Suno API error', {
                service: 'MusicService',
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
              });
            }
            throw error;
          }
        },
        undefined,
        'MusicService'
      );
    });
  }

  /**
   * Poll job status until completion or timeout
   */
  private async pollJobStatus(taskId: string, apiKey: string): Promise<{ 
    fileUrl: string; 
    audioId: string;
    alternateFileUrl?: string;
    alternateAudioId?: string;
  }> {
    const startTime = Date.now();
    let pollCount = 0;
    const maxPolls = Math.floor(this.TIMEOUT / this.POLL_INTERVAL);

    while (pollCount < maxPolls) {
      try {
        const status = await this.checkJobStatus(taskId, apiKey);

        if (status.status === 'completed') {
          loggingService.info('Music generation completed', {
            service: 'MusicService',
            taskId,
            pollCount,
            totalTime: Date.now() - startTime,
            tracksGenerated: status.alternateFileUrl ? 2 : 1
          });
          return { 
            fileUrl: status.fileUrl!, 
            audioId: status.audioId!,
            alternateFileUrl: status.alternateFileUrl,
            alternateAudioId: status.alternateAudioId
          };
        }

        if (status.status === 'failed') {
          throw new Error(`Task failed: ${status.error}`);
        }

        // Still processing, wait and retry
        loggingService.info('Music generation in progress', {
          service: 'MusicService',
          taskId,
          pollCount,
          currentStatus: status.status
        });
        
        await sleep(this.POLL_INTERVAL);
        pollCount++;
      } catch (error) {
        loggingService.logError('MusicService', error as Error, {
          taskId,
          pollCount
        });
        throw error;
      }
    }

    throw new Error(`Task timeout after ${this.TIMEOUT}ms (${maxPolls} polls)`);
  }

  /**
   * Check job status
   * Updated to match official NEW API documentation
   */
  private async checkJobStatus(taskId: string, apiKey: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    fileUrl?: string;
    audioId?: string;
    alternateFileUrl?: string;
    alternateAudioId?: string;
    error?: string;
  }> {
    try {
      // Use mock if enabled
      if (this.USE_MOCK) {
        // Simulate immediate completion for mock
        return {
          status: 'completed',
          fileUrl: `https://example.com/beats/${taskId}.mp3`
        };
      }

      // Call correct query endpoint (NEW API)
      const response = await axios.get(
        `${this.SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}` // Correct Bearer token format
          },
          timeout: 10000
        }
      );

      // Check response code (NEW API uses 200)
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || 'Query failed');
      }

      // Get task data from correct response structure (NEW API)
      const taskData = response.data.data;
      
      if (!taskData) {
        return { status: 'processing' };
      }

      // Handle all status values according to NEW API documentation
      switch (taskData.status) {
        case 'SUCCESS':
          // Get audio URLs from sunoData array (Suno returns 2 tracks)
          const tracks = taskData.response?.sunoData || [];
          if (tracks.length === 0 || !tracks[0].audioUrl) {
            loggingService.warn('Task marked SUCCESS but no audio URL', {
              service: 'MusicService',
              taskId,
              taskData
            });
            return { status: 'processing' };
          }
          
          // Save both tracks if available
          const result: any = {
            status: 'completed',
            fileUrl: tracks[0].audioUrl,
            audioId: tracks[0].id
          };
          
          if (tracks.length > 1 && tracks[1].audioUrl) {
            result.alternateFileUrl = tracks[1].audioUrl;
            result.alternateAudioId = tracks[1].id;
            loggingService.info('Both tracks retrieved', {
              service: 'MusicService',
              taskId,
              track1: tracks[0].id,
              track2: tracks[1].id
            });
          }
          
          return result;

        case 'FAILED':
          return {
            status: 'failed',
            error: taskData.errorMessage || 'Generation failed'
          };

        case 'PENDING':
        case 'GENERATING':
        case 'TEXT_SUCCESS':
        case 'FIRST_SUCCESS':
          return { status: 'processing' };

        default:
          loggingService.warn('Unknown status from Suno API', {
            service: 'MusicService',
            taskId,
            status: taskData.status
          });
          return { status: 'processing' };
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        loggingService.error('Failed to check job status', {
          service: 'MusicService',
          taskId,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Download and save audio file locally
   */
  async downloadAndSaveFile(fileUrl: string, taskId: string): Promise<string> {
    try {
      const outputDir = process.env.BEAT_OUTPUT_DIR || './output/beats';
      
      // Create directory structure: YYYY-MM/DD/
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      const dateDir = path.join(outputDir, `${year}-${month}`, day);
      
      // Ensure directory exists
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }

      const filename = `${taskId}.mp3`;
      const localPath = path.join(dateDir, filename);

      loggingService.info('Downloading audio file', {
        service: 'MusicService',
        taskId,
        fileUrl,
        localPath
      });

      // Download file
      const response = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 60000
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          const stats = fs.statSync(localPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          
          loggingService.info('Audio file downloaded successfully', {
            service: 'MusicService',
            localPath,
            size: `${sizeMB} MB`
          });
          
          resolve(localPath);
        });
        writer.on('error', (error) => {
          loggingService.logError('MusicService', error, {
            context: 'downloadAndSaveFile',
            fileUrl
          });
          reject(error);
        });
      });

    } catch (error) {
      loggingService.logError('MusicService', error as Error, {
        context: 'downloadAndSaveFile',
        fileUrl
      });
      throw error;
    }
  }
}
