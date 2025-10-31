// Import directly to avoid Expo module resolution issues
const TSVParser = require('../../src/services/TSVParser').TSVParser;

describe('TSVParser', () => {
  describe('parse', () => {
    it('should parse valid TSV content correctly', () => {
      const content = 'hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting\ngoodbye\tɡʊdˈbaɪ\tさようなら\tさようなら\tfarewell';
      
      const result = TSVParser.parse(content);
      
      expect(result.flashcards).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.validLines).toBe(2);
      expect(result.totalLines).toBe(2);
      
      expect(result.flashcards[0]).toEqual({
        word: 'hello',
        wordPronunciation: 'həˈloʊ',
        translation: 'こんにちは',
        translationPronunciation: 'こんにちは',
        memo: 'greeting',
        folderId: undefined,
      });
    });

    it('should handle minimum required columns', () => {
      const content = 'hello\t\tこんにちは';
      
      const result = TSVParser.parse(content);
      
      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0]).toEqual({
        word: 'hello',
        wordPronunciation: undefined,
        translation: 'こんにちは',
        translationPronunciation: undefined,
        memo: undefined,
        folderId: undefined,
      });
    });

    it('should skip empty lines when option is set', () => {
      const content = 'hello\t\tこんにちは\n\ngoodbye\t\tさようなら';
      
      const result = TSVParser.parse(content, { skipEmptyLines: true });
      
      expect(result.flashcards).toHaveLength(2);
      expect(result.totalLines).toBe(3);
      expect(result.validLines).toBe(2);
    });

    it('should trim whitespace when option is set', () => {
      const content = '  hello  \t  həˈloʊ  \t  こんにちは  ';
      
      const result = TSVParser.parse(content, { trimWhitespace: true });
      
      expect(result.flashcards[0].word).toBe('hello');
      expect(result.flashcards[0].wordPronunciation).toBe('həˈloʊ');
      expect(result.flashcards[0].translation).toBe('こんにちは');
    });

    it('should set target folder ID when provided', () => {
      const content = 'hello\t\tこんにちは';
      
      const result = TSVParser.parse(content, { targetFolderId: 5 });
      
      expect(result.flashcards[0].folderId).toBe(5);
    });

    it('should handle validation errors', () => {
      const content = '\t\t\nhello\t\t';
      
      const result = TSVParser.parse(content, { validateRequired: true });
      
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Translation column is required');
      expect(result.errors[1]).toContain('Translation column is required');
    });

    it('should handle insufficient columns', () => {
      const content = 'hello\tpronunciation';
      
      const result = TSVParser.parse(content);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Must have at least 3 columns');
    });

    it('should handle invalid content', () => {
      const result = TSVParser.parse('');
      
      expect(result.flashcards).toHaveLength(0);
      expect(result.totalLines).toBe(1);
    });

    it('should handle null or undefined content', () => {
      const result = TSVParser.parse(null as any);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid content provided');
    });
  });

  describe('validate', () => {
    it('should return valid for correct TSV', () => {
      const content = 'hello\t\tこんにちは';
      
      const result = TSVParser.validate(content);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for incorrect TSV', () => {
      const content = 'hello\tpronunciation';
      
      const result = TSVParser.validate(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('stringify', () => {
    it('should convert flashcards back to TSV format', () => {
      const flashcards: CreateFlashcard[] = [
        {
          word: 'hello',
          wordPronunciation: 'həˈloʊ',
          translation: 'こんにちは',
          translationPronunciation: 'こんにちは',
          memo: 'greeting',
        },
        {
          word: 'goodbye',
          translation: 'さようなら',
        },
      ];
      
      const result = TSVParser.stringify(flashcards);
      
      expect(result).toBe('hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting\ngoodbye\t\tさようなら\t\t');
    });
  });

  describe('getSampleFormat', () => {
    it('should return sample TSV format', () => {
      const sample = TSVParser.getSampleFormat();
      
      expect(sample).toContain('hello\t');
      expect(sample).toContain('goodbye\t');
      expect(sample).toContain('thank you\t');
    });
  });

  describe('getFormatDescription', () => {
    it('should return format description', () => {
      const description = TSVParser.getFormatDescription();
      
      expect(description).toContain('TSV Format:');
      expect(description).toContain('Column 1: Word');
      expect(description).toContain('tab character');
    });
  });
});