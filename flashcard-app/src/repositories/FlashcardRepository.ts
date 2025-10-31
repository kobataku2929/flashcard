// Flashcard repository implementation

import { FlashcardRepository } from './interfaces';
import { Flashcard, CreateFlashcard, UpdateFlashcard } from '../types';
import { DatabaseManager } from '../database/DatabaseManager';
import { handleDatabaseError, parseTimestamp, validateRequiredFields } from '../database/utils';
import { AppError, ERROR_CODES } from '../types/errors';
import { performanceMonitor, BatchProcessor } from '../utils/performance';
// SQLiteDatabase type is handled by the adapter

export class FlashcardRepositoryImpl implements FlashcardRepository {
  private batchProcessor: BatchProcessor<CreateFlashcard>;
  private cache: Map<number, Flashcard> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize batch processor for bulk operations
    this.batchProcessor = new BatchProcessor(
      (items) => this.processBatch(items),
      50, // batch size
      200 // flush delay
    );
  }

  private async getDb(): Promise<any> {
    return await DatabaseManager.getInstance().getDatabase();
  }



  private setCache(flashcard: Flashcard): void {
    this.cache.set(flashcard.id, flashcard);

    // Auto-expire cache entries
    setTimeout(() => {
      this.cache.delete(flashcard.id);
    }, this.cacheTimeout);
  }

  private getCache(id: number): Flashcard | null {
    return this.cache.get(id) || null;
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private async processBatch(items: CreateFlashcard[]): Promise<void> {
    const db = await this.getDb();

    await db.withTransactionAsync(async () => {
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO flashcards (word, word_pronunciation, translation, translation_pronunciation, memo, folder_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            item.word,
            item.wordPronunciation || null,
            item.translation,
            item.translationPronunciation || null,
            item.memo || null,
            item.folderId || null,
          ]
        );
      }
    });
  }

  async create(flashcard: CreateFlashcard): Promise<Flashcard> {
    return performanceMonitor.measureAsync('FlashcardRepository.create', async () => {
      try {
        validateRequiredFields(flashcard, ['word', 'translation']);

        const db = await this.getDb();

        // Simple approach: use runAsync and then findById
        const result = await db.runAsync(
          `INSERT INTO flashcards (word, word_pronunciation, translation, translation_pronunciation, memo, folder_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            flashcard.word,
            flashcard.wordPronunciation || null,
            flashcard.translation,
            flashcard.translationPronunciation || null,
            flashcard.memo || null,
            flashcard.folderId || null,
          ]
        );

        if (!result.lastInsertRowId) {
          throw new AppError('Failed to create flashcard', ERROR_CODES.DATABASE_ERROR);
        }

        // Get the created flashcard directly from database
        const row = await db.getFirstAsync(
          'SELECT * FROM flashcards WHERE id = ?',
          [result.lastInsertRowId]
        );

        if (!row) {
          throw new AppError('Failed to retrieve created flashcard', ERROR_CODES.DATABASE_ERROR);
        }

        const newFlashcard = this.mapRowToFlashcard(row);
        this.setCache(newFlashcard);
        return newFlashcard;
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw handleDatabaseError(error, 'create flashcard');
      }
    });
  }

  /**
   * Create multiple flashcards in batch for better performance
   */
  async createBatch(flashcards: CreateFlashcard[]): Promise<void> {
    return performanceMonitor.measureAsync('FlashcardRepository.createBatch', async () => {
      for (const flashcard of flashcards) {
        this.batchProcessor.add(flashcard);
      }
      await this.batchProcessor.flush();
      this.clearCache(); // Clear cache after batch operation
    }, { count: flashcards.length });
  }

  /**
   * Create multiple flashcards and return the created flashcards
   */
  async createMany(flashcards: CreateFlashcard[]): Promise<Flashcard[]> {
    return performanceMonitor.measureAsync('FlashcardRepository.createMany', async () => {
      try {
        const db = await this.getDb();
        const createdFlashcards: Flashcard[] = [];

        // Use transaction for better performance and consistency
        await db.execAsync('BEGIN TRANSACTION');

        try {
          for (const flashcard of flashcards) {
            validateRequiredFields(flashcard, ['word', 'translation']);

            const result = await db.runAsync(
              `INSERT INTO flashcards (word, word_pronunciation, translation, translation_pronunciation, memo, folder_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
              [
                flashcard.word,
                flashcard.wordPronunciation || null,
                flashcard.translation,
                flashcard.translationPronunciation || null,
                flashcard.memo || null,
                flashcard.folderId || null,
              ]
            );

            if (!result.lastInsertRowId) {
              throw new AppError('Failed to create flashcard', ERROR_CODES.DATABASE_ERROR);
            }

            // Get the created flashcard
            const row = await db.getFirstAsync(
              'SELECT * FROM flashcards WHERE id = ?',
              [result.lastInsertRowId]
            );

            if (row) {
              const newFlashcard = this.mapRowToFlashcard(row);
              createdFlashcards.push(newFlashcard);
              this.setCache(newFlashcard);
            }
          }

          await db.execAsync('COMMIT');
          return createdFlashcards;

        } catch (error) {
          await db.execAsync('ROLLBACK');
          throw error;
        }

      } catch (error) {
        if (error instanceof AppError) throw error;
        throw handleDatabaseError(error, 'create multiple flashcards');
      }
    }, { count: flashcards.length });
  }

  async findById(id: number): Promise<Flashcard | null> {
    return performanceMonitor.measureAsync('FlashcardRepository.findById', async () => {
      try {
        // Check cache first
        const cached = this.getCache(id);
        if (cached) {
          return cached;
        }

        const db = await this.getDb();
        const row = await db.getFirstAsync(
          'SELECT * FROM flashcards WHERE id = ?',
          [id]
        );

        if (!row) return null;

        const flashcard = this.mapRowToFlashcard(row as any);
        this.setCache(flashcard);
        return flashcard;
      } catch (error) {
        console.error('Error finding flashcard by id:', error);
        return null;
      }
    });
  }

  async findByFolderId(folderId: number | null): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      const query = folderId === null
        ? 'SELECT * FROM flashcards WHERE folder_id IS NULL ORDER BY created_at DESC'
        : 'SELECT * FROM flashcards WHERE folder_id = ? ORDER BY created_at DESC';

      const params = folderId === null ? [] : [folderId];
      const rows = await db.getAllAsync(query, params);

      return rows.map((row: any) => this.mapRowToFlashcard(row as any));
    } catch (error) {
      console.error('Error finding flashcards by folder:', error);
      return [];
    }
  }

  async update(id: number, flashcard: UpdateFlashcard): Promise<Flashcard> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Flashcard not found', ERROR_CODES.FLASHCARD_NOT_FOUND);
      }

      const db = await this.getDb();
      await db.runAsync(
        `UPDATE flashcards 
         SET word = ?, word_pronunciation = ?, translation = ?, 
             translation_pronunciation = ?, memo = ?, folder_id = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          flashcard.word ?? existing.word,
          (flashcard.wordPronunciation ?? existing.wordPronunciation) || null,
          flashcard.translation ?? existing.translation,
          (flashcard.translationPronunciation ?? existing.translationPronunciation) || null,
          (flashcard.memo ?? existing.memo) || null,
          (flashcard.folderId ?? existing.folderId) || null,
          id,
        ]
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new AppError('Failed to retrieve updated flashcard', ERROR_CODES.DATABASE_ERROR);
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error updating flashcard:', error);
      throw new AppError('Failed to update flashcard', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Flashcard not found', ERROR_CODES.FLASHCARD_NOT_FOUND);
      }

      const db = await this.getDb();
      await db.runAsync('DELETE FROM flashcards WHERE id = ?', [id]);

      // Clear from cache
      this.cache.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error deleting flashcard:', error);
      throw new AppError('Failed to delete flashcard', ERROR_CODES.DATABASE_ERROR);
    }
  }

  async findAll(): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync(
        'SELECT * FROM flashcards ORDER BY created_at DESC'
      );

      return rows.map((row: any) => this.mapRowToFlashcard(row as any));
    } catch (error) {
      console.error('Error finding all flashcards:', error);
      return [];
    }
  }



  async moveToFolder(id: number, folderId: number | null): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Flashcard not found', ERROR_CODES.FLASHCARD_NOT_FOUND);
      }

      const db = await this.getDb();
      await db.runAsync(
        'UPDATE flashcards SET folder_id = ? WHERE id = ?',
        [folderId, id]
      );

      // Clear from cache to force refresh
      this.cache.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error moving flashcard to folder:', error);
      throw new AppError('Failed to move flashcard to folder', ERROR_CODES.DATABASE_ERROR);
    }
  }

  /**
   * Search flashcards by word or translation with strict partial matching
   */
  async search(query: string): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      const searchTerm = `%${query.toLowerCase()}%`;
      const exactTerm = query.toLowerCase();
      const startsWithTerm = `${query.toLowerCase()}%`;

      // Enhanced search with additive relevance scoring
      const rows = await db.getAllAsync(
        `SELECT *, 
          (
            -- Exact matches get highest priority
            (CASE WHEN LOWER(word) = ? THEN 1000 ELSE 0 END) +
            (CASE WHEN LOWER(translation) = ? THEN 950 ELSE 0 END) +
            -- Starts with query gets high priority
            (CASE WHEN LOWER(word) LIKE ? AND LOWER(word) != ? THEN 800 ELSE 0 END) +
            (CASE WHEN LOWER(translation) LIKE ? AND LOWER(translation) != ? THEN 750 ELSE 0 END) +
            -- Contains query in word/translation
            (CASE WHEN LOWER(word) LIKE ? AND LOWER(word) NOT LIKE ? THEN 600 ELSE 0 END) +
            (CASE WHEN LOWER(translation) LIKE ? AND LOWER(translation) NOT LIKE ? THEN 550 ELSE 0 END) +
            -- Pronunciation matches
            (CASE WHEN LOWER(word_pronunciation) LIKE ? THEN 400 ELSE 0 END) +
            (CASE WHEN LOWER(translation_pronunciation) LIKE ? THEN 350 ELSE 0 END) +
            -- Memo matches (lowest priority)
            (CASE WHEN LOWER(memo) LIKE ? THEN 200 ELSE 0 END)
          ) as relevance_score
         FROM flashcards 
         WHERE (
           LOWER(word) LIKE ? 
           OR LOWER(translation) LIKE ? 
           OR LOWER(word_pronunciation) LIKE ?
           OR LOWER(translation_pronunciation) LIKE ?
           OR LOWER(memo) LIKE ?
         )
         AND relevance_score > 0
         ORDER BY relevance_score DESC, LENGTH(word) ASC, created_at DESC`,
        [
          // Scoring parameters (in order of CASE statements)
          exactTerm, exactTerm, // Exact matches
          startsWithTerm, exactTerm, // Word starts with (exclude exact)
          startsWithTerm, exactTerm, // Translation starts with (exclude exact)
          searchTerm, startsWithTerm, // Word contains (exclude starts with)
          searchTerm, startsWithTerm, // Translation contains (exclude starts with)
          searchTerm, searchTerm, // Pronunciation contains
          searchTerm, // Memo contains
          // WHERE clause parameters
          searchTerm, searchTerm, searchTerm, searchTerm, searchTerm
        ]
      );

      return rows.map((row: any) => this.mapRowToFlashcard(row as any));
    } catch (error) {
      console.error('Error searching flashcards:', error);
      return [];
    }
  }

  /**
   * Get search suggestions for auto-complete with strict partial matching
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const db = await this.getDb();
      const containsTerm = `%${query.toLowerCase()}%`;
      const startsWithTerm = `${query.toLowerCase()}%`;
      
      // Prioritize suggestions that start with the query, then those that contain it
      const suggestions: string[] = [];
      
      // First, get words that start with the query
      const startsWithWords = await db.getAllAsync(
        `SELECT DISTINCT word FROM flashcards 
         WHERE LOWER(word) LIKE ? 
         ORDER BY LENGTH(word), word 
         LIMIT ?`,
        [startsWithTerm, Math.ceil(limit * 0.4)]
      );
      
      // Then, get translations that start with the query
      const startsWithTranslations = await db.getAllAsync(
        `SELECT DISTINCT translation FROM flashcards 
         WHERE LOWER(translation) LIKE ? 
         ORDER BY LENGTH(translation), translation 
         LIMIT ?`,
        [startsWithTerm, Math.ceil(limit * 0.4)]
      );
      
      // Add words that contain the query (but don't start with it)
      const containsWords = await db.getAllAsync(
        `SELECT DISTINCT word FROM flashcards 
         WHERE LOWER(word) LIKE ? AND NOT LOWER(word) LIKE ?
         ORDER BY LENGTH(word), word 
         LIMIT ?`,
        [containsTerm, startsWithTerm, Math.ceil(limit * 0.1)]
      );
      
      // Add translations that contain the query (but don't start with it)
      const containsTranslations = await db.getAllAsync(
        `SELECT DISTINCT translation FROM flashcards 
         WHERE LOWER(translation) LIKE ? AND NOT LOWER(translation) LIKE ?
         ORDER BY LENGTH(translation), translation 
         LIMIT ?`,
        [containsTerm, startsWithTerm, Math.ceil(limit * 0.1)]
      );

      // Combine results with priority order
      suggestions.push(
        ...startsWithWords.map((row: any) => row.word),
        ...startsWithTranslations.map((row: any) => row.translation),
        ...containsWords.map((row: any) => row.word),
        ...containsTranslations.map((row: any) => row.translation)
      );

      // Remove duplicates and limit results
      return Array.from(new Set(suggestions)).slice(0, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Create multiple flashcards in a transaction
   */
  async createMany(flashcardsData: CreateFlashcard[]): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      const flashcards: Flashcard[] = [];
      const insertedIds: number[] = [];

      // First, insert all flashcards
      await db.withTransactionAsync(async () => {
        for (const data of flashcardsData) {
          validateRequiredFields(data, ['word', 'translation']);

          const result = await db.runAsync(
            `INSERT INTO flashcards (word, word_pronunciation, translation, translation_pronunciation, memo, folder_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              data.word,
              data.wordPronunciation || null,
              data.translation,
              data.translationPronunciation || null,
              data.memo || null,
              data.folderId || null,
            ]
          );

          if (result.lastInsertRowId) {
            insertedIds.push(result.lastInsertRowId);
          }
        }
      });

      // Then, fetch all created flashcards
      if (insertedIds.length > 0) {
        const placeholders = insertedIds.map(() => '?').join(',');
        const rows = await db.getAllAsync(
          `SELECT * FROM flashcards WHERE id IN (${placeholders}) ORDER BY id`,
          insertedIds
        );

        for (const row of rows) {
          const flashcard = this.mapRowToFlashcard(row);
          flashcards.push(flashcard);
          this.setCache(flashcard);
        }
      }

      return flashcards;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw handleDatabaseError(error, 'create multiple flashcards');
    }
  }

  /**
   * Delete multiple flashcards
   */
  async deleteMany(ids: number[]): Promise<void> {
    try {
      if (ids.length === 0) return;

      const db = await this.getDb();
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM flashcards WHERE id IN (${placeholders})`,
        ids
      );
    } catch (error) {
      console.error('Error deleting multiple flashcards:', error);
      throw error;
    }
  }

  /**
   * Move multiple flashcards to a folder
   */
  async moveManyToFolder(ids: number[], folderId: number | null): Promise<void> {
    try {
      if (ids.length === 0) return;

      const db = await this.getDb();
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE flashcards SET folder_id = ? WHERE id IN (${placeholders})`,
        [folderId, ...ids]
      );
    } catch (error) {
      console.error('Error moving multiple flashcards to folder:', error);
      throw error;
    }
  }

  /**
   * Get flashcard count by folder
   */
  async getCountByFolder(folderId: number | null): Promise<number> {
    try {
      const db = await this.getDb();
      const query = folderId === null
        ? 'SELECT COUNT(*) as count FROM flashcards WHERE folder_id IS NULL'
        : 'SELECT COUNT(*) as count FROM flashcards WHERE folder_id = ?';

      const params = folderId === null ? [] : [folderId];
      const result = await db.getFirstAsync(query, params) as { count: number } | null;
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting flashcard count by folder:', error);
      return 0;
    }
  }

  /**
   * Get random flashcards from folder
   */
  async getRandomFromFolder(folderId: number | null, count: number): Promise<Flashcard[]> {
    try {
      const db = await this.getDb();
      const query = folderId === null
        ? 'SELECT * FROM flashcards WHERE folder_id IS NULL ORDER BY RANDOM() LIMIT ?'
        : 'SELECT * FROM flashcards WHERE folder_id = ? ORDER BY RANDOM() LIMIT ?';

      const params = folderId === null ? [count] : [folderId, count];
      const rows = await db.getAllAsync(query, params);

      return rows.map((row: any) => this.mapRowToFlashcard(row as any));
    } catch (error) {
      console.error('Error getting random flashcards from folder:', error);
      return [];
    }
  }

  /**
   * Check if flashcard exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const flashcard = await this.findById(id);
      return flashcard !== null;
    } catch (error) {
      console.error('Failed to check flashcard existence:', error);
      return false;
    }
  }

  /**
   * Get flashcards with pagination
   */
  async findWithPagination(
    folderId: number | null,
    offset: number,
    limit: number
  ): Promise<{ flashcards: Flashcard[]; total: number }> {
    try {
      const db = await this.getDb();

      // Get total count
      const countQuery = folderId === null
        ? 'SELECT COUNT(*) as count FROM flashcards WHERE folder_id IS NULL'
        : 'SELECT COUNT(*) as count FROM flashcards WHERE folder_id = ?';

      const countParams = folderId === null ? [] : [folderId];
      const countResult = await db.getFirstAsync(countQuery, countParams) as { count: number } | null;
      const total = countResult?.count || 0;

      // Get flashcards with pagination
      const dataQuery = folderId === null
        ? 'SELECT * FROM flashcards WHERE folder_id IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?'
        : 'SELECT * FROM flashcards WHERE folder_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const dataParams = folderId === null ? [limit, offset] : [folderId, limit, offset];
      const rows = await db.getAllAsync(dataQuery, dataParams);

      const flashcards = rows.map((row: any) => this.mapRowToFlashcard(row as any));

      return { flashcards, total };
    } catch (error) {
      console.error('Error getting flashcards with pagination:', error);
      return { flashcards: [], total: 0 };
    }
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
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at),
    };
  }
}