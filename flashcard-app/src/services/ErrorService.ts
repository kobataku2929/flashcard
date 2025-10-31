// Error logging and reporting service

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorLog {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    appVersion?: string;
    platform?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface ErrorReport {
  logs: ErrorLog[];
  deviceInfo: {
    platform: string;
    appVersion: string;
    timestamp: number;
  };
}

class ErrorService {
  private static instance: ErrorService;
  private readonly STORAGE_KEY = '@flashcard_app_error_logs';
  private readonly MAX_LOGS = 100; // Keep only the latest 100 error logs

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Log an error with context information
   */
  async logError(
    error: Error,
    context?: ErrorLog['context'],
    severity: ErrorLog['severity'] = 'medium',
    handled: boolean = true
  ): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: this.generateId(),
        timestamp: Date.now(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context: {
          appVersion: '1.0.0', // TODO: Get from app config
          platform: 'mobile', // TODO: Get actual platform
          ...context,
        },
        severity,
        handled,
      };

      await this.saveErrorLog(errorLog);

      // Log to console in development
      if (__DEV__) {
        console.error('ErrorService logged error:', errorLog);
      }

      // Send to crash reporting service in production
      if (!__DEV__ && severity === 'critical') {
        await this.reportError(errorLog);
      }
    } catch (logError) {
      // Fallback: at least log to console if storage fails
      console.error('Failed to log error:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log a handled error with additional context
   */
  async logHandledError(
    error: Error,
    component: string,
    action: string,
    severity: ErrorLog['severity'] = 'low'
  ): Promise<void> {
    await this.logError(
      error,
      { component, action },
      severity,
      true
    );
  }

  /**
   * Log an unhandled error (from Error Boundary)
   */
  async logUnhandledError(
    error: Error,
    componentStack?: string
  ): Promise<void> {
    await this.logError(
      error,
      { component: componentStack },
      'critical',
      false
    );
  }

  /**
   * Get all stored error logs
   */
  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  /**
   * Clear all error logs
   */
  async clearErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(): Promise<{
    total: number;
    byseverity: Record<ErrorLog['severity'], number>;
    recent: number; // Last 24 hours
  }> {
    const logs = await this.getErrorLogs();
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const stats = {
      total: logs.length,
      byseverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<ErrorLog['severity'], number>,
      recent: 0,
    };

    logs.forEach(log => {
      stats.byseverity[log.severity]++;
      if (log.timestamp > dayAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Generate error report for debugging
   */
  async generateErrorReport(): Promise<ErrorReport> {
    const logs = await this.getErrorLogs();
    
    return {
      logs,
      deviceInfo: {
        platform: 'mobile', // TODO: Get actual platform info
        appVersion: '1.0.0', // TODO: Get from app config
        timestamp: Date.now(),
      },
    };
  }

  private async saveErrorLog(errorLog: ErrorLog): Promise<void> {
    const logs = await this.getErrorLogs();
    logs.unshift(errorLog); // Add to beginning

    // Keep only the latest logs
    if (logs.length > this.MAX_LOGS) {
      logs.splice(this.MAX_LOGS);
    }

    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
  }

  private async reportError(errorLog: ErrorLog): Promise<void> {
    // TODO: Implement crash reporting service integration
    // Example: Send to Sentry, Crashlytics, or custom endpoint
    
    if (__DEV__) {
      console.log('Would report error to crash service:', errorLog);
    }
    
    // Example implementation:
    // try {
    //   await fetch('https://your-error-reporting-endpoint.com/errors', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(errorLog),
    //   });
    // } catch (reportError) {
    //   console.error('Failed to report error:', reportError);
    // }
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { ErrorService };