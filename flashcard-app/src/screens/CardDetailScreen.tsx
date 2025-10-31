// Card detail screen component

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { HomeStackParamList } from '../navigation/types';
import { FlashcardComponent } from '../components/FlashcardComponent';
import { MemoModal } from '../components/MemoModal';
import { Flashcard } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FlashcardRepositoryImpl } from '../repositories/FlashcardRepository';

type Props = NativeStackScreenProps<HomeStackParamList, 'CardDetail'>;

export default function CardDetailScreen({ route, navigation }: Props) {
  const { cardId } = route.params;
  const [card, setCard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const flashcardRepository = new FlashcardRepositoryImpl();

  useEffect(() => {
    loadCard();
    
    // Add edit button to header
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleEdit}
          style={{ marginRight: 8 }}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [cardId, navigation]);

  const loadCard = async () => {
    try {
      setLoading(true);
      const loadedCard = await flashcardRepository.findById(cardId);
      if (!loadedCard) {
        throw new Error('Card not found');
      }
      setCard(loadedCard);
    } catch (error) {
      console.error('Failed to load card:', error);
      Alert.alert('エラー', 'カードの読み込みに失敗しました');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (card) {
      navigation.navigate('CardEditor' as never, { cardId: card.id } as never);
    }
  };

  const handleMemoPress = () => {
    if (card?.memo) {
      setShowMemoModal(true);
    }
  };

  const handleCloseMemo = () => {
    setShowMemoModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>カードが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FlashcardComponent
          flashcard={card}
          showMemoButton={true}
          onMemoPress={handleMemoPress}
          style={styles.flashcard}
        />
      </View>

      {/* Memo Modal */}
      <MemoModal
        visible={showMemoModal}
        memo={card?.memo || ''}
        onClose={handleCloseMemo}
        title={`${card?.word || ''} のメモ`}
      />
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
  },
  flashcard: {
    marginHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
  },
});