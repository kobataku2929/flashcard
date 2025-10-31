// Web SQLite adapter for browser compatibility

// Conditional import to avoid web bundling issues
let SQLite: any;
try {
  SQLite = require('expo-sqlite');
} catch (error) {
  // Ignore import error on web - this is expected in browser environments
}

// WebSQL implementation for web browsers
class WebSQLiteAdapter {
  private db: any;
  private debugMode: boolean = process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true';
  private mockStorage: Map<string, any[]> = new Map(); // For mock storage
  private nextId: number = 1;

  constructor(name: string) {
    // Use WebSQL API available in browsers
    if (typeof window !== 'undefined' && (window as any).openDatabase) {
      this.db = (window as any).openDatabase(name, '1.0', 'Flashcard Database', 2 * 1024 * 1024);
      if (this.debugMode) {
        console.log('WebSQLiteAdapter: Using WebSQL database');
      }
    } else {
      // Fallback to a functional in-memory storage for environments without WebSQL
      if (this.debugMode) {
        console.warn('WebSQL not available, using in-memory storage');
      }
      this.initializeMockStorage();
      this.db = {
        transaction: (callback: any) => {
          const mockTx = {
            executeSql: (sql: string, params: any[], success: any, error: any) => {
              try {
                const result = this.executeMockSQL(sql, params || []);
                setTimeout(() => success(mockTx, result), 1);
              } catch (err) {
                setTimeout(() => error(mockTx, err), 1);
              }
            }
          };
          callback(mockTx);
        }
      };
    }
  }

  private initializeMockStorage(): void {
    // Initialize tables
    this.mockStorage.set('flashcards', []);
    this.mockStorage.set('folders', []);
    this.mockStorage.set('study_sessions', []);
  }

  private executeMockSQL(sql: string, params: any[]): any {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('create table')) {
      // Handle CREATE TABLE
      return { insertId: null, rowsAffected: 0, rows: { length: 0, item: () => null } };
    }
    
    if (sqlLower.startsWith('insert into')) {
      // Handle INSERT
      const match = sql.match(/insert into (\w+)/i);
      const tableName = match ? match[1] : 'unknown';
      
      const table = this.mockStorage.get(tableName) || [];
      const newRow: any = { id: this.nextId++ };
      
      // Parse INSERT statement to extract column values
      if (tableName === 'flashcards') {
        newRow.word = params[0] || '';
        newRow.word_pronunciation = params[1];
        newRow.translation = params[2] || '';
        newRow.translation_pronunciation = params[3];
        newRow.memo = params[4];
        newRow.folder_id = params[5];
        newRow.created_at = new Date().toISOString();
        newRow.updated_at = new Date().toISOString();
      } else if (tableName === 'folders') {
        newRow.name = params[0] || '';
        newRow.parent_id = params[1];
        newRow.created_at = new Date().toISOString();
        newRow.updated_at = new Date().toISOString();
      }
      
      table.push(newRow);
      this.mockStorage.set(tableName, table);
      
      return {
        insertId: newRow.id,
        rowsAffected: 1,
        rows: { length: 0, item: () => null }
      };
    }
    
    if (sqlLower.startsWith('select')) {
      // Handle SELECT
      const match = sql.match(/from (\w+)/i);
      const tableName = match ? match[1] : 'unknown';
      const table = this.mockStorage.get(tableName) || [];
      
      let filteredRows = [...table];
      
      // Handle WHERE clause
      if (sql.includes('WHERE') || sql.includes('where')) {
        if (sql.includes('id = ?')) {
          const id = params[0];
          filteredRows = table.filter(row => row.id === id);
        } else if (sql.includes('folder_id IS NULL')) {
          filteredRows = table.filter(row => row.folder_id === null);
        } else if (sql.includes('folder_id = ?')) {
          const folderId = params[0];
          filteredRows = table.filter(row => row.folder_id === folderId);
        }
      }
      
      // Handle LIMIT
      if (sql.includes('LIMIT') || sql.includes('limit')) {
        const limitMatch = sql.match(/limit (\d+)/i);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1]);
          filteredRows = filteredRows.slice(0, limit);
        }
      }
      
      return {
        insertId: null,
        rowsAffected: 0,
        rows: {
          length: filteredRows.length,
          item: (index: number) => filteredRows[index] || null
        }
      };
    }
    
    if (sqlLower.startsWith('update')) {
      // Handle UPDATE
      const match = sql.match(/update (\w+)/i);
      const tableName = match ? match[1] : 'unknown';
      const table = this.mockStorage.get(tableName) || [];
      
      let updatedCount = 0;
      if (sql.includes('WHERE id = ?') || sql.includes('where id = ?')) {
        const id = params[params.length - 1]; // ID is usually the last parameter
        const rowIndex = table.findIndex(row => row.id === id);
        if (rowIndex !== -1) {
          // Update the row with new values
          if (tableName === 'flashcards') {
            table[rowIndex].word = params[0];
            table[rowIndex].word_pronunciation = params[1];
            table[rowIndex].translation = params[2];
            table[rowIndex].translation_pronunciation = params[3];
            table[rowIndex].memo = params[4];
            table[rowIndex].folder_id = params[5];
            table[rowIndex].updated_at = new Date().toISOString();
          }
          updatedCount = 1;
        }
      }
      
      return {
        insertId: null,
        rowsAffected: updatedCount,
        rows: { length: 0, item: () => null }
      };
    }
    
    if (sqlLower.startsWith('delete')) {
      // Handle DELETE
      const match = sql.match(/from (\w+)/i);
      const tableName = match ? match[1] : 'unknown';
      const table = this.mockStorage.get(tableName) || [];
      
      let deletedCount = 0;
      if (sql.includes('WHERE id = ?') || sql.includes('where id = ?')) {
        const id = params[0];
        const initialLength = table.length;
        const filteredTable = table.filter(row => row.id !== id);
        deletedCount = initialLength - filteredTable.length;
        this.mockStorage.set(tableName, filteredTable);
      }
      
      return {
        insertId: null,
        rowsAffected: deletedCount,
        rows: { length: 0, item: () => null }
      };
    }
    
    // Default response for unhandled SQL
    return {
      insertId: null,
      rowsAffected: 0,
      rows: { length: 0, item: () => null }
    };
  }

  private log(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.log(message, ...args);
    }
  }

  private logError(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  async execAsync(sql: string): Promise<void> {
    this.log(`WebSQLiteAdapter: Executing: ${sql}`);
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          [],
          () => {
            this.log('WebSQLiteAdapter: Exec completed');
            resolve();
          },
          (_tx: any, error: any) => {
            this.logError('WebSQLiteAdapter: Exec error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number | null; changes: number }> {
    this.log(`WebSQLiteAdapter: Running: ${sql} (${params?.length || 0})`, params);
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params || [],
          (_tx: any, result: any) => {
            const runResult = {
              lastInsertRowId: result.insertId || null,
              changes: result.rowsAffected || 0,
            };
            this.log('WebSQLiteAdapter: Run result:', runResult);
            resolve(runResult);
          },
          (_tx: any, error: any) => {
            this.logError('WebSQLiteAdapter: Run error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any> {
    this.log(`WebSQLiteAdapter: Getting first: ${sql}`, params);
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params || [],
          (_tx: any, result: any) => {
            const row = result.rows.length > 0 ? result.rows.item(0) : null;
            this.log('WebSQLiteAdapter: First result:', row);
            resolve(row);
          },
          (_tx: any, error: any) => {
            this.logError('WebSQLiteAdapter: First error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    this.log(`WebSQLiteAdapter: Getting all: ${sql}`, params);
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params || [],
          (_tx: any, result: any) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            this.log(`WebSQLiteAdapter: All results: ${rows.length} rows`);
            resolve(rows);
          },
          (_tx: any, error: any) => {
            this.logError('WebSQLiteAdapter: All error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  transaction(callback: (tx: any) => void): void {
    this.log('WebSQLiteAdapter: Starting transaction');
    this.db.transaction(callback);
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    this.log('WebSQLiteAdapter: Starting async transaction');
    return new Promise((resolve, reject) => {
      this.db.transaction(
        async (tx: any) => {
          try {
            // Store the transaction in a temporary property for access during the task
            (this as any)._currentTx = tx;
            const result = await task();
            resolve(result);
          } catch (error) {
            this.logError('WebSQLiteAdapter: Async transaction task failed:', error);
            reject(error);
          } finally {
            delete (this as any)._currentTx;
          }
        },
        (error: any) => {
          this.logError('WebSQLiteAdapter: Async transaction failed:', error);
          reject(error);
        },
        () => {
          this.log('WebSQLiteAdapter: Async transaction completed successfully');
        }
      );
    });
  }

  async closeAsync(): Promise<void> {
    this.log('WebSQLiteAdapter: Closing database');
    // WebSQL doesn't have explicit close method
  }
}

// Platform-specific database factory
export function createDatabase(name: string): Promise<any> {
  if (typeof window !== 'undefined') {
    // Web platform - use WebSQL adapter
    // Only log once during initialization
    return Promise.resolve(new WebSQLiteAdapter(name) as any);
  } else {
    // Native platform - use actual expo-sqlite
    if (!SQLite) {
      throw new Error('expo-sqlite is not available');
    }
    return SQLite.openDatabaseAsync(name);
  }
}

export { WebSQLiteAdapter };