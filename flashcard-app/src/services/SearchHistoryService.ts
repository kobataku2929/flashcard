// Search History Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryItem } from '../types/search';

export class SearchHistoryService {
  private static instance: SearchHistoryService;
  private readonly STORAGE_KEY = 'search_history';
  private readonly MAX_HISTORY_ITEMS = 50;
  private historyCache: SearchHistoryItem[] | null = null;

  private constructor() {}

  public static getInstance(): SearchHistoryService {
    if (!SearchHistoryService.instance) {
      SearchHistoryService.instance = new SearchHistoryService();
    }
    return SearchHistoryService.instance;
  }

  /**
   * Add a search to history
   */
  public async addToHistory(item: SearchHistoryItem): Promise<void> {
    try {
      const history = await this.getHistory();
      
      // Remove duplicate if exists (same query and similar filters)
      const filteredHistory = history.filter(existingItem => 
        !(existingItem.query === item.query && 
          JSON.stringify(existingItem.filters) === JSON.stringify(item.filters))
      );

      // Add new item to the beginning
      const updatedHistory = [item, ...filteredHistory];

      // Limit history size
      const limitedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);

      // Save to storage
      await this.saveHistory(limitedHistory);
      
      // Update cache
      this.historyCache = limitedHistory;

    } catch (error) {
      console.error('Failed to add to search history:', error);
    }
  }

  /**
   * Get search history
   */
  public async getHistory(limit?: number): Promise<SearchHistoryItem[]> {
    try {
      // Return from cache if available
      if (this.historyCache) {
        return limit ? this.historyCache.slice(0, limit) : this.historyCache;
      }

      // Load from storage
      const historyJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!historyJson) {
        this.historyCache = [];
        return [];
      }

      const history: SearchHistoryItem[] = JSON.parse(historyJson);
      
      // Convert timestamp strings back to Date objects
      const processedHistory = history.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp),
        filters: {
          ...item.filters,
          dateRange: item.filters.dateRange ? {
            startDate: new Date(item.filters.dateRange.startDate),
            endDate: new Date(item.filters.dateRange.endDate)
          } : undefined
        }
      }));

      // Update cache
      this.historyCache = processedHistory;

      return limit ? processedHistory.slice(0, limit) : processedHistory;

    } catch (error) {
      console.error('Failed to get search history:', error);
      return [];
    }
  }

  /**
   * Remove specific item from history
   */
  public async removeFromHistory(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter(item => item.id !== id);
      
      await this.saveHistory(updatedHistory);
      this.historyCache = updatedHistory;

    } catch (error) {
      console.error('Failed to remove from search history:', error);
    }
  }

  /**
   * Clear all search history
   */
  public async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.historyCache = [];
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }

  /**
   * Get frequently searched terms
   */
  public async getFrequentSearches(limit: number = 10): Promise<SearchHistoryItem[]> {
    try {
      const history = await this.getHistory();
      
      // Count frequency of each query
      const queryFrequency = new Map<string, { count: number; latestItem: SearchHistoryItem }>();
      
      history.forEach(item => {
        const existing = queryFrequency.get(item.query);
        if (existing) {
          existing.count++;
          // Keep the most recent item for this query
          if (item.timestamp > existing.latestItem.timestamp) {
            existing.latestItem = item;
          }
        } else {
          queryFrequency.set(item.query, { count: 1, latestItem: item });
        }
      });

      // Sort by frequency and return top items
      const frequentSearches = Array.from(queryFrequency.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => item.latestItem);

      return frequentSearches;

    } catch (error) {
      console.error('Failed to get frequent searches:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on history
   */
  public async getHistoryBasedSuggestions(partial: string, limit: number = 5): Promise<string[]> {
    try {
      if (partial.length < 2) {
        return [];
      }

      const history = await this.getHistory();
      const suggestions = new Set<string>();

      history.forEach(item => {
        if (item.query.toLowerCase().includes(partial.toLowerCase())) {
          suggestions.add(item.query);
        }
      });

      return Array.from(suggestions).slice(0, limit);

    } catch (error) {
      console.error('Failed to get history-based suggestions:', error);
      return [];
    }
  }

  /**
   * Get search statistics
   */
  public async getSearchStats(): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    mostRecentSearch?: Date;
  }> {
    try {
      const history = await this.getHistory();
      
      if (history.length === 0) {
        return {
          totalSearches: 0,
          uniqueQueries: 0,
          averageResultsPerSearch: 0
        };
      }

      const uniqueQueries = new Set(history.map(item => item.query)).size;
      const totalResults = history.reduce((sum, item) => sum + item.resultCount, 0);
      const averageResults = totalResults / history.length;
      const mostRecentSearch = history[0]?.timestamp;

      return {
        totalSearches: history.length,
        uniqueQueries,
        averageResultsPerSearch: Math.round(averageResults * 100) / 100,
        mostRecentSearch
      };

    } catch (error) {
      console.error('Failed to get search stats:', error);
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0
      };
    }
  }

  /**
   * Export search history
   */
  public async exportHistory(): Promise<string> {
    try {
      const history = await this.getHistory();
      return JSON.stringify(history, null, 2);
    } catch (error) {
      console.error('Failed to export search history:', error);
      return '[]';
    }
  }

  private async saveHistory(history: SearchHistoryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save search history:', error);
      throw error;
    }
  }
}