import * as DocumentPicker from 'expo-document-picker';
import { TSVParser, TSVParseResult } from './TSVParser';
import { CreateFlashcard } from '@/types';
import { AppError, ERROR_CODES } from '@/types/errors';
import { FlashcardRepositoryImpl } from '@/repositories/FlashcardRepository';

export interface ImportResult {
  success: boolean;
  flashcards: CreateFlashcard[];
  errors: string[];
  warnings: string[];
  totalProcessed: number;
  fileName?: string;
}

export interface ImportOptions {
  targetFolderId?: number;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  validateRequired?: boolean;
}

export class ImportService {
  /**
   * Pick and import TSV file
   */
  static async pickAndImportTSV(options: ImportOptions = {}): Promise<ImportResult> {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/tab-separated-values', 'text/plain', 'text/csv', '*/*'],
        copyToCacheDirectory: false, // Don't copy to cache, read directly
        multiple: false,
      });

      if (result.canceled) {
        return {
          success: false,
          flashcards: [],
          errors: ['File selection was cancelled'],
          warnings: [],
          totalProcessed: 0,
        };
      }

      const file = result.assets[0];
      if (!file) {
        throw new AppError('No file selected', ERROR_CODES.FILE_READ_ERROR);
      }

      return await this.importFromFile(file, options);
    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to pick and import file';
      
      return {
        success: false,
        flashcards: [],
        errors: [message],
        warnings: [],
        totalProcessed: 0,
      };
    }
  }

  /**
   * Import from file asset
   */
  static async importFromFile(
    file: DocumentPicker.DocumentPickerAsset,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    try {
      // Validate file
      if (!file.uri) {
        throw new AppError('Invalid file URI', ERROR_CODES.FILE_READ_ERROR);
      }

      // Read file content
      const content = await this.readFileContent(file);
      
      // Parse TSV content
      const parseResult = TSVParser.parse(content, {
        targetFolderId: options.targetFolderId,
        skipEmptyLines: options.skipEmptyLines ?? true,
        trimWhitespace: options.trimWhitespace ?? true,
        validateRequired: options.validateRequired ?? false, // Make validation less strict
      });



      return {
        success: parseResult.errors.length === 0 && parseResult.validLines > 0,
        flashcards: parseResult.flashcards,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        totalProcessed: parseResult.validLines,
        fileName: file.name,
      };
    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to import file';
      
      console.error('ImportService: Import error:', error);
      
      return {
        success: false,
        flashcards: [],
        errors: [message],
        warnings: [],
        totalProcessed: 0,
        fileName: file.name,
      };
    }
  }

  /**
   * Import from text content directly
   */
  static importFromText(
    content: string,
    options: ImportOptions = {}
  ): ImportResult {
    try {

      
      const parseResult = TSVParser.parse(content, {
        targetFolderId: options.targetFolderId,
        skipEmptyLines: options.skipEmptyLines ?? true,
        trimWhitespace: options.trimWhitespace ?? true,
        validateRequired: options.validateRequired ?? false,
      });



      return {
        success: parseResult.errors.length === 0 && parseResult.validLines > 0,
        flashcards: parseResult.flashcards,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        totalProcessed: parseResult.validLines,
      };
    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to import text content';
      
      console.error('ImportService: Text import error:', error);
      
      return {
        success: false,
        flashcards: [],
        errors: [message],
        warnings: [],
        totalProcessed: 0,
      };
    }
  }

  /**
   * Batch create flashcards
   */
  static async batchCreateFlashcards(
    flashcards: CreateFlashcard[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: boolean; created: number; errors: string[] }> {
    const result = {
      success: true,
      created: 0,
      errors: [] as string[],
    };

    if (flashcards.length === 0) {
      return result;
    }

    const repository = new FlashcardRepositoryImpl();
    const batchSize = 20; // Smaller batch size for better performance
    
    for (let i = 0; i < flashcards.length; i += batchSize) {
      const batch = flashcards.slice(i, i + batchSize);
      
      try {
        // Use createMany for better performance
        const createdFlashcards = await repository.createMany(batch);
        result.created += createdFlashcards.length;
        
        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + batchSize, flashcards.length), flashcards.length);
        }
        
        // Small delay to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        const message = error instanceof AppError 
          ? error.message 
          : `Failed to create batch starting at index ${i}: ${error}`;
        result.errors.push(message);
        result.success = false;
        
        // Try to create individual cards if batch fails
        for (const flashcard of batch) {
          try {
            await repository.create(flashcard);
            result.created++;
          } catch (individualError) {
            const individualMessage = individualError instanceof AppError 
              ? individualError.message 
              : `Failed to create flashcard: ${flashcard.word}`;
            result.errors.push(individualMessage);
          }
        }
      }
    }

    return result;
  }

  /**
   * Read file content from file asset
   */
  private static async readFileContent(file: DocumentPicker.DocumentPickerAsset): Promise<string> {
    try {
      // For web platform, use FileReader with blob
      if (typeof window !== 'undefined') {
        // Try to get the file as a blob first
        if (file.file) {
          // If we have the actual File object, use FileReader
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result;
              if (typeof result === 'string') {
                resolve(result);
              } else {
                reject(new Error('Failed to read file as text'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsText(file.file);
          });
        }
        
        // Fallback: try to fetch the URI
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return await response.text();
        } catch (fetchError) {
          console.error('Fetch failed:', fetchError);
          throw new AppError('Failed to read file content. Please try selecting the file again.', ERROR_CODES.FILE_READ_ERROR);
        }
      }
      
      // For native platforms, use fetch as fallback
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new AppError('Failed to read file', ERROR_CODES.FILE_READ_ERROR);
      }
      return await response.text();
    } catch (error) {
      console.error('readFileContent error:', error);
      throw new AppError(
        'Failed to read file content. Please ensure the file is accessible and try again.',
        ERROR_CODES.FILE_READ_ERROR
      );
    }
  }

  /**
   * Validate file before import
   */
  static validateFile(file: DocumentPicker.DocumentPickerAsset): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file.uri) {
      errors.push('File URI is missing');
    }

    if (!file.name) {
      errors.push('File name is missing');
    }

    // Check file size (limit to 10MB)
    if (file.size && file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file extension
    if (file.name && !this.isSupportedFileType(file.name)) {
      errors.push('Unsupported file type. Please use .tsv or .txt files');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if file type is supported
   */
  private static isSupportedFileType(fileName: string): boolean {
    const supportedExtensions = ['.tsv', '.txt', '.csv'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return supportedExtensions.includes(extension);
  }

  /**
   * Get supported file types for document picker
   */
  static getSupportedFileTypes(): string[] {
    return ['text/tab-separated-values', 'text/plain', 'text/csv'];
  }
}