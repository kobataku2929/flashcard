import { TSVParser } from '@/services/TSVParser';
import { ImportService } from '@/services/ImportService';
import * as DocumentPicker from 'expo-document-picker';

// Mock DocumentPicker
jest.mock('expo-document-picker');
const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

// Mock fetch for file reading
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('TSV Import Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-end TSV import flow', () => {
    it('should complete full import flow from file selection to flashcard creation', async () => {
      // Prepare test data
      const tsvContent = [
        'hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting',
        'goodbye\tɡʊdˈbaɪ\tさようなら\tさようなら\tfarewell',
        'thank you\tθæŋk juː\tありがとう\tありがとう\tgratitude',
      ].join('\n');

      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'vocabulary.tsv',
        size: tsvContent.length,
        mimeType: 'text/tab-separated-values',
      };

      // Mock file selection
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock file reading
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(tsvContent),
      } as Response);

      // Execute import flow
      const importResult = await ImportService.pickAndImportTSV({
        targetFolderId: 1,
        validateRequired: true,
      });

      // Verify import result
      expect(importResult.success).toBe(true);
      expect(importResult.flashcards).toHaveLength(3);
      expect(importResult.totalProcessed).toBe(3);
      expect(importResult.errors).toHaveLength(0);
      expect(importResult.fileName).toBe('vocabulary.tsv');

      // Verify flashcard data
      expect(importResult.flashcards[0]).toEqual({
        word: 'hello',
        wordPronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translationPronunciation: 'こんにちは',
        memo: 'greeting',
        folderId: 1,
      });

      expect(importResult.flashcards[1]).toEqual({
        word: 'goodbye',
        wordPronunciation: 'ɡʊdˈbaɪ',
        translation: 'さようなら',
        translationPronunciation: 'さようなら',
        memo: 'farewell',
        folderId: 1,
      });

      expect(importResult.flashcards[2]).toEqual({
        word: 'thank you',
        wordPronunciation: 'θæŋk juː',
        translation: 'ありがとう',
        translationPronunciation: 'ありがとう',
        memo: 'gratitude',
        folderId: 1,
      });
    });

    it('should handle mixed valid and invalid data', async () => {
      const tsvContent = [
        'hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting',
        'invalid\tline', // Invalid: insufficient columns
        '', // Empty line
        'goodbye\t\tさようなら', // Valid: minimum required columns
        '\t\t', // Invalid: empty required fields
      ].join('\n');

      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://mixed.tsv',
        name: 'mixed.tsv',
        size: tsvContent.length,
        mimeType: 'text/tab-separated-values',
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(tsvContent),
      } as Response);

      const importResult = await ImportService.pickAndImportTSV({
        skipEmptyLines: true,
        validateRequired: true,
      });

      expect(importResult.success).toBe(false); // Has errors
      expect(importResult.flashcards).toHaveLength(2); // Only valid ones
      expect(importResult.errors.length).toBeGreaterThan(0);
      expect(importResult.totalProcessed).toBe(2);
    });

    it('should handle large file import with progress tracking', async () => {
      // Generate large dataset
      const flashcards = Array.from({ length: 150 }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
      }));

      const progressCallback = jest.fn();
      
      const result = await ImportService.batchCreateFlashcards(flashcards, progressCallback);

      expect(result.success).toBe(true);
      expect(result.created).toBe(150);
      expect(progressCallback).toHaveBeenCalledTimes(3); // 150 / 50 = 3 batches
      
      // Verify progress calls
      expect(progressCallback).toHaveBeenCalledWith(50, 150);
      expect(progressCallback).toHaveBeenCalledWith(100, 150);
      expect(progressCallback).toHaveBeenCalledWith(150, 150);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle file read errors gracefully', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://corrupted.tsv',
        name: 'corrupted.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock file read failure
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const importResult = await ImportService.pickAndImportTSV();

      expect(importResult.success).toBe(false);
      expect(importResult.flashcards).toHaveLength(0);
      expect(importResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle document picker errors', async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error('Permission denied')
      );

      const importResult = await ImportService.pickAndImportTSV();

      expect(importResult.success).toBe(false);
      expect(importResult.errors).toContain('Permission denied');
    });

    it('should validate file before processing', () => {
      const oversizedFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://huge.tsv',
        name: 'huge.tsv',
        size: 15 * 1024 * 1024, // 15MB
        mimeType: 'text/tab-separated-values',
      };

      const validation = ImportService.validateFile(oversizedFile);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File size exceeds 10MB limit');
    });

    it('should reject unsupported file types', () => {
      const unsupportedFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://document.pdf',
        name: 'document.pdf',
        size: 1000,
        mimeType: 'application/pdf',
      };

      const validation = ImportService.validateFile(unsupportedFile);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported file type. Please use .tsv or .txt files');
    });
  });

  describe('Data transformation and validation', () => {
    it('should properly transform TSV data to flashcard format', () => {
      const tsvContent = 'word\tpronunciation\ttranslation\ttrans_pronunciation\tmemo_text';
      
      const parseResult = TSVParser.parse(tsvContent, {
        targetFolderId: 5,
        trimWhitespace: true,
        validateRequired: true,
      });

      expect(parseResult.flashcards).toHaveLength(1);
      expect(parseResult.flashcards[0]).toEqual({
        word: 'word',
        wordPronunciation: 'pronunciation',
        translation: 'translation',
        translationPronunciation: 'trans_pronunciation',
        memo: 'memo_text',
        folderId: 5,
      });
    });

    it('should handle optional fields correctly', () => {
      const tsvContent = 'hello\t\tこんにちは'; // Only required fields
      
      const parseResult = TSVParser.parse(tsvContent);

      expect(parseResult.flashcards[0]).toEqual({
        word: 'hello',
        wordPronunciation: undefined,
        translation: 'こんにちは',
        translationPronunciation: undefined,
        memo: undefined,
        folderId: undefined,
      });
    });

    it('should validate required fields when enabled', () => {
      const tsvContent = '\t\tこんにちは'; // Missing word
      
      const parseResult = TSVParser.parse(tsvContent, { validateRequired: true });

      expect(parseResult.errors).toContain('Line 1: Word column is required');
    });

    it('should skip validation when disabled', () => {
      const tsvContent = '\t\t'; // Missing required fields
      
      const parseResult = TSVParser.parse(tsvContent, { validateRequired: false });

      expect(parseResult.flashcards).toHaveLength(1);
      expect(parseResult.errors).toHaveLength(0);
    });
  });

  describe('Round-trip data integrity', () => {
    it('should maintain data integrity through parse and stringify cycle', () => {
      const originalTsv = [
        'hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting',
        'goodbye\tɡʊdˈbaɪ\tさようなら\tさようなら\tfarewell',
      ].join('\n');

      // Parse TSV to flashcards
      const parseResult = TSVParser.parse(originalTsv);
      expect(parseResult.flashcards).toHaveLength(2);

      // Convert back to TSV
      const regeneratedTsv = TSVParser.stringify(parseResult.flashcards);

      // Parse again to verify integrity
      const secondParseResult = TSVParser.parse(regeneratedTsv);

      expect(secondParseResult.flashcards).toEqual(parseResult.flashcards);
    });
  });
});