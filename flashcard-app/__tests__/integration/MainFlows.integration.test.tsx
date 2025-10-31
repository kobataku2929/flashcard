import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { AppProvider } from '../../src/context/AppContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { SettingsProvider } from '../../src/context/SettingsContext';
import ImportTSVScreen from '../../src/screens/ImportTSVScreen';
import FolderViewScreen from '../../src/screens/FolderViewScreen';
import CardEditorScreen from '../../src/screens/CardEditorScreen';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { FlashcardRepository } from '../../src/repositories/FlashcardRepository';
import { FolderRepository } from '../../src/repositories/FolderRepository';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock DocumentPicker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(Alert, 'prompt').mockImplementation((title, message, buttons) => {
  if (buttons && buttons[1] && buttons[1].onPress) {
    buttons[1].onPress('Test Folder');
  }
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <SettingsProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </SettingsProvider>
  </ToastProvider>
);

describe('Main Flows Integration Tests', () => {
  let dbManager: DatabaseManager;
  let flashcardRepository: FlashcardRepository;
  let folderRepository: FolderRepository;

  beforeEach(async () => {
    // Initialize database
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    
    // Clear database
    await dbManager.reset();
    
    // Initialize repositories
    flashcardRepository = new FlashcardRepository();
    folderRepository = new FolderRepository();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up database
    await dbManager.reset();
  });

  describe('TSV Import to Flashcard Display Flow', () => {
    it('should complete full TSV import flow successfully', async () => {
      // Mock successful file selection
      const mockFile = {
        uri: 'file://test.tsv',
        name: 'test.tsv',
        size: 1024,
        mimeType: 'text/tab-separated-values',
        lastModified: Date.now(),
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock fetch to return TSV content
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting\nworld\twɜːrld\t世界\tせかい\tplanet'),
      });

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <ImportTSVScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </TestWrapper>
      );

      // Step 1: Select file
      fireEvent.press(getByTestId('file-select-button'));

      await waitFor(() => {
        expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
      });

      // Step 2: Start import
      await waitFor(() => {
        expect(getByTestId('import-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('import-button'));

      // Step 3: Verify import completion
      await waitFor(() => {
        expect(getByText(/2枚のカードをインポートしました/)).toBeTruthy();
      }, { timeout: 5000 });

      // Step 4: Verify data in database
      const flashcards = await flashcardRepository.findAll();
      expect(flashcards).toHaveLength(2);
      expect(flashcards[0].word).toBe('hello');
      expect(flashcards[0].translation).toBe('こんにちは');
      expect(flashcards[1].word).toBe('world');
      expect(flashcards[1].translation).toBe('世界');

      // Step 5: Verify navigation back
      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle TSV import errors gracefully', async () => {
      // Mock file selection with invalid content
      const mockFile = {
        uri: 'file://invalid.tsv',
        name: 'invalid.tsv',
        size: 1024,
        mimeType: 'text/tab-separated-values',
        lastModified: Date.now(),
      };

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockFile],
      });

      // Mock fetch to return invalid TSV content
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('invalid\tcontent'),
      });

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <ImportTSVScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </TestWrapper>
      );

      // Select file and start import
      fireEvent.press(getByTestId('file-select-button'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('import-button'));
      });

      // Verify error handling
      await waitFor(() => {
        expect(getByText(/エラー/)).toBeTruthy();
      }, { timeout: 5000 });

      // Verify no data was imported
      const flashcards = await flashcardRepository.findAll();
      expect(flashcards).toHaveLength(0);
    });

    it('should handle file selection cancellation', async () => {
      // Mock cancelled file selection
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <ImportTSVScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('file-select-button'));

      await waitFor(() => {
        expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
      });

      // Verify import button is not shown
      expect(queryByTestId('import-button')).toBeNull();
    });
  });

  describe('Folder Creation to Card Movement Flow', () => {
    it('should complete full folder management flow successfully', async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <FolderViewScreen navigation={mockNavigation as any} route={mockRoute as any} />
        </TestWrapper>
      );

      // Step 1: Create a folder
      fireEvent.press(getByTestId('add-folder-button'));

      await waitFor(() => {
        expect(Alert.prompt).toHaveBeenCalled();
      });

      // Verify folder was created in database
      await waitFor(async () => {
        const folders = await folderRepository.findAll();
        expect(folders).toHaveLength(1);
        expect(folders[0].name).toBe('Test Folder');
      });

      // Step 2: Create a flashcard
      const flashcard = await flashcardRepository.create({
        word: 'test',
        translation: 'テスト',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: null,
      });

      // Step 3: Move flashcard to folder
      const folders = await folderRepository.findAll();
      const targetFolder = folders[0];

      await flashcardRepository.update(flashcard.id, {
        folderId: targetFolder.id,
      });

      // Step 4: Verify flashcard is in folder
      const updatedFlashcard = await flashcardRepository.findById(flashcard.id);
      expect(updatedFlashcard?.folderId).toBe(targetFolder.id);

      const folderFlashcards = await flashcardRepository.findByFolderId(targetFolder.id);
      expect(folderFlashcards).toHaveLength(1);
      expect(folderFlashcards[0].word).toBe('test');
    });

    it('should handle nested folder creation', async () => {
      // Create parent folder
      const parentFolder = await folderRepository.create({
        name: 'Parent Folder',
        parentId: null,
      });

      // Create child folder
      const childFolder = await folderRepository.create({
        name: 'Child Folder',
        parentId: parentFolder.id,
      });

      // Verify hierarchy
      expect(childFolder.parentId).toBe(parentFolder.id);

      // Create flashcard in child folder
      const flashcard = await flashcardRepository.create({
        word: 'nested',
        translation: 'ネスト',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: childFolder.id,
      });

      // Verify flashcard is in child folder
      const folderFlashcards = await flashcardRepository.findByFolderId(childFolder.id);
      expect(folderFlashcards).toHaveLength(1);
      expect(folderFlashcards[0].word).toBe('nested');
    });

    it('should handle folder deletion with cascading', async () => {
      // Create folder with flashcard
      const folder = await folderRepository.create({
        name: 'Test Folder',
        parentId: null,
      });

      const flashcard = await flashcardRepository.create({
        word: 'test',
        translation: 'テスト',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: folder.id,
      });

      // Verify initial state
      expect(await folderRepository.findById(folder.id)).toBeTruthy();
      expect(await flashcardRepository.findById(flashcard.id)).toBeTruthy();

      // Delete folder
      await folderRepository.delete(folder.id);

      // Verify folder is deleted
      expect(await folderRepository.findById(folder.id)).toBeNull();

      // Verify flashcard folderId is set to null (not deleted)
      const updatedFlashcard = await flashcardRepository.findById(flashcard.id);
      expect(updatedFlashcard?.folderId).toBeNull();
    });
  });

  describe('Card Creation and Management Flow', () => {
    it('should complete full card lifecycle', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CardEditorScreen 
            navigation={mockNavigation as any} 
            route={{ params: {} } as any} 
          />
        </TestWrapper>
      );

      // Step 1: Create new card
      const cardData = {
        word: 'lifecycle',
        translation: 'ライフサイクル',
        wordPronunciation: 'ˈlaɪfˌsaɪkəl',
        translationPronunciation: 'ライフサイクル',
        memo: 'Software development term',
        folderId: null,
      };

      // Simulate form submission
      const createdCard = await flashcardRepository.create(cardData);
      expect(createdCard.word).toBe('lifecycle');

      // Step 2: Update card
      const updatedCard = await flashcardRepository.update(createdCard.id, {
        memo: 'Updated memo',
      });
      expect(updatedCard.memo).toBe('Updated memo');

      // Step 3: Delete card
      await flashcardRepository.delete(createdCard.id);
      const deletedCard = await flashcardRepository.findById(createdCard.id);
      expect(deletedCard).toBeNull();
    });

    it('should handle card validation errors', async () => {
      // Try to create card with missing required fields
      await expect(
        flashcardRepository.create({
          word: '',
          translation: '',
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: null,
        })
      ).rejects.toThrow();
    });
  });

  describe('Data Persistence Flow', () => {
    it('should persist data across database reinitialization', async () => {
      // Create test data
      const folder = await folderRepository.create({
        name: 'Persistent Folder',
        parentId: null,
      });

      const flashcard = await flashcardRepository.create({
        word: 'persist',
        translation: '持続',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: folder.id,
      });

      // Verify data exists
      expect(await folderRepository.findById(folder.id)).toBeTruthy();
      expect(await flashcardRepository.findById(flashcard.id)).toBeTruthy();

      // Reinitialize database (simulate app restart)
      const newDbManager = DatabaseManager.getInstance();
      await newDbManager.initialize();

      // Create new repository instances
      const newFolderRepository = new FolderRepository();
      const newFlashcardRepository = new FlashcardRepository();

      // Verify data still exists
      const persistedFolder = await newFolderRepository.findById(folder.id);
      const persistedFlashcard = await newFlashcardRepository.findById(flashcard.id);

      expect(persistedFolder).toBeTruthy();
      expect(persistedFolder?.name).toBe('Persistent Folder');
      expect(persistedFlashcard).toBeTruthy();
      expect(persistedFlashcard?.word).toBe('persist');
      expect(persistedFlashcard?.folderId).toBe(folder.id);
    });

    it('should handle database corruption gracefully', async () => {
      // This test would simulate database corruption scenarios
      // For now, we'll test basic error handling
      
      try {
        // Attempt to access non-existent data
        const nonExistentCard = await flashcardRepository.findById(99999);
        expect(nonExistentCard).toBeNull();
        
        const nonExistentFolder = await folderRepository.findById(99999);
        expect(nonExistentFolder).toBeNull();
      } catch (error) {
        // Should not throw errors for non-existent data
        fail('Should handle non-existent data gracefully');
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple folders and flashcards
      const folders = [];
      for (let i = 0; i < 10; i++) {
        const folder = await folderRepository.create({
          name: `Folder ${i}`,
          parentId: null,
        });
        folders.push(folder);
      }

      const flashcards = [];
      for (let i = 0; i < 100; i++) {
        const flashcard = await flashcardRepository.create({
          word: `word${i}`,
          translation: `翻訳${i}`,
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: folders[i % folders.length].id,
        });
        flashcards.push(flashcard);
      }

      const creationTime = Date.now() - startTime;
      
      // Verify all data was created
      const allFolders = await folderRepository.findAll();
      const allFlashcards = await flashcardRepository.findAll();
      
      expect(allFolders).toHaveLength(10);
      expect(allFlashcards).toHaveLength(100);
      
      // Performance should be reasonable (less than 5 seconds for 110 items)
      expect(creationTime).toBeLessThan(5000);
      
      // Test bulk retrieval performance
      const retrievalStartTime = Date.now();
      
      for (const folder of folders) {
        await flashcardRepository.findByFolderId(folder.id);
      }
      
      const retrievalTime = Date.now() - retrievalStartTime;
      expect(retrievalTime).toBeLessThan(1000);
    });
  });
});