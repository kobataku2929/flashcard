// Auto-complete search bar component with real-time suggestions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AutocompleteSuggestion } from '../../types/search';

interface AutoCompleteSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  onSuggestionSelect: (suggestion: AutocompleteSuggestion) => void;
  getSuggestions: (query: string) => Promise<AutocompleteSuggestion[]>;
  style?: any;
  autoFocus?: boolean;
  maxSuggestions?: number;
  showFrequentSearches?: boolean;
}

export const AutoCompleteSearchBar: React.FC<AutoCompleteSearchBarProps> = ({
  placeholder = '検索...',
  value,
  onChangeText,
  onSearch,
  onSuggestionSelect,
  getSuggestions,
  style,
  autoFocus = false,
  maxSuggestions = 8,
  showFrequentSearches = true,
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frequentSearches, setFrequentSearches] = useState<AutocompleteSuggestion[]>([]);
  const inputRef = useRef<TextInput>(null);
  const suggestionHeight = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load frequent searches on mount
  useEffect(() => {
    if (showFrequentSearches) {
      loadFrequentSearches();
    }
  }, [showFrequentSearches]);

  // Load frequent searches
  const loadFrequentSearches = async () => {
    try {
      const frequent = await getSuggestions(''); // Empty query returns frequent searches
      setFrequentSearches(frequent.slice(0, 5));
    } catch (error) {
      console.error('Failed to load frequent searches:', error);
    }
  };

  useEffect(() => {
    // Debounced suggestion fetching
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length >= 1) {
      debounceRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const newSuggestions = await getSuggestions(value.trim());
          setSuggestions(newSuggestions.slice(0, maxSuggestions));
          setShowSuggestions(newSuggestions.length > 0);
          
          // Animate suggestions appearance
          Animated.timing(suggestionHeight, {
            toValue: newSuggestions.length > 0 ? Math.min(newSuggestions.length * 56, 300) : 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        } catch (error) {
          console.error('Failed to get suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setLoading(false);
        }
      }, 200); // Reduced debounce for better responsiveness
    } else if (showFrequentSearches && frequentSearches.length > 0) {
      // Show frequent searches when input is empty
      setSuggestions(frequentSearches);
      setShowSuggestions(true);
      Animated.timing(suggestionHeight, {
        toValue: Math.min(frequentSearches.length * 56, 300),
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      Animated.timing(suggestionHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, getSuggestions, maxSuggestions, suggestionHeight, showFrequentSearches, frequentSearches]);

  const handleTextChange = (text: string) => {
    onChangeText(text);
  };

  const handleSuggestionPress = (suggestion: AutocompleteSuggestion) => {
    onChangeText(suggestion.text);
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    // Animate suggestions disappearance
    Animated.timing(suggestionHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSearch(value.trim());
      setShowSuggestions(false);
      Keyboard.dismiss();
      
      // Animate suggestions disappearance
      Animated.timing(suggestionHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleClear = () => {
    onChangeText('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
    
    // Animate suggestions disappearance
    Animated.timing(suggestionHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getSuggestionIcon = (type: AutocompleteSuggestion['type']) => {
    switch (type) {
      case 'word':
        return 'text-outline';
      case 'translation':
        return 'language-outline';
      case 'memo':
        return 'document-text-outline';
      case 'history':
        return 'time-outline';
      case 'pronunciation':
        return 'volume-medium-outline';
      default:
        return 'search-outline';
    }
  };

  const getSuggestionTypeLabel = (type: AutocompleteSuggestion['type']) => {
    switch (type) {
      case 'word':
        return '単語';
      case 'translation':
        return '翻訳';
      case 'memo':
        return 'メモ';
      case 'history':
        return '履歴';
      case 'pronunciation':
        return '発音';
      default:
        return '';
    }
  };

  const getSuggestionSubtext = (suggestion: AutocompleteSuggestion) => {
    if (suggestion.type === 'history' && suggestion.resultCount !== undefined) {
      return `${suggestion.resultCount}件の結果`;
    }
    if (suggestion.flashcard) {
      if (suggestion.type === 'word') {
        return suggestion.flashcard.translation;
      }
      if (suggestion.type === 'translation') {
        return suggestion.flashcard.word;
      }
    }
    return getSuggestionTypeLabel(suggestion.type);
  };

  const renderSuggestion = ({ item }: { item: AutocompleteSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionContent}>
        <Ionicons
          name={getSuggestionIcon(item.type) as any}
          size={20}
          color={item.type === 'history' ? '#8b5cf6' : '#6b7280'}
          style={styles.suggestionIcon}
        />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionText} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={styles.suggestionType} numberOfLines={1}>
            {getSuggestionSubtext(item)}
          </Text>
        </View>
      </View>
      <View style={styles.suggestionActions}>
        {item.frequency && item.frequency > 1 && (
          <View style={styles.frequencyBadge}>
            <Text style={styles.frequencyText}>{item.frequency}</Text>
          </View>
        )}
        <Ionicons name="arrow-up-outline" size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
        {loading && (
          <View style={styles.loadingIndicator}>
            <Ionicons name="refresh-outline" size={16} color="#6366f1" />
          </View>
        )}
      </View>

      {showSuggestions && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              height: suggestionHeight,
            },
          ]}
        >
          {value.trim().length === 0 && showFrequentSearches && (
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionHeaderText}>最近の検索</Text>
            </View>
          )}
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingIndicator: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  suggestionType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  frequencyText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  suggestionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  suggestionHeaderText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});