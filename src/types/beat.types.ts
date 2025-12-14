// Beat Template from XML Catalog
export interface BeatTemplate {
  id: string;
  categoryName: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  basePrompt: string;
  isActive?: boolean;
  lastUsed?: Date;
  xmlChecksum?: string;
}

// API Key Management
export interface ApiKey {
  id: string;
  key: string;
  status: 'active' | 'exhausted' | 'error';
  quotaRemaining: number;
  lastUsed?: Date;
  createdAt: Date;
}

// Beat Generation Job
export interface BeatJob {
  id: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  conceptData?: ConceptData;
  normalizedPrompt?: string;
  sunoJobId?: string;
  metadata?: BeatMetadata;
  apiKeyUsed?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Concept from Gemini
export interface ConceptData {
  suggestion: string;
  trendAnalysis: string;
  moodEnhancement: string;
}

// Beat Metadata
export interface BeatMetadata {
  name: string;
  tags: string[];
  description: string;
  key?: string; // Musical key (e.g., "C Minor", "F# Major")
}

// Final Beat Record
export interface Beat {
  id: string;
  templateId: string;
  name: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string[];
  description: string;
  fileUrl: string; // MP3 file path (320kbps)
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: ConceptData;
  apiKeyUsed: string;
  bpm?: number; // Detected BPM (beats per minute)
  musicalKey?: string; // Musical key (e.g., "C Minor", "F# Major")
  coverArtPath?: string; // Path to cover art image (3000x3000px)
  previewPath?: string; // Path to 30-second preview (128kbps MP3)
  pricing?: any; // Pricing tiers data (JSON)
  
  // Multiple tracks support (Suno returns 2 tracks)
  alternateFileUrl?: string; // Second MP3 track from Suno
  alternateAudioId?: string; // Second audio ID for WAV conversion
  alternateDuration?: number; // Duration of second track
  alternateModelName?: string; // Model used for second track
  alternateSunoAudioUrl?: string; // Audio URL for second track
  alternateSunoImageUrl?: string; // Image URL for second track
  alternateSunoStreamUrl?: string; // Stream URL for second track
  
  // WAV conversion (on-demand)
  wavUrl?: string; // WAV file path (44.1kHz 16-bit)
  wavConversionStatus?: 'not_started' | 'processing' | 'completed' | 'failed';
  wavTaskId?: string; // Suno WAV conversion task ID
  sunoTaskId?: string; // Original Suno music generation task ID
  sunoAudioId?: string; // Original Suno audio ID (for WAV conversion)
  
  // Suno API response data
  duration?: number; // Audio duration in seconds from Suno
  modelName?: string; // Suno model used (e.g., "chirp-v3-5", "chirp-v4")
  sunoAudioUrl?: string; // Direct audio URL from Suno CDN
  sunoImageUrl?: string; // Cover image URL from Suno
  sunoStreamUrl?: string; // Streaming audio URL from Suno
  
  // Generation tracking
  generationStatus?: 'pending' | 'completed' | 'failed';
  filesUploaded?: boolean; // True if files manually uploaded
  
  createdAt: Date;
}

// Prompt Storage
export interface PromptRecord {
  id: string;
  templateId: string;
  version: number;
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: ConceptData;
  tags: string[];
  apiKeyUsed: string;
  executionResult: 'success' | 'failure';
  errorMessage?: string;
  createdAt: Date;
}
