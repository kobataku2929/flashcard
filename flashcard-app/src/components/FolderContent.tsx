import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder, Flashcard } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { usePerformanceMonitor, debounce } from '../utils/performance';
import { useOptimizedList, useItemHeight, useLazyLoading } from '../utils/listOptimization';
import { FolderAccessibility } from '../utils/accessibility';

interface FolderItem {
  type: 'folder' | 'flashcard';
  data: Folder | Flashcard;
}

interface FolderContentProps {
  folders: Folder[];
  flashcards: Flashcard[];
  loading?: boolean;
  onFolderPress: (folder: Folder) => void;
  onFlashcardPress: (flashcard: Flashcard) => void;
  onFolderLongPress?: (folder: Folder) => void;
  onFlashcardLongPress?: (flashcard: Flashcard) => void;
  refreshControl?: React.ReactElement<RefreshControl>;
  emptyMessage?: string;
  emptyHint?: string;
  showItemCount?: boolean;
  style?: any;
  searchQuery?: string;
  enableVirtualization?: boolean;
}

export const FolderContent: React.FC<FolderContentProps> = React.memo(({
  folders,
  flashcards,
  loading = false,
  onFolderPress,
  onFlashcardPress,
  onFolderLongPress,
  onFlashcardLongPress,
  refreshControl,
  emptyMessage = 'このフォルダは空です',
  emptyHint = '新しいフォルダを作成するか、TSVファイルをインポートしてください',
  showItemCount = true,
  style,
  searchQuery,
  enableVirtualization = true,
}) => {
  const { measure } = usePerformanceMonitor('FolderContent');
  
  // Use optimized list management
  const { items, totalCount, folderCount, flashcardCount } = useOptimizedList(
    folders,
    flashcards,
    searchQuery
  );
  
  // Use lazy loading for large lists
  const { visibleItems, loadMore, hasMore } = useLazyLoading(items, 50, 25);
  
  // Use dynamic item height calculation
  const { getItemLayout } = useItemHeight();

  // Convert optimized list items to FolderItem format
  const displayItems: FolderItem[] = useMemo(() => {
    return measure('convertItems', () => 
      visibleItems.map(item => ({
        type: item.type,
        data: item.data,
      }))
    );
  }, [visibleItems, measure]);

  // Debounced press handlers for better performance
  const debouncedFolderPress = useCallback(
    debounce((folder: Folder) => onFolderPress(folder), 200),
    [onFolderPress]
  );

  const debouncedFlashcardPress = useCallback(
    debounce((flashcard: Flashcard) => onFlashcardPress(flashcard), 200),
    [onFlashcardPress]
  );

  // Memoize render functions for better performance
  const renderItem = useCallback(({ item }: { item: FolderItem }) => {
    if (item.type === 'folder') {
      const folder = item.data as Folder;
      return (
        <FolderItemComponent
          folder={folder}
          onPress={debouncedFolderPress}
          onLongPress={onFolderLongPress}
          showItemCount={showItemCount}
        />
      );
    } else {
      const flashcard = item.data as Flashcard;
      return (
        <FlashcardItemComponent
          flashcard={flashcard}
          onPress={debouncedFlashcardPress}
          onLongPress={onFlashcardLongPress}
        />
      );
    }
  }, [debouncedFolderPress, debouncedFlashcardPress, onFolderLongPress, onFlashcardLongPress, showItemCount]);

  // Handle end reached for lazy loading
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      </View>
    );
  }, [loading, emptyMessage, emptyHint]);

  const renderSectionHeader = useCallback(() => {
    if (totalCount === 0) return null;

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {folderCount > 0 && `${folderCount} 個のフォルダ`}
          {folderCount > 0 && flashcardCount > 0 && ' • '}
          {flashcardCount > 0 && `${flashcardCount} 個の単語カード`}
          {searchQuery && (
            <Text style={styles.searchResultText}>
              {' '}(検索結果: {totalCount}件)
            </Text>
          )}
        </Text>
      </View>
    );
  }, [folderCount, flashcardCount, totalCount, searchQuery]);

  // If we're in a ScrollView context (no refresh control), render as a simple list
  if (!refreshControl) {
    return (
      <View style={[styles.container, style]}>
        {renderSectionHeader()}
        {displayItems.length === 0 || loading ? (
          renderEmpty()
        ) : (
          displayItems.map((item, index) => (
            <View key={`${item.type}-${item.data.id}`}>
              {renderItem({ item })}
              {index < displayItems.length - 1 && <View style={styles.separator} />}
            </View>
          ))
        )}
      </View>
    );
  }

  // Otherwise, use FlatList with full functionality
  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        ListHeaderComponent={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={displayItems.length === 0 || loading ? styles.emptyContentContainer : styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        // Performance optimizations for large lists
        removeClippedSubviews={enableVirtualization}
        maxToRenderPerBatch={enableVirtualization ? 15 : 50}
        updateCellsBatchingPeriod={50}
        initialNumToRender={enableVirtualization ? 25 : displayItems.length}
        windowSize={enableVirtualization ? 15 : 21}
        getItemLayout={enableVirtualization ? getItemLayout : undefined}
        // Lazy loading
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        // Additional optimizations
        keyboardShouldPersistTaps="handled"
        disableVirtualization={!enableVirtualization || displayItems.length < 50}
        legacyImplementation={false}
        // Accessibility
        {...FolderAccessibility.folderList()}
      />
    </View>
  );
});

// Memoized folder item component with optimized comparison
const FolderItemComponent = React.memo<{
  folder: Folder;
  onPress: (folder: Folder) => void;
  onLongPress?: (folder: Folder) => void;
  showItemCount: boolean;
}>(({ folder, onPress, onLongPress, showItemCount }) => {
  const [pressAnimation] = React.useState(new Animated.Value(1));
  
  const handlePressIn = React.useCallback(() => {
    Animated.timing(pressAnimation, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [pressAnimation]);

  const handlePressOut = React.useCallback(() => {
    Animated.timing(pressAnimation, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [pressAnimation]);

  return (
    <Animated.View style={{ transform: [{ scale: pressAnimation }] }}>
      <TouchableOpacity
        style={styles.folderItem}
        onPress={() => onPress(folder)}
        onLongPress={() => onLongPress?.(folder)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        {...FolderAccessibility.folder(folder)}
      >
        <View style={styles.itemIcon}>
          <Ionicons name="folder" size={24} color="#f59e0b" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {folder.name}
          </Text>
          {showItemCount && (
            <Text style={styles.itemSubtitle}>
              {folder.itemCount || 0} 個のアイテム
            </Text>
          )}
          <Text style={styles.itemDate}>
            {new Date(folder.updatedAt).toLocaleDateString('ja-JP')}
          </Text>
        </View>
        <View style={styles.itemArrow}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function
  return (
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.name === nextProps.folder.name &&
    prevProps.folder.updatedAt === nextProps.folder.updatedAt &&
    prevProps.folder.itemCount === nextProps.folder.itemCount &&
    prevProps.showItemCount === nextProps.showItemCount
  );
});

// Memoized flashcard item component with optimized comparison
const FlashcardItemComponent = React.memo<{
  flashcard: Flashcard;
  onPress: (flashcard: Flashcard) => void;
  onLongPress?: (flashcard: Flashcard) => void;
}>(({ flashcard, onPress, onLongPress }) => {
  const [pressAnimation] = React.useState(new Animated.Value(1));
  
  const handlePressIn = React.useCallback(() => {
    Animated.timing(pressAnimation, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [pressAnimation]);

  const handlePressOut = React.useCallback(() => {
    Animated.timing(pressAnimation, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [pressAnimation]);

  return (
    <Animated.View style={{ transform: [{ scale: pressAnimation }] }}>
      <TouchableOpacity
        style={styles.flashcardItem}
        onPress={() => onPress(flashcard)}
        onLongPress={() => onLongPress?.(flashcard)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        accessibilityLabel={`単語カード: ${flashcard.word} - ${flashcard.translation}`}
        accessibilityHint="タップして詳細を表示、長押しでメニューを開く"
        accessibilityRole="button"
      >
        <View style={styles.itemIcon}>
          <Ionicons name="document-text" size={24} color="#6366f1" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {flashcard.word}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {flashcard.translation}
          </Text>
          {flashcard.memo && (
            <View style={styles.memoContainer}>
              <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
              <Text style={styles.itemMemo} numberOfLines={1}>
                {flashcard.memo}
              </Text>
            </View>
          )}
          <Text style={styles.itemDate}>
            {new Date(flashcard.updatedAt).toLocaleDateString('ja-JP')}
          </Text>
        </View>
        <View style={styles.itemActions}>
          {flashcard.wordPronunciation && (
            <Ionicons 
              name="volume-medium-outline" 
              size={16} 
              color="#9ca3af"
              accessibilityLabel="発音記号あり"
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function
  return (
    prevProps.flashcard.id === nextProps.flashcard.id &&
    prevProps.flashcard.word === nextProps.flashcard.word &&
    prevProps.flashcard.translation === nextProps.flashcard.translation &&
    prevProps.flashcard.memo === nextProps.flashcard.memo &&
    prevProps.flashcard.wordPronunciation === nextProps.flashcard.wordPronunciation &&
    prevProps.flashcard.updatedAt === nextProps.flashcard.updatedAt
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 100, // Space for FAB
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  searchResultText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  flashcardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 64, // Align with content
  },
  itemIcon: {
    marginRight: 16,
    width: 24,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  memoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  itemMemo: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginLeft: 4,
    flex: 1,
  },
  itemArrow: {
    marginLeft: 12,
  },
  itemActions: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});