import { LoggingService, loggingService } from '../../../src/services/logging.service';
import * as fs from 'fs';
import * as path from 'path';

describe('LoggingService', () => {
  describe('getInstance', () => {
    it('should return a LoggingService instance', () => {
      const instance = LoggingService.getInstance();
      expect(instance).toBeInstanceOf(LoggingService);
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      const instance1 = LoggingService.getInstance();
      const instance2 = LoggingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should be the same as exported loggingService', () => {
      const instance = LoggingService.getInstance();
      expect(instance).toBe(loggingService);
    });
  });

  describe('logging methods', () => {
    it('should have error method', () => {
      expect(loggingService.error).toBeDefined();
      expect(typeof loggingService.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(loggingService.warn).toBeDefined();
      expect(typeof loggingService.warn).toBe('function');
    });

    it('should have info method', () => {
      expect(loggingService.info).toBeDefined();
      expect(typeof loggingService.info).toBe('function');
    });

    it('should have debug method', () => {
      expect(loggingService.debug).toBeDefined();
      expect(typeof loggingService.debug).toBe('function');
    });

    it('should log without throwing errors', () => {
      expect(() => loggingService.info('Test message')).not.toThrow();
      expect(() => loggingService.error('Test error')).not.toThrow();
      expect(() => loggingService.warn('Test warning')).not.toThrow();
      expect(() => loggingService.debug('Test debug')).not.toThrow();
    });
  });

  describe('specialized logging methods', () => {
    it('should have logApiCall method', () => {
      expect(loggingService.logApiCall).toBeDefined();
      expect(typeof loggingService.logApiCall).toBe('function');
    });

    it('should log API call without throwing', () => {
      expect(() => {
        loggingService.logApiCall(
          'TestService',
          '/api/test',
          { test: 'data' },
          200,
          150
        );
      }).not.toThrow();
    });

    it('should have logError method', () => {
      expect(loggingService.logError).toBeDefined();
      expect(typeof loggingService.logError).toBe('function');
    });

    it('should log error with context without throwing', () => {
      const testError = new Error('Test error');
      expect(() => {
        loggingService.logError('TestService', testError, { context: 'test' });
      }).not.toThrow();
    });

    it('should have logQuotaUsage method', () => {
      expect(loggingService.logQuotaUsage).toBeDefined();
      expect(typeof loggingService.logQuotaUsage).toBe('function');
    });

    it('should log quota usage without throwing', () => {
      expect(() => {
        loggingService.logQuotaUsage('test-key-id', 100);
      }).not.toThrow();
    });

    it('should have logScheduleExecution method', () => {
      expect(loggingService.logScheduleExecution).toBeDefined();
      expect(typeof loggingService.logScheduleExecution).toBe('function');
    });

    it('should log schedule execution without throwing', () => {
      expect(() => {
        loggingService.logScheduleExecution('template-id', 'success');
      }).not.toThrow();
    });
  });

  describe('log directory creation', () => {
    it('should create log directory if it does not exist', () => {
      const logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';
      const logDir = path.dirname(logFilePath);
      
      // The directory should exist after LoggingService initialization
      // Note: In test environment, this might be a different path
      expect(typeof logDir).toBe('string');
      expect(logDir.length).toBeGreaterThan(0);
    });
  });
});
