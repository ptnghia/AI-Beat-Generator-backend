import dotenv from 'dotenv';

dotenv.config();

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LoggingConfig {
  level: LogLevel;
  filePath: string;
  alertWebhookUrl?: string;
  errorRateThreshold: number;
}

export const loggingConfig: LoggingConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'INFO',
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
  errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.2')
};
