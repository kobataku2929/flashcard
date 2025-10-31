import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParamList } from '../navigation/types';
import { FlashcardComponent } from '../components/FlashcardComponent';
import { MemoModal } from '../components/MemoModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StudyService } from '../services/StudyService';
import { useToastHelpers } from '../context/ToastContext';
import {
  Flashcard,
  StudySession,
  StudyDifficulty,
  StudySettings,
} from '../types';

type Props = NativeStackScreenProps<StudyStackParamList, 'StudySession'>;

export default function StudySessionScreen({ route, navigation }: Props) {
  const params = route.params || {};
  const { cardIds = [], folderId, settings: routeSettings } = params;
  const settings: StudySettings = routeSettings || {
    shuffleCards: true,
    showTimer: true,
    autoAdvance: false,
  };
  
  const studyService = useRef(new StudyService()).current;
  const { showError, showSuccess } = useToastHelpers();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionStartTime] = useState<number>(Date.now());
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string>('');

  useEffect(() => {
    initializeSession();
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    // Reset card state when moving to next card
    setShowBack(false);
    setStartTime(Date.now());
  }, [currentCardIndex]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      const { session: newSession, cards: sessionCards } = await studyService.startStudySession(folderId);
      
      if (sessionCards.length === 0) {
        showError('学習するカードがありません');
        navigation.goBack();
        return;
      }

      const processedCards = studyService.applyStudySettings(sessionCards, settings);
      
      setSession(newSession);
      setCards(processedCards);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to initialize study session:', error);
      showError('学習セッションの開始に失敗しました');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = (): boolean => {
    Alert.alert(
      '学習を終了しますか？',
      '現在の進捗は保存されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '終了', style: 'destructive', onPress: handleEndSession },
      ]
    );
    return true;
  };

  const handleCardFlip = () => {
    setShowBack(!showBack);
  };

  const handleMemoPress = () => {
    const currentCard = cards[currentCardIndex];
    if (currentCard?.memo) {
      setSelectedMemo(currentCard.memo);
      setShowMemoModal(true);
    }
  };

  const handleCloseMemo = () => {
    setShowMemoModal(false);
    setSelectedMemo('');
  };

  const handleDifficultySelect = async (difficulty: StudyDifficulty) => {
    if (!session || !cards[currentCardIndex]) return;

    try {
      const responseTime = Date.now() - startTime;
      
      await studyService.recordStudyResult(
        session.id,
        cards[currentCardIndex].id,
        difficulty,
        responseTime
      );

      // Move to next card or end session
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        await handleEndSession();
      }
    } catch (error) {
      console.error('Failed to record study result:', error);
      showError('学習結果の記録に失敗しました');
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    try {
      const result = await studyService.endStudySession(session.id);
      const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
      
      showSuccess(`学習完了！${result.totalCards}枚中${result.correctCount}枚正解`);
      
      navigation.replace('StudyResult', {
        result,
        sessionDuration,
      });
    } catch (error) {
      console.error('Failed to end study session:', error);
      showError('学習セッションの終了に失敗しました');
      navigation.goBack();
    }
  };

  const handleSkipCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      handleEndSession();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>学習セッションを準備中...</Text>
      </SafeAreaView>
    );
  }

  if (!session || cards.length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>学習するカードがありません</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentCardIndex + 1} / {cards.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        {settings.showTimer && (
          <Text style={styles.timerText}>
            {Math.floor((Date.now() - startTime) / 1000)}s
          </Text>
        )}
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <FlashcardComponent
          flashcard={currentCard}
          showBack={showBack}
          onFlip={handleCardFlip}
          onMemoPress={handleMemoPress}
          style={styles.card}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!showBack ? (
          <TouchableOpacity style={styles.showAnswerButton} onPress={handleCardFlip}>
            <Text style={styles.showAnswerButtonText}>答えを表示</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.difficultyButtons}>
            <Text style={styles.difficultyLabel}>理解度を選択してください</Text>
            <View style={styles.difficultyRow}>
              <TouchableOpacity
                style={[styles.difficultyButton, styles.againButton]}
                onPress={() => handleDifficultySelect(4)}
              >
                <Text style={styles.difficultyButtonText}>もう一度</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.difficultyButton, styles.hardButton]}
                onPress={() => handleDifficultySelect(3)}
              >
                <Text style={styles.difficultyButtonText}>難しい</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.difficultyButton, styles.goodButton]}
                onPress={() => handleDifficultySelect(2)}
              >
                <Text style={styles.difficultyButtonText}>普通</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.difficultyButton, styles.easyButton]}
                onPress={() => handleDifficultySelect(1)}
              >
                <Text style={styles.difficultyButtonText}>簡単</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipCard}>
          <Text style={styles.skipButtonText}>スキップ</Text>
        </TouchableOpacity>
      </View>

      {/* Memo Modal */}
      <MemoModal
        visible={showMemoModal}
        memo={selectedMemo}
        onClose={handleCloseMemo}
        title={`${currentCard?.word || ''} のメモ`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    minWidth: 40,
    textAlign: 'right',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  controls: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  showAnswerButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  showAnswerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  difficultyButtons: {
    marginBottom: 12,
  },
  difficultyLabel: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  difficultyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  againButton: {
    backgroundColor: '#F44336',
  },
  hardButton: {
    backgroundColor: '#FF9800',
  },
  goodButton: {
    backgroundColor: '#2196F3',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  skipButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});