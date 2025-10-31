// Core data types for the flashcard application

export interface Flashcard {
  id: number;
  word: string;
  wordPronunciation?: string | null;
  translation: string;
  translationPronunciation?: string | null;
  memo?: string | null;
  folderId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: number;
  name: string;
  parentId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  children?: Folder[];
  flashcards?: Flashcard[];
  itemCount?: number;
}

export interface TSVRow {
  word: string;
  wordPronunciation: string;
  translation: string;
  translationPronunciation: string;
  memo: string;
}

// Database types for creation (without auto-generated fields)
export type CreateFlashcard = Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateFolder = Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'flashcards'>;

// Update types (partial updates)
export type UpdateFlashcard = Partial<Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>>;
export type UpdateFolder = Partial<Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'flashcards'>>;

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  autoHide?: boolean;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Re-export search types
export * from './search';