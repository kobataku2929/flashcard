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
import { Flashcard } from '../../types';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'word' | 'translation' | 'memo' | 'history';
  flashcard?: Flashcard;
}

interface AutoCompleteSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  getSuggestions: (query: string) => Promise<SearchSuggestion[]>;
  style?: any;
  autoFocus?: boolean;
  maxSuggestions?: number;
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
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const suggestionHeight = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<NodeJS.Timeout>();

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
            toValue: newSuggestions.length > 0 ? Math.min(newSuggestions.length * 50, 300) : 0,
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
      }, 300); // 300ms debounce
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
  }, [value, getSuggestions, maxSuggestions, suggestionHeight]);

  const handleTextChange = (text: string) => {
    onChangeText(text);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
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

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'word':
        return 'text-outline';
      case 'translation':
        return 'language-outline';
      case 'memo':
        return 'document-text-outline';
      case 'history':
        return 'time-outline';
      default:
        return 'search-outline';
    }
  };

  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'word':
        return '単語';
      case 'translation':
        return '翻訳';
      case 'memo':
        return 'メモ';
      case 'history':
        return '履歴';
      default:
        return '';
    }
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionContent}>
        <Ionicons
          name={getSuggestionIcon(item.type) as any}
          size={20}
          color="#6b7280"
          style={styles.suggestionIcon}
        />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionText} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={styles.suggestionType}>
            {getSuggestionTypeLabel(item.type)}
          </Text>
        </View>
      </View>
      <Ionicons name="arrow-up-outline" size={16} color="#9ca3af" />
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
});