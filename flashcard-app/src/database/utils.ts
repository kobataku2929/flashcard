// Database utility functions

import { AppError, ERROR_CODES } from '@/types/errors';

/**
 * Convert database row timestamp strings to Date objects
 */
export function parseTimestamp(timestamp: string | null): Date {
  if (!timestamp) {
    return new Date();
  }
  return new Date(timestamp);
}

/**
 * Convert Date object to database timestamp string
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Handle database errors and convert them to AppError
 */
export function handleDatabaseError(error: any, operation: string): never {
  console.error(`Database error during ${operation}:`, error);
  
  let message = `Database operation failed: ${operation}`;
  let code = ERROR_CODES.DATABASE_ERROR;
  
  if (error?.message) {
    message = `${message} - ${error.message}`;
  }
  
  // Check for specific SQLite error types
  if (error?.message?.includes('FOREIGN KEY constraint failed')) {
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Invalid reference to related data';
  } else if (error?.message?.includes('UNIQUE constraint failed')) {
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Duplicate data not allowed';
  } else if (error?.message?.includes('NOT NULL constraint failed')) {
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Required field is missing';
  }
  
  throw new AppError(message, code, 'high');
}

/**
 * Validate that required fields are present
 */
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );
  
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      ERROR_CODES.VALIDATION_ERROR,
      'medium'
    );
  }
}

/**
 * Sanitize string input to prevent SQL injection (additional safety)
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input.toString().trim();
}

/**
 * Build WHERE clause for dynamic queries
 */
export function buildWhereClause(
  conditions: Record<string, any>
): { whereClause: string; values: any[] } {
  const keys = Object.keys(conditions).filter(key => 
    conditions[key] !== undefined && conditions[key] !== null
  );
  
  if (keys.length === 0) {
    return { whereClause: '', values: [] };
  }
  
  const whereClause = 'WHERE ' + keys.map(key => `${key} = ?`).join(' AND ');
  const values = keys.map(key => conditions[key]);
  
  return { whereClause, values };
}