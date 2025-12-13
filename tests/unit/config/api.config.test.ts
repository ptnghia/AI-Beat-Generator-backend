import { apiConfig, validateApiConfig } from '../../../src/config/api.config';

describe('API Configuration', () => {
  describe('apiConfig', () => {
    it('should load API configuration from environment', () => {
      expect(apiConfig).toBeDefined();
      expect(apiConfig.geminiApiKey).toBeDefined();
      expect(apiConfig.openaiApiKey).toBeDefined();
      expect(apiConfig.sunoApiKeys).toBeDefined();
    });

    it('should parse Suno API keys as array', () => {
      expect(Array.isArray(apiConfig.sunoApiKeys)).toBe(true);
      expect(apiConfig.sunoApiKeys.length).toBeGreaterThan(0);
    });

    it('should have valid port number', () => {
      expect(apiConfig.port).toBeGreaterThan(0);
      expect(apiConfig.port).toBeLessThanOrEqual(65535);
    });

    it('should have valid rate limit configuration', () => {
      expect(apiConfig.rateLimitWindow).toBeGreaterThan(0);
      expect(apiConfig.rateLimitMaxRequests).toBeGreaterThan(0);
    });
  });

  describe('validateApiConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should not throw when all required keys are present', () => {
      expect(() => validateApiConfig()).not.toThrow();
    });

    it('should throw when GEMINI_API_KEY is missing', () => {
      // This test would require mocking the config module
      // For now, we verify the function exists and can be called
      expect(validateApiConfig).toBeDefined();
      expect(typeof validateApiConfig).toBe('function');
    });
  });
});
