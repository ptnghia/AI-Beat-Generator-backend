import { PrismaClient } from '@prisma/client';

// Type for PromptRecord from Prisma
type PromptRecord = {
  id: string;
  templateId: string;
  version: number;
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: any;
  tags: any;
  apiKeyUsed: string;
  executionResult: string;
  errorMessage: string | null;
  createdAt: Date;
};

export interface PromptQueryFilters {
  templateId?: string;
  genre?: string;
  style?: string;
  mood?: string;
  tags?: string[];
  executionResult?: 'success' | 'failure';
  fromDate?: Date;
  toDate?: Date;
}

export interface CreatePromptData {
  templateId: string;
  basePrompt: string;
  normalizedPrompt: string;
  conceptData: any;
  tags: string[];
  apiKeyUsed: string;
  executionResult: 'success' | 'failure';
  errorMessage?: string;
}

export class PromptRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new prompt record with automatic versioning
   */
  async create(data: CreatePromptData): Promise<PromptRecord> {
    // Get the latest version for this template
    const latestPrompt = await this.prisma.promptRecord.findFirst({
      where: { templateId: data.templateId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestPrompt ? latestPrompt.version + 1 : 1;

    return this.prisma.promptRecord.create({
      data: {
        ...data,
        version: nextVersion,
      },
    });
  }

  /**
   * Find prompt by ID
   */
  async findById(id: string): Promise<PromptRecord | null> {
    return this.prisma.promptRecord.findUnique({
      where: { id },
    });
  }

  /**
   * Find all prompts for a specific template
   */
  async findByTemplateId(templateId: string): Promise<PromptRecord[]> {
    return this.prisma.promptRecord.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get the latest version of a prompt for a template
   */
  async findLatestByTemplateId(templateId: string): Promise<PromptRecord | null> {
    return this.prisma.promptRecord.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Query prompts by multiple criteria
   */
  async query(filters: PromptQueryFilters): Promise<any[]> {
    const where: any = {};

    if (filters.templateId) {
      where.templateId = filters.templateId;
    }

    if (filters.executionResult) {
      where.executionResult = filters.executionResult;
    }

    // For genre, style, mood - need to join with BeatTemplate
    if (filters.genre || filters.style || filters.mood) {
      where.template = {};
      if (filters.genre) where.template.genre = filters.genre;
      if (filters.style) where.template.style = filters.style;
      if (filters.mood) where.template.mood = filters.mood;
    }

    // Date range filter
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    let results = await this.prisma.promptRecord.findMany({
      where,
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by tags if specified (JSON field filtering)
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((prompt: any) => {
        const promptTags = prompt.tags as string[];
        return filters.tags!.some((tag) => promptTags.includes(tag));
      });
    }

    return results;
  }

  /**
   * Get all prompts with pagination
   */
  async findAll(page: number = 1, pageSize: number = 20): Promise<{
    data: PromptRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.promptRecord.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promptRecord.count(),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update prompt execution result
   */
  async updateExecutionResult(
    id: string,
    executionResult: 'success' | 'failure',
    errorMessage?: string
  ): Promise<PromptRecord> {
    return this.prisma.promptRecord.update({
      where: { id },
      data: {
        executionResult,
        errorMessage,
      },
    });
  }

  /**
   * Delete a prompt record
   */
  async delete(id: string): Promise<PromptRecord> {
    return this.prisma.promptRecord.delete({
      where: { id },
    });
  }

  /**
   * Get prompt statistics
   */
  async getStatistics(): Promise<{
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  }> {
    const [total, successful] = await Promise.all([
      this.prisma.promptRecord.count(),
      this.prisma.promptRecord.count({
        where: { executionResult: 'success' },
      }),
    ]);

    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate,
    };
  }

  /**
   * Get prompts by API key
   */
  async findByApiKey(apiKeyId: string): Promise<PromptRecord[]> {
    return this.prisma.promptRecord.findMany({
      where: { apiKeyUsed: apiKeyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
