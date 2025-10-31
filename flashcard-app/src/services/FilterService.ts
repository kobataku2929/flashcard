// Filter Service for Enhanced Search

import { 
  SearchFilters, 
  SearchResult, 
  FilterOptions, 
  FilterPreset,
  DateRangeOption,
  StudyStatusOption,
  SortOption,
  StudyStatus,
  DateRange
} from '../types/search';
import { getFolderRepository } from '../repositories';

export class FilterService {
  private static instance: FilterService;
  private folderRepo = getFolderRepository();

  private constructor() {}

  public static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  /**
   * Get all available filter options
   */
  public async getAvailableFilters(): Promise<FilterOptions> {
    try {
      const folders = await this.folderRepo.findAll();
      
      return {
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name
        })),
        dateRanges: this.getDateRangeOptions(),
        studyStatuses: this.getStudyStatusOptions(),
        sortOptions: Object.values(SortOption)
      };
    } catch (error) {
      console.error('Failed to get available filters:', error);
      return {
        folders: [],
        dateRanges: this.getDateRangeOptions(),
        studyStatuses: this.getStudyStatusOptions(),
        sortOptions: Object.values(SortOption)
      };
    }
  }

  /**
   * Apply filters to search results
   */
  public applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    let filteredResults = [...results];

    // Apply study status filter
    if (filters.studyStatus && filters.studyStatus.length > 0) {
      filteredResults = filteredResults.filter(result => {
        const cardStatus = this.determineStudyStatus(result.flashcard);
        return filters.studyStatus!.includes(cardStatus);
      });
    }

    return filteredResults;
  }

  /**
   * Validate filter configuration
   */
  public validateFilters(filters: SearchFilters): boolean {
    try {
      // Validate date range
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        if (startDate > endDate) {
          return false;
        }
        if (startDate > new Date() || endDate > new Date()) {
          return false;
        }
      }

      // Validate sort option
      if (!Object.values(SortOption).includes(filters.sortBy)) {
        return false;
      }

      // Validate sort order
      if (!['asc', 'desc'].includes(filters.sortOrder)) {
        return false;
      }

      // Validate study status
      if (filters.studyStatus) {
        const validStatuses = Object.values(StudyStatus);
        const invalidStatus = filters.studyStatus.find(status => !validStatuses.includes(status));
        if (invalidStatus) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating filters:', error);
      return false;
    }
  }

  /**
   * Get predefined filter presets
   */
  public getFilterPresets(): FilterPreset[] {
    return [
      {
        id: 'recent',
        name: 'Recent Cards',
        filters: {
          dateRange: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            endDate: new Date()
          },
          sortBy: SortOption.DATE_CREATED,
          sortOrder: 'desc'
        },
        isDefault: false
      },
      {
        id: 'alphabetical',
        name: 'Alphabetical',
        filters: {
          sortBy: SortOption.ALPHABETICAL,
          sortOrder: 'asc'
        },
        isDefault: false
      },
      {
        id: 'needs_review',
        name: 'Needs Review',
        filters: {
          studyStatus: [StudyStatus.NEEDS_REVIEW],
          sortBy: SortOption.RELEVANCE,
          sortOrder: 'desc'
        },
        isDefault: false
      },
      {
        id: 'new_cards',
        name: 'New Cards',
        filters: {
          studyStatus: [StudyStatus.NEW],
          sortBy: SortOption.DATE_CREATED,
          sortOrder: 'desc'
        },
        isDefault: false
      }
    ];
  }

  /**
   * Save a custom filter preset
   */
  public async saveFilterPreset(name: string, filters: SearchFilters): Promise<FilterPreset> {
    // TODO: Implement persistent storage for custom presets
    const preset: FilterPreset = {
      id: `custom_${Date.now()}`,
      name,
      filters,
      isDefault: false
    };

    // For now, just return the preset
    // In the future, save to local storage or database
    return preset;
  }

  /**
   * Create default filters
   */
  public createDefaultFilters(): SearchFilters {
    return {
      sortBy: SortOption.RELEVANCE,
      sortOrder: 'desc'
    };
  }

  /**
   * Merge filters with defaults
   */
  public mergeWithDefaults(filters: Partial<SearchFilters>): SearchFilters {
    const defaults = this.createDefaultFilters();
    return {
      ...defaults,
      ...filters
    };
  }

  public getDateRangeOptions(): DateRangeOption[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return [
      {
        label: 'Today',
        value: {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
      },
      {
        label: 'Last 7 days',
        value: {
          startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now
        }
      },
      {
        label: 'Last 30 days',
        value: {
          startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now
        }
      },
      {
        label: 'Last 3 months',
        value: {
          startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
          endDate: now
        }
      },
      {
        label: 'Last year',
        value: {
          startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
          endDate: now
        }
      }
    ];
  }

  public getStudyStatusOptions(): StudyStatusOption[] {
    return [
      {
        label: 'New Cards',
        value: StudyStatus.NEW
      },
      {
        label: 'Learning',
        value: StudyStatus.LEARNING
      },
      {
        label: 'Mastered',
        value: StudyStatus.MASTERED
      },
      {
        label: 'Needs Review',
        value: StudyStatus.NEEDS_REVIEW
      }
    ];
  }

  private determineStudyStatus(flashcard: any): StudyStatus {
    // TODO: Implement actual study status determination based on study history
    // For now, return NEW as default
    // This should be implemented when study tracking is available
    
    // Placeholder logic - in reality this would check:
    // - How many times the card has been studied
    // - Success rate in recent studies
    // - Time since last study
    // - User's performance on this card
    
    return StudyStatus.NEW;
  }
}