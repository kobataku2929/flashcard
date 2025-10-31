// Context types and interfaces

import { Flashcard, Folder, CreateFlashcard, CreateFolder, UpdateFlashcard, UpdateFolder } from '@/types';

export interface AppState {
  flashcards: Flashcard[];
  folders: Folder[];
  currentFolder?: Folder;
  loading: boolean;
  error?: string;
  isInitialized: boolean;
}

export interface AppContextType {
  state: AppState;
  actions: {
    // Flashcard actions
    loadFlashcards: () => Promise<void>;
    loadFlashcard: (id: number) => Promise<Flashcard>;
    createFlashcard: (flashcard: CreateFlashcard) => Promise<void>;
    updateFlashcard: (id: number, flashcard: UpdateFlashcard) => Promise<void>;
    deleteFlashcard: (id: number) => Promise<void>;
    searchFlashcards: (query: string) => Promise<Flashcard[]>;
    
    // Folder actions
    loadFolders: () => Promise<void>;
    createFolder: (folder: CreateFolder) => Promise<void>;
    updateFolder: (id: number, folder: UpdateFolder) => Promise<void>;
    deleteFolder: (id: number) => Promise<void>;
    
    // Navigation actions
    navigateToFolder: (folder?: Folder) => void;
    moveItem: (itemId: number, itemType: 'folder' | 'flashcard', targetFolderId?: number) => Promise<void>;
    
    // Import actions
    importFromTSV: (tsvContent: string, targetFolderId?: number) => Promise<void>;
    
    // Utility actions
    clearError: () => void;
    initializeApp: () => Promise<void>;
  };
}

// Action types for reducer
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_FLASHCARDS'; payload: Flashcard[] }
  | { type: 'ADD_FLASHCARD'; payload: Flashcard }
  | { type: 'UPDATE_FLASHCARD'; payload: { id: number; flashcard: Flashcard } }
  | { type: 'REMOVE_FLASHCARD'; payload: number }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: { id: number; folder: Folder } }
  | { type: 'REMOVE_FOLDER'; payload: number }
  | { type: 'SET_CURRENT_FOLDER'; payload: Folder | undefined }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET_ALL_DATA' };