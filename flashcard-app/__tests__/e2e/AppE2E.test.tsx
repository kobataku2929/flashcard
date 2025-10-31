import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import App from '../../App';
import { DatabaseManager } from '../../src/database/DatabaseManager';

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

// Mock navigation (since we're testing the full app)
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

describe('App E2E Tests', () => {
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    // Initialize and reset database
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    await dbManager.reset();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await dbManager.reset();
  });

  describe('Complete User Journey', () => {
    it('should complete full user workflow from app start to data persistence', async () => {
      // Step 1: App initialization
      const { getByTestId, getByText, queryByText } = render(<App />);

      // Wait for app to initialize
      await waitFor(() => {
        expect(queryByText('初期化中')).toBeNull();
      }, { timeout: 5000 });

      // Step 2: Verify home screen is displayed
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Step 3: Create a folder
      fireEvent.press(getByTestId('add-folder-button'));
      
      await waitFor(() => {
        expect(Alert.prompt).toHaveBeenCalled();
      });

      // Step 4: Navigate to TSV import
      fireEvent.press(getByTestId('import-tsv-button'));

      // Step 5: Import TSV data
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

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('hello\thəˈloʊ\tこんにちは\tこんにちは\tgreeting'),
      });

      fireEvent.press(getByTestId('file-select-button'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('import-button'));
      });

      // Step 6: Verify import success
      await waitFor(() => {
        expect(getByText(/カードをインポートしました/)).toBeTruthy();
      }, { timeout: 5000 });

      // Step 7: Navigate back to home
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Step 8: Verify imported data is displayed
      await waitFor(() => {
        expect(getByText('hello')).toBeTruthy();
      });

      // Step 9: Create a new card manually
      fireEvent.press(getByTestId('add-card-button'));
      
      // Fill in card details
      fireEvent.changeText(getByTestId('word-input'), 'manual');
      fireEvent.changeText(getByTestId('translation-input'), '手動');
      fireEvent.press(getByTestId('save-button'));

      // Step 10: Verify card was created
      await waitFor(() => {
        expect(getByText('manual')).toBeTruthy();
      });

      // Step 11: Test card interaction
      fireEvent.press(getByText('hello'));
      
      // Should show card details or flip animation
      await waitFor(() => {
        expect(getByText('こんにちは')).toBeTruthy();
      });
    });

    it('should handle app restart and data persistence', async () => {
      // Step 1: Create initial data
      const { unmount } = render(<App />);

      await waitFor(() => {
        // App should be initialized
      }, { timeout: 5000 });

      // Create test data directly in database
      const db = await dbManager.getDatabase();
      await db.executeSqlAsync(
        'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
        ['Persistent Folder', null]
      );
      
      await db.executeSqlAsync(
        'INSERT INTO flashcards (word, translation, folder_id) VALUES (?, ?, ?)',
        ['persistent', '永続', 1]
      );

      // Step 2: Unmount app (simulate app close)
      unmount();

      // Step 3: Restart app
      const { getByText } = render(<App />);

      // Step 4: Verify data persists after restart
      await waitFor(() => {
        expect(getByText('Persistent Folder')).toBeTruthy();
        expect(getByText('persistent')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should handle offline functionality', async () => {
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network unavailable'));

      const { getByTestId, getByText } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // App should still function offline
      fireEvent.press(getByTestId('add-card-button'));
      
      fireEvent.changeText(getByTestId('word-input'), 'offline');
      fireEvent.changeText(getByTestId('translation-input'), 'オフライン');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByText('offline')).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from database errors', async () => {
      const { getByTestId, getByText } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Simulate database corruption
      const originalExecute = dbManager.execute;
      dbManager.execute = jest.fn().mockRejectedValue(new Error('Database corrupted'));

      // Try to create a card (should fail)
      fireEvent.press(getByTestId('add-card-button'));
      fireEvent.changeText(getByTestId('word-input'), 'error');
      fireEvent.changeText(getByTestId('translation-input'), 'エラー');
      fireEvent.press(getByTestId('save-button'));

      // Should show error message
      await waitFor(() => {
        expect(getByText(/エラー/)).toBeTruthy();
      });

      // Restore database functionality
      dbManager.execute = originalExecute;

      // Should be able to create card after recovery
      fireEvent.changeText(getByTestId('word-input'), 'recovered');
      fireEvent.changeText(getByTestId('translation-input'), '回復');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByText('recovered')).toBeTruthy();
      });
    });

    it('should handle memory pressure gracefully', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Create many cards to simulate memory pressure
      for (let i = 0; i < 50; i++) {
        fireEvent.press(getByTestId('add-card-button'));
        fireEvent.changeText(getByTestId('word-input'), `word${i}`);
        fireEvent.changeText(getByTestId('translation-input'), `翻訳${i}`);
        fireEvent.press(getByTestId('save-button'));
      }

      // App should remain responsive
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  describe('User Experience Flows', () => {
    it('should provide smooth navigation between screens', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Navigate to settings
      fireEvent.press(getByTestId('settings-button'));
      
      await waitFor(() => {
        expect(getByTestId('settings-screen')).toBeTruthy();
      });

      // Navigate back to home
      fireEvent.press(getByTestId('back-button'));
      
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Navigate to import screen
      fireEvent.press(getByTestId('import-tsv-button'));
      
      await waitFor(() => {
        expect(getByTestId('import-screen')).toBeTruthy();
      });
    });

    it('should handle rapid user interactions', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Rapidly tap buttons
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('add-card-button'));
        fireEvent.press(getByTestId('cancel-button'));
      }

      // App should remain stable
      expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('should maintain state during screen transitions', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Start creating a card
      fireEvent.press(getByTestId('add-card-button'));
      fireEvent.changeText(getByTestId('word-input'), 'partial');

      // Navigate away and back
      fireEvent.press(getByTestId('cancel-button'));
      fireEvent.press(getByTestId('add-card-button'));

      // Form should be reset (new card)
      expect(getByTestId('word-input').props.value).toBe('');
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Create folder and card
      fireEvent.press(getByTestId('add-folder-button'));
      
      fireEvent.press(getByTestId('add-card-button'));
      fireEvent.changeText(getByTestId('word-input'), 'integrity');
      fireEvent.changeText(getByTestId('translation-input'), '整合性');
      fireEvent.press(getByTestId('save-button'));

      // Move card to folder
      fireEvent.longPress(getByTestId('card-integrity'));
      fireEvent.press(getByTestId('move-to-folder'));
      fireEvent.press(getByTestId('folder-Test Folder'));

      // Delete folder
      fireEvent.longPress(getByTestId('folder-Test Folder'));
      fireEvent.press(getByTestId('delete-folder'));
      fireEvent.press(getByTestId('confirm-delete'));

      // Card should still exist but not in folder
      await waitFor(() => {
        expect(getByTestId('card-integrity')).toBeTruthy();
      });
    });

    it('should handle concurrent operations correctly', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Simulate concurrent card creation
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            fireEvent.press(getByTestId('add-card-button'));
            fireEvent.changeText(getByTestId('word-input'), `concurrent${i}`);
            fireEvent.changeText(getByTestId('translation-input'), `同時${i}`);
            fireEvent.press(getByTestId('save-button'));
            resolve();
          })
        );
      }

      await Promise.all(promises);

      // All cards should be created
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(getByTestId(`card-concurrent${i}`)).toBeTruthy();
        });
      }
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load large datasets efficiently', async () => {
      // Pre-populate database with large dataset
      const db = await dbManager.getDatabase();
      
      for (let i = 0; i < 100; i++) {
        await db.executeSqlAsync(
          'INSERT INTO flashcards (word, translation) VALUES (?, ?)',
          [`word${i}`, `翻訳${i}`]
        );
      }

      const startTime = Date.now();
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (less than 5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    it('should handle scrolling through large lists smoothly', async () => {
      // Pre-populate with many items
      const db = await dbManager.getDatabase();
      
      for (let i = 0; i < 200; i++) {
        await db.executeSqlAsync(
          'INSERT INTO flashcards (word, translation) VALUES (?, ?)',
          [`scroll${i}`, `スクロール${i}`]
        );
      }

      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Simulate scrolling
      const scrollView = getByTestId('cards-list');
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 5000 },
          layoutMeasurement: { height: 800 },
        },
      });

      // Should remain responsive
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  describe('Accessibility and Usability', () => {
    it('should support accessibility features', async () => {
      const { getByTestId, getByLabelText } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Check for accessibility labels
      expect(getByLabelText('カードを追加')).toBeTruthy();
      expect(getByLabelText('フォルダを追加')).toBeTruthy();
      expect(getByLabelText('設定')).toBeTruthy();
    });

    it('should handle different screen orientations', async () => {
      const { getByTestId } = render(<App />);

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Simulate orientation change
      fireEvent(getByTestId('home-screen'), 'layout', {
        nativeEvent: {
          layout: { width: 800, height: 600 }, // Landscape
        },
      });

      // App should adapt to new orientation
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});