import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loggingService } from './logging.service';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export interface BPMDetectionResult {
  bpm: number;
  confidence: number;
  method: 'essentia' | 'aubio' | 'estimated';
}

export class BPMDetectionService {
  /**
   * Detect BPM from audio file
   * Uses multiple methods with fallback
   */
  async detectBPM(audioFilePath: string): Promise<BPMDetectionResult> {
    const startTime = Date.now();
    let tempWavPath: string | null = null;

    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Calculate temp WAV path for cleanup
      if (!audioFilePath.endsWith('.wav')) {
        tempWavPath = audioFilePath.replace(/\.[^.]+$/, '_temp.wav');
      }

      loggingService.info('Starting BPM detection', {
        service: 'BPMDetectionService',
        filePath: audioFilePath
      });

      // Try Essentia first (most accurate)
      try {
        const result = await this.detectWithEssentia(audioFilePath);
        loggingService.info('BPM detected successfully', {
          service: 'BPMDetectionService',
          bpm: result.bpm,
          method: result.method,
          duration: Date.now() - startTime
        });
        return result;
      } catch (essentiaError) {
        loggingService.warn('Essentia BPM detection failed, trying alternative', {
          service: 'BPMDetectionService',
          error: essentiaError instanceof Error ? essentiaError.message : String(essentiaError)
        });
      }

      // Fallback to SoX-based detection
      try {
        const result = await this.detectWithSoX(audioFilePath);
        loggingService.info('BPM detected with fallback method', {
          service: 'BPMDetectionService',
          bpm: result.bpm,
          method: result.method,
          duration: Date.now() - startTime
        });
        return result;
      } catch (soxError) {
        loggingService.warn('SoX BPM detection failed', {
          service: 'BPMDetectionService',
          error: soxError instanceof Error ? soxError.message : String(soxError)
        });
      }

      // Last resort: estimate from genre
      const estimated = this.estimateBPM(audioFilePath);
      loggingService.warn('Using estimated BPM', {
        service: 'BPMDetectionService',
        bpm: estimated.bpm,
        method: estimated.method
      });
      return estimated;

    } catch (error) {
      loggingService.logError('BPMDetectionService', error as Error, {
        filePath: audioFilePath
      });
      throw error;
    } finally {
      // ✅ ALWAYS cleanup temp WAV file
      if (tempWavPath && fs.existsSync(tempWavPath)) {
        try {
          fs.unlinkSync(tempWavPath);
          loggingService.info('Cleaned up temp WAV file', {
            service: 'BPMDetectionService',
            tempFile: path.basename(tempWavPath),
            size: '~20MB'
          });
        } catch (cleanupError) {
          loggingService.warn('Failed to cleanup temp WAV file', {
            service: 'BPMDetectionService',
            tempFile: tempWavPath,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          });
        }
      }
    }
  }

  /**
   * Detect BPM using Essentia (Python-based, most accurate)
   */
  private async detectWithEssentia(audioFilePath: string): Promise<BPMDetectionResult> {
    try {
      // Convert to WAV if needed (Essentia works best with WAV)
      const wavPath = audioFilePath.endsWith('.wav') 
        ? audioFilePath 
        : await this.convertToWav(audioFilePath);

      // Use Essentia via Python (if available)
      const pythonScript = `
import essentia
import essentia.standard as es
audio = es.MonoLoader(filename='${wavPath}')()
rhythm_extractor = es.RhythmExtractor2013()
bpm, beats, beats_confidence, _, _ = rhythm_extractor(audio)
print(f"{bpm},{beats_confidence}")
`;

      const scriptPath = path.join(__dirname, '../../temp/bpm_detect.py');
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
      fs.writeFileSync(scriptPath, pythonScript);

      const output = execSync(`python3 ${scriptPath}`, {
        encoding: 'utf-8',
        timeout: 30000
      }).trim();

      const [bpmStr, confidenceStr] = output.split(',');
      const bpm = Math.round(parseFloat(bpmStr));
      const confidence = parseFloat(confidenceStr);

      // Cleanup temp files
      fs.unlinkSync(scriptPath);
      if (wavPath !== audioFilePath) {
        fs.unlinkSync(wavPath);
      }

      return {
        bpm,
        confidence,
        method: 'essentia'
      };
    } catch (error) {
      throw new Error(`Essentia detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect BPM using SoX (command-line tool)
   */
  private async detectWithSoX(audioFilePath: string): Promise<BPMDetectionResult> {
    try {
      // SoX tempo detection
      const output = execSync(`sox "${audioFilePath}" -n stat 2>&1 | grep "Length"`, {
        encoding: 'utf-8',
        timeout: 30000
      });

      // Parse output and estimate BPM
      // This is a simplified approach - SoX doesn't directly give BPM
      // but we can estimate from file length and typical beat patterns
      
      // For now, throw to use fallback
      throw new Error('SoX BPM detection not fully implemented');
    } catch (error) {
      throw new Error(`SoX detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate BPM based on genre patterns and file analysis
   */
  private estimateBPM(audioFilePath: string): BPMDetectionResult {
    // Get file metadata to guess genre
    const filename = path.basename(audioFilePath).toLowerCase();

    // Genre-based BPM estimation
    let estimatedBPM = 120; // Default

    if (filename.includes('trap') || filename.includes('drill')) {
      estimatedBPM = 140;
    } else if (filename.includes('lofi') || filename.includes('chill')) {
      estimatedBPM = 80;
    } else if (filename.includes('rnb') || filename.includes('r&b')) {
      estimatedBPM = 85;
    } else if (filename.includes('boom bap') || filename.includes('hip hop')) {
      estimatedBPM = 90;
    }

    loggingService.warn('BPM estimated from filename', {
      service: 'BPMDetectionService',
      filename,
      estimatedBPM
    });

    return {
      bpm: estimatedBPM,
      confidence: 0.3, // Low confidence for estimates
      method: 'estimated'
    };
  }

  /**
   * Convert audio to WAV format for better processing
   */
  private async convertToWav(audioFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const wavPath = audioFilePath.replace(/\.[^.]+$/, '_temp.wav');

      ffmpeg(audioFilePath)
        .output(wavPath)
        .audioFrequency(44100)
        .audioChannels(1)
        .on('end', () => resolve(wavPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Validate and round BPM to reasonable values
   */
  validateBPM(bpm: number): number {
    // Round to nearest integer
    let validated = Math.round(bpm);

    // Handle half-time/double-time confusion
    if (validated < 60) {
      validated *= 2; // Likely half-time detection
    } else if (validated > 200) {
      validated /= 2; // Likely double-time detection
    }

    // Clamp to reasonable range
    validated = Math.max(60, Math.min(180, validated));

    return validated;
  }
}

export const bpmDetectionService = new BPMDetectionService();
