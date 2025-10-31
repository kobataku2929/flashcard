// TSV Parser Service

import { TSVRow, CreateFlashcard } from '@/types';
import { AppError, ERROR_CODES } from '@/types/errors';

export interface TSVParseResult {
  flashcards: CreateFlashcard[];
  errors: string[];
  warnings: string[];
  totalLines: number;
  validLines: number;
}

export interface TSVParseOptions {
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  validateRequired?: boolean;
  targetFolderId?: number;
}

export class TSVParser {
  private static readonly DEFAULT_OPTIONS: Required<TSVParseOptions> = {
    skipEmptyLines: true,
    trimWhitespace: true,
    validateRequired: false, // Make validation less strict by default
    targetFolderId: undefined as any,
  };

  /**
   * Parse TSV content into flashcards
   */
  static parse(content: string, options: TSVParseOptions = {}): TSVParseResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: TSVParseResult = {
      flashcards: [],
      errors: [],
      warnings: [],
      totalLines: 0,
      validLines: 0,
    };

    try {
      if (!content || typeof content !== 'string') {
        throw new AppError('Invalid content provided', ERROR_CODES.TSV_PARSE_ERROR);
      }

      const lines = content.split(/\r?\n/);
      result.totalLines = lines.length;

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // Skip empty lines if option is set
        if (opts.skipEmptyLines && !line.trim()) {
          return;
        }

        try {
          const flashcard = this.parseLine(line, opts, lineNumber);
          if (flashcard) {
            result.flashcards.push(flashcard);
            result.validLines++;
          }
        } catch (error) {
          const message = error instanceof AppError 
            ? error.message 
            : `Line ${lineNumber}: ${error}`;
          result.errors.push(message);
        }
      });

      // Add summary warnings
      if (result.validLines === 0 && result.totalLines > 0) {
        result.warnings.push('No valid flashcards were found in the file');
      } else if (result.errors.length > 0) {
        result.warnings.push(`${result.errors.length} lines had errors and were skipped`);
      }

    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to parse TSV content';
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Parse a single TSV line
   */
  private static parseLine(
    line: string, 
    options: Required<TSVParseOptions>, 
    lineNumber: number
  ): CreateFlashcard | null {
    if (!line.trim()) {
      return null;
    }

    // Support both TSV (tab) and CSV (comma) formats
    const columns = line.includes('\t') ? line.split('\t') : line.split(',');
    
    if (columns.length < 2) {
      throw new AppError(
        `Line ${lineNumber}: Must have at least 2 columns (word, translation). Found ${columns.length} columns.`,
        ERROR_CODES.TSV_PARSE_ERROR
      );
    }

    // Extract and optionally trim columns
    // Support both formats:
    // 2 columns: word, translation (legacy format)
    // 3+ columns: word, wordPronunciation, translation, translationPronunciation, memo (new format)
    let word: string, wordPronunciation: string | undefined, translation: string;
    let translationPronunciation: string | undefined, memo: string | undefined;

    if (columns.length === 2) {
      // Legacy format: word, translation
      word = options.trimWhitespace ? columns[0]?.trim() : columns[0];
      translation = options.trimWhitespace ? columns[1]?.trim() : columns[1];
      wordPronunciation = undefined;
      translationPronunciation = undefined;
      memo = undefined;
    } else {
      // New format: word, wordPronunciation, translation, translationPronunciation, memo
      word = options.trimWhitespace ? columns[0]?.trim() : columns[0];
      wordPronunciation = options.trimWhitespace ? columns[1]?.trim() : columns[1];
      translation = options.trimWhitespace ? columns[2]?.trim() : columns[2];
      translationPronunciation = options.trimWhitespace ? columns[3]?.trim() : columns[3];
      memo = options.trimWhitespace ? columns[4]?.trim() : columns[4];
    }



    // Validate required fields
    if (options.validateRequired) {
      if (!word || word.trim() === '') {
        throw new AppError(
          `Line ${lineNumber}: Word column (column 1) is required and cannot be empty`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      if (!translation || translation.trim() === '') {
        const translationColumn = columns.length === 2 ? 2 : 3;
        throw new AppError(
          `Line ${lineNumber}: Translation column (column ${translationColumn}) is required and cannot be empty`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    // Create flashcard object
    const flashcard: CreateFlashcard = {
      word: word || '',
      wordPronunciation: wordPronunciation || undefined,
      translation: translation || '',
      translationPronunciation: translationPronunciation || undefined,
      memo: memo || undefined,
      folderId: options.targetFolderId,
    };

    return flashcard;
  }

  /**
   * Validate TSV content without parsing
   */
  static validate(content: string): { isValid: boolean; errors: string[] } {
    const result = this.parse(content, { validateRequired: true });
    return {
      isValid: result.errors.length === 0 && result.validLines > 0,
      errors: result.errors,
    };
  }

  /**
   * Convert flashcards back to TSV format
   */
  static stringify(flashcards: CreateFlashcard[]): string {
    return flashcards
      .map(card => [
        card.word,
        card.wordPronunciation || '',
        card.translation,
        card.translationPronunciation || '',
        card.memo || '',
      ].join('\t'))
      .join('\n');
  }

  /**
   * Get sample TSV format
   */
  static getSampleFormat(): string {
    return `Simple format (2 columns):
hello\tこんにちは
goodbye\tさようなら
thank you\tありがとう

Extended format (3+ columns):
hello\thəˈloʊ\tこんにちは
goodbye\tɡʊdˈbaɪ\tさようなら
thank you\tθæŋk juː\tありがとう`;
  }

  /**
   * Get format description
   */
  static getFormatDescription(): string {
    return `TSV Format:

Supported formats:
1. Simple format (2 columns):
   Column 1: Word (required)
   Column 2: Translation (required)

2. Extended format (3+ columns):
   Column 1: Word (required)
   Column 2: Word pronunciation (optional)
   Column 3: Translation (required)
   Column 4: Translation pronunciation (optional)
   Column 5: Memo (optional)

Each column should be separated by a tab character.
Each row should be on a new line.
Minimum 2 columns required.`;
  }
}