// Search History Service

import { DatabaseManager } from '../database/DatabaseManager';
import { SearchHistoryItem } from '../types/search';

export class SearchHistoryService {
  private static instance: SearchHistoryService;
  private readonly MAX_HISTORY_ITEMS = 50;
  private historyCache: SearchHistoryItem[] | null = null;

  private constructor() {}

  public static getInstance(): SearchHistoryService {
    if (!SearchHistoryService.instance) {
      SearchHistoryService.instance = new SearchHistoryService();
    }
    return SearchHistoryService.instance;
  }

  private async getDb() {
    return DatabaseManager.getInstance().getDatabase();
  }

  /**
   * Ensure search history table exists
   */
  private async ensureHistoryTable(): Promise<void> {
    try {
      const db = await this.getDb();
      
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS search_history (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          filters TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          result_count INTEGER DEFAULT 0
        )
      `);

      // Create indexes for better performance
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_search_history_timestamp 
        ON search_history (timestamp)
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_search_history_query 
        ON search_history (query)
      `);

    } catch (error) {
      console.error('Error ensuring search history table:', error);
    }
  }

  /**
   * Add a search to history
   */
  public async addToHistory(item: SearchHistoryItem): Promise<void> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();
      
      // Remove duplicate if exists (same query and similar filters)
      await db.runAsync(
        `DELETE FROM search_history WHERE query = ? AND filters = ?`,
        [item.query, JSON.stringify(item.filters)]
      );

      // Insert new item
      await db.runAsync(
        `INSERT INTO search_history (id, query, filters, timestamp, result_count) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          item.id,
          item.query,
          JSON.stringify(item.filters),
          item.timestamp.toISOString(),
          item.resultCount
        ]
      );

      // Clean up old entries to maintain size limit
      await this.cleanupOldEntries();
      
      // Clear cache to force refresh
      this.historyCache = null;

    } catch (error) {
      console.error('Failed to add to search history:', error);
    }
  }

  /**
   * Clean up old entries to maintain size limit
   */
  private async cleanupOldEntries(): Promise<void> {
    try {
      const db = await this.getDb();
      
      // Keep only the most recent MAX_HISTORY_ITEMS entries
      await db.runAsync(`
        DELETE FROM search_history 
        WHERE id NOT IN (
          SELECT id FROM search_history 
          ORDER BY timestamp DESC 
          LIMIT ?
        )
      `, [this.MAX_HISTORY_ITEMS]);

    } catch (error) {
      console.error('Failed to cleanup old search history entries:', error);
    }
  }

  /**
   * Get search history
   */
  public async getHistory(limit?: number): Promise<SearchHistoryItem[]> {
    try {
      // Return from cache if available and no limit specified
      if (this.historyCache && !limit) {
        return this.historyCache;
      }

      await this.ensureHistoryTable();
      const db = await this.getDb();

      const sql = `
        SELECT id, query, filters, timestamp, result_count 
        FROM search_history 
        ORDER BY timestamp DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;

      const rows = await db.getAllAsync(sql);
      
      // Convert database rows to SearchHistoryItem objects
      const history: SearchHistoryItem[] = rows.map((row: any) => {
        const filters = row.filters ? JSON.parse(row.filters) : {};
        
        // Convert date strings back to Date objects
        if (filters.dateRange) {
          filters.dateRange = {
            startDate: new Date(filters.dateRange.startDate),
            endDate: new Date(filters.dateRange.endDate)
          };
        }

        return {
          id: row.id,
          query: row.query,
          filters,
          timestamp: new Date(row.timestamp),
          resultCount: row.result_count
        };
      });

      // Update cache if no limit was specified
      if (!limit) {
        this.historyCache = history;
      }

      return history;

    } catch (error) {
      console.error('Failed to get search history:', error);
      return [];
    }
  }

  /**
   * Remove specific item from history
   */
  public async removeFromHistory(id: string): Promise<void> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();
      
      await db.runAsync(`DELETE FROM search_history WHERE id = ?`, [id]);
      
      // Clear cache to force refresh
      this.historyCache = null;

    } catch (error) {
      console.error('Failed to remove from search history:', error);
    }
  }

  /**
   * Clear all search history
   */
  public async clearHistory(): Promise<void> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();
      
      await db.runAsync(`DELETE FROM search_history`);
      this.historyCache = [];
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }

  /**
   * Get frequently searched terms
   */
  public async getFrequentSearches(limit: number = 10): Promise<SearchHistoryItem[]> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();

      const sql = `
        SELECT 
          query,
          COUNT(*) as frequency,
          MAX(timestamp) as latest_timestamp,
          id,
          filters,
          result_count
        FROM search_history 
        GROUP BY query 
        ORDER BY frequency DESC, latest_timestamp DESC 
        LIMIT ?
      `;

      const rows = await db.getAllAsync(sql, [limit]);
      
      // Convert to SearchHistoryItem objects
      const frequentSearches: SearchHistoryItem[] = rows.map((row: any) => {
        const filters = row.filters ? JSON.parse(row.filters) : {};
        
        // Convert date strings back to Date objects
        if (filters.dateRange) {
          filters.dateRange = {
            startDate: new Date(filters.dateRange.startDate),
            endDate: new Date(filters.dateRange.endDate)
          };
        }

        return {
          id: row.id,
          query: row.query,
          filters,
          timestamp: new Date(row.latest_timestamp),
          resultCount: row.result_count
        };
      });

      return frequentSearches;

    } catch (error) {
      console.error('Failed to get frequent searches:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on history
   */
  public async getHistoryBasedSuggestions(partial: string, limit: number = 5): Promise<string[]> {
    try {
      if (partial.length < 2) {
        return [];
      }

      await this.ensureHistoryTable();
      const db = await this.getDb();

      const sql = `
        SELECT DISTINCT query 
        FROM search_history 
        WHERE LOWER(query) LIKE LOWER(?) 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      const searchTerm = `%${partial}%`;
      const rows = await db.getAllAsync(sql, [searchTerm, limit]);
      
      return rows.map((row: any) => row.query);

    } catch (error) {
      console.error('Failed to get history-based suggestions:', error);
      return [];
    }
  }

  /**
   * Get search statistics
   */
  public async getSearchStats(): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    mostRecentSearch?: Date;
  }> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();

      // Get total searches
      const totalResult = await db.getFirstAsync(
        `SELECT COUNT(*) as total FROM search_history`
      );
      const totalSearches = (totalResult as any)?.total || 0;

      if (totalSearches === 0) {
        return {
          totalSearches: 0,
          uniqueQueries: 0,
          averageResultsPerSearch: 0
        };
      }

      // Get unique queries count
      const uniqueResult = await db.getFirstAsync(
        `SELECT COUNT(DISTINCT query) as unique_count FROM search_history`
      );
      const uniqueQueries = (uniqueResult as any)?.unique_count || 0;

      // Get average results per search
      const avgResult = await db.getFirstAsync(
        `SELECT AVG(result_count) as avg_results FROM search_history`
      );
      const averageResultsPerSearch = Math.round(((avgResult as any)?.avg_results || 0) * 100) / 100;

      // Get most recent search
      const recentResult = await db.getFirstAsync(
        `SELECT MAX(timestamp) as recent_timestamp FROM search_history`
      );
      const mostRecentSearch = (recentResult as any)?.recent_timestamp 
        ? new Date((recentResult as any).recent_timestamp) 
        : undefined;

      return {
        totalSearches,
        uniqueQueries,
        averageResultsPerSearch,
        mostRecentSearch
      };

    } catch (error) {
      console.error('Failed to get search stats:', error);
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0
      };
    }
  }

  /**
   * Export search history
   */
  public async exportHistory(): Promise<string> {
    try {
      const history = await this.getHistory();
      return JSON.stringify(history, null, 2);
    } catch (error) {
      console.error('Failed to export search history:', error);
      return '[]';
    }
  }

  /**
   * Get search history size management info
   */
  public async getHistorySize(): Promise<{
    currentCount: number;
    maxCount: number;
    canAddMore: boolean;
  }> {
    try {
      await this.ensureHistoryTable();
      const db = await this.getDb();

      const result = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM search_history`
      );
      const currentCount = (result as any)?.count || 0;

      return {
        currentCount,
        maxCount: this.MAX_HISTORY_ITEMS,
        canAddMore: currentCount < this.MAX_HISTORY_ITEMS
      };

    } catch (error) {
      console.error('Failed to get history size info:', error);
      return {
        currentCount: 0,
        maxCount: this.MAX_HISTORY_ITEMS,
        canAddMore: true
      };
    }
  }
}