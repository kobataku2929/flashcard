// Database connection and initialization

import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, DATABASE_VERSION } from '@/constants';
import { ALL_SCHEMA_STATEMENTS } from './schema';
import { AppError, ERROR_CODES } from '@/types/errors';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database connection and create tables
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    if (database) {
      return database;
    }

    // Open database connection
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Enable foreign key constraints
    await database.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables, indexes, and triggers
    for (const statement of ALL_SCHEMA_STATEMENTS) {
      await database.execAsync(statement);
    }

    console.log('Database initialized successfully');
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new AppError(
      'Failed to initialize database',
      ERROR_CODES.DATABASE_ERROR,
      'high'
    );
  }
}

/**
 * Get the current database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    return await initializeDatabase();
  }
  return database;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (database) {
      await database.closeAsync();
      database = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Failed to close database:', error);
    throw new AppError(
      'Failed to close database',
      ERROR_CODES.DATABASE_ERROR,
      'medium'
    );
  }
}

/**
 * Execute a database migration (for future use)
 */
export async function runMigration(migrationSql: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execAsync(migrationSql);
    console.log('Migration executed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw new AppError(
      'Database migration failed',
      ERROR_CODES.DATABASE_ERROR,
      'high'
    );
  }
}

/**
 * Reset the database (for development/testing purposes)
 */
export async function resetDatabase(): Promise<void> {
  try {
    if (database) {
      await database.closeAsync();
      database = null;
    }
    
    // Delete the database file and reinitialize
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
    await initializeDatabase();
    
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw new AppError(
      'Failed to reset database',
      ERROR_CODES.DATABASE_ERROR,
      'high'
    );
  }
}