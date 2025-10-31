import React, { useEffect } from 'react';
import { Alert } from 'react-native';

import { RootNavigator } from './src/navigation';
import { AppProvider } from './src/context/AppContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { ToastProvider } from './src/context/ToastContext';
import { ToastContainer } from './src/components/ToastContainer';
import { DatabaseManager } from './src/database/DatabaseManager';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ErrorService } from './src/services/ErrorService';

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseManager.getInstance().initialize();
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      
      // Log initialization error
      const errorService = ErrorService.getInstance();
      await errorService.logError(
        error as Error,
        { component: 'App', action: 'initialize' },
        'critical',
        false
      );
      
      Alert.alert(
        'エラー',
        'アプリの初期化に失敗しました。アプリを再起動してください。'
      );
    }
  };

  const handleGlobalError = async (error: Error, errorInfo: any) => {
    const errorService = ErrorService.getInstance();
    await errorService.logUnhandledError(error, errorInfo.componentStack);
  };

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ToastProvider>
        <SettingsProvider>
          <AppProvider>
            <RootNavigator />
            <ToastContainer />
          </AppProvider>
        </SettingsProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

