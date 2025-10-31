// Enhanced search screen with real-time suggestions

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { BrowseStackParamList } from '../navigation/types';
import { useAppContext } from '../context/AppContext';
import { FlashcardComponent } from '../components/FlashcardComponent';
import { AutoCompleteSearchBar, SearchSuggestion } from '../components/search/AutoCompleteSearchBar';
import { RealTimeSearchService } from '../services/RealTimeSearchService';
import { HighlightedText } from '../components/search/HighlightedText';
import { Flashcard } from '../types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: Props) {
  const { state, actions } = useAppContext();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Flashcard[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const realTimeSearchService = RealTimeSearchService.getInstance();

  // Load recent searches and refresh cache when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadRecentSearches();
      realTimeSearchService.refreshCache();
    }, [])
  );

  const loadRecentSearches = () => {
    // TODO: Load from AsyncStorage or search history service
    setRecentSearches(['hello', 'こんにちは', 'thank you', 'ありがとう']);
  };

  const handleTextChange = async (text: string) => {
    setQuery(text);
    
    if (text.trim().length >= 1) {
      try {
        setSearching(true);
        // Use the app context action for consistency
        const results = await actions.searchFlashcardsRealTime(text.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to perform real-time search:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await actions.searchFlashcards(searchQuery.trim());
      setSearchResults(results);
      
      // Add to recent searches
      const newRecentSearches = [
        searchQuery.trim(),
        ...recentSearches.filter(s => s !== searchQuery.trim())
      ].slice(0, 10);
      setRecentSearches(newRecentSearches);
      
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setSearching(false);
    }
  };

  const getSuggestions = async (partialQuery: string): Promise<SearchSuggestion[]> => {
    try {
      const suggestions = await realTimeSearchService.getSuggestions(partialQuery);
      
      // Add recent searches that match
      const matchingRecentSearches = recentSearches
        .filter(search => search.toLowerCase().includes(partialQuery.toLowerCase()))
        .map(search => ({
          id: `history-${search}`,
          text: search,
          type: 'history' as const,
        }));

      return [...suggestions, ...matchingRecentSearches].slice(0, 8);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.flashcard) {
      // Navigate to card detail if suggestion has associated flashcard
      navigation.navigate('CardDetail', { cardId: suggestion.flashcard.id });
    } else {
      // Perform search with suggestion text
      handleSearch(suggestion.text);
    }
  };

  const handleCardPress = (card: Flashcard) => {
    navigation.navigate('CardDetail', { cardId: card.id });
  };

  const handleRecentSearchPress = (searchTerm: string) => {
    setQuery(searchTerm);
    handleSearch(searchTerm);
  };

  const renderSearchResult = ({ item }: { item: Flashcard }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultCard}>
        <View style={styles.cardContent}>
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
        </View>
        
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

  const renderRecentSearch = (searchTerm: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.recentSearchItem}
      onPress={() => handleRecentSearchPress(searchTerm)}
      activeOpacity={0.7}
    >
      <Ionicons name="time-outline" size={16} color="#6b7280" />
      <Text style={styles.recentSearchText}>{searchTerm}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AutoCompleteSearchBar
          placeholder="単語や翻訳を検索..."
          value={query}
          onChangeText={handleTextChange}
          onSearch={handleSearch}
          onSuggestionSelect={handleSuggestionSelect}
          getSuggestions={getSuggestions}
          autoFocus={true}
          style={styles.searchBar}
          maxSuggestions={8}
        />

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                検索結果 ({searchResults.length}件)
              </Text>
              {searching && (
                <View style={styles.searchingIndicator}>
                  <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                  <Text style={styles.searchingText}>検索中...</Text>
                </View>
              )}
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsList}
            />
          </View>
        )}

        {query.trim() && searchResults.length === 0 && !searching && (
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
        )}

        {!query.trim() && (
          <ScrollView style={styles.emptyContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyContent}>
              <Ionicons name="search-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>カードを検索</Text>
              <Text style={styles.emptyDescription}>
                単語や翻訳、メモから検索できます{'\n'}
                入力すると候補が表示されます
              </Text>
            </View>

            {recentSearches.length > 0 && (
              <View style={styles.recentSearchesContainer}>
                <Text style={styles.recentSearchesTitle}>最近の検索</Text>
                <View style={styles.recentSearchesList}>
                  {recentSearches.slice(0, 6).map(renderRecentSearch)}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFront: {
    flex: 1,
    paddingRight: 12,
  },
  cardDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  cardBack: {
    flex: 1,
    paddingLeft: 12,
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
  recentSearchesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  recentSearchesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  recentSearchText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
  },
});