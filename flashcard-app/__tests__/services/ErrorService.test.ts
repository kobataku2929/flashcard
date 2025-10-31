// ErrorService tests

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorService, ErrorLog } from '../../src/services/ErrorService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ErrorService', () => {
  let errorService: ErrorService;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    errorService = ErrorService.getInstance();
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = ErrorService.getInstance();
      const instance2 = ErrorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logError', () => {
    it('logs error with default parameters', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const error = new Error('Test error');
      await errorService.logError(error);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@flashcard_app_error_logs',
        expect.stringContaining('Test error')
      );
    });

    it('logs error with custom context and severity', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const error = new Error('Test error');
      const context = { component: 'TestComponent', action: 'testAction' };
      
      await errorService.logError(error, context, 'high', false);

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const logs = JSON.parse(savedData) as ErrorLog[];
      
      expect(logs[0]).toMatchObject({
        error: {
          name: 'Error',
          message: 'Test error',
        },
        context: expect.objectContaining(context),
        severity: 'high',
        handled: false,
      });
    });

    it('maintains maximum log limit', async () => {
      // Create 101 existing logs
      const existingLogs = Array.from({ length: 101 }, (_, i) => ({
        id: `error_${i}`,
        timestamp: Date.now() - i,
        error: { name: 'Error', message: `Error ${i}` },
        severity: 'low' as const,
        handled: true,
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLogs));
      mockAsyncStorage.setItem.mockResolvedValue();

      const error = new Error('New error');
      await errorService.logError(error);

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const logs = JSON.parse(savedData) as ErrorLog[];
      
      // Should keep only 100 logs (new one + 99 existing)
      expect(logs).toHaveLength(100);
      expect(logs[0].error.message).toBe('New error');
    });

    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const error = new Error('Test error');
      
      // Should not throw
      await expect(errorService.logError(error)).resolves.toBeUndefined();
    });
  });

  describe('logHandledError', () => {
    it('logs handled error with component and action context', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const error = new Error('Handled error');
      await errorService.logHandledError(error, 'TestComponent', 'testAction', 'medium');

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const logs = JSON.parse(savedData) as ErrorLog[];
      
      expect(logs[0]).toMatchObject({
        error: {
          message: 'Handled error',
        },
        context: {
          component: 'TestComponent',
          action: 'testAction',
        },
        severity: 'medium',
        handled: true,
      });
    });
  });

  describe('logUnhandledError', () => {
    it('logs unhandled error with critical severity', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const error = new Error('Unhandled error');
      const componentStack = 'Component stack trace';
      
      await errorService.logUnhandledError(error, componentStack);

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const logs = JSON.parse(savedData) as ErrorLog[];
      
      expect(logs[0]).toMatchObject({
        error: {
          message: 'Unhandled error',
        },
        context: {
          component: componentStack,
        },
        severity: 'critical',
        handled: false,
      });
    });
  });

  describe('getErrorLogs', () => {
    it('returns empty array when no logs exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const logs = await errorService.getErrorLogs();
      expect(logs).toEqual([]);
    });

    it('returns parsed logs from storage', async () => {
      const storedLogs = [
        {
          id: 'error_1',
          timestamp: Date.now(),
          error: { name: 'Error', message: 'Test error' },
          severity: 'low',
          handled: true,
        },
      ];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLogs));
      
      const logs = await errorService.getErrorLogs();
      expect(logs).toEqual(storedLogs);
    });

    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const logs = await errorService.getErrorLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('clearErrorLogs', () => {
    it('removes error logs from storage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();
      
      await errorService.clearErrorLogs();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@flashcard_app_error_logs');
    });

    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      await expect(errorService.clearErrorLogs()).resolves.toBeUndefined();
    });
  });

  describe('getErrorStats', () => {
    it('calculates correct statistics', async () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      
      const logs: ErrorLog[] = [
        {
          id: 'error_1',
          timestamp: now - 1000, // Recent
          error: { name: 'Error', message: 'Error 1' },
          severity: 'low',
          handled: true,
        },
        {
          id: 'error_2',
          timestamp: dayAgo - 1000, // Old
          error: { name: 'Error', message: 'Error 2' },
          severity: 'high',
          handled: true,
        },
        {
          id: 'error_3',
          timestamp: now - 2000, // Recent
          error: { name: 'Error', message: 'Error 3' },
          severity: 'critical',
          handled: false,
        },
      ];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(logs));
      
      const stats = await errorService.getErrorStats();
      
      expect(stats).toEqual({
        total: 3,
        byseverity: {
          low: 1,
          medium: 0,
          high: 1,
          critical: 1,
        },
        recent: 2, // 2 errors in last 24 hours
      });
    });
  });

  describe('generateErrorReport', () => {
    it('generates complete error report', async () => {
      const logs: ErrorLog[] = [
        {
          id: 'error_1',
          timestamp: Date.now(),
          error: { name: 'Error', message: 'Test error' },
          severity: 'medium',
          handled: true,
        },
      ];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(logs));
      
      const report = await errorService.generateErrorReport();
      
      expect(report).toMatchObject({
        logs,
        deviceInfo: {
          platform: 'mobile',
          appVersion: '1.0.0',
          timestamp: expect.any(Number),
        },
      });
    });
  });
});