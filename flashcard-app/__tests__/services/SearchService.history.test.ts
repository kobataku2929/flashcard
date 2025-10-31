// SearchService History Integration Tests

import { SearchService } from '../../src/services/SearchService';
import { SearchHistoryService } from '../../src/services/SearchHistoryService';
import { SearchFilters, SortOption } from '../../src/types/search';
import { Flashcard } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/SearchHistoryService');
jest.mock('../../src/services/FilterService');
jest.mock('../../src/services/SearchAnalyticsService');
jest.mock('../../src/repositories');

describe('SearchService - History Integration', () => {
  let searchService: SearchService;
  let mockHistoryService: jest.Mocked<SearchHistoryService>;
  let mockSearchRepo: any;
  let mockFlashcardRepo: any;

  beforeEach(() => {
    // Reset singleton
    (SearchService as any).instance = null;
    searchService = SearchService.getInstance();

    // Setup mocks
    mockHistoryService = {
      addToHistory: jest.fn().mockResolvedValue(undefined),
      getHistory: jest.fn().mockResolvedValue([]),
      getHistoryBasedSuggestions: jest.fn().mockResolvedValue([]),
    } as any;

    (SearchHistoryService.getInstance as jest.Mock).mockReturnValue(mockHistoryService);

    // Mock repositories
    mockSearchRepo = {
      searchWithFullText: jest.fn().mockResolvedValue([]),
      getContentBasedSuggestions: jest.fn().mockResolvedValue([]),
    };

    mockFlashcardRepo = {
      search: jest.fn().mockResolvedValue([]),
    };

    // Mock repository getters
    const mockGetSearchRepository = jest.fn().mockReturnValue(mockSearchRepo);
    const mockGetFlashcardRepository = jest.fn().mockReturnValue(mockFlashcardRepo);
    
    require('../../src/repositories').__setMockRepositories({
      getSearchRepository: mockGetSearchRepository,
      getFlashcardRepository: mockGetFlashcardRepository,
    });

    // Mock FilterService
    const mockFilterService = {
      applyFilters: jest.fn().mockImplementation((results) => results),
    };
    require('../../src/services/FilterService').__setMockInstance(mockFilterService);

    // Mock SearchAnalyticsService
    const mockAnalyticsService = {
      logSearch: jest.fn().mockResolvedValue(undefined),
    };
    require('../../src/services/SearchAnalyticsService').__setMockInstance(mockAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search with history integration', () => {
    it('should save search to history after successful search', async () => {
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

      mockSearchRepo.searchWithFullText.mockResolvedValue(mockFlashcards);

      const query = 'hello';
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      const results = await searchService.search(query, filters);

      expect(results).toHaveLength(1);
      expect(mockHistoryService.addToHistory).toHaveBeenCalledWith({
        id: expect.stringMatching(/^search_\d+_[a-z0-9]+$/),
        query,
        filters,
        timestamp: expect.any(Date),
        resultCount: 1
      });
    });

    it('should not save to history if search fails', async () => {
      mockSearchRepo.searchWithFullText.mockRejectedValue(new Error('Database error'));

      const query = 'hello';
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      await expect(searchService.search(query, filters)).rejects.toThrow();
      expect(mockHistoryService.addToHistory).not.toHaveBeenCalled();
    });

    it('should save to history even with zero results', async () => {
      mockSearchRepo.searchWithFullText.mockResolvedValue([]);

      const query = 'nonexistent';
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      const results = await searchService.search(query, filters);

      expect(results).toHaveLength(0);
      expect(mockHistoryService.addToHistory).toHaveBeenCalledWith({
        id: expect.any(String),
        query,
        filters,
        timestamp: expect.any(Date),
        resultCount: 0
      });
    });

    it('should continue search even if history save fails', async () => {
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

      mockSearchRepo.searchWithFullText.mockResolvedValue(mockFlashcards);
      mockHistoryService.addToHistory.mockRejectedValue(new Error('History save failed'));

      const query = 'hello';
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      // Should not throw even if history save fails
      const results = await searchService.search(query, filters);
      expect(results).toHaveLength(1);
    });
  });

  describe('getSearchSuggestions with history integration', () => {
    it('should combine content and history suggestions', async () => {
      const contentSuggestions = ['hello world', 'hello there'];
      const historySuggestions = ['hello friend', 'hello again'];

      mockSearchRepo.getContentBasedSuggestions.mockResolvedValue(contentSuggestions);
      mockHistoryService.getHistory.mockResolvedValue([
        {
          id: '1',
          query: 'hello friend',
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
          timestamp: new Date(),
          resultCount: 5
        },
        {
          id: '2',
          query: 'hello again',
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
          timestamp: new Date(),
          resultCount: 3
        },
        {
          id: '3',
          query: 'goodbye',
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
          timestamp: new Date(),
          resultCount: 2
        }
      ]);

      const suggestions = await searchService.getSearchSuggestions('hello');

      expect(suggestions).toContain('hello world');
      expect(suggestions).toContain('hello there');
      expect(suggestions).toContain('hello friend');
      expect(suggestions).toContain('hello again');
      expect(suggestions).not.toContain('goodbye');
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should deduplicate suggestions', async () => {
      const contentSuggestions = ['hello world', 'hello there'];
      
      mockSearchRepo.getContentBasedSuggestions.mockResolvedValue(contentSuggestions);
      mockHistoryService.getHistory.mockResolvedValue([
        {
          id: '1',
          query: 'hello world', // Duplicate
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
          timestamp: new Date(),
          resultCount: 5
        }
      ]);

      const suggestions = await searchService.getSearchSuggestions('hello');

      // Should only contain unique suggestions
      expect(suggestions.filter(s => s === 'hello world')).toHaveLength(1);
    });

    it('should return empty array for short queries', async () => {
      const suggestions = await searchService.getSearchSuggestions('h');

      expect(suggestions).toEqual([]);
      expect(mockSearchRepo.getContentBasedSuggestions).not.toHaveBeenCalled();
      expect(mockHistoryService.getHistory).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSearchRepo.getContentBasedSuggestions.mockRejectedValue(new Error('Content error'));
      mockHistoryService.getHistory.mockRejectedValue(new Error('History error'));

      const suggestions = await searchService.getSearchSuggestions('hello');

      expect(suggestions).toEqual([]);
    });
  });

  describe('search caching with history', () => {
    it('should not save cached results to history', async () => {
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

      mockSearchRepo.searchWithFullText.mockResolvedValue(mockFlashcards);

      const query = 'hello';
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      // First search - should save to history
      await searchService.search(query, filters);
      expect(mockHistoryService.addToHistory).toHaveBeenCalledTimes(1);

      // Second search with same query - should use cache and not save to history again
      await searchService.search(query, filters);
      expect(mockHistoryService.addToHistory).toHaveBeenCalledTimes(1); // Still only once
    });
  });

  describe('history ID generation', () => {
    it('should generate unique history IDs', async () => {
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

      mockSearchRepo.searchWithFullText.mockResolvedValue(mockFlashcards);

      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };

      // Perform multiple searches
      await searchService.search('hello', filters);
      await searchService.search('world', filters);

      expect(mockHistoryService.addToHistory).toHaveBeenCalledTimes(2);

      const firstCall = mockHistoryService.addToHistory.mock.calls[0][0];
      const secondCall = mockHistoryService.addToHistory.mock.calls[1][0];

      expect(firstCall.id).not.toBe(secondCall.id);
      expect(firstCall.id).toMatch(/^search_\d+_[a-z0-9]+$/);
      expect(secondCall.id).toMatch(/^search_\d+_[a-z0-9]+$/);
    });
  });
});