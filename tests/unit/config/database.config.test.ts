import { databaseConfig } from '../../../src/config/database.config';

describe('Database Configuration', () => {
  describe('databaseConfig', () => {
    it('should load database configuration from environment', () => {
      expect(databaseConfig).toBeDefined();
      expect(databaseConfig.url).toBeDefined();
      expect(databaseConfig.poolSize).toBeGreaterThan(0);
    });

    it('should have valid pool size', () => {
      expect(databaseConfig.poolSize).toBeGreaterThanOrEqual(1);
      expect(databaseConfig.poolSize).toBeLessThanOrEqual(100);
    });

    it('should parse pool size as integer', () => {
      expect(Number.isInteger(databaseConfig.poolSize)).toBe(true);
    });

    it('should have database URL in correct format', () => {
      expect(databaseConfig.url).toContain('mysql://');
    });
  });
});
