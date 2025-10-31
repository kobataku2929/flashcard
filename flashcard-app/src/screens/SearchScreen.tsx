// Enhanced search screen with strict filtering

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { BrowseStackParamList } from '../navigation/types';
import { useAppContext } from '../context/AppContext';
import { HighlightedText } from '../components/search/HighlightedText';
import { AutoCompleteSearchBar } from '../components/search/AutoCompleteSearchBar';
import { SearchService } from '../services/SearchService';
import { Flashcard } from '../types';
import { AutocompleteSuggestion, SearchFilters, SortOption } from '../types/search';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: Props) {
  const { actions } = useAppContext();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Flashcard[]>([]);
  const [searching, setSearching] = useState(false);
  const searchService = useRef(SearchService.getInstance()).current;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (searchText: string) => {
    if (searchText.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    try {
      setSearching(true);
      
      // Create default filters for search
      const filters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc'
      };
      
      // Use enhanced search service
      const searchResults = await searchService.search(searchText.trim(), filters);
      const flashcards = searchResults.map(result => result.flashcard);
      setSearchResults(flashcards);
      
    } catch (error) {
      console.error('Failed to perform search:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Clear results immediately when text is empty
    if (text.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    // Set searching state immediately for better UX
    setSearching(true);
    
    // Debounce search with 300ms delay
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  };

  const handleSearch = (searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(searchQuery);
  };

  const getSuggestions = async (partial: string): Promise<AutocompleteSuggestion[]> => {
    try {
      return await searchService.getAutocompleteSuggestions(partial);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  };

  const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
    // Perform search with the selected suggestion
    handleSearch(suggestion.text);
  };



  const handleCardPress = (card: Flashcard) => {
    // Navigate to card detail - this will need to be implemented in the navigation
    console.log('Navigate to card detail:', card.id);
    // TODO: Implement navigation to card detail screen
  };

  const renderSearchResult = ({ item }: { item: Flashcard }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultCard}>
        {/* 1. 単語（表面のメイン）- 最優先 */}
        <View style={styles.cardFront}>
          <HighlightedText
            text={item.word}
            searchTerm={query}
            style={styles.wordText}
            highlightStyle={styles.highlightText}
            numberOfLines={2}
          />
          {item.wordPronunciation && (
            <HighlightedText
              text={item.wordPronunciation}
              searchTerm={query}
              style={styles.pronunciationText}
              highlightStyle={styles.highlightText}
              numberOfLines={1}
            />
          )}
        </View>
        
        <View style={styles.cardDivider} />
        
        {/* 2. 翻訳（裏面のメイン）- 2番目の優先度 */}
        <View style={styles.cardBack}>
          <HighlightedText
            text={item.translation}
            searchTerm={query}
            style={styles.translationText}
            highlightStyle={styles.highlightText}
            numberOfLines={2}
          />
          {item.translationPronunciation && (
            <HighlightedText
              text={item.translationPronunciation}
              searchTerm={query}
              style={styles.pronunciationText}
              highlightStyle={styles.highlightText}
              numberOfLines={1}
            />
          )}
        </View>
        
        {/* 3. メモ - 最低優先度（一番下） */}
        {item.memo && (
          <View style={styles.memoContainer}>
            <Ionicons name="document-text-outline" size={14} color="#6b7280" />
            <HighlightedText
              text={item.memo}
              searchTerm={query}
              style={styles.memoText}
              highlightStyle={styles.highlightText}
              numberOfLines={2}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );



  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AutoCompleteSearchBar
          placeholder="単語や翻訳を検索..."
          value={query}
          onChangeText={handleTextChange}
          onSearch={handleSearch}
          onSuggestionSelect={handleSuggestionSelect}
          getSuggestions={getSuggestions}
          autoFocus={true}
          maxSuggestions={8}
          showFrequentSearches={true}
          style={styles.searchBar}
        />

        {query.trim().length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                "{query}" を含むカード ({searchResults.length}件)
              </Text>
              {searching && (
                <View style={styles.searchingIndicator}>
                  <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                  <Text style={styles.searchingText}>検索中...</Text>
                </View>
              )}
            </View>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            ) : !searching ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#9ca3af" />
                <Text style={styles.noResultsText}>
                  "{query}" を含むカードが見つかりませんでした
                </Text>
                <Text style={styles.noResultsHint}>
                  • 単語、翻訳、発音、メモから部分一致で検索します{'\n'}
                  • 別のキーワードで検索してみてください{'\n'}
                  • スペルを確認してください
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {query.trim().length === 0 && (
          <ScrollView style={styles.emptyContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyContent}>
              <Ionicons name="search-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>カードを検索</Text>
              <Text style={styles.emptyDescription}>
                単語や翻訳、メモから検索できます{'\n'}
                検索バーをタップして入力を開始してください
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 14,
    color: '#6366f1',
    marginLeft: 4,
  },
  resultsList: {
    paddingBottom: 16,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultCard: {
    marginHorizontal: 0,
  },
  searchResultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardFront: {
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  cardBack: {
    marginBottom: 0,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  pronunciationText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  highlightText: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: 'bold',
  },
  memoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  memoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  noResultsHint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
});