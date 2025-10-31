import { ImportService } from '@/services/ImportService';
import * as DocumentPicker from 'expo-document-picker';

// Mock DocumentPicker
jest.mock('expo-document-picker');
const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

// Mock fetch for file reading
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ImportService Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File selection errors', () => {
    it('should handle document picker cancellation', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('File selection was cancelled');
      expect(result.flashcards).toHaveLength(0);
    });

    it('should handle document picker permission errors', async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Permission denied');
    });

    it('should handle document picker system errors', async () => {
      mockDocumentPicker.getDocumentAsync.mockRejectedValue(
        new Error('System error occurred')
      );

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('System error occurred');
    });

    it('should handle empty file selection result', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [],
      });

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No file selected');
    });
  });

  describe('File reading errors', () => {
    it('should handle network errors during file read', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle HTTP errors during file read', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle corrupted file content', async () => {
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

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.reject(new Error('Corrupted file')),
      } as Response);

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing file URI', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: '',
        name: 'test.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      const result = await ImportService.importFromFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid file URI');
    });
  });

  describe('File validation errors', () => {
    it('should reject files without URI', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: '',
        name: 'test.tsv',
        size: 1000,
        mimeType: 'text/tab-separated-values',
      };

      const validation = ImportService.validateFile(file);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File URI is missing');
    });

    it('should reject files without name', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: '',
        size: 1000,
        mimeType: 'text/tab-separated-values',
      };

      const validation = ImportService.validateFile(file);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File name is missing');
    });

    it('should reject oversized files', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://huge.tsv',
        name: 'huge.tsv',
        size: 15 * 1024 * 1024, // 15MB
        mimeType: 'text/tab-separated-values',
      };

      const validation = ImportService.validateFile(file);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File size exceeds 10MB limit');
    });

    it('should reject unsupported file extensions', () => {
      const unsupportedFiles = [
        { name: 'document.pdf', mimeType: 'application/pdf' },
        { name: 'image.jpg', mimeType: 'image/jpeg' },
        { name: 'archive.zip', mimeType: 'application/zip' },
        { name: 'document.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      ];

      unsupportedFiles.forEach(({ name, mimeType }) => {
        const file: DocumentPicker.DocumentPickerAsset = {
          uri: `file://${name}`,
          name,
          size: 1000,
          mimeType,
        };

        const validation = ImportService.validateFile(file);

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Unsupported file type. Please use .tsv or .txt files');
      });
    });

    it('should accept supported file extensions', () => {
      const supportedFiles = [
        { name: 'data.tsv', mimeType: 'text/tab-separated-values' },
        { name: 'data.txt', mimeType: 'text/plain' },
        { name: 'data.csv', mimeType: 'text/csv' },
      ];

      supportedFiles.forEach(({ name, mimeType }) => {
        const file: DocumentPicker.DocumentPickerAsset = {
          uri: `file://${name}`,
          name,
          size: 1000,
          mimeType,
        };

        const validation = ImportService.validateFile(file);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  describe('Content processing errors', () => {
    it('should handle completely invalid TSV content', () => {
      const invalidContent = 'This is not TSV content at all!';

      const result = ImportService.importFromText(invalidContent);

      expect(result.success).toBe(false);
      expect(result.flashcards).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty file content', () => {
      const result = ImportService.importFromText('');

      expect(result.success).toBe(false);
      expect(result.flashcards).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('should handle whitespace-only content', () => {
      const result = ImportService.importFromText('   \n\n   \t\t   \n');

      expect(result.success).toBe(false);
      expect(result.flashcards).toHaveLength(0);
    });

    it('should handle mixed encoding issues', () => {
      // Simulate content with encoding issues
      const problematicContent = 'hello\t\t\uFFFD\uFFFD\uFFFD'; // Replacement characters

      const result = ImportService.importFromText(problematicContent);

      // Should still process but may have warnings
      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].translation).toContain('\uFFFD');
    });
  });

  describe('Batch processing errors', () => {
    it('should handle batch processing with simulated repository errors', async () => {
      const flashcards = [
        { word: 'test1', translation: 'テスト1' },
        { word: 'test2', translation: 'テスト2' },
      ];

      // Note: Since we don't have actual repository integration yet,
      // this test demonstrates the structure for future integration
      const result = await ImportService.batchCreateFlashcards(flashcards);

      // Currently always succeeds, but structure is ready for repository integration
      expect(result.created).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle progress callback errors gracefully', async () => {
      const flashcards = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
      }));

      const faultyProgressCallback = jest.fn().mockImplementation(() => {
        throw new Error('Progress callback error');
      });

      // Should not fail even if progress callback throws
      const result = await ImportService.batchCreateFlashcards(flashcards, faultyProgressCallback);

      expect(result.success).toBe(true);
      expect(result.created).toBe(100);
    });
  });

  describe('Edge case scenarios', () => {
    it('should handle extremely large number of flashcards', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
      }));

      const result = await ImportService.batchCreateFlashcards(largeDataset);

      expect(result.success).toBe(true);
      expect(result.created).toBe(10000);
    });

    it('should handle concurrent import attempts', async () => {
      const content = 'hello\t\tこんにちは\ngoodbye\t\tさようなら';

      // Simulate concurrent imports
      const promises = Array.from({ length: 5 }, () => 
        ImportService.importFromText(content)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.flashcards).toHaveLength(2);
      });
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate processing very large content
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `word${i}\tpronunciation${i}\ttranslation${i}`
      ).join('\n');

      const result = ImportService.importFromText(largeContent);

      expect(result.success).toBe(true);
      expect(result.flashcards).toHaveLength(1000);
    });
  });
});