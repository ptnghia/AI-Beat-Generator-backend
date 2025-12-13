/**
 * API Server Entry Point
 * Starts the Express server
 */

import app from './server';
import { loggingService } from '../services/logging.service';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  loggingService.info('API Server started', {
    service: 'API Server',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
  
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎵 Beats API: http://localhost:${PORT}/api/beats`);
  console.log(`📈 Stats API: http://localhost:${PORT}/api/stats`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  loggingService.info('SIGTERM received, shutting down gracefully', {
    service: 'API Server'
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  loggingService.info('SIGINT received, shutting down gracefully', {
    service: 'API Server'
  });
  process.exit(0);
});
