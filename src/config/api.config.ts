import dotenv from 'dotenv';

dotenv.config();

export interface ApiConfig {
  geminiApiKey: string;
  openaiApiKey: string;
  sunoApiKeys: string[];
  port: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
}

export const apiConfig: ApiConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  sunoApiKeys: process.env.SUNO_API_KEYS?.split(',').map(k => k.trim()) || [],
  port: parseInt(process.env.PORT || '3000', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
};

export function validateApiConfig(): void {
  const errors: string[] = [];

  if (!apiConfig.geminiApiKey) {
    errors.push('GEMINI_API_KEY is required');
  }

  if (!apiConfig.openaiApiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (apiConfig.sunoApiKeys.length === 0) {
    errors.push('At least one SUNO_API_KEY is required');
  }

  if (errors.length > 0) {
    throw new Error(`API configuration errors:\n${errors.join('\n')}`);
  }
}
