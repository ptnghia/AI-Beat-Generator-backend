import { ConceptData, BeatMetadata } from './beat.types';

// Gemini API Types
export interface GeminiConceptRequest {
  category: string;
  genre: string;
  style: string;
  mood: string;
}

export interface GeminiConceptResponse {
  suggestion: string;
  trendAnalysis: string;
  moodEnhancement: string;
}

export interface GeminiMetadataRequest {
  genre: string;
  style: string;
  mood: string;
  prompt: string;
}

// OpenAI API Types
export interface OpenAIPromptRequest {
  basePrompt: string;
  concept: ConceptData;
}

export interface OpenAIPromptResponse {
  normalizedPrompt: string;
  additionalTags: string[];
}

// Suno API Types
export interface SunoJobRequest {
  prompt: string;
  apiKey: string;
}

export interface SunoJobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SunoJobStatusResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  error?: string;
}
