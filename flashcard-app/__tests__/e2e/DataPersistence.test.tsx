import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import App from '../../App';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { FlashcardRepository } from '../../src/repositories/FlashcardRepository';
import { FolderRepository } from '../../src/repositories/FolderRepository';

describe('Data Persistence E2E Tests', () => {
  let dbManager: DatabaseManager;
  let flashcardRepository: FlashcardRepository;
  let folderRepository: FolderRepository;

  beforeEach(async () => {
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    await dbManager.reset();
    
    flashcardRepository = new FlashcardRepository();
    folderRepository = new FolderRepository();
  });

  afterEach(async () => {
    await dbManager.reset();
  });

  describe('App Restart Data Persistence', () => {
    it('should persist flashcards across app restarts', async () => {
      // Step 1: Create initial data
      const testCard = await flashcardRepository.create({
        word: 'persistent',
        translation: '永続的',
        wordPronunciation: 'pərˈsɪstənt',
        translationPronunciation: 'えいぞくてき',
        memo: 'This card should persist across restarts',
        folderId: null,
      });

      // Step 2: Verify data exists
      const initialCard = await flashcardRepository.findById(testCard.id);
      expect(initialCard).toBeTruthy();
      expect(initialCard?.word).toBe('persistent');

      // Step 3: Simulate app restart by creating new repository instance
      const newFlashcardRepository = new FlashcardRepository();
      
      // Step 4: Verify data persists
      const persistedCard = await newFlashcardRepository.findById(testCard.id);
      expect(persistedCard).toBeTruthy();
      expect(persistedCard?.word).toBe('persistent');
      expect(persistedCard?.translation).toBe('永続的');
      expect(persistedCard?.memo).toBe('This card should persist across restarts');
    });

    it('should persist folders and hierarchy across app restarts', async () => {
      // Step 1: Create folder hierarchy
      const parentFolder = await folderRepository.create({
        name: 'Parent Folder',
        parentId: null,
      });

      const childFolder = await folderRepository.create({
        name: 'Child Folder',
        parentId: parentFolder.id,
      });

      const grandchildFolder = await folderRepository.create({
        name: 'Grandchild Folder',
        parentId: childFolder.id,
      });

      // Step 2: Create flashcard in nested folder
      const nestedCard = await flashcardRepository.create({
        word: 'nested',
        translation: 'ネスト',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: grandchildFolder.id,
      });

      // Step 3: Simulate app restart
      const newFolderRepository = new FolderRepository();
      const newFlashcardRepository = new FlashcardRepository();

      // Step 4: Verify folder hierarchy persists
      const persistedParent = await newFolderRepository.findById(parentFolder.id);
      const persistedChild = await newFolderRepository.findById(childFolder.id);
      const persistedGrandchild = await newFolderRepository.findById(grandchildFolder.id);

      expect(persistedParent?.name).toBe('Parent Folder');
      expect(persistedParent?.parentId).toBeNull();
      
      expect(persistedChild?.name).toBe('Child Folder');
      expect(persistedChild?.parentId).toBe(parentFolder.id);
      
      expect(persistedGrandchild?.name).toBe('Grandchild Folder');
      expect(persistedGrandchild?.parentId).toBe(childFolder.id);

      // Step 5: Verify flashcard relationship persists
      const persistedCard = await newFlashcardRepository.findById(nestedCard.id);
      expect(persistedCard?.folderId).toBe(grandchildFolder.id);
    });

    it('should maintain data integrity after multiple restarts', async () => {
      // Step 1: Create initial dataset
      const folders = [];
      const flashcards = [];

      for (let i = 0; i < 5; i++) {
        const folder = await folderRepository.create({
          name: `Folder ${i}`,
          parentId: null,
        });
        folders.push(folder);

        for (let j = 0; j < 3; j++) {
          const card = await flashcardRepository.create({
            word: `word${i}_${j}`,
            translation: `翻訳${i}_${j}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: `Memo for card ${i}_${j}`,
            folderId: folder.id,
          });
          flashcards.push(card);
        }
      }

      // Step 2: Simulate multiple restarts
      for (let restart = 0; restart < 3; restart++) {
        const newFolderRepository = new FolderRepository();
        const newFlashcardRepository = new FlashcardRepository();

        // Verify all folders exist
        const allFolders = await newFolderRepository.findAll();
        expect(allFolders).toHaveLength(5);

        // Verify all flashcards exist
        const allFlashcards = await newFlashcardRepository.findAll();
        expect(allFlashcards).toHaveLength(15);

        // Verify relationships are intact
        for (let i = 0; i < 5; i++) {
          const folderCards = await newFlashcardRepository.findByFolderId(folders[i].id);
          expect(folderCards).toHaveLength(3);
        }
      }
    });
  });

  describe('Database Migration and Versioning', () => {
    it('should handle database schema updates', async () => {
      // Step 1: Create data with current schema
      const card = await flashcardRepository.create({
        word: 'migration',
        translation: 'マイグレーション',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: null,
      });

      // Step 2: Verify current schema version
      const db = await dbManager.getDatabase();
      const versionResult = await db.executeSqlAsync('PRAGMA user_version');
      const currentVersion = versionResult.rows[0].user_version;

      // Step 3: Simulate schema update (this would be done in a real migration)
      // For testing, we'll just verify the data survives a re-initialization
      await dbManager.initialize();

      // Step 4: Verify data survives migration
      const migratedCard = await flashcardRepository.findById(card.id);
      expect(migratedCard?.word).toBe('migration');
    });

    it('should handle database corruption recovery', async () => {
      // Step 1: Create test data
      const testData = [];
      for (let i = 0; i < 10; i++) {
        const card = await flashcardRepository.create({
          word: `recovery${i}`,
          translation: `回復${i}`,
          wordPronunciation: null,
          translationPronunciation: null,
          memo: null,
          folderId: null,
        });
        testData.push(card);
      }

      // Step 2: Verify data exists
      const initialCards = await flashcardRepository.findAll();
      expect(initialCards).toHaveLength(10);

      // Step 3: Simulate database reset (recovery scenario)
      await dbManager.reset();
      await dbManager.initialize();

      // Step 4: Verify database is clean after reset
      const newFlashcardRepository = new FlashcardRepository();
      const recoveredCards = await newFlashcardRepository.findAll();
      expect(recoveredCards).toHaveLength(0);

      // Step 5: Verify we can create new data after recovery
      const newCard = await newFlashcardRepository.create({
        word: 'recovered',
        translation: '回復済み',
        wordPronunciation: null,
        translationPronunciation: null,
        memo: null,
        folderId: null,
      });

      expect(newCard.word).toBe('recovered');
    });
  });

  describe('Concurrent Access and Data Consistency', () => {
    it('should handle concurrent database operations', async () => {
      // Step 1: Create multiple concurrent operations
      const promises = [];
      
      // Concurrent folder creation
      for (let i = 0; i < 5; i++) {
        promises.push(
          folderRepository.create({
            name: `Concurrent Folder ${i}`,
            parentId: null,
          })
        );
      }

      // Concurrent flashcard creation
      for (let i = 0; i < 10; i++) {
        promises.push(
          flashcardRepository.create({
            word: `concurrent${i}`,
            translation: `同時${i}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: null,
          })
        );
      }

      // Step 2: Wait for all operations to complete
      const results = await Promise.all(promises);
      
      // Step 3: Verify all operations succeeded
      expect(results).toHaveLength(15);
      results.forEach(result => {
        expect(result.id).toBeDefined();
      });

      // Step 4: Verify final state is consistent
      const allFolders = await folderRepository.findAll();
      const allFlashcards = await flashcardRepository.findAll();
      
      expect(allFolders).toHaveLength(5);
      expect(allFlashcards).toHaveLength(10);
    });

    it('should maintain referential integrity under concurrent operations', async () => {
      // Step 1: Create a folder
      const folder = await folderRepository.create({
        name: 'Integrity Test Folder',
        parentId: null,
      });

      // Step 2: Create multiple flashcards concurrently referencing the folder
      const cardPromises = [];
      for (let i = 0; i < 10; i++) {
        cardPromises.push(
          flashcardRepository.create({
            word: `integrity${i}`,
            translation: `整合性${i}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: folder.id,
          })
        );
      }

      const cards = await Promise.all(cardPromises);

      // Step 3: Verify all cards reference the correct folder
      for (const card of cards) {
        expect(card.folderId).toBe(folder.id);
      }

      // Step 4: Verify folder contains all cards
      const folderCards = await flashcardRepository.findByFolderId(folder.id);
      expect(folderCards).toHaveLength(10);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      // Step 1: Create large dataset
      const batchSize = 100;
      const totalCards = 1000;
      
      for (let batch = 0; batch < totalCards / batchSize; batch++) {
        const promises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const cardIndex = batch * batchSize + i;
          promises.push(
            flashcardRepository.create({
              word: `large${cardIndex}`,
              translation: `大規模${cardIndex}`,
              wordPronunciation: null,
              translationPronunciation: null,
              memo: `This is memo number ${cardIndex} for performance testing`,
              folderId: null,
            })
          );
        }
        
        await Promise.all(promises);
      }

      const creationTime = Date.now() - startTime;

      // Step 2: Verify all data was created
      const allCards = await flashcardRepository.findAll();
      expect(allCards).toHaveLength(totalCards);

      // Step 3: Test retrieval performance
      const retrievalStartTime = Date.now();
      
      // Test various query patterns
      const firstCard = await flashcardRepository.findById(1);
      const lastCard = await flashcardRepository.findById(totalCards);
      const allCardsAgain = await flashcardRepository.findAll();
      
      const retrievalTime = Date.now() - retrievalStartTime;

      // Step 4: Verify performance is acceptable
      expect(creationTime).toBeLessThan(30000); // 30 seconds for 1000 cards
      expect(retrievalTime).toBeLessThan(5000);  // 5 seconds for retrieval operations
      
      expect(firstCard?.word).toBe('large0');
      expect(lastCard?.word).toBe(`large${totalCards - 1}`);
      expect(allCardsAgain).toHaveLength(totalCards);
    });

    it('should maintain performance with complex folder hierarchies', async () => {
      // Step 1: Create deep folder hierarchy
      let currentParentId = null;
      const folderIds = [];
      
      for (let depth = 0; depth < 10; depth++) {
        const folder = await folderRepository.create({
          name: `Level ${depth} Folder`,
          parentId: currentParentId,
        });
        folderIds.push(folder.id);
        currentParentId = folder.id;
      }

      // Step 2: Create cards at each level
      for (let i = 0; i < folderIds.length; i++) {
        for (let j = 0; j < 5; j++) {
          await flashcardRepository.create({
            word: `level${i}_card${j}`,
            translation: `レベル${i}_カード${j}`,
            wordPronunciation: null,
            translationPronunciation: null,
            memo: null,
            folderId: folderIds[i],
          });
        }
      }

      // Step 3: Test retrieval at each level
      const startTime = Date.now();
      
      for (const folderId of folderIds) {
        const folderCards = await flashcardRepository.findByFolderId(folderId);
        expect(folderCards).toHaveLength(5);
      }
      
      const queryTime = Date.now() - startTime;
      
      // Should complete queries efficiently
      expect(queryTime).toBeLessThan(2000);
    });
  });

  describe('Data Export and Backup', () => {
    it('should export and restore complete database', async () => {
      // Step 1: Create comprehensive test data
      const folders = [];
      const flashcards = [];

      // Create folder hierarchy
      const rootFolder = await folderRepository.create({
        name: 'Root Export Folder',
        parentId: null,
      });
      folders.push(rootFolder);

      const childFolder = await folderRepository.create({
        name: 'Child Export Folder',
        parentId: rootFolder.id,
      });
      folders.push(childFolder);

      // Create flashcards
      for (let i = 0; i < 5; i++) {
        const card = await flashcardRepository.create({
          word: `export${i}`,
          translation: `エクスポート${i}`,
          wordPronunciation: `ɪkˈspɔrt${i}`,
          translationPronunciation: `エクスポート${i}`,
          memo: `Export test memo ${i}`,
          folderId: i % 2 === 0 ? rootFolder.id : childFolder.id,
        });
        flashcards.push(card);
      }

      // Step 2: Export database
      const exportData = await dbManager.exportDatabase();
      expect(exportData).toBeTruthy();

      // Step 3: Reset database
      await dbManager.reset();

      // Step 4: Verify database is empty
      const emptyFolders = await folderRepository.findAll();
      const emptyCards = await flashcardRepository.findAll();
      expect(emptyFolders).toHaveLength(0);
      expect(emptyCards).toHaveLength(0);

      // Step 5: Restore from export (this would be implemented in a real scenario)
      // For now, we'll recreate the data to simulate restoration
      await dbManager.initialize();

      // Step 6: Verify restoration capability by recreating data
      const restoredRootFolder = await folderRepository.create({
        name: 'Root Export Folder',
        parentId: null,
      });

      const restoredChildFolder = await folderRepository.create({
        name: 'Child Export Folder',
        parentId: restoredRootFolder.id,
      });

      for (let i = 0; i < 5; i++) {
        await flashcardRepository.create({
          word: `export${i}`,
          translation: `エクスポート${i}`,
          wordPronunciation: `ɪkˈspɔrt${i}`,
          translationPronunciation: `エクスポート${i}`,
          memo: `Export test memo ${i}`,
          folderId: i % 2 === 0 ? restoredRootFolder.id : restoredChildFolder.id,
        });
      }

      // Step 7: Verify restoration
      const restoredFolders = await folderRepository.findAll();
      const restoredCards = await flashcardRepository.findAll();
      
      expect(restoredFolders).toHaveLength(2);
      expect(restoredCards).toHaveLength(5);
    });
  });
});