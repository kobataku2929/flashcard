// Enhanced search types

import { Flashcard } from './index';

export interface SearchFilters {
  folderId?: number;
  dateRange?: DateRange;
  studyStatus?: StudyStatus[];
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SearchResult {
  flashcard: Flashcard;
  relevanceScore: number;
  matchedFields: string[];
  highlightedContent: HighlightedContent;
}

export interface HighlightedContent {
  word: string;
  translation: string;
  memo?: string;
  wordPronunciation?: string;
  translationPronunciation?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  mostSearchedTerms: Array<{ term: string; count: number }>;
  averageResultsPerSearch: number;
  mostAccessedCards: Array<{ cardId: number; accessCount: number }>;
  searchPatterns: SearchPattern[];
}

export interface SearchPattern {
  timeOfDay: string;
  dayOfWeek: string;
  commonFilters: SearchFilters;
  averageSessionLength: number;
}

export interface FilterOptions {
  folders: Array<{ id: number; name: string }>;
  dateRanges: DateRangeOption[];
  studyStatuses: StudyStatusOption[];
  sortOptions: SortOption[];
}

export interface DateRangeOption {
  label: string;
  value: DateRange;
}

export interface StudyStatusOption {
  label: string;
  value: StudyStatus;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  isDefault?: boolean;
}

export enum SortOption {
  RELEVANCE = 'relevance',
  DATE_CREATED = 'dateCreated',
  ALPHABETICAL = 'alphabetical',
  STUDY_PROGRESS = 'studyProgress',
  LAST_STUDIED = 'lastStudied'
}

export enum StudyStatus {
  NEW = 'new',
  LEARNING = 'learning',
  MASTERED = 'mastered',
  NEEDS_REVIEW = 'needsReview'
}

export enum SearchErrorType {
  QUERY_TOO_SHORT = 'QUERY_TOO_SHORT',
  INVALID_FILTERS = 'INVALID_FILTERS',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERFORMANCE_TIMEOUT = 'PERFORMANCE_TIMEOUT'
}

export interface SearchError extends Error {
  type: SearchErrorType;
  query?: string;
  filters?: SearchFilters;
  suggestions?: string[];
}

export interface AutocompleteSuggestion {
  id: string;
  text: string;
  type: 'word' | 'translation' | 'memo' | 'history' | 'pronunciation';
  frequency?: number;
  lastUsed?: Date;
  resultCount?: number;
  flashcard?: {
    word: string;
    translation: string;
    memo?: string;
  };
}