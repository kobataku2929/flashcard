import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudySessionScreen from '../../src/screens/StudySessionScreen';
import StudyResultScreen from '../../src/screens/StudyResultScreen';
import { ToastProvider } from '../../src/context/ToastContext';
import { StudyService } from '../../src/services/StudyService';
import { StudyStackParamList } from '../../src/navigation/types';

// Mock the StudyService
jest.mock('../../src/services/StudyService');
const mockStudyService = StudyService as jest.MockedClass<typeof StudyService>;

// Mock BackHandler
jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const Stack = createNativeStackNavigator<StudyStackParamList>();

const TestNavigator = ({ initialParams }: { initialParams: any }) => (
  <NavigationContainer>
    <ToastProvider>
      <Stack.Navigator initialRouteName="StudySession">
        <Stack.Screen
          name="StudySession"
          component={StudySessionScreen}
          initialParams={initialParams}
        />
        <Stack.Screen
          name="StudyResult"
          component={StudyResultScreen}
        />
      </Stack.Navigator>
    </ToastProvider>
  </NavigationContainer>
);

describe('StudySession Integration', () => {
  let mockStudyServiceInstance: jest.Mocked<StudyService>;

  const mockCards = [
    {
      id: 1,
      word: 'hello',
      translation: 'こんにちは',
      wordPronunciation: 'həˈloʊ',
      translationPronunciation: 'こんにちは',
      memo: 'greeting',
      folderId: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      word: 'goodbye',
      translation: 'さようなら',
      wordPronunciation: 'ɡʊdˈbaɪ',
      translationPronunciation: 'さようなら',
      memo: 'farewell',
      folderId: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const mockSession = {
    id: 1,
    startedAt: '2023-01-01T00:00:00Z',
    totalCards: 0,
    correctCount: 0,
    folderId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStudyServiceInstance = {
      startStudySession: jest.fn(),
      applyStudySettings: jest.fn(),
      recordStudyResult: jest.fn(),
      endStudySession: jest.fn(),
      getStudyStatistics: jest.fn(),
      getRecentSessions: jest.fn(),
      calculateAccuracy: jest.fn(),
      getDifficultyLabel: jest.fn(),
      getDifficultyColor: jest.fn(),
      shuffleCards: jest.fn(),
      getCardsForStudy: jest.fn(),
    } as any;

    mockStudyService.mockImplementation(() => mockStudyServiceInstance);
  });

  describe('Study Session Flow', () => {
    it('should complete a full study session', async () => {
      const initialParams = {
        cardIds: [1, 2],
        folderId: null,
        settings: {
          shuffleCards: false,
          showTimer: true,
          autoAdvance: false,
        },
      };

      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: mockCards,
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue(mockCards);
      mockStudyServiceInstance.recordStudyResult.mockResolvedValue({
        id: 1,
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1000,
        createdAt: '2023-01-01T00:00:00Z',
      });

      const { getByText, getByTestId } = render(
        <TestNavigator initialParams={initialParams} />
      );

      // Wait for session to initialize
      await waitFor(() => {
        expect(getByText('hello')).toBeTruthy();
      });

      // Check initial state
      expect(getByText('1 / 2')).toBeTruthy();
      expect(getByText('答えを表示')).toBeTruthy();

      // Flip card to show answer
      await act(async () => {
        fireEvent.press(getByText('答えを表示'));
      });

      // Should show difficulty buttons
      await waitFor(() => {
        expect(getByText('理解度を選択してください')).toBeTruthy();
        expect(getByText('簡単')).toBeTruthy();
        expect(getByText('普通')).toBeTruthy();
        expect(getByText('難しい')).toBeTruthy();
        expect(getByText('もう一度')).toBeTruthy();
      });

      // Select difficulty (普通 = 2)
      await act(async () => {
        fireEvent.press(getByText('普通'));
      });

      // Should move to next card
      await waitFor(() => {
        expect(getByText('goodbye')).toBeTruthy();
        expect(getByText('2 / 2')).toBeTruthy();
      });

      expect(mockStudyServiceInstance.recordStudyResult).toHaveBeenCalledWith(
        1, // session id
        1, // flashcard id
        2, // difficulty
        expect.any(Number) // response time
      );
    });

    it('should handle session with no cards', async () => {
      const initialParams = {
        cardIds: [],
        folderId: null,
      };

      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: [],
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue([]);

      const { getByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      await waitFor(() => {
        expect(getByText('学習するカードがありません')).toBeTruthy();
      });
    });

    it('should handle session initialization error', async () => {
      const initialParams = {
        cardIds: [1],
        folderId: null,
      };

      mockStudyServiceInstance.startStudySession.mockRejectedValue(
        new Error('Database error')
      );

      const { getByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      await waitFor(() => {
        expect(getByText('学習セッションを準備中...')).toBeTruthy();
      });

      // Should show error and navigate back
      // Note: In a real test, we'd need to mock navigation to verify this
    });

    it('should end session when reaching last card', async () => {
      const initialParams = {
        cardIds: [1],
        folderId: null,
        settings: {
          shuffleCards: false,
          showTimer: true,
          autoAdvance: false,
        },
      };

      const singleCard = [mockCards[0]];
      
      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: singleCard,
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue(singleCard);
      mockStudyServiceInstance.recordStudyResult.mockResolvedValue({
        id: 1,
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1000,
        createdAt: '2023-01-01T00:00:00Z',
      });
      mockStudyServiceInstance.endStudySession.mockResolvedValue({
        sessionId: 1,
        totalCards: 1,
        correctCount: 1,
        averageResponseTime: 1000,
        difficultyBreakdown: {
          easy: 0,
          good: 1,
          hard: 0,
          again: 0,
        },
      });

      const { getByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      // Wait for session to initialize
      await waitFor(() => {
        expect(getByText('hello')).toBeTruthy();
      });

      // Flip card
      await act(async () => {
        fireEvent.press(getByText('答えを表示'));
      });

      // Select difficulty - this should end the session since it's the last card
      await act(async () => {
        fireEvent.press(getByText('普通'));
      });

      expect(mockStudyServiceInstance.endStudySession).toHaveBeenCalledWith(1);
    });

    it('should handle skip functionality', async () => {
      const initialParams = {
        cardIds: [1, 2],
        folderId: null,
        settings: {
          shuffleCards: false,
          showTimer: true,
          autoAdvance: false,
        },
      };

      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: mockCards,
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue(mockCards);

      const { getByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      // Wait for session to initialize
      await waitFor(() => {
        expect(getByText('hello')).toBeTruthy();
      });

      // Skip first card
      await act(async () => {
        fireEvent.press(getByText('スキップ'));
      });

      // Should move to next card
      await waitFor(() => {
        expect(getByText('goodbye')).toBeTruthy();
        expect(getByText('2 / 2')).toBeTruthy();
      });
    });
  });

  describe('Timer functionality', () => {
    it('should show timer when enabled in settings', async () => {
      const initialParams = {
        cardIds: [1],
        folderId: null,
        settings: {
          shuffleCards: false,
          showTimer: true,
          autoAdvance: false,
        },
      };

      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: [mockCards[0]],
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue([mockCards[0]]);

      const { getByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      await waitFor(() => {
        expect(getByText('hello')).toBeTruthy();
      });

      // Timer should be visible (showing seconds)
      await waitFor(() => {
        expect(getByText(/\d+s/)).toBeTruthy();
      });
    });

    it('should not show timer when disabled in settings', async () => {
      const initialParams = {
        cardIds: [1],
        folderId: null,
        settings: {
          shuffleCards: false,
          showTimer: false,
          autoAdvance: false,
        },
      };

      mockStudyServiceInstance.startStudySession.mockResolvedValue({
        session: mockSession,
        cards: [mockCards[0]],
      });
      mockStudyServiceInstance.applyStudySettings.mockReturnValue([mockCards[0]]);

      const { queryByText } = render(
        <TestNavigator initialParams={initialParams} />
      );

      await waitFor(() => {
        expect(queryByText('hello')).toBeTruthy();
      });

      // Timer should not be visible
      expect(queryByText(/\d+s/)).toBeNull();
    });
  });
});