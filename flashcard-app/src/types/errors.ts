// Error handling types and classes

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' = 'medium'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error code constants
export const ERROR_CODES = {
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  TSV_PARSE_ERROR: 'TSV_PARSE_ERROR',
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  FLASHCARD_NOT_FOUND: 'FLASHCARD_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];