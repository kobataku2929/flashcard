// Real-time search service with auto-complete functionality

import { Flashcard } from '../types';
import { SearchSuggestion } from '../components/search/AutoCompleteSearchBar';
import { getFlashcardRepository } from '../repositories';

export class RealTimeSearchService {
  private static instance: RealTimeSearchService;
  private flashcardRepo = getFlashcardRepository();
  private searchCache = new Map<string, SearchSuggestion[]>();
  private flashcardCache: Flashcard[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): RealTimeSearchService {
    if (!RealTimeSearchService.instance) {
      RealTimeSearchService.instance = new RealTimeSearchService();
    }
    return RealTimeSearchService.instance;
  }

  /**
   * Get search suggestions based on partial input with strict matching
   */
  public async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 1) {
      return [];
    }

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    try {
      // Use repository method for better performance
      const textSuggestions = await this.flashcardRepo.getSearchSuggestions(query, 8);
      
      // Convert to SearchSuggestion format with strict filtering
      const suggestions: SearchSuggestion[] = [];
      const seenTexts = new Set<string>();
      const lowerQuery = query.toLowerCase();

      // Get flashcards for each suggestion to provide context
      for (const text of textSuggestions) {
        const lowerText = text.toLowerCase();
        
        // Strict filtering: only include if text actually contains the query
        if (lowerText.includes(lowerQuery) && !seenTexts.has(lowerText)) {
          // Find a flashcard that matches this text
          const matchingFlashcards = await this.findFlashcardsForText(text, query);
          const flashcard = matchingFlashcards[0]; // Use first match

          if (flashcard) {
            const type = this.determineTextType(flashcard, text);
            suggestions.push({
              id: `${type}-${flashcard.id}-${text}`,
              text,
              type,
              flashcard,
            });
            seenTexts.add(lowerText);
          }
        }
      }

      // Sort suggestions by relevance to query
      const sortedSuggestions = this.sortSuggestionsByQueryRelevance(suggestions, query);

      // Cache the results
      this.searchCache.set(cacheKey, sortedSuggestions);

      // Clean up cache if it gets too large
      if (this.searchCache.size > 100) {
        const firstKey = this.searchCache.keys().next().value;
        if (firstKey) {
          this.searchCache.delete(firstKey);
        }
      }

      return sortedSuggestions;

    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Find flashcards that contain the given text and query
   */
  private async findFlashcardsForText(text: string, query: string): Promise<Flashcard[]> {
    await this.ensureFlashcardCache();
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    return this.flashcardCache.filter(flashcard => {
      // Check if the flashcard contains both the text and the original query
      const hasText = (
        flashcard.word.toLowerCase() === lowerText ||
        flashcard.translation.toLowerCase() === lowerText ||
        (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase() === lowerText) ||
        (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase() === lowerText) ||
        (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerText))
      );
      
      const hasQuery = (
        flashcard.word.toLowerCase().includes(lowerQuery) ||
        flashcard.translation.toLowerCase().includes(lowerQuery) ||
        (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase().includes(lowerQuery)) ||
        (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase().includes(lowerQuery)) ||
        (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerQuery))
      );
      
      return hasText && hasQuery;
    });
  }

  /**
   * Determine the type of text based on which field it matches
   */
  private determineTextType(flashcard: Flashcard, text: string): SearchSuggestion['type'] {
    const lowerText = text.toLowerCase();
    
    if (flashcard.word.toLowerCase() === lowerText || 
        (flashcard.wordPronunciation && flashcard.wordPronunciation.toLowerCase() === lowerText)) {
      return 'word';
    }
    
    if (flashcard.translation.toLowerCase() === lowerText || 
        (flashcard.translationPronunciation && flashcard.translationPronunciation.toLowerCase() === lowerText)) {
      return 'translation';
    }
    
    if (flashcard.memo && flashcard.memo.toLowerCase().includes(lowerText)) {
      return 'memo';
    }
    
    return 'word'; // Default
  }

  /**
   * Sort suggestions by relevance to the query
   */
  private sortSuggestionsByQueryRelevance(suggestions: SearchSuggestion[], query: string): SearchSuggestion[] {
    const lowerQuery = query.toLowerCase();
    
    return suggestions.sort((a, b) => {
      const aText = a.text.toLowerCase();
      const bText = b.text.toLowerCase();
      
      // Exact match gets highest priority
      if (aText === lowerQuery && bText !== lowerQuery) return -1;
      if (bText === lowerQuery && aText !== lowerQuery) return 1;
      
      // Starts with query gets high priority
      const aStartsWith = aText.startsWith(lowerQuery);
      const bStartsWith = bText.startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      
      // Type priority: word > translation > memo
      const typeOrder = { word: 3, translation: 2, memo: 1, history: 0 };
      const aTypeScore = typeOrder[a.type] || 0;
      const bTypeScore = typeOrder[b.type] || 0;
      if (aTypeScore !== bTypeScore) return bTypeScore - aTypeScore;
      
      // Shorter text gets priority (more specific)
      if (aText.length !== bText.length) return aText.length - bText.length;
      
      // Alphabetical order as final tiebreaker
      return aText.localeCompare(bText);
    });
  }

  /**
   * Perform real-time search
   */
  public async searchRealTime(query: string): Promise<Flashcard[]> {
    if (query.length < 1) {
      return [];
    }

    try {
      // Use repository search for better performance and ranking
      return await this.flashcardRepo.search(query);
    } catch (error) {
      console.error('Failed to perform real-time search:', error);
      return [];
    }
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.searchCache.clear();
    this.flashcardCache = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Force refresh of flashcard cache
   */
  public async refreshCache(): Promise<void> {
    this.flashcardCache = await this.flashcardRepo.findAll();
    this.lastCacheUpdate = Date.now();
    this.searchCache.clear(); // Clear search cache when data changes
  }

  private async ensureFlashcardCache(): Promise<void> {
    const now = Date.now();
    if (this.flashcardCache.length === 0 || 
        (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
      await this.refreshCache();
    }
  }

  private sortSuggestionsByRelevance(suggestions: SearchSuggestion[], query: string): SearchSuggestion[] {
    const lowerQuery = query.toLowerCase();

    return suggestions.sort((a, b) => {
      const scoreA = this.calculateSuggestionScore(a, lowerQuery);
      const scoreB = this.calculateSuggestionScore(b, lowerQuery);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // If scores are equal, sort by text length (shorter first)
      return a.text.length - b.text.length;
    });
  }

  private calculateSuggestionScore(suggestion: SearchSuggestion, lowerQuery: string): number {
    const text = suggestion.text.toLowerCase();
    let score = 0;

    // Exact match gets highest score
    if (text === lowerQuery) {
      score += 1000;
    }

    // Starts with query gets high score
    if (text.startsWith(lowerQuery)) {
      score += 500;
    }

    // Contains query gets medium score
    if (text.includes(lowerQuery)) {
      score += 100;
    }

    // Type-based scoring
    switch (suggestion.type) {
      case 'word':
        score += 50;
        break;
      case 'translation':
        score += 40;
        break;
      case 'memo':
        score += 10;
        break;
      case 'history':
        score += 30;
        break;
    }

    // Shorter texts get slight preference
    score -= text.length * 0.1;

    return score;
  }

  private calculateRelevanceScore(flashcard: Flashcard, lowerQuery: string): number {
    let score = 0;

    // Word matching
    const word = flashcard.word.toLowerCase();
    if (word === lowerQuery) {
      score += 1000;
    } else if (word.startsWith(lowerQuery)) {
      score += 500;
    } else if (word.includes(lowerQuery)) {
      score += 200;
    }

    // Translation matching
    const translation = flashcard.translation.toLowerCase();
    if (translation === lowerQuery) {
      score += 800;
    } else if (translation.startsWith(lowerQuery)) {
      score += 400;
    } else if (translation.includes(lowerQuery)) {
      score += 150;
    }

    // Pronunciation matching
    if (flashcard.wordPronunciation) {
      const wordPron = flashcard.wordPronunciation.toLowerCase();
      if (wordPron.includes(lowerQuery)) {
        score += 100;
      }
    }

    if (flashcard.translationPronunciation) {
      const transPron = flashcard.translationPronunciation.toLowerCase();
      if (transPron.includes(lowerQuery)) {
        score += 80;
      }
    }

    // Memo matching (lower priority)
    if (flashcard.memo) {
      const memo = flashcard.memo.toLowerCase();
      if (memo.includes(lowerQuery)) {
        score += 50;
      }
    }

    return score;
  }
}