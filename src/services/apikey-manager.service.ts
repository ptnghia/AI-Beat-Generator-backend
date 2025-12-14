import { ApiKey } from '../types/beat.types';
import { getPrismaClient } from '../config/database.config';
import { loggingService } from './logging.service';

export class ApiKeyManager {
  private prisma = getPrismaClient();
  private cachedKey: ApiKey | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Add a new API key to the pool
   */
  async addKey(key: string, quotaRemaining: number = 0): Promise<ApiKey> {
    try {
      const apiKey = await this.prisma.apiKey.create({
        data: {
          key,
          status: 'active',
          quotaRemaining,
          lastUsed: null
        }
      });

      // Invalidate cache
      this.cachedKey = null;

      loggingService.info('API key added', {
        service: 'ApiKeyManager',
        keyId: apiKey.id,
        quotaRemaining
      });

      return {
        id: apiKey.id,
        key: apiKey.key,
        status: apiKey.status as 'active' | 'exhausted' | 'error',
        quotaRemaining: apiKey.quotaRemaining,
        lastUsed: apiKey.lastUsed || undefined,
        createdAt: apiKey.createdAt
      };
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'addKey'
      });
      throw error;
    }
  }

  /**
   * Get API key with priority: Database > Environment
   * Uses simple single-key strategy with caching
   */
  async getNextAvailableKey(): Promise<ApiKey | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cachedKey && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        loggingService.info('Using cached API key', {
          service: 'ApiKeyManager',
          keyId: this.cachedKey.id
        });
        return this.cachedKey;
      }

      // Priority 1: Get from database
      const dbKey = await this.prisma.apiKey.findFirst({
        where: {
          status: 'active',
          quotaRemaining: { gt: 0 }
        },
        orderBy: { createdAt: 'asc' } // Use oldest key (most stable)
      });

      if (dbKey) {
        // Update last used timestamp
        await this.prisma.apiKey.update({
          where: { id: dbKey.id },
          data: { lastUsed: new Date() }
        });

        const apiKey = {
          id: dbKey.id,
          key: dbKey.key,
          status: dbKey.status as 'active' | 'exhausted' | 'error',
          quotaRemaining: dbKey.quotaRemaining,
          lastUsed: dbKey.lastUsed || undefined,
          createdAt: dbKey.createdAt
        };

        // Cache the key
        this.cachedKey = apiKey;
        this.cacheTimestamp = now;

        loggingService.info('API key selected from database', {
          service: 'ApiKeyManager',
          keyId: apiKey.id,
          quotaRemaining: apiKey.quotaRemaining
        });

        return apiKey;
      }

      // Priority 2: Fallback to .env if database is empty
      const envKey = process.env.SUNO_API_KEYS?.split(',')[0]?.trim();
      
      if (envKey) {
        loggingService.warn('No database API key found, using .env fallback', {
          service: 'ApiKeyManager',
          key: envKey.substring(0, 10) + '...'
        });

        // Create temporary API key object (not saved to DB)
        const apiKey: ApiKey = {
          id: 'env-fallback',
          key: envKey,
          status: 'active',
          quotaRemaining: 500, // Default quota
          createdAt: new Date()
        };

        // Cache the fallback key
        this.cachedKey = apiKey;
        this.cacheTimestamp = now;

        return apiKey;
      }

      // No keys available
      loggingService.warn('No API keys available (database or .env)', {
        service: 'ApiKeyManager'
      });
      
      return null;

    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'getNextAvailableKey'
      });
      throw error;
    }
  }

  /**
   * Update API key quota
   */
  async updateKeyQuota(keyId: string, remaining: number): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: { quotaRemaining: remaining }
      });

      loggingService.logQuotaUsage(keyId, remaining);

      // Auto-mark as exhausted if quota is 0
      if (remaining <= 0) {
        await this.markKeyExhausted(keyId);
      }
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'updateKeyQuota',
        keyId
      });
      throw error;
    }
  }

  /**
   * Mark API key as exhausted
   */
  async markKeyExhausted(keyId: string): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: {
          status: 'exhausted',
          quotaRemaining: 0
        }
      });

      loggingService.warn('API key marked as exhausted', {
        service: 'ApiKeyManager',
        keyId
      });
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'markKeyExhausted',
        keyId
      });
      throw error;
    }
  }

  /**
   * Mark API key as error state
   */
  async markKeyError(keyId: string): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: { status: 'error' }
      });

      loggingService.error('API key marked as error', {
        service: 'ApiKeyManager',
        keyId
      });
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'markKeyError',
        keyId
      });
      throw error;
    }
  }

  /**
   * Get all API keys with their status
   */
  async getAllKeysStatus(): Promise<ApiKey[]> {
    try {
      const keys = await this.prisma.apiKey.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });

      return keys.map((key: any): ApiKey => ({
        id: key.id,
        key: key.key,
        status: key.status as 'active' | 'exhausted' | 'error',
        quotaRemaining: key.quotaRemaining,
        lastUsed: key.lastUsed || undefined,
        createdAt: key.createdAt
      }));
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'getAllKeysStatus'
      });
      throw error;
    }
  }

  /**
   * Get API key by ID
   */
  async getKeyById(keyId: string): Promise<ApiKey | null> {
    try {
      const key = await this.prisma.apiKey.findUnique({
        where: { id: keyId }
      });

      if (!key) return null;

      return {
        id: key.id,
        key: key.key,
        status: key.status as 'active' | 'exhausted' | 'error',
        quotaRemaining: key.quotaRemaining,
        lastUsed: key.lastUsed || undefined,
        createdAt: key.createdAt
      };
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'getKeyById',
        keyId
      });
      throw error;
    }
  }

  /**
   * Delete API key
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      await this.prisma.apiKey.delete({
        where: { id: keyId }
      });

      loggingService.info('API key deleted', {
        service: 'ApiKeyManager',
        keyId
      });
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'deleteKey',
        keyId
      });
      throw error;
    }
  }

  /**
   * Refresh API key quota (manual refresh)
   */
  async refreshKeyQuota(keyId: string, newQuota: number): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: {
          quotaRemaining: newQuota,
          status: newQuota > 0 ? 'active' : 'exhausted'
        }
      });

      loggingService.info('API key quota refreshed', {
        service: 'ApiKeyManager',
        keyId,
        newQuota
      });
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'refreshKeyQuota',
        keyId
      });
      throw error;
    }
  }

  /**
   * Check if any active keys are available
   */
  async hasActiveKeys(): Promise<boolean> {
    try {
      const count = await this.prisma.apiKey.count({
        where: {
          status: 'active',
          quotaRemaining: {
            gt: 0
          }
        }
      });

      return count > 0;
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'hasActiveKeys'
      });
      throw error;
    }
  }

  /**
   * Get statistics about API keys
   */
  async getKeyStatistics(): Promise<{
    total: number;
    active: number;
    exhausted: number;
    error: number;
    totalQuotaRemaining: number;
  }> {
    try {
      const keys = await this.prisma.apiKey.findMany();

      const stats = {
        total: keys.length,
        active: keys.filter((k: any) => k.status === 'active').length,
        exhausted: keys.filter((k: any) => k.status === 'exhausted').length,
        error: keys.filter((k: any) => k.status === 'error').length,
        totalQuotaRemaining: keys.reduce((sum: number, k: any) => sum + k.quotaRemaining, 0)
      };

      return stats;
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'getKeyStatistics'
      });
      throw error;
    }
  }

  /**
   * Select next available API key (alias for getNextAvailableKey)
   */
  async selectKey(): Promise<ApiKey | null> {
    return this.getNextAvailableKey();
  }

  /**
   * Mark API key as used (update lastUsed timestamp)
   */
  async markKeyUsed(keyId: string): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: { lastUsed: new Date() }
      });

      loggingService.info('API key marked as used', {
        service: 'ApiKeyManager',
        keyId
      });
    } catch (error) {
      loggingService.logError('ApiKeyManager', error as Error, {
        context: 'markKeyUsed',
        keyId
      });
      throw error;
    }
  }
}
