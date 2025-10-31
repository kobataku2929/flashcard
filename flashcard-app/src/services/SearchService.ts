// Enhanced Search Service

import { 
  SearchFilters, 
  SearchResult, 
  SearchHistoryItem, 
  SearchError, 
  SearchErrorType,
  SortOption,
  StudyStatus,
  HighlightedContent
} from '../types/search';
import { Flashcard } from '../types';
import { getFlashcardRepository, getSearchRepository } from '../repositories';
import { SearchHistoryService } from './SearchHistoryService';
import { FilterService } from './FilterService';
import { SearchPerformanceMonitor } from './SearchPerformanceMonitor';
import { SearchAnalyticsService } from './SearchAnalyticsService';

export class SearchService {
  private static instance: SearchService;
  private flashcardRepo = getFlashcardRepository();
  private searchRepo = getSearchRepository();
  private historyService = SearchHistoryService.getInstance();
  private filterService = FilterService.getInstance();
  private performanceMonitor = SearchPerformanceMonitor.getInstance();
  private analyticsService = SearchAnalyticsService.getInstance();
  private searchCache = new Map<string, SearchResult[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_QUERY_LENGTH = 1;
  private readonly MAX_RESULTS = 1000;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Perform enhanced search with filters and ranking
   */
  public async search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    try {
      // Validate query
      if (query.length < this.MIN_QUERY_LENGTH) {
        throw this.createSearchError(
          SearchErrorType.QUERY_TOO_SHORT,
          `Query must be at least ${this.MIN_QUERY_LENGTH} characters`,
          query,
          filters,
          ['Try entering more characters', 'Use specific terms']
        );
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(query, filters);
      const cachedResults = this.getCachedResults(cacheKey);
      if (cachedResults) {
        // Record cache hit
        this.performanceMonitor.recordSearch({
          queryTime: 0,
          resultCount: cachedResults.length,
          cacheHit: true,
          query,
          timestamp: new Date()
        });
        return cachedResults;
      }

      // Perform database search using FTS
      const startTime = Date.now();
      const flashcards = await this.searchRepo.searchWithFullText(query, filters);
      const searchTime = Date.now() - startTime;
      
      // Check for performance timeout
      if (searchTime > 5000) { // 5 second timeout
        console.warn(`Search took ${searchTime}ms, consider optimization`);
      }

      // Convert to search results with relevance scoring
      const results = await this.convertToSearchResults(flashcards, query);

      // Apply filters
      const filteredResults = this.filterService.applyFilters(results, filters);

      // Sort results
      const sortedResults = this.sortResults(filteredResults, filters.sortBy, filters.sortOrder);

      // Limit results
      const limitedResults = sortedResults.slice(0, this.MAX_RESULTS);

      // Cache results
      this.cacheResults(cacheKey, limitedResults);

      // Record performance metrics
      this.performanceMonitor.recordSearch({
        queryTime: searchTime,
        resultCount: limitedResults.length,
        cacheHit: false,
        query,
        timestamp: new Date()
      });

      // Save to history
      await this.historyService.addToHistory({
        id: this.generateHistoryId(),
        query,
        filters,
        timestamp: new Date(),
        resultCount: limitedResults.length
      });

      // Log search analytics (respects privacy settings)
      await this.analyticsService.logSearch(query);

      return limitedResults;

    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      
      throw this.createSearchError(
        SearchErrorType.DATABASE_ERROR,
        'Failed to perform search',
        query,
        filters,
        ['Try again', 'Check your connection', 'Simplify your search']
      );
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  public async getSearchSuggestions(partial: string): Promise<string[]> {
    try {
      if (partial.length < 2) {
        return [];
      }

      // Get suggestions from search repository (more efficient)
      const contentSuggestions = await this.searchRepo.getContentBasedSuggestions(partial, 8);
      const suggestions = new Set<string>(contentSuggestions);

      // Get recent searches that match
      const recentSearches = await this.historyService.getHistory(10);
      recentSearches.forEach(item => {
        if (item.query.toLowerCase().includes(partial.toLowerCase())) {
          suggestions.add(item.query);
        }
      });

      return Array.from(suggestions).slice(0, 10);

    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get search statistics
   */
  public async getSearchStats(): Promise<{ cacheSize: number; historyCount: number }> {
    const historyCount = (await this.historyService.getHistory()).length;
    return {
      cacheSize: this.searchCache.size,
      historyCount
    };
  }

  private async performDatabaseSearch(query: string, filters: SearchFilters): Promise<Flashcard[]> {
    // Use existing search method from repository as base
    let flashcards = await this.flashcardRepo.search(query);

    // Apply folder filter if specified
    if (filters.folderId !== undefined) {
      flashcards = flashcards.filter(card => card.folderId === filters.folderId);
    }

    // Apply date range filter if specified
    if (filters.dateRange) {
      flashcards = flashcards.filter(card => {
        const cardDate = new Date(card.createdAt);
        return cardDate >= filters.dateRange!.startDate && cardDate <= filters.dateRange!.endDate;
      });
    }

    return flashcards;
  }

  private async convertToSearchResults(flashcards: Flashcard[], query: string): Promise<SearchResult[]> {
    return flashcards.map(flashcard => ({
      flashcard,
      relevanceScore: this.calculateRelevanceScore(flashcard, query),
      matchedFields: this.getMatchedFields(flashcard, query),
      highlightedContent: this.createHighlightedContent(flashcard, query)
    }));
  }

  private calculateRelevanceScore(flashcard: Flashcard, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Exact word match gets highest score
    if (flashcard.word.toLowerCase() === lowerQuery) {
      score += 100;
    } else if (flashcard.word.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Translation match
    if (flashcard.translation.toLowerCase() === lowerQuery) {
      score += 80;
    } else if (flashcard.translation.toLowerCase().includes(lowerQuery)) {
      score += 40;
    }

    // Memo match (lower priority)
    if (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Pronunciation matches
    if (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }
    if (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase().includes(lowerQuery)) {
      score += 25;
    }

    return score;
  }

  private getMatchedFields(flashcard: Flashcard, query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const matchedFields: string[] = [];

    if (flashcard.word.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('word');
    }
    if (flashcard.translation.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('translation');
    }
    if (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('memo');
    }
    if (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('wordPronunciation');
    }
    if (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('translationPronunciation');
    }

    return matchedFields;
  }

  private createHighlightedContent(flashcard: Flashcard, query: string): HighlightedContent {
    const highlightText = (text: string, query: string): string => {
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    return {
      word: highlightText(flashcard.word, query),
      translation: highlightText(flashcard.translation, query),
      memo: flashcard.memo ? highlightText(flashcard.memo, query) : undefined,
      wordPronunciation: flashcard.wordPronunciation ? highlightText(flashcard.wordPronunciation, query) : undefined,
      translationPronunciation: flashcard.translationPronunciation ? highlightText(flashcard.translationPronunciation, query) : undefined
    };
  }

  private sortResults(results: SearchResult[], sortBy: SortOption, sortOrder: 'asc' | 'desc'): SearchResult[] {
    const sortedResults = [...results];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    sortedResults.sort((a, b) => {
      switch (sortBy) {
        case SortOption.RELEVANCE:
          return (b.relevanceScore - a.relevanceScore) * multiplier;
        
        case SortOption.DATE_CREATED:
          return (new Date(b.flashcard.createdAt).getTime() - new Date(a.flashcard.createdAt).getTime()) * multiplier;
        
        case SortOption.ALPHABETICAL:
          return a.flashcard.word.localeCompare(b.flashcard.word) * multiplier;
        
        case SortOption.STUDY_PROGRESS:
          // TODO: Implement when study progress tracking is available
          return 0;
        
        case SortOption.LAST_STUDIED:
          // TODO: Implement when last studied tracking is available
          return 0;
        
        default:
          return (b.relevanceScore - a.relevanceScore) * multiplier;
      }
    });

    return sortedResults;
  }

  private generateCacheKey(query: string, filters: SearchFilters): string {
    return `${query}:${JSON.stringify(filters)}`;
  }

  private getCachedResults(cacheKey: string): SearchResult[] | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    return null;
  }

  private cacheResults(cacheKey: string, results: SearchResult[]): void {
    this.searchCache.set(cacheKey, results);
    
    // Clean up old cache entries
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
  }

  private generateHistoryId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSearchError(
    type: SearchErrorType,
    message: string,
    query?: string,
    filters?: SearchFilters,
    suggestions?: string[]
  ): SearchError {
    const error = new Error(message) as SearchError;
    error.type = type;
    error.query = query;
    error.filters = filters;
    error.suggestions = suggestions;
    return error;
  }
}