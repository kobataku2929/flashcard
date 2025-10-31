// SearchHistoryService Tests

import { SearchHistoryService } from '../../src/services/SearchHistoryService';
import { SearchHistoryItem, SearchFilters, SortOption } from '../../src/types/search';
import { DatabaseManager } from '../../src/database/DatabaseManager';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager');

describe('SearchHistoryService', () => {
  let service: SearchHistoryService;
  let mockDb: any;

  beforeEach(() => {
    // Reset singleton instance
    (SearchHistoryService as any).instance = null;
    service = SearchHistoryService.getInstance();

    // Setup mock database
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue({
      getDatabase: jest.fn().mockResolvedValue(mockDb),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToHistory', () => {
    it('should add a new search to history', async () => {
      const historyItem: SearchHistoryItem = {
        id: 'test-id',
        query: 'test query',
        filters: {
          sortBy: SortOption.RELEVANCE,
          sortOrder: 'desc'
        },
        timestamp: new Date(),
        resultCount: 5
      };

      await service.addToHistory(historyItem);

      // Should create table
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS search_history')
      );

      // Should delete duplicates
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM search_history WHERE query = ? AND filters = ?',
        [historyItem.query, JSON.stringify(historyItem.filters)]
      );

      // Should insert new item
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_history'),
        [
          historyItem.id,
          historyItem.query,
          JSON.stringify(historyItem.filters),
          historyItem.timestamp.toISOString(),
          historyItem.resultCount
        ]
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      const historyItem: SearchHistoryItem = {
        id: 'test-id',
        query: 'test query',
        filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
        timestamp: new Date(),
        resultCount: 5
      };

      // Should not throw
      await expect(service.addToHistory(historyItem)).resolves.toBeUndefined();
    });
  });

  describe('getHistory', () => {
    it('should return search history from database', async () => {
      const mockRows = [
        {
          id: 'test-1',
          query: 'hello',
          filters: JSON.stringify({ sortBy: SortOption.RELEVANCE, sortOrder: 'desc' }),
          timestamp: '2023-01-01T00:00:00.000Z',
          result_count: 3
        },
        {
          id: 'test-2',
          query: 'world',
          filters: JSON.stringify({ sortBy: SortOption.DATE_CREATED, sortOrder: 'asc' }),
          timestamp: '2023-01-02T00:00:00.000Z',
          result_count: 7
        }
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await service.getHistory();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'test-1',
        query: 'hello',
        filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        resultCount: 3
      });
    });

    it('should apply limit when specified', async () => {
      await service.getHistory(5);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5')
      );
    });

    it('should handle date range filters in history', async () => {
      const mockRows = [
        {
          id: 'test-1',
          query: 'test',
          filters: JSON.stringify({
            sortBy: SortOption.RELEVANCE,
            sortOrder: 'desc',
            dateRange: {
              startDate: '2023-01-01T00:00:00.000Z',
              endDate: '2023-01-31T23:59:59.999Z'
            }
          }),
          timestamp: '2023-01-01T00:00:00.000Z',
          result_count: 5
        }
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await service.getHistory();

      expect(result[0].filters.dateRange).toEqual({
        startDate: new Date('2023-01-01T00:00:00.000Z'),
        endDate: new Date('2023-01-31T23:59:59.999Z')
      });
    });

    it('should return empty array on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const result = await service.getHistory();

      expect(result).toEqual([]);
    });
  });

  describe('removeFromHistory', () => {
    it('should remove specific item from history', async () => {
      await service.removeFromHistory('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM search_history WHERE id = ?',
        ['test-id']
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(service.removeFromHistory('test-id')).resolves.toBeUndefined();
    });
  });

  describe('clearHistory', () => {
    it('should clear all search history', async () => {
      await service.clearHistory();

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM search_history');
    });

    it('should handle errors gracefully', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(service.clearHistory()).resolves.toBeUndefined();
    });
  });

  describe('getFrequentSearches', () => {
    it('should return frequently searched terms', async () => {
      const mockRows = [
        {
          query: 'hello',
          frequency: 5,
          latest_timestamp: '2023-01-05T00:00:00.000Z',
          id: 'test-1',
          filters: JSON.stringify({ sortBy: SortOption.RELEVANCE, sortOrder: 'desc' }),
          result_count: 3
        },
        {
          query: 'world',
          frequency: 3,
          latest_timestamp: '2023-01-03T00:00:00.000Z',
          id: 'test-2',
          filters: JSON.stringify({ sortBy: SortOption.DATE_CREATED, sortOrder: 'asc' }),
          result_count: 7
        }
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await service.getFrequentSearches(10);

      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('hello');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY query'),
        [10]
      );
    });

    it('should return empty array on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const result = await service.getFrequentSearches();

      expect(result).toEqual([]);
    });
  });

  describe('getHistoryBasedSuggestions', () => {
    it('should return suggestions based on partial query', async () => {
      const mockRows = [
        { query: 'hello world' },
        { query: 'hello there' }
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await service.getHistoryBasedSuggestions('hello', 5);

      expect(result).toEqual(['hello world', 'hello there']);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(query) LIKE LOWER(?)'),
        ['%hello%', 5]
      );
    });

    it('should return empty array for short queries', async () => {
      const result = await service.getHistoryBasedSuggestions('h');

      expect(result).toEqual([]);
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const result = await service.getHistoryBasedSuggestions('hello');

      expect(result).toEqual([]);
    });
  });

  describe('getSearchStats', () => {
    it('should return search statistics', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ total: 25 })
        .mockResolvedValueOnce({ unique_count: 15 })
        .mockResolvedValueOnce({ avg_results: 4.5 })
        .mockResolvedValueOnce({ recent_timestamp: '2023-01-05T00:00:00.000Z' });

      const result = await service.getSearchStats();

      expect(result).toEqual({
        totalSearches: 25,
        uniqueQueries: 15,
        averageResultsPerSearch: 4.5,
        mostRecentSearch: new Date('2023-01-05T00:00:00.000Z')
      });
    });

    it('should return zero stats when no history exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 0 });

      const result = await service.getSearchStats();

      expect(result).toEqual({
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0
      });
    });

    it('should handle errors gracefully', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      const result = await service.getSearchStats();

      expect(result).toEqual({
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0
      });
    });
  });

  describe('getHistorySize', () => {
    it('should return history size information', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 25 });

      const result = await service.getHistorySize();

      expect(result).toEqual({
        currentCount: 25,
        maxCount: 50,
        canAddMore: true
      });
    });

    it('should indicate when history is full', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 50 });

      const result = await service.getHistorySize();

      expect(result.canAddMore).toBe(false);
    });
  });

  describe('exportHistory', () => {
    it('should export history as JSON string', async () => {
      const mockHistory = [
        {
          id: 'test-1',
          query: 'hello',
          filters: { sortBy: SortOption.RELEVANCE, sortOrder: 'desc' },
          timestamp: new Date('2023-01-01T00:00:00.000Z'),
          resultCount: 3
        }
      ];

      // Mock getHistory method
      jest.spyOn(service, 'getHistory').mockResolvedValue(mockHistory);

      const result = await service.exportHistory();

      expect(result).toBe(JSON.stringify(mockHistory, null, 2));
    });

    it('should return empty array JSON on error', async () => {
      jest.spyOn(service, 'getHistory').mockRejectedValue(new Error('Export error'));

      const result = await service.exportHistory();

      expect(result).toBe('[]');
    });
  });
});