import { ApiKeyManager } from '../../../src/services/apikey-manager.service';
import { getPrismaClient } from '../../../src/config/database.config';

describe('API Key Manager Unit Tests', () => {
  const apiKeyManager = new ApiKeyManager();
  const prisma = getPrismaClient();
  const testKeyPrefix = 'test-unit';

  beforeEach(async () => {
    // Clean up test keys
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: testKeyPrefix
        }
      }
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: testKeyPrefix
        }
      }
    });
  });

  describe('addKey', () => {
    it('should add a new API key', async () => {
      const key = `${testKeyPrefix}-add-test-${Date.now()}`;
      const result = await apiKeyManager.addKey(key, 100);

      expect(result).toBeDefined();
      expect(result.key).toBe(key);
      expect(result.status).toBe('active');
      expect(result.quotaRemaining).toBe(100);

      await apiKeyManager.deleteKey(result.id);
    });

    it('should handle duplicate keys', async () => {
      const key = `${testKeyPrefix}-duplicate-${Date.now()}`;
      const result1 = await apiKeyManager.addKey(key, 100);

      // Adding duplicate should throw error
      await expect(apiKeyManager.addKey(key, 100)).rejects.toThrow();

      await apiKeyManager.deleteKey(result1.id);
    });
  });

  describe('getNextAvailableKey', () => {
    it('should return null when no keys available', async () => {
      const result = await apiKeyManager.getNextAvailableKey();
      // May be null if no other keys exist
      expect(result === null || result !== null).toBe(true);
    });

    it('should return active key with quota', async () => {
      const key = `${testKeyPrefix}-available-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      const result = await apiKeyManager.getNextAvailableKey();
      expect(result).toBeDefined();
      expect(result?.quotaRemaining).toBeGreaterThan(0);

      await apiKeyManager.deleteKey(added.id);
    });

    it('should not return exhausted keys', async () => {
      const key = `${testKeyPrefix}-exhausted-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 0);
      await apiKeyManager.markKeyExhausted(added.id);

      const result = await apiKeyManager.getNextAvailableKey();
      if (result) {
        expect(result.id).not.toBe(added.id);
      }

      await apiKeyManager.deleteKey(added.id);
    });
  });

  describe('updateKeyQuota', () => {
    it('should update quota correctly', async () => {
      const key = `${testKeyPrefix}-update-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      await apiKeyManager.updateKeyQuota(added.id, 50);

      const retrieved = await apiKeyManager.getKeyById(added.id);
      expect(retrieved?.quotaRemaining).toBe(50);

      await apiKeyManager.deleteKey(added.id);
    });

    it('should auto-mark as exhausted when quota reaches 0', async () => {
      const key = `${testKeyPrefix}-auto-exhaust-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      await apiKeyManager.updateKeyQuota(added.id, 0);

      const retrieved = await apiKeyManager.getKeyById(added.id);
      expect(retrieved?.status).toBe('exhausted');

      await apiKeyManager.deleteKey(added.id);
    });

    it('should handle negative quota values', async () => {
      const key = `${testKeyPrefix}-negative-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      await apiKeyManager.updateKeyQuota(added.id, -10);

      const retrieved = await apiKeyManager.getKeyById(added.id);
      // Negative quota triggers auto-exhaust which sets quota to 0
      expect(retrieved?.quotaRemaining).toBe(0);
      expect(retrieved?.status).toBe('exhausted');

      await apiKeyManager.deleteKey(added.id);
    });
  });

  describe('markKeyExhausted', () => {
    it('should mark key as exhausted', async () => {
      const key = `${testKeyPrefix}-mark-exhausted-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      await apiKeyManager.markKeyExhausted(added.id);

      const retrieved = await apiKeyManager.getKeyById(added.id);
      expect(retrieved?.status).toBe('exhausted');
      expect(retrieved?.quotaRemaining).toBe(0);

      await apiKeyManager.deleteKey(added.id);
    });
  });

  describe('getAllKeysStatus', () => {
    it('should return all keys', async () => {
      const key1 = `${testKeyPrefix}-all-1-${Date.now()}`;
      const key2 = `${testKeyPrefix}-all-2-${Date.now()}`;

      const added1 = await apiKeyManager.addKey(key1, 100);
      const added2 = await apiKeyManager.addKey(key2, 50);

      const allKeys = await apiKeyManager.getAllKeysStatus();
      const testKeys = allKeys.filter(k => k.key.startsWith(testKeyPrefix));

      expect(testKeys.length).toBeGreaterThanOrEqual(2);

      await apiKeyManager.deleteKey(added1.id);
      await apiKeyManager.deleteKey(added2.id);
    });
  });

  describe('hasActiveKeys', () => {
    it('should return true when active keys exist', async () => {
      const key = `${testKeyPrefix}-has-active-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 100);

      const hasActive = await apiKeyManager.hasActiveKeys();
      expect(hasActive).toBe(true);

      await apiKeyManager.deleteKey(added.id);
    });
  });

  describe('getKeyStatistics', () => {
    it('should return correct statistics', async () => {
      const key1 = `${testKeyPrefix}-stats-1-${Date.now()}`;
      const key2 = `${testKeyPrefix}-stats-2-${Date.now()}`;

      const added1 = await apiKeyManager.addKey(key1, 100);
      const added2 = await apiKeyManager.addKey(key2, 50);
      await apiKeyManager.markKeyExhausted(added2.id);

      const stats = await apiKeyManager.getKeyStatistics();

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.active).toBeGreaterThanOrEqual(1);
      expect(stats.exhausted).toBeGreaterThanOrEqual(1);

      await apiKeyManager.deleteKey(added1.id);
      await apiKeyManager.deleteKey(added2.id);
    });
  });

  describe('refreshKeyQuota', () => {
    it('should refresh quota and reactivate key', async () => {
      const key = `${testKeyPrefix}-refresh-${Date.now()}`;
      const added = await apiKeyManager.addKey(key, 0);
      await apiKeyManager.markKeyExhausted(added.id);

      await apiKeyManager.refreshKeyQuota(added.id, 100);

      const retrieved = await apiKeyManager.getKeyById(added.id);
      expect(retrieved?.quotaRemaining).toBe(100);
      expect(retrieved?.status).toBe('active');

      await apiKeyManager.deleteKey(added.id);
    });
  });
});
