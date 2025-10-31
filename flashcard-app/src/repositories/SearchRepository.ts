// Enhanced Search Repository

import { DatabaseManager } from '../database/DatabaseManager';
import { Flashcard } from '../types';
import { SearchFilters, SearchAnalytics } from '../types/search';

export class SearchRepository {
  private static instance: SearchRepository;

  private constructor() {}

  public static getInstance(): SearchRepository {
    if (!SearchRepository.instance) {
      SearchRepository.instance = new SearchRepository();
    }
    return SearchRepository.instance;
  }

  public async getDb() {
    return DatabaseManager.getInstance().getDatabase();
  }

  /**
   * Enhanced search with full-text search capabilities
   */
  public async searchWithFullText(query: string, filters: SearchFilters): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      
      // Ensure FTS table exists
      await this.ensureFTSTable();
      
      // Try FTS search first, fallback to LIKE search if FTS fails
      try {
        // Use FTS5 for better search performance with custom relevance scoring
        let sql = `
          SELECT f.*, 
                 fts.rank,
                 snippet(flashcards_fts, 0, '<mark>', '</mark>', '...', 32) as word_snippet,
                 snippet(flashcards_fts, 1, '<mark>', '</mark>', '...', 32) as translation_snippet,
                 (
                   -- 単語（表面のメイン）- 最高優先度
                   CASE 
                     WHEN LOWER(f.word) = ? THEN 100000
                     WHEN LOWER(f.word) LIKE ? THEN 80000
                     WHEN LOWER(f.word) LIKE ? THEN 60000
                     ELSE 0
                   END +
                   -- 翻訳（裏面のメイン）- 2番目の優先度
                   CASE 
                     WHEN LOWER(f.translation) = ? THEN 50000
                     WHEN LOWER(f.translation) LIKE ? THEN 40000
                     WHEN LOWER(f.translation) LIKE ? THEN 30000
                     ELSE 0
                   END +
                   -- メモ - 3番目の優先度（最低）
                   CASE 
                     WHEN f.memo IS NOT NULL AND LOWER(f.memo) = ? THEN 20000
                     WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 15000
                     WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 10000
                     ELSE 0
                   END +
                   -- 発音 - 最低優先度
                   CASE 
                     WHEN f.word_pronunciation IS NOT NULL AND LOWER(f.word_pronunciation) LIKE ? THEN 5000
                     ELSE 0
                   END +
                   CASE 
                     WHEN f.translation_pronunciation IS NOT NULL AND LOWER(f.translation_pronunciation) LIKE ? THEN 2500
                     ELSE 0
                   END
                 ) as custom_rank
          FROM flashcards f
          JOIN flashcards_fts fts ON f.id = fts.rowid
          WHERE flashcards_fts MATCH ?
          AND (
            LOWER(f.word) LIKE ? OR 
            LOWER(f.translation) LIKE ? OR 
            (f.memo IS NOT NULL AND LOWER(f.memo) LIKE ?) OR
            (f.word_pronunciation IS NOT NULL AND LOWER(f.word_pronunciation) LIKE ?) OR
            (f.translation_pronunciation IS NOT NULL AND LOWER(f.translation_pronunciation) LIKE ?)
          )
        `;
        
        // Prepare FTS query - escape special characters and add wildcards
        const ftsQuery = this.prepareFTSQuery(query);
        const searchTerm = `%${query.toLowerCase()}%`;
        const exactMatch = query.toLowerCase();
        const startsWith = `${query.toLowerCase()}%`;
        const contains = `%${query.toLowerCase()}%`;
        
        let params: any[] = [
          exactMatch, startsWith, contains, // word patterns
          exactMatch, startsWith, contains, // translation patterns  
          exactMatch, startsWith, contains, // memo patterns
          contains, contains, // pronunciation patterns
          ftsQuery, // For FTS MATCH
          contains, contains, contains, contains, contains  // For additional filtering
        ];

      // Add folder filter
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          sql += ` AND f.folder_id IS NULL`;
        } else {
          sql += ` AND f.folder_id = ?`;
          params.push(filters.folderId);
        }
      }

      // Add date range filter
      if (filters.dateRange) {
        sql += ` AND f.created_at BETWEEN ? AND ?`;
        params.push(filters.dateRange.startDate.toISOString());
        params.push(filters.dateRange.endDate.toISOString());
      }

        // Add ordering
        switch (filters.sortBy) {
          case 'dateCreated':
            sql += ` ORDER BY f.created_at ${filters.sortOrder}`;
            break;
          case 'alphabetical':
            sql += ` ORDER BY f.word ${filters.sortOrder}`;
            break;
          default:
            // For relevance, use custom ranking: word > translation > memo
            sql += ` ORDER BY custom_rank DESC, f.created_at DESC`;
            break;
        }

        const rows = await db.getAllAsync(sql, params);
        
        // デバッグログ（データベース結果）
        console.log(`[SearchRepository] FTS search returned ${rows.length} results for query: "${query}"`);
        rows.forEach((row: any, index: number) => {
          console.log(`[SearchRepository] FTS result [${index}]: "${row.word}" -> "${row.translation}", custom_rank: ${row.custom_rank}`);
        });
        
        return rows.map((row: any) => this.mapRowToFlashcard(row));
        
      } catch (ftsError) {
        console.warn('FTS search failed, falling back to LIKE search:', ftsError);
        return await this.fallbackSearch(query, filters);
      }

    } catch (error) {
      console.error('Error in enhanced search:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on existing content
   */
  public async getContentBasedSuggestions(partial: string, limit: number = 10): Promise<string[]> {
    try {
      const db = await this.getDb();
      const searchTerm = `${partial.toLowerCase()}%`;
      
      const sql = `
        SELECT DISTINCT 
          CASE 
            WHEN LOWER(word) LIKE ? THEN word
            WHEN LOWER(translation) LIKE ? THEN translation
            WHEN LOWER(memo) LIKE ? AND memo IS NOT NULL THEN memo
            ELSE NULL
          END as suggestion
        FROM flashcards 
        WHERE suggestion IS NOT NULL
        ORDER BY LENGTH(suggestion), suggestion
        LIMIT ?
      `;

      const rows = await db.getAllAsync(sql, [searchTerm, searchTerm, searchTerm, limit]);
      return rows.map((row: any) => row.suggestion).filter(Boolean);

    } catch (error) {
      console.error('Error getting content-based suggestions:', error);
      return [];
    }
  }

  /**
   * Log search analytics
   */
  public async logSearchAnalytics(
    searchTerm: string, 
    cardId?: number, 
    actionType: string = 'search'
  ): Promise<void> {
    try {
      const db = await this.getDb();
      
      // First ensure the analytics table exists
      await this.ensureAnalyticsTable();

      const sql = `
        INSERT INTO search_analytics (search_term, card_id, action_type, timestamp)
        VALUES (?, ?, ?, ?)
      `;

      await db.runAsync(sql, [
        searchTerm,
        cardId || null,
        actionType,
        new Date().toISOString()
      ]);

    } catch (error) {
      console.error('Error logging search analytics:', error);
      // Don't throw error for analytics logging failures
    }
  }

  /**
   * Get search analytics
   */
  public async getSearchAnalytics(limit: number = 100): Promise<SearchAnalytics> {
    try {
      const db = await this.getDb();
      
      // Ensure analytics table exists
      await this.ensureAnalyticsTable();

      // Get total searches
      const totalSearchesResult = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM search_analytics WHERE action_type = 'search'`
      );
      const totalSearches = (totalSearchesResult as any)?.count || 0;

      // Get most searched terms
      const mostSearchedTermsRows = await db.getAllAsync(`
        SELECT search_term as term, COUNT(*) as count 
        FROM search_analytics 
        WHERE action_type = 'search' AND search_term IS NOT NULL
        GROUP BY search_term 
        ORDER BY count DESC 
        LIMIT 10
      `);
      const mostSearchedTerms = mostSearchedTermsRows.map((row: any) => ({
        term: row.term,
        count: row.count
      }));

      // Get most accessed cards
      const mostAccessedCardsRows = await db.getAllAsync(`
        SELECT card_id as cardId, COUNT(*) as accessCount 
        FROM search_analytics 
        WHERE card_id IS NOT NULL
        GROUP BY card_id 
        ORDER BY accessCount DESC 
        LIMIT 10
      `);
      const mostAccessedCards = mostAccessedCardsRows.map((row: any) => ({
        cardId: row.cardId,
        accessCount: row.accessCount
      }));

      // Calculate average results per search (placeholder)
      const averageResultsPerSearch = totalSearches > 0 ? 5.2 : 0; // TODO: Calculate actual average

      return {
        totalSearches,
        mostSearchedTerms,
        averageResultsPerSearch,
        mostAccessedCards,
        searchPatterns: [] // TODO: Implement search patterns analysis
      };

    } catch (error) {
      console.error('Error getting search analytics:', error);
      return {
        totalSearches: 0,
        mostSearchedTerms: [],
        averageResultsPerSearch: 0,
        mostAccessedCards: [],
        searchPatterns: []
      };
    }
  }

  /**
   * Clean up old analytics data
   */
  public async cleanupAnalytics(olderThanDays: number = 90): Promise<void> {
    try {
      const db = await this.getDb();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      await db.runAsync(
        `DELETE FROM search_analytics WHERE timestamp < ?`,
        [cutoffDate.toISOString()]
      );

    } catch (error) {
      console.error('Error cleaning up analytics:', error);
    }
  }

  /**
   * Ensure FTS table exists and is populated
   */
  private async ensureFTSTable(): Promise<void> {
    try {
      const db = await this.getDb();
      
      // Create FTS5 virtual table if it doesn't exist
      await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS flashcards_fts USING fts5(
          word, translation, memo, word_pronunciation, translation_pronunciation,
          content='flashcards',
          content_rowid='id'
        )
      `);

      // Check if FTS table needs to be populated
      const ftsCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM flashcards_fts`);
      const flashcardsCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM flashcards`);
      
      if ((ftsCount as any)?.count === 0 && (flashcardsCount as any)?.count > 0) {
        // Populate FTS table
        await db.execAsync(`INSERT INTO flashcards_fts(flashcards_fts) VALUES('rebuild')`);
      }

    } catch (error) {
      console.warn('Error ensuring FTS table, will use fallback search:', error);
    }
  }

  private async ensureAnalyticsTable(): Promise<void> {
    try {
      const db = await this.getDb();
      
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          search_term TEXT,
          card_id INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          action_type TEXT DEFAULT 'search',
          FOREIGN KEY (card_id) REFERENCES flashcards (id)
        )
      `);

      // Create index for better performance
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_search_analytics_term 
        ON search_analytics (search_term)
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp 
        ON search_analytics (timestamp)
      `);

    } catch (error) {
      console.error('Error ensuring analytics table:', error);
    }
  }

  /**
   * Prepare FTS query by escaping special characters and adding wildcards
   */
  private prepareFTSQuery(query: string): string {
    // Escape FTS special characters and clean the query
    const escaped = query.replace(/['"*\-\+\(\)\[\]]/g, '').trim();
    
    if (escaped.length === 0) {
      return '""'; // Empty query
    }
    
    // Split into terms and filter out empty ones
    const terms = escaped.split(/\s+/).filter(term => term.length > 0);
    
    if (terms.length === 0) {
      return '""';
    }
    
    // For single term, use exact match with wildcard
    if (terms.length === 1) {
      return `"${terms[0]}"*`;
    }
    
    // For multiple terms, create AND query for better precision
    return terms.map(term => `"${term}"`).join(' AND ');
  }

  /**
   * Fallback to LIKE search if FTS fails
   */
  private async fallbackSearch(query: string, filters: SearchFilters): Promise<Flashcard[]> {
    const db = await this.getDb();
    
    // Use custom ordering for relevance-based search with strict filtering
    let sql = `
      SELECT f.*,
        (
          -- 単語（表面のメイン）- 最高優先度
          CASE 
            WHEN LOWER(f.word) = ? THEN 100000
            WHEN LOWER(f.word) LIKE ? THEN 80000
            WHEN LOWER(f.word) LIKE ? THEN 60000
            ELSE 0
          END +
          -- 翻訳（裏面のメイン）- 2番目の優先度
          CASE 
            WHEN LOWER(f.translation) = ? THEN 50000
            WHEN LOWER(f.translation) LIKE ? THEN 40000
            WHEN LOWER(f.translation) LIKE ? THEN 30000
            ELSE 0
          END +
          -- メモ - 3番目の優先度（最低）
          CASE 
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) = ? THEN 20000
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 15000
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 10000
            ELSE 0
          END +
          -- 発音 - 最低優先度
          CASE 
            WHEN f.word_pronunciation IS NOT NULL AND LOWER(f.word_pronunciation) LIKE ? THEN 5000
            ELSE 0
          END +
          CASE 
            WHEN f.translation_pronunciation IS NOT NULL AND LOWER(f.translation_pronunciation) LIKE ? THEN 2500
            ELSE 0
          END
        ) as relevance_score
      FROM flashcards f
      WHERE (
        LOWER(f.word) LIKE ? OR 
        LOWER(f.translation) LIKE ? OR 
        (f.memo IS NOT NULL AND LOWER(f.memo) LIKE ?) OR
        (f.word_pronunciation IS NOT NULL AND LOWER(f.word_pronunciation) LIKE ?) OR
        (f.translation_pronunciation IS NOT NULL AND LOWER(f.translation_pronunciation) LIKE ?)
      )
      AND (
        (
          -- 単語（表面のメイン）- 最高優先度
          CASE 
            WHEN LOWER(f.word) = ? THEN 100000
            WHEN LOWER(f.word) LIKE ? THEN 80000
            WHEN LOWER(f.word) LIKE ? THEN 60000
            ELSE 0
          END +
          -- 翻訳（裏面のメイン）- 2番目の優先度
          CASE 
            WHEN LOWER(f.translation) = ? THEN 50000
            WHEN LOWER(f.translation) LIKE ? THEN 40000
            WHEN LOWER(f.translation) LIKE ? THEN 30000
            ELSE 0
          END +
          -- メモ - 3番目の優先度（最低）
          CASE 
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) = ? THEN 20000
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 15000
            WHEN f.memo IS NOT NULL AND LOWER(f.memo) LIKE ? THEN 10000
            ELSE 0
          END +
          -- 発音 - 最低優先度
          CASE 
            WHEN f.word_pronunciation IS NOT NULL AND LOWER(f.word_pronunciation) LIKE ? THEN 5000
            ELSE 0
          END +
          CASE 
            WHEN f.translation_pronunciation IS NOT NULL AND LOWER(f.translation_pronunciation) LIKE ? THEN 2500
            ELSE 0
          END
        )
      ) > 0
    `;
    
    const exactMatch = query.toLowerCase();
    const startsWith = `${query.toLowerCase()}%`;
    const contains = `%${query.toLowerCase()}%`;
    
    let params: any[] = [
      exactMatch, startsWith, contains, // word patterns for scoring
      exactMatch, startsWith, contains, // translation patterns for scoring
      exactMatch, startsWith, contains, // memo patterns for scoring
      contains, contains, // pronunciation patterns for scoring
      contains, contains, contains, contains, contains, // For WHERE clause
      exactMatch, startsWith, contains, // word patterns for filtering
      exactMatch, startsWith, contains, // translation patterns for filtering
      exactMatch, startsWith, contains, // memo patterns for filtering
      contains, contains  // pronunciation patterns for filtering
    ];

    // Add folder filter
    if (filters.folderId !== undefined) {
      if (filters.folderId === null) {
        sql += ` AND f.folder_id IS NULL`;
      } else {
        sql += ` AND f.folder_id = ?`;
        params.push(filters.folderId);
      }
    }

    // Add date range filter
    if (filters.dateRange) {
      sql += ` AND f.created_at BETWEEN ? AND ?`;
      params.push(filters.dateRange.startDate.toISOString());
      params.push(filters.dateRange.endDate.toISOString());
    }

    // Add ordering based on user preference
    switch (filters.sortBy) {
      case 'dateCreated':
        sql += ` ORDER BY f.created_at ${filters.sortOrder}`;
        break;
      case 'alphabetical':
        sql += ` ORDER BY f.word ${filters.sortOrder}`;
        break;
      default:
        // Custom relevance ordering: word > translation > memo
        sql += ` ORDER BY relevance_score DESC, f.created_at DESC`;
        break;
    }

    const rows = await db.getAllAsync(sql, params);
    
    // デバッグログ（フォールバック検索結果）
    console.log(`[SearchRepository] Fallback search returned ${rows.length} results for query: "${query}"`);
    rows.forEach((row: any, index: number) => {
      console.log(`[SearchRepository] Fallback result [${index}]: "${row.word}" -> "${row.translation}", relevance_score: ${row.relevance_score}`);
    });
    
    return rows.map((row: any) => this.mapRowToFlashcard(row));
  }

  private mapRowToFlashcard(row: any): Flashcard {
    return {
      id: row.id,
      word: row.word,
      wordPronunciation: row.word_pronunciation,
      translation: row.translation,
      translationPronunciation: row.translation_pronunciation,
      memo: row.memo,
      folderId: row.folder_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}