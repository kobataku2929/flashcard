// FlashcardRepository tests

import { FlashcardRepositoryImpl } from '@/repositories/FlashcardRepository';
import { CreateFlashcard, UpdateFlashcard } from '@/types';
import { AppError, ERROR_CODES } from '@/types/errors';
import { setupTestDatabase, teardownTestDatabase, mockDatabase } from '../helpers/testDatabase';

describe('FlashcardRepository', () => {
  let repository: FlashcardRepositoryImpl;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = await setupTestDatabase();
    repository = new FlashcardRepositoryImpl();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('create', () => {
    it('should create a flashcard successfully', async () => {
      const flashcardData: CreateFlashcard = {
        word: 'hello',
        wordPronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translationPronunciation: 'こんにちは',
        memo: 'greeting',
      };

      const mockCreatedFlashcard = {
        id: 1,
        word: 'hello',
        word_pronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translation_pronunciation: 'こんにちは',
        memo: 'greeting',
        folder_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      mockDb.getFirstAsync.mockResolvedValue(mockCreatedFlashcard);

      const result = await repository.create(flashcardData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO flashcards'),
        [
          'hello',
          'həˈloʊ',
          'こんにちは',
          'こんにちは',
          'greeting',
          null,
        ]
      );

      expect(result).toEqual({
        id: 1,
        word: 'hello',
        wordPronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translationPronunciation: 'こんにちは',
        memo: 'greeting',
        folderId: null,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        word: '',
        translation: 'こんにちは',
      } as CreateFlashcard;

      await expect(repository.create(invalidData)).rejects.toThrow(AppError);
    });

    it('should handle database errors', async () => {
      const flashcardData: CreateFlashcard = {
        word: 'hello',
        translation: 'こんにちは',
      };

      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(flashcardData)).rejects.toThrow(AppError);
    });
  });

  describe('findById', () => {
    it('should find flashcard by id', async () => {
      const mockFlashcard = {
        id: 1,
        word: 'hello',
        word_pronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translation_pronunciation: 'こんにちは',
        memo: 'greeting',
        folder_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockFlashcard);

      const result = await repository.findById(1);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM flashcards WHERE id = ?',
        [1]
      );

      expect(result).toEqual({
        id: 1,
        word: 'hello',
        wordPronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translationPronunciation: 'こんにちは',
        memo: 'greeting',
        folderId: null,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when flashcard not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByFolderId', () => {
    it('should find flashcards by folder id', async () => {
      const mockFlashcards = [
        {
          id: 1,
          word: 'hello',
          word_pronunciation: null,
          translation: 'こんにちは',
          translation_pronunciation: null,
          memo: null,
          folder_id: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockFlashcards);

      const result = await repository.findByFolderId(1);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM flashcards WHERE folder_id = ? ORDER BY created_at DESC',
        [1]
      );

      expect(result).toHaveLength(1);
      expect(result[0].folderId).toBe(1);
    });

    it('should find flashcards with null folder id', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await repository.findByFolderId(null);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM flashcards WHERE folder_id IS NULL ORDER BY created_at DESC',
        []
      );
    });
  });

  describe('update', () => {
    it('should update flashcard successfully', async () => {
      const existingFlashcard = {
        id: 1,
        word: 'hello',
        word_pronunciation: null,
        translation: 'こんにちは',
        translation_pronunciation: null,
        memo: null,
        folder_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const updatedFlashcard = {
        ...existingFlashcard,
        memo: 'updated memo',
        updated_at: '2023-01-01T01:00:00.000Z',
      };

      const updateData: UpdateFlashcard = {
        memo: 'updated memo',
      };

      mockDb.getFirstAsync
        .mockResolvedValueOnce(existingFlashcard)
        .mockResolvedValueOnce(updatedFlashcard);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const result = await repository.update(1, updateData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE flashcards'),
        expect.arrayContaining(['updated memo'])
      );

      expect(result.memo).toBe('updated memo');
    });

    it('should throw error when flashcard not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const updateData: UpdateFlashcard = { memo: 'test' };

      await expect(repository.update(999, updateData)).rejects.toThrow(
        new AppError('Flashcard not found', ERROR_CODES.FLASHCARD_NOT_FOUND)
      );
    });
  });

  describe('delete', () => {
    it('should delete flashcard successfully', async () => {
      const existingFlashcard = {
        id: 1,
        word: 'hello',
        translation: 'こんにちは',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(existingFlashcard);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM flashcards WHERE id = ?',
        [1]
      );
    });

    it('should throw error when flashcard not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow(
        new AppError('Flashcard not found', ERROR_CODES.FLASHCARD_NOT_FOUND)
      );
    });
  });

  describe('search', () => {
    it('should search flashcards by query', async () => {
      const mockResults = [
        {
          id: 1,
          word: 'hello',
          word_pronunciation: null,
          translation: 'こんにちは',
          translation_pronunciation: null,
          memo: null,
          folder_id: null,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockResults);

      const result = await repository.search('hello');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE word LIKE ? OR translation LIKE ? OR memo LIKE ?'),
        ['%hello%', '%hello%', '%hello%']
      );

      expect(result).toHaveLength(1);
    });
  });
});