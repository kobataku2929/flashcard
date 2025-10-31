// useErrorHandler hook tests

import { renderHook, act } from '@testing-library/react-hooks';
import { Alert } from 'react-native';
import { useErrorHandler } from '../../src/hooks/useErrorHandler';
import { ErrorService } from '../../src/services/ErrorService';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock ErrorService
const mockErrorService = {
  logHandledError: jest.fn(),
};

jest.mock('../../src/services/ErrorService', () => ({
  ErrorService: {
    getInstance: () => mockErrorService,
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleError', () => {
    it('logs error and shows alert with default options', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        error,
        'Unknown',
        'Unknown',
        'medium'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'エラー',
        '予期しないエラーが発生しました。もう一度お試しください。',
        [{ text: 'OK' }]
      );
    });

    it('uses custom options when provided', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Database connection failed');

      await act(async () => {
        await result.current.handleError(error, {
          showAlert: true,
          alertTitle: 'カスタムタイトル',
          alertMessage: 'カスタムメッセージ',
          severity: 'high',
          context: {
            component: 'TestComponent',
            action: 'testAction',
          },
        });
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        error,
        'TestComponent',
        'testAction',
        'high'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'カスタムタイトル',
        'カスタムメッセージ',
        [{ text: 'OK' }]
      );
    });

    it('does not show alert when showAlert is false', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      await act(async () => {
        await result.current.handleError(error, { showAlert: false });
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('provides appropriate error messages for different error types', async () => {
      const { result } = renderHook(() => useErrorHandler());

      // Database error
      await act(async () => {
        await result.current.handleError(new Error('database connection failed'));
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'エラー',
        'データの操作中にエラーが発生しました。もう一度お試しください。',
        [{ text: 'OK' }]
      );

      // Network error
      await act(async () => {
        await result.current.handleError(new Error('network timeout'));
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'エラー',
        'ネットワーク接続を確認してもう一度お試しください。',
        [{ text: 'OK' }]
      );

      // Validation error
      await act(async () => {
        await result.current.handleError(new Error('validation failed'));
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'エラー',
        '入力内容を確認してもう一度お試しください。',
        [{ text: 'OK' }]
      );
    });
  });

  describe('handleAsyncError', () => {
    it('wraps async function and handles errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));

      const wrappedFn = result.current.handleAsyncError(asyncFn);

      await act(async () => {
        await wrappedFn();
      });

      expect(asyncFn).toHaveBeenCalled();
      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        expect.any(Error),
        'Unknown',
        'Unknown',
        'medium'
      );
    });

    it('does not handle errors when async function succeeds', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockResolvedValue('success');

      const wrappedFn = result.current.handleAsyncError(asyncFn);

      await act(async () => {
        await wrappedFn();
      });

      expect(asyncFn).toHaveBeenCalled();
      expect(mockErrorService.logHandledError).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('wrapAsyncFunction', () => {
    it('wraps function and returns result on success', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockResolvedValue('success result');

      const wrappedFn = result.current.wrapAsyncFunction(asyncFn);

      let returnValue: any;
      await act(async () => {
        returnValue = await wrappedFn('arg1', 'arg2');
      });

      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(returnValue).toBe('success result');
      expect(mockErrorService.logHandledError).not.toHaveBeenCalled();
    });

    it('handles errors and returns undefined', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockRejectedValue(new Error('Function error'));

      const wrappedFn = result.current.wrapAsyncFunction(asyncFn, {
        severity: 'high',
        context: { component: 'TestComponent' },
      });

      let returnValue: any;
      await act(async () => {
        returnValue = await wrappedFn('arg1');
      });

      expect(asyncFn).toHaveBeenCalledWith('arg1');
      expect(returnValue).toBeUndefined();
      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        expect.any(Error),
        'TestComponent',
        'Unknown',
        'high'
      );
    });
  });

  describe('specialized error handlers', () => {
    it('handleDatabaseError uses appropriate settings', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Database error');

      await act(async () => {
        await result.current.handleDatabaseError(error, 'create_user');
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        error,
        'Database',
        'create_user',
        'high'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'データベースエラー',
        'データの操作中にエラーが発生しました。もう一度お試しください。',
        [{ text: 'OK' }]
      );
    });

    it('handleNetworkError uses appropriate settings', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Network error');

      await act(async () => {
        await result.current.handleNetworkError(error, 'fetch_data');
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        error,
        'Network',
        'fetch_data',
        'medium'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'ネットワークエラー',
        'ネットワーク接続を確認してもう一度お試しください。',
        [{ text: 'OK' }]
      );
    });

    it('handleValidationError uses appropriate settings', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Validation error');

      await act(async () => {
        await result.current.handleValidationError(error, 'email');
      });

      expect(mockErrorService.logHandledError).toHaveBeenCalledWith(
        error,
        'Validation',
        'validate_email',
        'low'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        '入力エラー',
        'emailの入力内容を確認してください。',
        [{ text: 'OK' }]
      );
    });
  });
});