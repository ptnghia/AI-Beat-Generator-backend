import express, { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { getPrismaClient } from '../../config/database.config';
import { loggingService } from '../../services/logging.service';

const router = express.Router();
const prisma = getPrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = '';
    
    if (file.fieldname === 'mp3') {
      uploadDir = process.env.BEAT_OUTPUT_DIR || './output/beats';
    } else if (file.fieldname === 'wav') {
      uploadDir = process.env.WAV_OUTPUT_DIR || './output/beats-wav';
    } else if (file.fieldname === 'cover') {
      uploadDir = process.env.COVER_OUTPUT_DIR || './output/covers';
    }
    
    // Create directory with date structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateDir = path.join(uploadDir, `${year}-${month}`, day);
    
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
    
    cb(null, dateDir);
  },
  filename: (req, file, cb) => {
    const beatId = req.params.id;
    const ext = path.extname(file.originalname);
    
    if (file.fieldname === 'mp3') {
      cb(null, `${beatId}${ext}`);
    } else if (file.fieldname === 'wav') {
      cb(null, `${beatId}.wav`);
    } else if (file.fieldname === 'cover') {
      cb(null, `${beatId}.png`);
    } else {
      cb(null, file.originalname);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes: Record<string, string[]> = {
      mp3: ['.mp3'],
      wav: ['.wav'],
      cover: ['.png', '.jpg', '.jpeg']
    };
    
    const ext = path.extname(file.originalname).toLowerCase();
    const fieldAllowed = allowedTypes[file.fieldname];
    
    if (fieldAllowed && fieldAllowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}: ${ext}`));
    }
  }
});

/**
 * POST /api/beats/:id/upload
 * Upload MP3, WAV, and/or Cover files manually
 * 
 * Body (multipart/form-data):
 * - mp3: MP3 file (optional)
 * - wav: WAV file (optional)
 * - cover: Cover image (optional, PNG/JPG)
 */
router.post('/:id/upload',
  upload.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'wav', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req: Request, res: Response) => {
    try {
      const beatId = req.params.id;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Check if beat exists
      const beat = await prisma.beat.findUnique({
        where: { id: beatId }
      });

      if (!beat) {
        // Clean up uploaded files
        if (files) {
          Object.values(files).flat().forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(404).json({
          status: 'error',
          message: 'Beat not found'
        });
      }

      const updateData: any = {
        filesUploaded: true
      };

      const uploadedFiles: any = {};

      // Process MP3
      if (files.mp3 && files.mp3.length > 0) {
        const mp3File = files.mp3[0];
        updateData.fileUrl = mp3File.path;
        updateData.generationStatus = 'completed';
        uploadedFiles.mp3 = mp3File.path;
        
        loggingService.info('MP3 file uploaded', {
          service: 'UploadRoute',
          beatId,
          path: mp3File.path,
          size: mp3File.size
        });
      }

      // Process WAV
      if (files.wav && files.wav.length > 0) {
        const wavFile = files.wav[0];
        updateData.wavUrl = wavFile.path;
        updateData.wavConversionStatus = 'completed';
        uploadedFiles.wav = wavFile.path;
        
        loggingService.info('WAV file uploaded', {
          service: 'UploadRoute',
          beatId,
          path: wavFile.path,
          size: wavFile.size
        });
      }

      // Process Cover
      if (files.cover && files.cover.length > 0) {
        const coverFile = files.cover[0];
        updateData.coverArtPath = coverFile.path;
        uploadedFiles.cover = coverFile.path;
        
        loggingService.info('Cover image uploaded', {
          service: 'UploadRoute',
          beatId,
          path: coverFile.path,
          size: coverFile.size
        });
      }

      // Update beat record
      await prisma.beat.update({
        where: { id: beatId },
        data: updateData
      });

      res.status(200).json({
        status: 'success',
        message: 'Files uploaded successfully',
        beatId,
        uploadedFiles
      });

    } catch (error) {
      loggingService.error('File upload failed', {
        service: 'UploadRoute',
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }
);

/**
 * GET /api/beats/:id/files
 * Get file status for a beat
 */
router.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const beatId = req.params.id;

    const beat = await prisma.beat.findUnique({
      where: { id: beatId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        alternateFileUrl: true as any,
        wavUrl: true,
        coverArtPath: true,
        generationStatus: true as any,
        filesUploaded: true as any,
        wavConversionStatus: true
      }
    });

    if (!beat) {
      return res.status(404).json({
        status: 'error',
        message: 'Beat not found'
      });
    }

    const beatAny = beat as any;
    const fileStatus = {
      mp3: {
        exists: !!beatAny.fileUrl && fs.existsSync(beatAny.fileUrl),
        path: beatAny.fileUrl,
        size: beatAny.fileUrl && fs.existsSync(beatAny.fileUrl) 
          ? fs.statSync(beatAny.fileUrl).size 
          : 0
      },
      alternateMp3: {
        exists: !!beatAny.alternateFileUrl && fs.existsSync(beatAny.alternateFileUrl),
        path: beatAny.alternateFileUrl,
        size: beatAny.alternateFileUrl && fs.existsSync(beatAny.alternateFileUrl)
          ? fs.statSync(beatAny.alternateFileUrl).size
          : 0
      },
      wav: {
        exists: !!beatAny.wavUrl && fs.existsSync(beatAny.wavUrl),
        path: beatAny.wavUrl,
        status: beatAny.wavConversionStatus,
        size: beatAny.wavUrl && fs.existsSync(beatAny.wavUrl)
          ? fs.statSync(beatAny.wavUrl).size
          : 0
      },
      cover: {
        exists: !!beatAny.coverArtPath && fs.existsSync(beatAny.coverArtPath),
        path: beatAny.coverArtPath,
        size: beatAny.coverArtPath && fs.existsSync(beatAny.coverArtPath)
          ? fs.statSync(beatAny.coverArtPath).size
          : 0
      },
      generationStatus: beatAny.generationStatus,
      filesUploaded: beatAny.filesUploaded
    };

    res.status(200).json({
      status: 'success',
      beatId,
      beatName: beat.name,
      files: fileStatus
    });

  } catch (error) {
    loggingService.error('Failed to get file status', {
      service: 'UploadRoute',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to get file status'
    });
  }
});

export default router;
