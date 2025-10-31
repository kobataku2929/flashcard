// General app state hooks

import { useEffect } from 'react';
import { useAppContext } from '@/context';

export function useAppState() {
  const { state, actions } = useAppContext();

  return {
    // State
    loading: state.loading,
    error: state.error,
    isInitialized: state.isInitialized,

    // Actions
    clearError: actions.clearError,
    initializeApp: actions.initializeApp,
  };
}

// Hook to initialize app on mount
export function useAppInitialization() {
  const { state, actions } = useAppContext();

  useEffect(() => {
    if (!state.isInitialized) {
      actions.initializeApp();
    }
  }, [state.isInitialized, actions]);

  return {
    isInitialized: state.isInitialized,
    loading: state.loading,
    error: state.error,
  };
}

// Hook for error handling
export function useErrorHandler() {
  const { state, actions } = useAppContext();

  const handleError = (error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    const message = error?.message || 'An unexpected error occurred';
    // You could add more sophisticated error handling here
    // such as logging to external services
  };

  return {
    error: state.error,
    clearError: actions.clearError,
    handleError,
  };
}

// Hook for loading states
export function useLoadingState() {
  const { state } = useAppContext();

  return {
    loading: state.loading,
    isLoading: (operation?: string) => {
      // You could extend this to track specific operations
      return state.loading;
    },
  };
}