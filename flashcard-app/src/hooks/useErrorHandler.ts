// Custom hook for error handling

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ErrorService } from '../services/ErrorService';

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: {
    component?: string;
    action?: string;
  };
}

export function useErrorHandler() {
  const errorService = ErrorService.getInstance();

  const handleError = useCallback(
    async (error: Error, options: ErrorHandlerOptions = {}) => {
      const {
        showAlert = true,
        alertTitle = 'エラー',
        alertMessage,
        severity = 'medium',
        context,
      } = options;

      // Log the error
      await errorService.logHandledError(
        error,
        context?.component || 'Unknown',
        context?.action || 'Unknown',
        severity
      );

      // Show alert to user if requested
      if (showAlert) {
        const message = alertMessage || getDefaultErrorMessage(error);
        Alert.alert(alertTitle, message, [{ text: 'OK' }]);
      }

      // Log to console in development
      if (__DEV__) {
        console.error('Error handled:', error);
        console.error('Context:', context);
      }
    },
    [errorService]
  );

  const handleAsyncError = useCallback(
    (asyncFn: () => Promise<void>, options: ErrorHandlerOptions = {}) => {
      return async () => {
        try {
          await asyncFn();
        } catch (error) {
          await handleError(error as Error, options);
        }
      };
    },
    [handleError]
  );

  const wrapAsyncFunction = useCallback(
    <T extends any[], R>(
      fn: (...args: T) => Promise<R>,
      options: ErrorHandlerOptions = {}
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await fn(...args);
        } catch (error) {
          await handleError(error as Error, options);
          return undefined;
        }
      };
    },
    [handleError]
  );

  const handleDatabaseError = useCallback(
    async (error: Error, operation: string) => {
      await handleError(error, {
        showAlert: true,
        alertTitle: 'データベースエラー',
        alertMessage: 'データの操作中にエラーが発生しました。もう一度お試しください。',
        severity: 'high',
        context: {
          component: 'Database',
          action: operation,
        },
      });
    },
    [handleError]
  );

  const handleNetworkError = useCallback(
    async (error: Error, operation: string) => {
      await handleError(error, {
        showAlert: true,
        alertTitle: 'ネットワークエラー',
        alertMessage: 'ネットワーク接続を確認してもう一度お試しください。',
        severity: 'medium',
        context: {
          component: 'Network',
          action: operation,
        },
      });
    },
    [handleError]
  );

  const handleValidationError = useCallback(
    async (error: Error, field: string) => {
      await handleError(error, {
        showAlert: true,
        alertTitle: '入力エラー',
        alertMessage: `${field}の入力内容を確認してください。`,
        severity: 'low',
        context: {
          component: 'Validation',
          action: `validate_${field}`,
        },
      });
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    wrapAsyncFunction,
    handleDatabaseError,
    handleNetworkError,
    handleValidationError,
  };
}

function getDefaultErrorMessage(error: Error): string {
  // Provide user-friendly error messages based on error type
  if (error.message.includes('database')) {
    return 'データの操作中にエラーが発生しました。もう一度お試しください。';
  }
  
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'ネットワーク接続を確認してもう一度お試しください。';
  }
  
  if (error.message.includes('validation')) {
    return '入力内容を確認してもう一度お試しください。';
  }
  
  if (error.message.includes('permission')) {
    return '必要な権限がありません。設定を確認してください。';
  }
  
  // Generic error message
  return '予期しないエラーが発生しました。もう一度お試しください。';
}