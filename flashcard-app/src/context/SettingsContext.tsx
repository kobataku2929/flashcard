// Settings context for managing app settings

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  darkMode: boolean;
  animations: boolean;
  studyMode: 'flashcard' | 'quiz' | 'mixed';
  reviewInterval: number; // in days
  autoPlay: boolean;
  fontSize: 'small' | 'medium' | 'large';
  language: 'ja' | 'en';
  notifications: boolean;
  soundEnabled: boolean;
}

interface SettingsState {
  settings: Settings;
  loading: boolean;
}

type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_SETTINGS'; payload: Settings }
  | { type: 'UPDATE_SETTING'; payload: { key: keyof Settings; value: any } }
  | { type: 'RESET_SETTINGS' };

interface SettingsContextType {
  state: SettingsState;
  updateSetting: (key: keyof Settings, value: any) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  darkMode: false,
  animations: true,
  studyMode: 'flashcard',
  reviewInterval: 1,
  autoPlay: false,
  fontSize: 'medium',
  language: 'ja',
  notifications: true,
  soundEnabled: true,
};

const initialState: SettingsState = {
  settings: defaultSettings,
  loading: true,
};

const SETTINGS_STORAGE_KEY = '@flashcard_app_settings';

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'LOAD_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        loading: false,
      };
    
    case 'UPDATE_SETTING':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value,
        },
      };
    
    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultSettings,
      };
    
    default:
      return state;
  }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        // Merge with defaults to handle new settings
        const mergedSettings = { ...defaultSettings, ...settings };
        dispatch({ type: 'LOAD_SETTINGS', payload: mergedSettings });
      } else {
        dispatch({ type: 'LOAD_SETTINGS', payload: defaultSettings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      dispatch({ type: 'LOAD_SETTINGS', payload: defaultSettings });
    }
  };

  const saveSettings = async (settings: Settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key, value } });
    
    // Save to storage
    const newSettings = { ...state.settings, [key]: value };
    await saveSettings(newSettings);
  };

  const resetSettings = async () => {
    dispatch({ type: 'RESET_SETTINGS' });
    await saveSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        state,
        updateSetting,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export type { Settings, SettingsState };