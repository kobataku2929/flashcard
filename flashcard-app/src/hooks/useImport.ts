// Import-related hooks

import { useState } from 'react';
import { useAppContext } from '@/context';
import * as DocumentPicker from 'expo-document-picker';
import { AppError, ERROR_CODES } from '@/types/errors';

export function useImport() {
  const { actions } = useAppContext();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | undefined>();

  const selectAndImportTSV = async (targetFolderId?: number) => {
    try {
      setImporting(true);
      setImportError(undefined);

      // Select file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/tab-separated-values', 'text/plain', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        throw new AppError('No file selected', ERROR_CODES.FILE_READ_ERROR);
      }

      // Read file content
      const response = await fetch(file.uri);
      const content = await response.text();

      if (!content.trim()) {
        throw new AppError('File is empty', ERROR_CODES.TSV_PARSE_ERROR);
      }

      // Import content
      await actions.importFromTSV(content, targetFolderId);

    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to import file';
      setImportError(message);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const importFromText = async (tsvContent: string, targetFolderId?: number) => {
    try {
      setImporting(true);
      setImportError(undefined);

      if (!tsvContent.trim()) {
        throw new AppError('Content is empty', ERROR_CODES.TSV_PARSE_ERROR);
      }

      await actions.importFromTSV(tsvContent, targetFolderId);

    } catch (error) {
      const message = error instanceof AppError 
        ? error.message 
        : 'Failed to import content';
      setImportError(message);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const validateTSVContent = (content: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      errors.push('Content is empty');
      return { isValid: false, errors };
    }

    let validLines = 0;
    lines.forEach((line, index) => {
      const columns = line.split('\t');
      
      if (columns.length < 3) {
        errors.push(`Line ${index + 1}: Must have at least 3 columns (word, pronunciation, translation)`);
      } else {
        const word = columns[0]?.trim();
        const translation = columns[2]?.trim();
        
        if (!word) {
          errors.push(`Line ${index + 1}: Word column is empty`);
        }
        if (!translation) {
          errors.push(`Line ${index + 1}: Translation column is empty`);
        }
        
        if (word && translation) {
          validLines++;
        }
      }
    });

    if (validLines === 0) {
      errors.push('No valid flashcards found');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const clearImportError = () => {
    setImportError(undefined);
  };

  return {
    importing,
    importError,
    selectAndImportTSV,
    importFromText,
    validateTSVContent,
    clearImportError,
  };
}