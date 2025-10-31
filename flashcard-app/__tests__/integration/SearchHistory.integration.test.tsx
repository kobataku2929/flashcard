// Search History Integration Tests

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { AppProvider } from '../../src/context/AppContext';
import SearchScreen from '../../src/screens/SearchScreen';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { SearchHistoryService } from '../../src/services/SearchHistoryService';
import { SearchService } from '../../src/services/SearchService';
import { Flashcard } from '../../src/types';
import { SortOption } from '../../src/types/search';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock database
jest.mock('../../src/database/DatabaseManager');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Search History Integration', () => {
  let mockDb: any;
  let searchHistoryService: SearchHistoryService;
  let searchService: SearchService;

  beforeEach(async () => {
    // Setup mock database
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      getDatabase: jest.fn().mockResolvedValue(mockDb),
    });

    // Reset singletons
    (SearchHistoryService as any).instance = null;
    (SearchService as any).instance = null;
    
    searchHistoryService = SearchHistoryService.getInstance();
    searchService = SearchService.getInstance();

    // Clear all mocks
    jest.clearAllMocks();
  });

  const renderSearchScreen = () => {
    return render(
      <AppProvider>
        <SearchScreen navigation={mockNavigation as any} route={mockRoute as any} />
      </AppProvider>
    );
  };

  describe('Search History Storage', () => {
    it('should save search queries to history when performing search', async () => {
      // Mock search results
      const mockFlashcards: Flashcard[] = [
        {
          id: 1,
          word: 'hello',
          translation: 'こんにちは',
          folderId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock database search
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('flashcards_fts')) {
          return Promise.resolve(mockFlashcards.map(card => ({
            ...card,
            created_at: card.createdAt.toISOString(),
            updated_at: card.updatedAt.toISOString(),
            folder_id: card.folderId,
            word_pronunciation: card.wordPronunciation,
            translation_pronunciation: card.translationPronunciation,
            rank: 1
          })));
        }
        return Promise.resolve([]);
      });

      renderSearchScreen();

      // Find search input and enter query
      const searchInput = screen.getByPlaceholderText('単語や翻訳を検索...');
      fireEvent.changeText(searchInput, 'hello');

      // Wait for search to complete
      await waitFor(() => {
        expect(mockDb.getAllAsync).toHaveBeenCalled();
      });

      // Verify search history was saved
      await waitFor(() => {
        expect(mockDb.runAsync).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO search_history'),
          expect.arrayContaining([
            expect.any(String), // id
            'hello', // query
            expect.any(String), // filters JSON
            expect.any(String), // timestamp
            1 // result count
          ])
        );
      });
    });

    it('should not duplicate identical searches in history', async () => {
      renderSearchScreen();

      const searchInput = screen.getByPlaceholderText('単語や翻訳を検索...');
      
      // Perform same search twice
      fireEvent.changeText(searchInput, 'hello');
      await waitFor(() => {
        expect(mockDb.getAllAsync).toHaveBeenCalled();
      });

      fireEvent.changeText(searchInput, '');
      fireEvent.changeText(searchInput, 'hello');
      
      await waitFor(() => {
        expect(mockDb.getAllAsync).toHaveBeenCalledTimes(2);
      });

      // Should delete duplicate before inserting
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM search_history WHERE query = ? AND filters = ?',
        expect.any(Array)
      );
    });
  });

  describe('Search History Retrieval', () => {
    it('should display recent searches when input is focused', async () => {
      // Mock recent searches
      const mockHistoryRows = [
        {
          id: 'search-1',
          query: 'hello',
          filters: JSON.stringify({ sortBy: SortOption.RELEVANCE, sortOrder: 'desc' }),
          timestamp: new Date().toISOString(),
          result_count: 5
        },
        {
          id: 'search-2',
          query: 'world',
          filters: JSON.stringify({ sortBy: SortOption.RELEVANCE, sortOrder: 'desc' }),
          timestamp: new Date().toISOString(),
          result_count: 3
        }
      ];

      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('FROM search_history')) {
          return Promise.resolve(mockHistoryRows);
        }
        return Promise.resolve([]);
      });

      renderSearchScreen();

      // Wait for recent searches to load
      await waitFor(() => {
        expect(screen.getByText('最近の検索')).toBeTruthy();
      });

      // Should display recent search items
      expect(screen.getByText('hello')).toBeTruthy();
      expect(screen.getByText('world')).toBeTruthy();
    });

    it('should execute search when tapping on recent search item', async () => {
      const mockHistoryRows = [
        {
          id: 'search-1',
          query: 'hello',
          filters: JSON.stringify({ sortBy: SortOption.RELEVANCE, sortOrder: 'desc' }),
          timestamp: new Date().toISOString(),
          result_count: 5
        }
      ];

      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('FROM search_history')) {
          return Promise.resolve(mockHistoryRows);
        }
        if (sql.includes('flashcards_fts')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      renderSearchScreen();

      await waitFor(() => {
        expect(screen.getByText('hello')).toBeTruthy();
      });

      // Tap on recent search item
      fireEvent.press(screen.getByText('hello'));

      // Should execute search
      await waitFor(() => {
        expect(mockDb.getAllAsync).toHaveBeenCalledWith(
          expect.stringContaining('flashcards_fts MATCH'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Search History Management', () => {
    it('should limit history to maximum number of items', async () => {
      // Simulate adding many searches
      const searches = Array.from({ length: 60 }, (_, i) => ({
        id: `search-${i}`,
        query: `query-${i}`,
        filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' as const },
        timestamp: new Date(),
        resultCount: 1
      }));

      for (const search of searches) {
        await searchHistoryService.addToHistory(search);
      }

      // Should call cleanup to maintain size limit
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM search_history'),
        [50] // MAX_HISTORY_ITEMS
      );
    });

    it('should provide search statistics', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ total: 25 })
        .mockResolvedValueOnce({ unique_count: 15 })
        .mockResolvedValueOnce({ avg_results: 4.5 })
        .mockResolvedValueOnce({ recent_timestamp: new Date().toISOString() });

      const stats = await searchHistoryService.getSearchStats();

      expect(stats).toEqual({
        totalSearches: 25,
        uniqueQueries: 15,
        averageResultsPerSearch: 4.5,
        mostRecentSearch: expect.any(Date)
      });
    });

    it('should export search history as JSON', async () => {
      const mockHistory = [
        {
          id: 'search-1',
          query: 'hello',
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' as const },
          timestamp: new Date(),
          resultCount: 5
        }
      ];

      jest.spyOn(searchHistoryService, 'getHistory').mockResolvedValue(mockHistory);

      const exported = await searchHistoryService.exportHistory();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].query).toBe('hello');
    });
  });

  describe('Search Suggestions with History', () => {
    it('should provide suggestions based on search history', async () => {
      const mockHistoryRows = [
        { query: 'hello world' },
        { query: 'hello there' }
      ];

      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE LOWER(query) LIKE LOWER(?)')) {
          return Promise.resolve(mockHistoryRows);
        }
        return Promise.resolve([]);
      });

      const suggestions = await searchHistoryService.getHistoryBasedSuggestions('hello');

      expect(suggestions).toContain('hello world');
      expect(suggestions).toContain('hello there');
    });

    it('should combine content and history suggestions', async () => {
      // Mock content suggestions from flashcards
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('CASE WHEN LOWER(word) LIKE')) {
          return Promise.resolve([
            { suggestion: 'hello' },
            { suggestion: 'help' }
          ]);
        }
        if (sql.includes('WHERE LOWER(query) LIKE LOWER(?)')) {
          return Promise.resolve([
            { query: 'hello world' }
          ]);
        }
        return Promise.resolve([]);
      });

      const suggestions = await searchService.getSearchSuggestions('hel');

      expect(suggestions.length).toBeGreaterThan(0);
      // Should include both content and history suggestions
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during history operations', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(searchHistoryService.addToHistory({
        id: 'test',
        query: 'test',
        filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
        timestamp: new Date(),
        resultCount: 0
      })).resolves.toBeUndefined();
    });

    it('should continue search functionality even if history fails', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('History save failed'));
      
      // Mock successful search
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('flashcards_fts')) {
          return Promise.resolve([{
            id: 1,
            word: 'hello',
            translation: 'こんにちは',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            folder_id: null,
            rank: 1
          }]);
        }
        return Promise.resolve([]);
      });

      renderSearchScreen();

      const searchInput = screen.getByPlaceholderText('単語や翻訳を検索...');
      fireEvent.changeText(searchInput, 'hello');

      // Should still show search results even if history save fails
      await waitFor(() => {
        expect(screen.getByText('"hello" を含むカード (1件)')).toBeTruthy();
      });
    });
  });
});