// Search results screen component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BrowseStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'SearchResults'>;

export default function SearchResultsScreen({ route }: Props) {
  const { query } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>検索結果</Text>
        <Text style={styles.query}>"{query}"</Text>
        <Text style={styles.placeholder}>
          検索結果画面は今後実装予定です
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  query: {
    fontSize: 18,
    color: '#6366f1',
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});