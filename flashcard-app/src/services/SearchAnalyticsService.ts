// Search Analytics Service with Privacy Controls

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSearchRepository } from '../repositories';
import { SearchAnalytics } from '../types/search';

export interface AnalyticsSettings {
  enabled: boolean;
  retentionDays: number;
  anonymizeData: boolean;
}

export class SearchAnalyticsService {
  private static instance: SearchAnalyticsService;
  private searchRepo = getSearchRepository();
  private readonly SETTINGS_KEY = 'search_analytics_settings';
  private readonly DEFAULT_RETENTION_DAYS = 90;

  private constructor() {}

  public static getInstance(): SearchAnalyticsService {
    if (!SearchAnalyticsService.instance) {
      SearchAnalyticsService.instance = new SearchAnalyticsService();
    }
    return SearchAnalyticsService.instance;
  }

  /**
   * Get analytics settings
   */
  public async getSettings(): Promise<AnalyticsSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      
      // Return default settings
      return {
        enabled: true,
        retentionDays: this.DEFAULT_RETENTION_DAYS,
        anonymizeData: false
      };
    } catch (error) {
      console.error('Failed to get analytics settings:', error);
      return {
        enabled: true,
        retentionDays: this.DEFAULT_RETENTION_DAYS,
        anonymizeData: false
      };
    }
  }

  /**
   * Update analytics settings
   */
  public async updateSettings(settings: AnalyticsSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      
      // If analytics is disabled, clean up existing data
      if (!settings.enabled) {
        await this.clearAllAnalytics();
      }
    } catch (error) {
      console.error('Failed to update analytics settings:', error);
      throw error;
    }
  }

  /**
   * Log search analytics (respects privacy settings)
   */
  public async logSearch(
    searchTerm: string, 
    cardId?: number, 
    actionType: string = 'search'
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled) {
        return; // Analytics disabled
      }

      // Anonymize data if required
      const term = settings.anonymizeData ? this.anonymizeSearchTerm(searchTerm) : searchTerm;
      
      await this.searchRepo.logSearchAnalytics(term, cardId, actionType);
    } catch (error) {
      console.error('Failed to log search analytics:', error);
      // Don't throw error for analytics logging failures
    }
  }

  /**
   * Get search analytics
   */
  public async getAnalytics(): Promise<SearchAnalytics> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled) {
        return {
          totalSearches: 0,
          mostSearchedTerms: [],
          averageResultsPerSearch: 0,
          mostAccessedCards: [],
          searchPatterns: []
        };
      }

      return await this.searchRepo.getSearchAnalytics();
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return {
        totalSearches: 0,
        mostSearchedTerms: [],
        averageResultsPerSearch: 0,
        mostAccessedCards: [],
        searchPatterns: []
      };
    }
  }

  /**
   * Clear all analytics data
   */
  public async clearAllAnalytics(): Promise<void> {
    try {
      // This would need to be implemented in SearchRepository
      // For now, we'll use the cleanup method with 0 days retention
      await this.searchRepo.cleanupAnalytics(0);
    } catch (error) {
      console.error('Failed to clear analytics:', error);
      throw error;
    }
  }

  /**
   * Run data retention cleanup
   */
  public async runRetentionCleanup(): Promise<void> {
    try {
      const settings = await this.getSettings();
      await this.searchRepo.cleanupAnalytics(settings.retentionDays);
    } catch (error) {
      console.error('Failed to run retention cleanup:', error);
    }
  }

  /**
   * Export analytics data
   */
  public async exportAnalytics(): Promise<string> {
    try {
      const analytics = await this.getAnalytics();
      return JSON.stringify(analytics, null, 2);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      return '{}';
    }
  }

  /**
   * Get analytics summary for user display
   */
  public async getAnalyticsSummary(): Promise<{
    totalSearches: number;
    topSearchTerms: string[];
    searchFrequency: 'low' | 'medium' | 'high';
    dataRetentionDays: number;
    isEnabled: boolean;
  }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled) {
        return {
          totalSearches: 0,
          topSearchTerms: [],
          searchFrequency: 'low',
          dataRetentionDays: settings.retentionDays,
          isEnabled: false
        };
      }

      const analytics = await this.getAnalytics();
      const topTerms = analytics.mostSearchedTerms.slice(0, 5).map(t => t.term);
      
      let frequency: 'low' | 'medium' | 'high' = 'low';
      if (analytics.totalSearches > 100) frequency = 'high';
      else if (analytics.totalSearches > 20) frequency = 'medium';

      return {
        totalSearches: analytics.totalSearches,
        topSearchTerms: topTerms,
        searchFrequency: frequency,
        dataRetentionDays: settings.retentionDays,
        isEnabled: true
      };
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return {
        totalSearches: 0,
        topSearchTerms: [],
        searchFrequency: 'low',
        dataRetentionDays: this.DEFAULT_RETENTION_DAYS,
        isEnabled: false
      };
    }
  }

  private anonymizeSearchTerm(term: string): string {
    // Simple anonymization - replace with hash or generic term
    if (term.length <= 2) {
      return '**';
    }
    
    // Keep first and last character, replace middle with asterisks
    const first = term.charAt(0);
    const last = term.charAt(term.length - 1);
    const middle = '*'.repeat(Math.max(1, term.length - 2));
    
    return `${first}${middle}${last}`;
  }
}