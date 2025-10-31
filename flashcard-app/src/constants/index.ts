// Application constants

export const DATABASE_NAME = 'flashcard.db';
export const DATABASE_VERSION = 1;

// Table names
export const TABLES = {
  FOLDERS: 'folders',
  FLASHCARDS: 'flashcards',
} as const;

// UI constants
export const COLORS = {
  PRIMARY: '#007AFF',
  SECONDARY: '#5856D6',
  SUCCESS: '#34C759',
  WARNING: '#FF9500',
  ERROR: '#FF3B30',
  BACKGROUND: '#F2F2F7',
  CARD_BACKGROUND: '#FFFFFF',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#8E8E93',
  BORDER: '#C6C6C8',
} as const;

export const SIZES = {
  CARD_BORDER_RADIUS: 12,
  BUTTON_HEIGHT: 44,
  SPACING_XS: 4,
  SPACING_SM: 8,
  SPACING_MD: 16,
  SPACING_LG: 24,
  SPACING_XL: 32,
} as const;

// Animation constants
export const ANIMATION = {
  CARD_FLIP_DURATION: 300,
  MODAL_ANIMATION_DURATION: 250,
  TOAST_DURATION: 3000,
} as const;