// Database migrations for enhanced search features

// DatabaseManager will be imported dynamically to avoid circular dependency
import { 
  CREATE_SEARCH_HISTORY_TABLE, 
  CREATE_SEARCH_ANALYTICS_TABLE, 
  CREATE_FLASHCARDS_FTS_TABLE 
} from './schema';

export interface Migration {
  version: number;
  name: string;
  up: string[];
  down: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 2,
    name: 'add_enhanced_search_tables',
    up: [
      CREATE_SEARCH_HISTORY_TABLE,
      CREATE_SEARCH_ANALYTICS_TABLE,
      CREATE_FLASHCARDS_FTS_TABLE,
      // Create indexes for search tables
      'CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);',
      'CREATE INDEX IF NOT EXISTS idx_search_analytics_term ON search_analytics(search_term);',
      'CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_search_analytics_card_id ON search_analytics(card_id);',
      // Create FTS triggers
      `CREATE TRIGGER IF NOT EXISTS flashcards_fts_insert 
       AFTER INSERT ON flashcards 
       BEGIN 
         INSERT INTO flashcards_fts(rowid, word, translation, memo, word_pronunciation, translation_pronunciation) 
         VALUES (NEW.id, NEW.word, NEW.translation, NEW.memo, NEW.word_pronunciation, NEW.translation_pronunciation); 
       END;`,
      `CREATE TRIGGER IF NOT EXISTS flashcards_fts_update 
       AFTER UPDATE ON flashcards 
       BEGIN 
         UPDATE flashcards_fts SET 
           word = NEW.word, 
           translation = NEW.translation, 
           memo = NEW.memo, 
           word_pronunciation = NEW.word_pronunciation, 
           translation_pronunciation = NEW.translation_pronunciation 
         WHERE rowid = NEW.id; 
       END;`,
      `CREATE TRIGGER IF NOT EXISTS flashcards_fts_delete 
       AFTER DELETE ON flashcards 
       BEGIN 
         DELETE FROM flashcards_fts WHERE rowid = OLD.id; 
       END;`,
      // Populate FTS table with existing data
      `INSERT INTO flashcards_fts(rowid, word, translation, memo, word_pronunciation, translation_pronunciation)
       SELECT id, word, translation, memo, word_pronunciation, translation_pronunciation 
       FROM flashcards;`
    ],
    down: [
      'DROP TRIGGER IF EXISTS flashcards_fts_delete;',
      'DROP TRIGGER IF EXISTS flashcards_fts_update;',
      'DROP TRIGGER IF EXISTS flashcards_fts_insert;',
      'DROP INDEX IF EXISTS idx_search_analytics_card_id;',
      'DROP INDEX IF EXISTS idx_search_analytics_timestamp;',
      'DROP INDEX IF EXISTS idx_search_analytics_term;',
      'DROP INDEX IF EXISTS idx_search_history_query;',
      'DROP INDEX IF EXISTS idx_search_history_timestamp;',
      'DROP TABLE IF EXISTS flashcards_fts;',
      'DROP TABLE IF EXISTS search_analytics;',
      'DROP TABLE IF EXISTS search_history;'
    ]
  }
];

export class MigrationManager {
  private static instance: MigrationManager;

  private constructor() {}

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Get database instance without causing circular dependency
   */
  private async getDatabase(): Promise<any> {
    const { DatabaseManager } = await import('./DatabaseManager');
    const dbManager = DatabaseManager.getInstance();
    return await dbManager.getDatabase();
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      const db = await this.getDatabase();
      
      // Create migrations table if it doesn't exist
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Get current database version
      const currentVersion = await this.getCurrentVersion();
      console.log(`Current database version: ${currentVersion}`);

      // Run pending migrations
      const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
      
      for (const migration of pendingMigrations) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        await this.runMigration(migration);
      }

      if (pendingMigrations.length > 0) {
        console.log(`Applied ${pendingMigrations.length} migrations`);
      } else {
        console.log('No pending migrations');
      }

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Run a specific migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      // Start transaction
      await db.execAsync('BEGIN TRANSACTION;');

      // Execute migration statements
      for (const statement of migration.up) {
        await db.execAsync(statement);
      }

      // Record migration as applied
      await db.runAsync(
        'INSERT INTO migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );

      // Commit transaction
      await db.execAsync('COMMIT;');
      
      console.log(`Migration ${migration.version} applied successfully`);

    } catch (error) {
      // Rollback on error
      await db.execAsync('ROLLBACK;');
      console.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const db = await this.getDatabase();
      
      const result = await db.getFirstAsync(
        'SELECT MAX(version) as version FROM migrations'
      );
      
      return (result as any)?.version || 1; // Default to version 1 if no migrations table
    } catch (error) {
      // If migrations table doesn't exist, we're at version 1
      return 1;
    }
  }

  /**
   * Rollback to a specific version
   */
  public async rollbackTo(targetVersion: number): Promise<void> {
    try {
      const db = await this.getDatabase();
      const currentVersion = await this.getCurrentVersion();

      if (targetVersion >= currentVersion) {
        console.log('Target version is not lower than current version');
        return;
      }

      // Get migrations to rollback (in reverse order)
      const migrationsToRollback = MIGRATIONS
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version);

      for (const migration of migrationsToRollback) {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        // Start transaction
        await db.execAsync('BEGIN TRANSACTION;');

        try {
          // Execute rollback statements
          for (const statement of migration.down) {
            await db.execAsync(statement);
          }

          // Remove migration record
          await db.runAsync(
            'DELETE FROM migrations WHERE version = ?',
            [migration.version]
          );

          // Commit transaction
          await db.execAsync('COMMIT;');
          
          console.log(`Migration ${migration.version} rolled back successfully`);

        } catch (error) {
          // Rollback on error
          await db.execAsync('ROLLBACK;');
          console.error(`Rollback of migration ${migration.version} failed:`, error);
          throw error;
        }
      }

      console.log(`Rolled back to version ${targetVersion}`);

    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<{
    currentVersion: number;
    appliedMigrations: Array<{ version: number; name: string; appliedAt: Date }>;
    pendingMigrations: Array<{ version: number; name: string }>;
  }> {
    try {
      const db = await this.getDatabase();
      const currentVersion = await this.getCurrentVersion();

      // Get applied migrations
      const appliedRows = await db.getAllAsync(
        'SELECT version, name, applied_at FROM migrations ORDER BY version'
      );
      const appliedMigrations = appliedRows.map((row: any) => ({
        version: row.version,
        name: row.name,
        appliedAt: new Date(row.applied_at)
      }));

      // Get pending migrations
      const pendingMigrations = MIGRATIONS
        .filter(m => m.version > currentVersion)
        .map(m => ({ version: m.version, name: m.name }));

      return {
        currentVersion,
        appliedMigrations,
        pendingMigrations
      };

    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }
}