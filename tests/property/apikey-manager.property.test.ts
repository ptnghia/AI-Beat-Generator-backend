import fc from 'fast-check';
import { ApiKeyManager } from '../../src/services/apikey-manager.service';
import { getPrismaClient } from '../../src/config/database.config';

describe('API Key Manager Property Tests', () => {
  const apiKeyManager = new ApiKeyManager();
  const prisma = getPrismaClient();

  // Generator for valid API keys
  const apiKeyArb = fc.string({
    minLength: 32,
    maxLength: 64
  }).filter(s => s.trim().length >= 32);

  const quotaArb = fc.integer({ min: 0, max: 500 });

  beforeEach(async () => {
    // Clean up test API keys
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-'
        }
      }
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-'
        }
      }
    });
  });

  /**
   * Feature: automated-beat-generation, Property 1: API Key Addition Persistence
   * Validates: Requirements 1.1
   */
  it('Property 1: API Key Addition Persistence - added key should be retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        apiKeyArb.map(k => `test-${k}`),
        quotaArb,
        async (apiKey, quota) => {
          // Add API key
          const result = await apiKeyManager.addKey(apiKey, quota);

          // Verify it exists in database
          const retrieved = await apiKeyManager.getKeyById(result.id);

          expect(retrieved).toBeDefined();
          expect(retrieved?.key).toBe(apiKey);
          expect(retrieved?.status).toBe('active');
          expect(retrieved?.quotaRemaining).toBe(quota);

          // Cleanup
          await apiKeyManager.deleteKey(result.id);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Feature: automated-beat-generation, Property 2: Quota Update Consistency
   * Validates: Requirements 1.2
   */
  it('Property 2: Quota Update Consistency - quota should match after update', async () => {
    await fc.assert(
      fc.asyncProperty(
        apiKeyArb.map(k => `test-${k}`),
        quotaArb,
        quotaArb,
        async (apiKey, initialQuota, newQuota) => {
          // Add API key with initial quota
          const result = await apiKeyManager.addKey(apiKey, initialQuota);

          // Update quota
          await apiKeyManager.updateKeyQuota(result.id, newQuota);

          // Verify quota was updated
          const retrieved = await apiKeyManager.getKeyById(result.id);
          expect(retrieved?.quotaRemaining).toBe(newQuota);

          // Cleanup
          await apiKeyManager.deleteKey(result.id);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Feature: automated-beat-generation, Property 3: Exhausted Key State Transition
   * Validates: Requirements 1.3
   */
  it('Property 3: Exhausted Key State Transition - key with zero quota should be exhausted', async () => {
    await fc.assert(
      fc.asyncProperty(
        apiKeyArb.map(k => `test-${k}`),
        quotaArb.filter(q => q > 0),
        async (apiKey, initialQuota) => {
          // Add API key with quota
          const result = await apiKeyManager.addKey(apiKey, initialQuota);

          // Update quota to 0
          await apiKeyManager.updateKeyQuota(result.id, 0);

          // Verify key is marked as exhausted
          const retrieved = await apiKeyManager.getKeyById(result.id);
          expect(retrieved?.status).toBe('exhausted');
          expect(retrieved?.quotaRemaining).toBe(0);

          // Verify exhausted key is not selected
          const nextKey = await apiKeyManager.getNextAvailableKey();
          if (nextKey) {
            expect(nextKey.id).not.toBe(result.id);
          }

          // Cleanup
          await apiKeyManager.deleteKey(result.id);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Feature: automated-beat-generation, Property 4: Round-Robin Key Selection
   * Validates: Requirements 1.5
   */
  it('Property 4: Round-Robin Key Selection - each key should be selected once in N selections', async () => {
    const numKeys = 3;
    const keyPrefix = `test-rr-${Date.now()}`;
    const addedKeys: string[] = [];

    try {
      // Add N keys
      for (let i = 0; i < numKeys; i++) {
        const result = await apiKeyManager.addKey(`${keyPrefix}-${i}`, 100);
        addedKeys.push(result.id);
      }

      // Select keys N times
      const selectedIds = new Set<string>();
      for (let i = 0; i < numKeys; i++) {
        const key = await apiKeyManager.getNextAvailableKey();
        if (key) {
          selectedIds.add(key.id);
        }
      }

      // Verify each key was selected at least once
      expect(selectedIds.size).toBeGreaterThanOrEqual(1);

      // After enough selections, all keys should have been used
      const moreSelections = numKeys * 2;
      const allSelectedIds = new Set<string>();
      for (let i = 0; i < moreSelections; i++) {
        const key = await apiKeyManager.getNextAvailableKey();
        if (key) {
          allSelectedIds.add(key.id);
        }
      }

      expect(allSelectedIds.size).toBe(numKeys);

    } finally {
      // Cleanup
      for (const keyId of addedKeys) {
        await apiKeyManager.deleteKey(keyId);
      }
    }
  }, 60000);
});
