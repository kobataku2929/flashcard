// Search Filters Management Component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchFilters as SearchFiltersType, SortOption, StudyStatus, DateRange } from '../../types/search';
import { FolderFilter } from './FolderFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { StudyStatusFilter } from './StudyStatusFilter';
import { FilterService } from '../../services/FilterService';

interface Props {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  style?: any;
}

export function SearchFilters({ filters, onFiltersChange, style }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const filterService = FilterService.getInstance();

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.folderId !== undefined) count++;
    if (filters.dateRange) count++;
    if (filters.studyStatus && filters.studyStatus.length > 0) count++;
    return count;
  };

  const handleFolderChange = (folderId?: number | null) => {
    onFiltersChange({
      ...filters,
      folderId
    });
  };

  const handleDateRangeChange = (dateRange?: DateRange) => {
    onFiltersChange({
      ...filters,
      dateRange
    });
  };

  const handleStudyStatusChange = (studyStatus?: StudyStatus[]) => {
    onFiltersChange({
      ...filters,
      studyStatus
    });
  };

  const handleSortChange = (sortBy: SortOption) => {
    onFiltersChange({
      ...filters,
      sortBy
    });
  };

  const handleSortOrderChange = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleClearAllFilters = () => {
    onFiltersChange(filterService.createDefaultFilters());
  };

  const getSortOptionLabel = (option: SortOption): string => {
    switch (option) {
      case SortOption.RELEVANCE:
        return 'Relevance';
      case SortOption.DATE_CREATED:
        return 'Date Created';
      case SortOption.ALPHABETICAL:
        return 'Alphabetical';
      case SortOption.STUDY_PROGRESS:
        return 'Study Progress';
      case SortOption.LAST_STUDIED:
        return 'Last Studied';
      default:
        return 'Relevance';
    }
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <View style={[styles.container, style]}>
      {/* Filter Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.toggleButtonContent}>
          <Ionicons name="options-outline" size={20} color="#6b7280" />
          <Text style={styles.toggleButtonText}>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#6b7280" 
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <View style={styles.filtersPanel}>
          {/* Filter Controls */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.filtersRowContent}
          >
            <FolderFilter
              selectedFolderId={filters.folderId}
              onFolderSelect={handleFolderChange}
              style={styles.filterItem}
            />
            
            <DateRangeFilter
              selectedDateRange={filters.dateRange}
              onDateRangeSelect={handleDateRangeChange}
              style={styles.filterItem}
            />
            
            <StudyStatusFilter
              selectedStatuses={filters.studyStatus}
              onStatusesSelect={handleStudyStatusChange}
              style={styles.filterItem}
            />
          </ScrollView>

          {/* Sort Controls */}
          <View style={styles.sortSection}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.sortControls}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.sortOptions}
              >
                {Object.values(SortOption).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.sortOption,
                      filters.sortBy === option && styles.selectedSortOption
                    ]}
                    onPress={() => handleSortChange(option)}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      filters.sortBy === option && styles.selectedSortOptionText
                    ]}>
                      {getSortOptionLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.sortOrderButton}
                onPress={handleSortOrderChange}
              >
                <Ionicons 
                  name={filters.sortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                  size={16} 
                  color="#6366f1" 
                />
                <Text style={styles.sortOrderText}>
                  {filters.sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAllFilters}
            >
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: '#f9fafb',
    paddingVertical: 16,
  },
  filtersRow: {
    paddingHorizontal: 16,
  },
  filtersRowContent: {
    paddingRight: 16,
  },
  filterItem: {
    width: 200,
    marginRight: 12,
  },
  sortSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptions: {
    flex: 1,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedSortOption: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedSortOptionText: {
    color: '#fff',
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
    marginLeft: 8,
  },
  sortOrderText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 4,
  },
});