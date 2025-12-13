import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';

/**
 * Service for converting MP3 beats to WAV format using Suno API
 * On-demand conversion to save storage and API credits
 */
export class WavConversionService {
  private readonly API_BASE_URL = process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org';
  private readonly API_KEY = process.env.SUNO_API_KEY;
  private readonly WAV_OUTPUT_DIR = process.env.WAV_OUTPUT_DIR || './output/beats-wav';
  private readonly CALLBACK_URL = process.env.SUNO_WAV_CALLBACK_URL || process.env.SUNO_CALLBACK_URL;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker('WavConversionService');
    
    // Ensure WAV output directory exists
    if (!fs.existsSync(this.WAV_OUTPUT_DIR)) {
      fs.mkdirSync(this.WAV_OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Submit WAV conversion job to Suno API
   * @param taskId Original music generation task ID
   * @param audioId Specific audio ID to convert
   * @returns Conversion task ID
   */
  async submitConversion(taskId: string, audioId: string): Promise<string> {
    loggingService.info('Submitting WAV conversion job', { 
      service: 'WavConversionService',
      taskId, 
      audioId 
    });

    const endpoint = `${this.API_BASE_URL}/api/v1/wav/generate`;

    const requestBody = {
      taskId,
      audioId,
      callBackUrl: this.CALLBACK_URL
    };

    try {
      const response = await this.circuitBreaker.execute(
        async () => withRetry(
          async () => {
            const result = await axios.post(endpoint, requestBody, {
              headers: {
                'Authorization': `Bearer ${this.API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            });
            return result;
          },
          { maxAttempts: 3, baseDelay: 1000, maxDelay: 8000, backoffMultiplier: 2 }
        )
      );

      if (response.data.code !== 200) {
        throw new Error(`WAV conversion API error: ${response.data.msg}`);
      }

      const wavTaskId = response.data.data.taskId;

      loggingService.info('WAV conversion job submitted', {
        service: 'WavConversionService',
        originalTaskId: taskId,
        wavTaskId,
        audioId
      });

      return wavTaskId;

    } catch (error) {
      loggingService.error('Failed to submit WAV conversion', {
        service: 'WavConversionService',
        taskId,
        audioId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check WAV conversion status
   * @param wavTaskId WAV conversion task ID
   * @returns Conversion status and WAV URL if completed
   */
  async checkConversionStatus(wavTaskId: string): Promise<{
    status: string;
    wavUrl?: string;
    audioId?: string;
  }> {
    loggingService.info('Checking WAV conversion status', {
      service: 'WavConversionService',
      wavTaskId
    });

    const endpoint = `${this.API_BASE_URL}/api/v1/wav/record-info`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`
        },
        params: {
          taskId: wavTaskId
        },
        timeout: 10000
      });

      if (response.data.code !== 200) {
        throw new Error(`Failed to get WAV status: ${response.data.msg}`);
      }

      const data = response.data.data;
      const status = data.status;

      loggingService.info('WAV conversion status retrieved', {
        service: 'WavConversionService',
        wavTaskId,
        status
      });

      if (status === 'SUCCESS' && data.response?.sunoData?.[0]) {
        return {
          status,
          wavUrl: data.response.sunoData[0].audioUrl,
          audioId: data.response.sunoData[0].id
        };
      }

      return { status };

    } catch (error) {
      loggingService.error('Failed to check WAV conversion status', {
        service: 'WavConversionService',
        wavTaskId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Download WAV file and save locally
   * @param wavUrl Remote WAV file URL
   * @param beatId Beat ID for organizing files
   * @returns Local file path
   */
  async downloadWavFile(wavUrl: string, beatId: string): Promise<string> {
    loggingService.info('Downloading WAV file', {
      service: 'WavConversionService',
      beatId,
      wavUrl
    });

    // Create date-based directory structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const outputDir = path.join(this.WAV_OUTPUT_DIR, `${year}-${month}`, day);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${beatId}.wav`;
    const localPath = path.join(outputDir, fileName);

    try {
      // Download file with streaming
      const response = await axios.get(wavUrl, {
        responseType: 'stream',
        timeout: 300000 // 5 minutes for large WAV files
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      // Get file size
      const stats = fs.statSync(localPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      loggingService.info('WAV file downloaded successfully', {
        service: 'WavConversionService',
        beatId,
        localPath,
        size: `${fileSizeMB} MB`
      });

      return localPath;

    } catch (error) {
      loggingService.error('Failed to download WAV file', {
        service: 'WavConversionService',
        beatId,
        wavUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Clean up partial download
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      
      throw error;
    }
  }

  /**
   * Complete conversion process: submit, wait, and download
   * @param taskId Original music generation task ID
   * @param audioId Specific audio ID to convert
   * @param beatId Beat ID for organizing files
   * @param pollIntervalMs Polling interval in milliseconds
   * @param maxPollAttempts Maximum number of polling attempts
   * @returns Local WAV file path
   */
  async convertAndDownload(
    taskId: string,
    audioId: string,
    beatId: string,
    pollIntervalMs: number = 10000,
    maxPollAttempts: number = 60
  ): Promise<string> {
    loggingService.info('Starting complete WAV conversion process', {
      service: 'WavConversionService',
      taskId,
      audioId,
      beatId
    });

    // Submit conversion
    const wavTaskId = await this.submitConversion(taskId, audioId);

    // Poll for completion
    let attempts = 0;
    while (attempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      attempts++;

      const status = await this.checkConversionStatus(wavTaskId);

      if (status.status === 'SUCCESS' && status.wavUrl) {
        loggingService.info('WAV conversion completed', {
          service: 'WavConversionService',
          wavTaskId,
          attempts,
          totalTime: attempts * pollIntervalMs
        });

        // Download file
        return await this.downloadWavFile(status.wavUrl, beatId);
      }

      if (status.status === 'FAILED') {
        throw new Error('WAV conversion failed on Suno side');
      }

      loggingService.info('WAV conversion in progress', {
        service: 'WavConversionService',
        wavTaskId,
        attempt: attempts,
        status: status.status
      });
    }

    throw new Error(`WAV conversion timeout after ${maxPollAttempts} attempts`);
  }

  /**
   * Get relative path for database storage
   * @param absolutePath Absolute file path
   * @returns Relative path from project root
   */
  getRelativePath(absolutePath: string): string {
    const projectRoot = process.cwd();
    return path.relative(projectRoot, absolutePath);
  }
}

// Singleton instance
export const wavConversionService = new WavConversionService();
