// Enhanced Search Service

import { 
  SearchFilters, 
  SearchResult, 
  SearchErrorType,
  SortOption,
  HighlightedContent,
  AutocompleteSuggestion
} from '../types/search';
import { Flashcard } from '../types';
import { getFlashcardRepository, getSearchRepository } from '../repositories';
import { SearchHistoryService } from './SearchHistoryService';
import { FilterService } from './FilterService';
import { SearchAnalyticsService } from './SearchAnalyticsService';

export class SearchService {
  private static instance: SearchService;
  private flashcardRepo = getFlashcardRepository();
  private searchRepo = getSearchRepository();
  private historyService = SearchHistoryService.getInstance();
  private filterService = FilterService.getInstance();
  private analyticsService = SearchAnalyticsService.getInstance();
  private searchCache = new Map<string, SearchResult[]>();
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

      // Log performance metrics
      if (searchTime > 1000) {
        console.warn(`Slow search query: "${query}" took ${searchTime}ms`);
      }

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
      if (error && typeof error === 'object' && 'type' in error) {
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
   * Get enhanced autocomplete suggestions with metadata
   */
  public async getAutocompleteSuggestions(partial: string): Promise<AutocompleteSuggestion[]> {
    try {
      if (partial.length < 1) {
        // Return recent searches when no input
        const recentSearches = await this.historyService.getHistory(5);
        return recentSearches.map(item => ({
          id: `history_${item.id}`,
          text: item.query,
          type: 'history' as const,
          frequency: 1,
          lastUsed: item.timestamp,
          resultCount: item.resultCount
        }));
      }

      const suggestions: AutocompleteSuggestion[] = [];
      const seenTexts = new Set<string>();

      // Get content-based suggestions with enhanced metadata
      const contentSuggestions = await this.getEnhancedContentSuggestions(partial, 6);
      contentSuggestions.forEach(suggestion => {
        if (!seenTexts.has(suggestion.text.toLowerCase())) {
          suggestions.push(suggestion);
          seenTexts.add(suggestion.text.toLowerCase());
        }
      });

      // Get history-based suggestions
      const historySuggestions = await this.historyService.getHistoryBasedSuggestions(partial, 4);
      historySuggestions.forEach(query => {
        if (!seenTexts.has(query.toLowerCase())) {
          suggestions.push({
            id: `history_${Date.now()}_${Math.random()}`,
            text: query,
            type: 'history',
            frequency: 1,
            lastUsed: new Date()
          });
          seenTexts.add(query.toLowerCase());
        }
      });

      // Sort by relevance and frequency
      return this.rankSuggestions(suggestions, partial).slice(0, 8);

    } catch (error) {
      console.error('Failed to get autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Get frequent search terms for quick access
   */
  public async getFrequentSearchTerms(limit: number = 5): Promise<AutocompleteSuggestion[]> {
    try {
      const frequentSearches = await this.historyService.getFrequentSearches(limit);
      return frequentSearches.map(item => ({
        id: `frequent_${item.id}`,
        text: item.query,
        type: 'history' as const,
        frequency: 1, // TODO: Get actual frequency from analytics
        lastUsed: item.timestamp,
        resultCount: item.resultCount
      }));
    } catch (error) {
      console.error('Failed to get frequent search terms:', error);
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



  private async convertToSearchResults(flashcards: Flashcard[], query: string): Promise<SearchResult[]> {
    const lowerQuery = query.toLowerCase();
    
    return flashcards
      .map(flashcard => {
        const relevanceScore = this.calculateRelevanceScore(flashcard, query);
        const matchedFields = this.getMatchedFields(flashcard, query);
        
        return {
          flashcard,
          relevanceScore,
          matchedFields,
          highlightedContent: this.createHighlightedContent(flashcard, query)
        };
      })
      .filter(result => {
        // 検索ワードが含まれているカードのみを返す - より厳密なチェック
        if (result.relevanceScore <= 0 || result.matchedFields.length === 0) {
          return false;
        }
        
        // 実際にクエリが含まれているかダブルチェック
        const { flashcard } = result;
        return (
          flashcard.word.toLowerCase().includes(lowerQuery) ||
          flashcard.translation.toLowerCase().includes(lowerQuery) ||
          (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerQuery)) ||
          (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase().includes(lowerQuery)) ||
          (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase().includes(lowerQuery))
        );
      });
  }

  private calculateRelevanceScore(flashcard: Flashcard, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;
    let matchType = '';

    // 優先順位: 表面のメイン（単語）> 裏面のメイン（翻訳）> メモ
    
    // 表面のメイン（単語）- 最高優先度
    if (flashcard.word.toLowerCase() === lowerQuery) {
      score += 100000; // 完全一致
      matchType = 'word-exact';
    } else if (flashcard.word.toLowerCase().startsWith(lowerQuery)) {
      score += 80000; // 前方一致
      matchType = 'word-starts';
    } else if (flashcard.word.toLowerCase().includes(lowerQuery)) {
      score += 60000; // 部分一致
      matchType = 'word-contains';
    }

    // 裏面のメイン（翻訳）- 2番目の優先度
    if (flashcard.translation.toLowerCase() === lowerQuery) {
      score += 50000; // 完全一致
      if (!matchType) matchType = 'translation-exact';
    } else if (flashcard.translation.toLowerCase().startsWith(lowerQuery)) {
      score += 40000; // 前方一致
      if (!matchType) matchType = 'translation-starts';
    } else if (flashcard.translation.toLowerCase().includes(lowerQuery)) {
      score += 30000; // 部分一致
      if (!matchType) matchType = 'translation-contains';
    }

    // メモ（3番目の優先度 - 最低）
    if (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerQuery)) {
      if (flashcard.memo.toLowerCase() === lowerQuery) {
        score += 20000; // 完全一致
        if (!matchType) matchType = 'memo-exact';
      } else if (flashcard.memo.toLowerCase().startsWith(lowerQuery)) {
        score += 15000; // 前方一致
        if (!matchType) matchType = 'memo-starts';
      } else {
        score += 10000; // 部分一致
        if (!matchType) matchType = 'memo-contains';
      }
    }

    // 発音（最低優先度）
    if (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase().includes(lowerQuery)) {
      score += 5000;
      if (!matchType) matchType = 'word-pronunciation';
    }
    if (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase().includes(lowerQuery)) {
      score += 2500;
      if (!matchType) matchType = 'translation-pronunciation';
    }

    // デバッグログ（開発時のみ）
    if (score > 0) {
      console.log(`[SearchService] Card: "${flashcard.word}" -> "${flashcard.translation}", Score: ${score}, Match: ${matchType}, Query: "${query}"`);
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

    // デバッグログ（ソート前）
    console.log(`[SearchService] Sorting ${results.length} results by ${sortBy}, order: ${sortOrder}`);
    results.forEach((result, index) => {
      console.log(`[SearchService] Before sort [${index}]: "${result.flashcard.word}" -> "${result.flashcard.translation}", Score: ${result.relevanceScore}`);
    });

    sortedResults.sort((a, b) => {
      switch (sortBy) {
        case SortOption.RELEVANCE:
          // 関連性スコアで並び替え（高い方が先）
          const scoreDiff = b.relevanceScore - a.relevanceScore;
          if (scoreDiff !== 0) {
            return scoreDiff * multiplier;
          }
          // スコアが同じ場合は作成日で並び替え
          return (new Date(b.flashcard.createdAt).getTime() - new Date(a.flashcard.createdAt).getTime()) * multiplier;
        
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
          // デフォルトは関連性順
          const defaultScoreDiff = b.relevanceScore - a.relevanceScore;
          if (defaultScoreDiff !== 0) {
            return defaultScoreDiff;
          }
          return (new Date(b.flashcard.createdAt).getTime() - new Date(a.flashcard.createdAt).getTime());
      }
    });

    // デバッグログ（ソート後）
    sortedResults.forEach((result, index) => {
      console.log(`[SearchService] After sort [${index}]: "${result.flashcard.word}" -> "${result.flashcard.translation}", Score: ${result.relevanceScore}`);
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
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
  }

  private generateHistoryId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get enhanced content suggestions with metadata
   */
  private async getEnhancedContentSuggestions(partial: string, limit: number): Promise<AutocompleteSuggestion[]> {
    try {
      const db = await this.searchRepo.getDb();
      const searchTerm = `${partial.toLowerCase()}%`;
      
      const sql = `
        SELECT 
          word, translation, memo, word_pronunciation, translation_pronunciation,
          created_at,
          CASE 
            WHEN LOWER(word) LIKE ? THEN 'word'
            WHEN LOWER(translation) LIKE ? THEN 'translation'
            WHEN LOWER(memo) LIKE ? AND memo IS NOT NULL THEN 'memo'
            WHEN LOWER(word_pronunciation) LIKE ? AND word_pronunciation IS NOT NULL THEN 'pronunciation'
            WHEN LOWER(translation_pronunciation) LIKE ? AND translation_pronunciation IS NOT NULL THEN 'pronunciation'
            ELSE 'other'
          END as match_type,
          CASE 
            WHEN LOWER(word) LIKE ? THEN word
            WHEN LOWER(translation) LIKE ? THEN translation
            WHEN LOWER(memo) LIKE ? AND memo IS NOT NULL THEN memo
            WHEN LOWER(word_pronunciation) LIKE ? AND word_pronunciation IS NOT NULL THEN word_pronunciation
            WHEN LOWER(translation_pronunciation) LIKE ? AND translation_pronunciation IS NOT NULL THEN translation_pronunciation
            ELSE NULL
          END as suggestion_text
        FROM flashcards 
        WHERE suggestion_text IS NOT NULL
        ORDER BY 
          CASE match_type
            WHEN 'word' THEN 1
            WHEN 'translation' THEN 2
            WHEN 'pronunciation' THEN 3
            WHEN 'memo' THEN 4
            ELSE 5
          END,
          LENGTH(suggestion_text), 
          created_at DESC
        LIMIT ?
      `;

      const params = Array(11).fill(searchTerm).concat([limit]);
      const rows = await db.getAllAsync(sql, params);
      
      return rows.map((row: any, index: number) => ({
        id: `content_${index}_${Date.now()}`,
        text: row.suggestion_text,
        type: row.match_type === 'word' ? 'word' as const :
              row.match_type === 'translation' ? 'translation' as const :
              row.match_type === 'memo' ? 'memo' as const :
              'word' as const,
        frequency: 1,
        lastUsed: new Date(row.created_at),
        flashcard: {
          word: row.word,
          translation: row.translation,
          memo: row.memo
        }
      }));

    } catch (error) {
      console.error('Failed to get enhanced content suggestions:', error);
      return [];
    }
  }

  /**
   * Rank suggestions by relevance and frequency
   */
  private rankSuggestions(suggestions: AutocompleteSuggestion[], partial: string): AutocompleteSuggestion[] {
    const lowerPartial = partial.toLowerCase();
    
    return suggestions.sort((a, b) => {
      const aText = a.text.toLowerCase();
      const bText = b.text.toLowerCase();
      
      // Exact match gets highest priority
      const aExact = aText === lowerPartial ? 100 : 0;
      const bExact = bText === lowerPartial ? 100 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Starts with gets second priority
      const aStartsWith = aText.startsWith(lowerPartial) ? 50 : 0;
      const bStartsWith = bText.startsWith(lowerPartial) ? 50 : 0;
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
      
      // Type priority (word > translation > history > memo)
      const typeScore = (type: string) => {
        switch (type) {
          case 'word': return 40;
          case 'translation': return 30;
          case 'history': return 20;
          case 'memo': return 10;
          default: return 0;
        }
      };
      const aTypeScore = typeScore(a.type);
      const bTypeScore = typeScore(b.type);
      if (aTypeScore !== bTypeScore) return bTypeScore - aTypeScore;
      
      // Frequency and recency
      const aFrequency = (a.frequency || 1) * 10;
      const bFrequency = (b.frequency || 1) * 10;
      if (aFrequency !== bFrequency) return bFrequency - aFrequency;
      
      // Recency (more recent = higher score)
      const aRecency = a.lastUsed ? Date.now() - a.lastUsed.getTime() : Infinity;
      const bRecency = b.lastUsed ? Date.now() - b.lastUsed.getTime() : Infinity;
      if (aRecency !== bRecency) return aRecency - bRecency;
      
      // Length (shorter = better)
      return aText.length - bText.length;
    });
  }

  private createSearchError(
    type: SearchErrorType,
    message: string,
    query?: string,
    filters?: SearchFilters,
    suggestions?: string[]
  ): Error & { type: SearchErrorType; query?: string; filters?: SearchFilters; suggestions?: string[] } {
    const error = new Error(message) as Error & { 
      type: SearchErrorType; 
      query?: string; 
      filters?: SearchFilters; 
      suggestions?: string[] 
    };
    error.type = type;
    error.query = query;
    error.filters = filters;
    error.suggestions = suggestions;
    return error;
  }
}