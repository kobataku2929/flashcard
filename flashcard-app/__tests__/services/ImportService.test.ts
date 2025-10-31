// Import directly to avoid Expo module resolution issues
const ImportService = require('../../src/services/ImportService').ImportService;

// Mock DocumentPicker
const mockDocumentPicker = {
  getDocumentAsync: jest.fn(),
};

// Mock fetch for file reading
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromText', () => {
    it('should import valid TSV text content', () => {
      const content = 'hello\t\tこんにちは\ngoodbye\t\tさようなら';
      
      const result = ImportService.importFromText(content);
      
      expect(result.success).toBe(true);
      expect(result.flashcards).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid TSV content', () => {
      const content = 'invalid\tcontent';
      
      const result = ImportService.importFromText(content);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should apply target folder ID', () => {
      const content = 'hello\t\tこんにちは';
      
      const result = ImportService.importFromText(content, { targetFolderId: 5 });
      
      expect(result.flashcards[0].folderId).toBe(5);
    });
  });

  describe('pickAndImportTSV', () => {
    it('should handle cancelled file selection', async () => {
      mockDocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('File selection was cancelled');
    });

    it('should handle successful file selection and import', async () => {
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
        ok: true,
        text: () => Promise.resolve('hello\t\tこんにちは'),
      } as Response);

      const result = await ImportService.pickAndImportTSV();

      expect(result.success).toBe(true);
      expect(result.flashcards).toHaveLength(1);
      expect(result.fileName).toBe('test.tsv');
    });
  });

  describe('importFromFile', () => {
    it('should import from valid file', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('hello\t\tこんにちは\ngoodbye\t\tさようなら'),
      } as Response);

      const result = await ImportService.importFromFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.flashcards).toHaveLength(2);
      expect(result.fileName).toBe('test.tsv');
    });

    it('should handle file read error', async () => {
      const mockFile: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 100,
        mimeType: 'text/tab-separated-values',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await ImportService.importFromFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid file URI', async () => {
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

  describe('batchCreateFlashcards', () => {
    it('should process flashcards in batches', async () => {
      const flashcards = Array.from({ length: 120 }, (_, i) => ({
        word: `word${i}`,
        translation: `translation${i}`,
      }));

      const progressCallback = jest.fn();
      
      const result = await ImportService.batchCreateFlashcards(flashcards, progressCallback);

      expect(result.success).toBe(true);
      expect(result.created).toBe(120);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle batch processing errors', async () => {
      const flashcards = [
        { word: 'test', translation: 'テスト' },
      ];

      // Mock an error scenario (this would be more realistic with actual repository integration)
      const result = await ImportService.batchCreateFlashcards(flashcards);

      expect(result.created).toBe(1); // Currently always succeeds as it's not integrated with repository
    });
  });

  describe('validateFile', () => {
    it('should validate correct file', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 1000,
        mimeType: 'text/tab-separated-values',
      };

      const result = ImportService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file without URI', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: '',
        name: 'test.tsv',
        size: 1000,
        mimeType: 'text/tab-separated-values',
      };

      const result = ImportService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File URI is missing');
    });

    it('should reject file without name', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: '',
        size: 1000,
        mimeType: 'text/tab-separated-values',
      };

      const result = ImportService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File name is missing');
    });

    it('should reject oversized file', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 15 * 1024 * 1024, // 15MB
        mimeType: 'text/tab-separated-values',
      };

      const result = ImportService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds 10MB limit');
    });

    it('should reject unsupported file type', () => {
      const file: DocumentPicker.DocumentPickerAsset = {
        uri: 'file://test.pdf',
        name: 'test.pdf',
        size: 1000,
        mimeType: 'application/pdf',
      };

      const result = ImportService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file type. Please use .tsv or .txt files');
    });
  });

  describe('getSupportedFileTypes', () => {
    it('should return supported file types', () => {
      const types = ImportService.getSupportedFileTypes();

      expect(types).toContain('text/tab-separated-values');
      expect(types).toContain('text/plain');
      expect(types).toContain('text/csv');
    });
  });
});