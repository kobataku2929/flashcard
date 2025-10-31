// Card editor screen component

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { CardEditor } from '../components/CardEditor';
import { useToastHelpers } from '../context/ToastContext';
import { Flashcard, CreateFlashcard, UpdateFlashcard } from '../types';
import { FlashcardRepositoryImpl } from '../repositories/FlashcardRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'CardEditor'>;

export default function CardEditorScreen({ route, navigation }: Props) {
  const { cardId, folderId } = route.params || {};
  const { showSuccess, showError } = useToastHelpers();
  const [card, setCard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(false);
  const flashcardRepository = new FlashcardRepositoryImpl();

  useEffect(() => {
    if (cardId) {
      loadCard();
    }
  }, [cardId]);

  const loadCard = async () => {
    if (!cardId) return;
    
    try {
      setLoading(true);
      const loadedCard = await flashcardRepository.findById(cardId);
      if (!loadedCard) {
        throw new Error('Card not found');
      }
      setCard(loadedCard);
    } catch (error) {
      console.error('Failed to load card:', error);
      showError('カードの読み込みに失敗しました');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (cardData: CreateFlashcard) => {
    try {
      setLoading(true);
      
      if (cardId) {
        // Update existing card
        const updateData: UpdateFlashcard = {
          word: cardData.word,
          wordPronunciation: cardData.wordPronunciation,
          translation: cardData.translation,
          translationPronunciation: cardData.translationPronunciation,
          memo: cardData.memo,
          folderId: cardData.folderId,
        };
        await flashcardRepository.update(cardId, updateData);
        showSuccess('カードを更新しました');
      } else {
        // Create new card
        const createData: CreateFlashcard = {
          ...cardData,
          folderId: folderId || null,
        };
        await flashcardRepository.create(createData);
        showSuccess('カードを作成しました');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save card:', error);
      showError('カードの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleDelete = async () => {
    if (!cardId) return;

    Alert.alert(
      'カードを削除',
      'このカードを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await flashcardRepository.delete(cardId);
              showSuccess('カードを削除しました');
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete card:', error);
              showError('カードの削除に失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <CardEditor
            flashcard={card}
            folderId={folderId}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});