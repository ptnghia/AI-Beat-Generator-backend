export interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  DATABASE_POOL_SIZE: number;
  
  // API Keys
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  SUNO_API_KEYS: string;
  
  // Scheduler
  BEAT_GENERATION_INTERVAL: string;
  
  // File Paths
  BEAT_CATALOG_PATH: string;
  BEAT_OUTPUT_DIR: string;
  
  // API Server
  PORT: number;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  LOG_FILE_PATH: string;
  
  // Monitoring
  ALERT_WEBHOOK_URL?: string;
  ERROR_RATE_THRESHOLD: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
