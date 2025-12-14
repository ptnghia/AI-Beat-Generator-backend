/**
 * Express API Server
 * Provides REST API endpoints for beat generation system
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loggingService } from '../services/logging.service';
import { beatRoutes } from './routes/beat.routes';
import { statsRoutes } from './routes/stats.routes';

const app: Express = express();

// Trust proxy for reverse proxy setup (Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log after response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    loggingService.info('API Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/beats', beatRoutes);
app.use('/api/stats', statsRoutes);

// Generation routes (manual beat generation)
import generateRoutes from './routes/generate.routes';
app.use('/api/generate', generateRoutes);

// Beat action routes (generate-audio, download, versions)
import beatActionRoutes from './routes/beat-actions.routes';
app.use('/api/beats', beatActionRoutes);

// Upload routes (for manual file uploads)
import uploadRoutes from './routes/upload.routes';
app.use('/api/beats', uploadRoutes);

// Callback routes (no rate limiting for webhooks)
import callbackRoutes from './routes/callbacks';
app.use('/api/callbacks', callbackRoutes);

// Admin authentication routes (no rate limiting for login)
import { adminAuthRoutes } from './routes/admin-auth.routes';
app.use('/api/admin', adminAuthRoutes);

// Admin management routes (beat CRUD, API keys, logs)
import adminRoutes from './routes/admin.routes';
app.use('/api/admin', adminRoutes);

// BeatStars export routes
import beatstarsRoutes from './routes/beatstars.routes';
app.use('/api/beatstars', beatstarsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  loggingService.logError('API Server', err, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  });

  const statusCode = (err as any).statusCode || 500;
  
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
