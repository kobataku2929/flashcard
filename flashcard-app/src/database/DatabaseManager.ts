// Database Manager singleton class

// Conditional import to avoid web bundling issues
let SQLite: any;
try {
  SQLite = require('expo-sqlite');
} catch (error) {
  // Ignore import error on web
  console.warn('expo-sqlite not available, using web adapter');
}

import { ALL_SCHEMA_STATEMENTS } from './schema';
import { AppError, ERROR_CODES } from '../types/errors';
import { createDatabase } from './WebSQLiteAdapter';

// Database constants
const DATABASE_NAME = 'flashcard.db';
const DATABASE_VERSION = 1;

export interface DatabaseHealth {
  isHealthy: boolean;
  version: string;
  errors: string[];
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private database: any | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize(): Promise<void> {
    if (!this.database) {
      await this.initializeDatabase();
    }
    
    // Run migrations after basic initialization
    try {
      console.log('Running database migrations...');
      const { MigrationManager } = await import('./migrations');
      const migrationManager = MigrationManager.getInstance();
      await migrationManager.runMigrations();
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
   * Get the current database instance
   */
  async getDatabase(): Promise<any> {
    if (!this.database) {
      await this.initializeDatabase();
    }
    return this.database!;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      console.log('Initializing database...');
      this.database = await createDatabase(DATABASE_NAME);
      
      // Enable foreign key constraints
      await this.database.execAsync('PRAGMA foreign_keys = ON;');
      
      // Create tables, indexes, and triggers
      console.log(`Executing ${ALL_SCHEMA_STATEMENTS.length} schema statements...`);
      for (let i = 0; i < ALL_SCHEMA_STATEMENTS.length; i++) {
        const statement = ALL_SCHEMA_STATEMENTS[i];
        try {
          await this.database.execAsync(statement);
          console.log(`Schema statement ${i + 1}/${ALL_SCHEMA_STATEMENTS.length} executed successfully`);
        } catch (error) {
          console.error(`Failed to execute schema statement ${i + 1}:`, statement);
          console.error('Error:', error);
          throw error;
        }
      }
      
      // Verify tables exist
      const tables = await this.database.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      console.log('Database tables:', tables.map((t: any) => t.name));
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Failed to initialize database',
        error
      );
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    try {
      if (this.database) {
        await this.database.closeAsync();
        this.database = null;
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
   * Reset the database (delete all data and recreate tables)
   */
  async reset(): Promise<void> {
    try {
      if (this.database) {
        await this.database.closeAsync();
        this.database = null;
      }
      
      // Delete the database file and reinitialize
      if (typeof window === 'undefined' && SQLite) {
        // Native platform only
        await SQLite.deleteDatabaseAsync(DATABASE_NAME);
      }
      await this.initializeDatabase();
      
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

  /**
   * Export database as SQL dump
   */
  async exportDatabase(): Promise<string> {
    try {
      const db = await this.getDatabase();
      
      // Get all table names
      const tables = await db.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `) as { name: string }[];

      let sqlDump = '-- Database Export\n';
      sqlDump += `-- Generated: ${new Date().toISOString()}\n\n`;

      // Export each table
      for (const table of tables) {
        const tableName = table.name;
        
        // Get table schema
        const schema = await db.getAllAsync(`
          SELECT sql FROM sqlite_master 
          WHERE type='table' AND name='${tableName}'
        `) as { sql: string }[];
        
        if (schema.length > 0) {
          sqlDump += `-- Table: ${tableName}\n`;
          sqlDump += `${schema[0].sql};\n\n`;
        }

        // Get table data
        const rows = await db.getAllAsync(`SELECT * FROM ${tableName}`);
        
        if (rows.length > 0) {
          sqlDump += `-- Data for table: ${tableName}\n`;
          
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const value = (row as any)[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              return value;
            });
            
            sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          sqlDump += '\n';
        }
      }

      return sqlDump;
    } catch (error) {
      console.error('Failed to export database:', error);
      throw new AppError(
        'Failed to export database',
        ERROR_CODES.DATABASE_ERROR,
        'medium'
      );
    }
  }

  /**
   * Check database health and integrity
   */
  async checkHealth(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      isHealthy: true,
      version: DATABASE_VERSION.toString(),
      errors: [],
    };

    try {
      const db = await this.getDatabase();

      // Check if database is accessible
      await db.getAllAsync('SELECT 1');

      // Check foreign key constraints
      const fkCheck = await db.getAllAsync('PRAGMA foreign_key_check');
      if (fkCheck.length > 0) {
        health.isHealthy = false;
        health.errors.push('Foreign key constraint violations detected');
      }

      // Check database integrity
      const integrityCheck = await db.getAllAsync('PRAGMA integrity_check');
      const integrityResult = integrityCheck[0] as { integrity_check: string };
      if (integrityResult.integrity_check !== 'ok') {
        health.isHealthy = false;
        health.errors.push(`Database integrity check failed: ${integrityResult.integrity_check}`);
      }

      // Check if required tables exist
      const requiredTables = ['flashcards', 'folders'];
      const existingTables = await db.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `) as { name: string }[];
      
      const existingTableNames = existingTables.map(t => t.name);
      for (const requiredTable of requiredTables) {
        if (!existingTableNames.includes(requiredTable)) {
          health.isHealthy = false;
          health.errors.push(`Required table '${requiredTable}' is missing`);
        }
      }

    } catch (error) {
      health.isHealthy = false;
      health.errors.push(`Database access error: ${error}`);
    }

    return health;
  }

  /**
   * Execute a database migration (for future use)
   */
  async runMigration(migrationSql: string): Promise<void> {
    try {
      const db = await this.getDatabase();
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
   * Get database statistics
   */
  async getStatistics(): Promise<{
    totalFlashcards: number;
    totalFolders: number;
    databaseSize: number;
  }> {
    try {
      const db = await this.getDatabase();

      const flashcardCount = await db.getAllAsync('SELECT COUNT(*) as count FROM flashcards');
      const folderCount = await db.getAllAsync('SELECT COUNT(*) as count FROM folders');
      
      // Get database file size (approximate)
      const pageCount = await db.getAllAsync('PRAGMA page_count');
      const pageSize = await db.getAllAsync('PRAGMA page_size');
      
      const totalFlashcards = (flashcardCount[0] as { count: number }).count;
      const totalFolders = (folderCount[0] as { count: number }).count;
      const databaseSize = (pageCount[0] as { page_count: number }).page_count * 
                          (pageSize[0] as { page_size: number }).page_size;

      return {
        totalFlashcards,
        totalFolders,
        databaseSize,
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      throw new AppError(
        'Failed to get database statistics',
        ERROR_CODES.DATABASE_ERROR,
        'low'
      );
    }
  }
}