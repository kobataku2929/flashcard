/**
 * List optimization utilities for handling large datasets
 */

import React, { useMemo, useCallback } from 'react';
import { Flashcard, Folder } from '../types';
import { BatchProcessor } from './performance';

export interface ListItem {
  id: string;
  type: 'folder' | 'flashcard';
  data: Folder | Flashcard;
  searchText: string; // Pre-computed search text for filtering
}

/**
 * Hook for optimized list management with virtual scrolling support
 */
export function useOptimizedList(
  folders: Folder[],
  flashcards: Flashcard[],
  searchQuery?: string
) {
  // Pre-compute search text for each item
  const items = useMemo(() => {
    const folderItems: ListItem[] = folders.map(folder => ({
      id: `folder-${folder.id}`,
      type: 'folder' as const,
      data: folder,
      searchText: folder.name.toLowerCase(),
    }));

    const flashcardItems: ListItem[] = flashcards.map(flashcard => ({
      id: `flashcard-${flashcard.id}`,
      type: 'flashcard' as const,
      data: flashcard,
      searchText: `${flashcard.word} ${flashcard.translation} ${flashcard.memo || ''}`.toLowerCase(),
    }));

    return [...folderItems, ...flashcardItems];
  }, [folders, flashcards]);

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => item.searchText.includes(query));
  }, [items, searchQuery]);

  // Chunked items for batch rendering
  const chunkedItems = useMemo(() => {
    const chunkSize = 50; // Render in chunks of 50 items
    const chunks: ListItem[][] = [];
    
    for (let i = 0; i < filteredItems.length; i += chunkSize) {
      chunks.push(filteredItems.slice(i, i + chunkSize));
    }
    
    return chunks;
  }, [filteredItems]);

  return {
    items: filteredItems,
    chunkedItems,
    totalCount: filteredItems.length,
    folderCount: filteredItems.filter(item => item.type === 'folder').length,
    flashcardCount: filteredItems.filter(item => item.type === 'flashcard').length,
  };
}

/**
 * Virtual list item height calculator
 */
export function useItemHeight() {
  const getItemHeight = useCallback((item: ListItem): number => {
    // Base height for all items
    let height = 80;

    if (item.type === 'flashcard') {
      const flashcard = item.data as Flashcard;
      
      // Add height for memo if present
      if (flashcard.memo) {
        height += 20;
      }
      
      // Add height for pronunciation if present
      if (flashcard.wordPronunciation || flashcard.translationPronunciation) {
        height += 15;
      }
    }

    return height;
  }, []);

  const getItemLayout = useCallback((data: ListItem[] | null | undefined, index: number) => {
    if (!data || !data[index]) {
      return { length: 80, offset: 80 * index, index };
    }

    const item = data[index];
    const length = getItemHeight(item);
    
    // Calculate offset by summing heights of previous items
    let offset = 0;
    for (let i = 0; i < index; i++) {
      if (data[i]) {
        offset += getItemHeight(data[i]);
      }
    }

    return { length, offset, index };
  }, [getItemHeight]);

  return { getItemHeight, getItemLayout };
}

/**
 * Batch processor for bulk operations
 */
export class ListBatchProcessor {
  private static instance: ListBatchProcessor;
  private updateProcessor: BatchProcessor<() => void>;
  private deleteProcessor: BatchProcessor<{ type: 'folder' | 'flashcard'; id: number }>;

  private constructor() {
    // Batch UI updates
    this.updateProcessor = new BatchProcessor(
      async (updates) => {
        // Execute all updates in a single batch
        updates.forEach(update => update());
      },
      5, // Batch size
      50  // Flush delay (ms)
    );

    // Batch delete operations
    this.deleteProcessor = new BatchProcessor(
      async (items) => {
        // Group by type for efficient batch deletion
        const folders = items.filter(item => item.type === 'folder').map(item => item.id);
        const flashcards = items.filter(item => item.type === 'flashcard').map(item => item.id);

        // Perform batch deletions
        // This would integrate with your repository layer
        console.log('Batch deleting:', { folders, flashcards });
      },
      10, // Batch size
      200 // Flush delay (ms)
    );
  }

  static getInstance(): ListBatchProcessor {
    if (!ListBatchProcessor.instance) {
      ListBatchProcessor.instance = new ListBatchProcessor();
    }
    return ListBatchProcessor.instance;
  }

  batchUpdate(updateFn: () => void): void {
    this.updateProcessor.add(updateFn);
  }

  batchDelete(type: 'folder' | 'flashcard', id: number): void {
    this.deleteProcessor.add({ type, id });
  }

  async flushAll(): Promise<void> {
    await Promise.all([
      this.updateProcessor.flush(),
      this.deleteProcessor.flush(),
    ]);
  }
}

/**
 * Hook for batch operations
 */
export function useBatchOperations() {
  const processor = useMemo(() => ListBatchProcessor.getInstance(), []);

  const batchUpdate = useCallback((updateFn: () => void) => {
    processor.batchUpdate(updateFn);
  }, [processor]);

  const batchDelete = useCallback((type: 'folder' | 'flashcard', id: number) => {
    processor.batchDelete(type, id);
  }, [processor]);

  const flushAll = useCallback(async () => {
    await processor.flushAll();
  }, [processor]);

  return { batchUpdate, batchDelete, flushAll };
}

/**
 * Memoization utilities for list items
 */
export const createMemoizedListItem = <T extends { id: number; updatedAt: string }>(
  Component: React.ComponentType<{ item: T; [key: string]: any }>
) => {
  return React.memo(Component, (prevProps, nextProps) => {
    // Compare by ID and updatedAt for efficient re-rendering
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.updatedAt === nextProps.item.updatedAt
    );
  });
};

/**
 * Intersection observer for lazy loading (React Native compatible)
 */
export function useLazyLoading(
  items: ListItem[],
  initialLoadCount: number = 50,
  loadMoreCount: number = 25
) {
  const [loadedCount, setLoadedCount] = React.useState(initialLoadCount);

  const loadMore = useCallback(() => {
    setLoadedCount(prev => Math.min(prev + loadMoreCount, items.length));
  }, [items.length, loadMoreCount]);

  const visibleItems = useMemo(() => {
    return items.slice(0, loadedCount);
  }, [items, loadedCount]);

  const hasMore = loadedCount < items.length;

  return {
    visibleItems,
    loadMore,
    hasMore,
    loadedCount,
    totalCount: items.length,
  };
}

/**
 * Search optimization with debouncing
 */
export function useOptimizedSearch(
  items: ListItem[],
  searchQuery: string,
  debounceMs: number = 300
) {
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const query = debouncedQuery.toLowerCase().trim();
    const words = query.split(/\s+/);

    return items.filter(item => {
      // All words must match for the item to be included
      return words.every(word => item.searchText.includes(word));
    });
  }, [items, debouncedQuery]);

  return {
    searchResults,
    isSearching: searchQuery !== debouncedQuery,
    debouncedQuery,
  };
}