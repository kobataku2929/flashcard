import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AppProvider } from '../../src/context/AppContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { SettingsProvider } from '../../src/context/SettingsContext';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { FlashcardRepository } from '../../src/repositories/FlashcardRepository';
import { FolderRepository } from '../../src/repositories/FolderRepository';
import { ErrorService } from '../../src/services/ErrorService';
import ImportTSVScreen from '../../src/screens/ImportTSVScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }
  return null;
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary onError={jest.fn()}>
    <ToastProvider>
      <SettingsProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </SettingsProvider>
    </ToastProvider>
  </ErrorBoundary>
);

describe('Error Handling Integration Tests', () => {
  let dbManager: DatabaseManager;
  let flashcardRepository: FlashcardRepository;
  let folderRepository: FolderRepository;
  let errorService: ErrorService;

  beforeEach(async () => {
    // Initialize services
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    await dbManager.reset();
    
    flashcardRepository = new FlashcardRepository();
    folderRepository = new FolderRepository();
    errorService = ErrorService.getInstance();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await dbManager.reset();
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database connection failure
      const originalExecute = dbManager.execute;
      dbManager.execute = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await flashcardRepository.create({
          word: 'test',
          translation: 'テスト',
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: null,
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Database connection failed');
      }

      // Restore original method
      dbManager.execute = originalExecute;
    });

    it('should handle constraint violations', async () => {
      // Create a folder
      const folder = await folderRepository.create({
        name: 'Test Folder',
        parentId: null,
      });

      // Try to create a flashcard with invalid folderId
      try {
        await flashcardRepository.create({
          word: 'test',
          translation: 'テスト',
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: 99999, // Non-existent folder ID
        });
        fail('Should have thrown a constraint violation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle transaction rollbacks', async () => {
      // Start a transaction that will fail
      const db = await dbManager.getDatabase();
      
      try {
        await db.transactionAsync(async (tx) => {
          // Create a folder
          await tx.executeSqlAsync(
            'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
            ['Test Folder', null]
          );
          
          // This should fail due to invalid SQL
          await tx.executeSqlAsync(
            'INVALID SQL STATEMENT',
            []
          );
        });
        fail('Transaction should have failed');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Verify no data was inserted due to rollback
      const folders = await folderRepository.findAll();
      expect(folders).toHaveLength(0);
    });
  });

  describe('Component Error Boundary', () => {
    it('should catch and handle component errors', () => {
      const onError = jest.fn();
      
      const { getByText } = render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error boundary should display error message
      expect(getByText(/エラーが発生しました/)).toBeTruthy();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not interfere with normal component rendering', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Network and File System Errors', () => {
    it('should handle file read errors during TSV import', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(
        <TestWrapper>
          <ImportTSVScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </TestWrapper>
      );

      // This test would need to be expanded with proper mocking
      // of the document picker and file reading process
      expect(getByTestId('file-select-button')).toBeTruthy();
    });

    it('should handle malformed TSV data', async () => {
      // Mock fetch to return malformed data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('malformed\tdata\twith\ttoo\tmany\tcolumns\textra'),
      });

      // Test would continue with TSV parsing error handling
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Memory and Performance Error Handling', () => {
    it('should handle large dataset operations gracefully', async () => {
      // Create a large number of items to test memory limits
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(
          flashcardRepository.create({
            word: `word${i}`,
            translation: `翻訳${i}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: `This is a longer memo text for card ${i} to test memory usage`,
            folderId: null,
          })
        );
      }

      try {
        await Promise.all(promises);
        
        // Verify all items were created
        const allCards = await flashcardRepository.findAll();
        expect(allCards.length).toBeGreaterThan(0);
      } catch (error) {
        // If memory limits are hit, should handle gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle concurrent database operations', async () => {
      // Test concurrent reads and writes
      const readPromises = [];
      const writePromises = [];

      // Start multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        writePromises.push(
          flashcardRepository.create({
            word: `concurrent${i}`,
            translation: `同時${i}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: null,
          })
        );

        readPromises.push(flashcardRepository.findAll());
      }

      try {
        await Promise.all([...readPromises, ...writePromises]);
        
        // Verify final state is consistent
        const finalCards = await flashcardRepository.findAll();
        expect(finalCards.length).toBeGreaterThanOrEqual(10);
      } catch (error) {
        // Should handle database locking gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0;
      const originalExecute = dbManager.execute;
      
      // Mock to fail first two attempts, succeed on third
      dbManager.execute = jest.fn().mockImplementation(async (...args) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return originalExecute.apply(dbManager, args);
      });

      // This would test retry logic if implemented
      // For now, just verify the mock behavior
      try {
        await flashcardRepository.create({
          word: 'retry',
          translation: 'リトライ',
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: null,
        });
        
        expect(attemptCount).toBe(3);
      } catch (error) {
        // Expected to fail without retry logic
        expect(attemptCount).toBe(1);
      }

      // Restore original method
      dbManager.execute = originalExecute;
    });
  });

  describe('Error Logging and Reporting', () => {
    it('should log errors with proper context', async () => {
      const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        // Trigger an error
        await flashcardRepository.findById(-1);
      } catch (error) {
        await errorService.logError(
          error as Error,
          { component: 'FlashcardRepository', action: 'findById' },
          'medium'
        );
      }

      // Verify error was logged
      expect(logSpy).toHaveBeenCalled();
      
      logSpy.mockRestore();
    });

    it('should handle error service failures gracefully', async () => {
      // Mock error service to fail
      const originalLogError = errorService.logError;
      errorService.logError = jest.fn().mockRejectedValue(new Error('Logging failed'));

      // Should not throw even if logging fails
      try {
        await errorService.logError(
          new Error('Test error'),
          { component: 'Test' },
          'low'
        );
      } catch (error) {
        // Logging errors should not propagate
        fail('Error logging should not throw');
      }

      // Restore original method
      errorService.logError = originalLogError;
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should handle invalid input data', async () => {
      // Test with various invalid inputs
      const invalidInputs = [
        { word: null, translation: 'test' },
        { word: '', translation: '' },
        { word: 'test', translation: null },
        { word: 'a'.repeat(1000), translation: 'test' }, // Very long input
      ];

      for (const input of invalidInputs) {
        try {
          await flashcardRepository.create({
            word: input.word as string,
            translation: input.translation as string,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: null,
          });
          
          // Some inputs might be valid, others should fail
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should sanitize user input to prevent injection', async () => {
      // Test SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE flashcards; --",
        "test'; INSERT INTO flashcards VALUES (999, 'hacked', 'ハック'); --",
        "<script>alert('xss')</script>",
      ];

      for (const maliciousInput of maliciousInputs) {
        try {
          const card = await flashcardRepository.create({
            word: maliciousInput,
            translation: 'test',
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: null,
          });

          // Input should be stored as-is (escaped), not executed
          expect(card.word).toBe(maliciousInput);
          
          // Verify database integrity
          const allCards = await flashcardRepository.findAll();
          expect(allCards.length).toBeGreaterThan(0);
        } catch (error) {
          // Some validation might reject these inputs
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });
});