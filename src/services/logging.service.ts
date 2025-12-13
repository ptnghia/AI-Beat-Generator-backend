import winston from 'winston';
import { loggingConfig } from '../config/logging.config';
import * as fs from 'fs';
import * as path from 'path';

export class LoggingService {
  private logger: winston.Logger;
  private static instance: LoggingService;

  private constructor() {
    // Ensure log directory exists
    const logDir = path.dirname(loggingConfig.filePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: loggingConfig.level.toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              let log = `${timestamp} [${level}]`;
              if (service) log += ` [${service}]`;
              log += `: ${message}`;
              if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
              }
              return log;
            })
          )
        }),
        // File transport
        new winston.transports.File({
          filename: loggingConfig.filePath,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public logApiCall(
    service: string,
    endpoint: string,
    requestPayload: any,
    responseStatus: number,
    executionTime: number
  ): void {
    this.info('API call completed', {
      service,
      endpoint,
      requestPayload,
      responseStatus,
      executionTime
    });
  }

  public logError(
    service: string,
    error: Error,
    context?: any
  ): void {
    this.error('Error occurred', {
      service,
      message: error.message,
      stackTrace: error.stack,
      context
    });
  }

  public logQuotaUsage(
    apiKeyId: string,
    quotaRemaining: number
  ): void {
    this.info('API key quota updated', {
      service: 'ApiKeyManager',
      apiKeyId,
      quotaRemaining
    });
  }

  public logScheduleExecution(
    templateId: string,
    result: 'success' | 'failure',
    error?: string
  ): void {
    this.info('Schedule execution completed', {
      service: 'Scheduler',
      templateId,
      result,
      error
    });
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();
