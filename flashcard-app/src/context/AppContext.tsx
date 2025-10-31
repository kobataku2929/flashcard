// App Context Provider

import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import { AppContextType, AppState } from './types';
import { appReducer, initialState } from './reducer';
import { useAppActions } from './actions';
import { usePerformanceMonitor } from '../utils/performance';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { measure } = usePerformanceMonitor('AppProvider');
  const [state, dispatch] = useReducer(appReducer, initialState);
  const actions = useAppActions(dispatch);

  // Initialize app when provider mounts
  React.useEffect(() => {
    if (!state.isInitialized) {
      measure('initializeApp', () => {
        actions.initializeApp();
      });
    }
  }, [state.isInitialized, actions, measure]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: AppContextType = useMemo(() => ({
    state,
    actions,
  }), [state, actions]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}