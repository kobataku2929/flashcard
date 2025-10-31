import { TSVParser } from '@/services/TSVParser';
import { AppError, ERROR_CODES } from '@/types/errors';

describe('TSVParser Error Cases', () => {
  describe('Input validation errors', () => {
    it('should handle null input', () => {
      const result = TSVParser.parse(null as any);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid content provided');
      expect(result.flashcards).toHaveLength(0);
    });

    it('should handle undefined input', () => {
      const result = TSVParser.parse(undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid content provided');
    });

    it('should handle non-string input', () => {
      const result = TSVParser.parse(123 as any);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid content provided');
    });

    it('should handle empty string input', () => {
      const result = TSVParser.parse('');
      
      expect(result.flashcards).toHaveLength(0);
      expect(result.totalLines).toBe(1);
    });
  });

  describe('Format validation errors', () => {
    it('should reject lines with insufficient columns', () => {
      const content = [
        'hello', // Only 1 column
        'hello\tpronunciation', // Only 2 columns
        'hello\tpronunciation\ttranslation', // Valid: 3 columns
      ].join('\n');

      const result = TSVParser.parse(content);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Must have at least 3 columns');
      expect(result.errors[1]).toContain('Must have at least 3 columns');
      expect(result.flashcards).toHaveLength(1); // Only the valid line
    });

    it('should handle malformed TSV with mixed delimiters', () => {
      const content = [
        'hello,pronunciation,translation', // CSV format
        'goodbye\tpronunciation\ttranslation', // TSV format
      ].join('\n');

      const result = TSVParser.parse(content);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Must have at least 3 columns');
      expect(result.flashcards).toHaveLength(1);
    });

    it('should handle lines with only tab characters', () => {
      const content = '\t\t\t\t';

      const result = TSVParser.parse(content, { validateRequired: true });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Word column is required');
      expect(result.errors[1]).toContain('Translation column is required');
    });
  });

  describe('Content validation errors', () => {
    it('should validate required word field', () => {
      const content = '\tpronunciation\ttranslation';

      const result = TSVParser.parse(content, { validateRequired: true });

      expect(result.errors).toContain('Line 1: Word column is required');
      expect(result.flashcards).toHaveLength(0);
    });

    it('should validate required translation field', () => {
      const content = 'word\tpronunciation\t';

      const result = TSVParser.parse(content, { validateRequired: true });

      expect(result.errors).toContain('Line 1: Translation column is required');
      expect(result.flashcards).toHaveLength(0);
    });

    it('should validate both required fields', () => {
      const content = '\tpronunciation\t';

      const result = TSVParser.parse(content, { validateRequired: true });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Word column is required');
      expect(result.errors[1]).toContain('Translation column is required');
    });

    it('should handle whitespace-only required fields', () => {
      const content = '   \tpronunciation\t   ';

      const result = TSVParser.parse(content, { 
        validateRequired: true,
        trimWhitespace: true 
      });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Word column is required');
      expect(result.errors[1]).toContain('Translation column is required');
    });
  });

  describe('Line-specific error reporting', () => {
    it('should report correct line numbers for errors', () => {
      const content = [
        'valid\tpronunciation\ttranslation', // Line 1: Valid
        'invalid\tline', // Line 2: Invalid
        '', // Line 3: Empty (skipped)
        '\tpronunciation\t', // Line 4: Missing required fields
        'another\tvalid\tline', // Line 5: Valid
      ].join('\n');

      const result = TSVParser.parse(content, { 
        validateRequired: true,
        skipEmptyLines: true 
      });

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('Line 2:');
      expect(result.errors[1]).toContain('Line 4:');
      expect(result.errors[2]).toContain('Line 4:');
      expect(result.flashcards).toHaveLength(2); // Lines 1 and 5
    });

    it('should handle multiple errors on the same line', () => {
      const content = '\t\t'; // Missing both word and translation

      const result = TSVParser.parse(content, { validateRequired: true });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Line 1:');
      expect(result.errors[1]).toContain('Line 1:');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle very long lines', () => {
      const longWord = 'a'.repeat(10000);
      const content = `${longWord}\tpronunciation\ttranslation`;

      const result = TSVParser.parse(content);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].word).toBe(longWord);
    });

    it('should handle special characters in content', () => {
      const content = 'hello\t/həˈloʊ/\tこんにちは\t[konnichiwa]\t"greeting" & more';

      const result = TSVParser.parse(content);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0]).toEqual({
        word: 'hello',
        wordPronunciation: '/həˈloʊ/',
        translation: 'こんにちは',
        translationPronunciation: '[konnichiwa]',
        memo: '"greeting" & more',
        folderId: undefined,
      });
    });

    it('should handle newlines within fields (escaped)', () => {
      // Note: This is a limitation - TSV doesn't handle embedded newlines well
      const content = 'hello\tpronunciation\ttranslation with\\nnewline';

      const result = TSVParser.parse(content);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].translation).toBe('translation with\\nnewline');
    });

    it('should handle different line ending formats', () => {
      const contentCRLF = 'hello\tpronunciation\ttranslation\r\ngoodbye\tpronunciation\ttranslation';
      const contentLF = 'hello\tpronunciation\ttranslation\ngoodbye\tpronunciation\ttranslation';
      const contentCR = 'hello\tpronunciation\ttranslation\rgoodbye\tpronunciation\ttranslation';

      const resultCRLF = TSVParser.parse(contentCRLF);
      const resultLF = TSVParser.parse(contentLF);
      const resultCR = TSVParser.parse(contentCR);

      expect(resultCRLF.flashcards).toHaveLength(2);
      expect(resultLF.flashcards).toHaveLength(2);
      expect(resultCR.flashcards).toHaveLength(2);
    });
  });

  describe('Warning generation', () => {
    it('should generate warning when no valid flashcards found', () => {
      const content = [
        'invalid\tline',
        'another\tinvalid',
      ].join('\n');

      const result = TSVParser.parse(content);

      expect(result.warnings).toContain('No valid flashcards were found in the file');
    });

    it('should generate warning when some lines have errors', () => {
      const content = [
        'valid\tpronunciation\ttranslation',
        'invalid\tline',
      ].join('\n');

      const result = TSVParser.parse(content);

      expect(result.warnings).toContain('1 lines had errors and were skipped');
    });

    it('should not generate warnings when all lines are valid', () => {
      const content = [
        'hello\tpronunciation\ttranslation',
        'goodbye\tpronunciation\ttranslation',
      ].join('\n');

      const result = TSVParser.parse(content);

      expect(result.warnings).toHaveLength(0);
    });
  });
});