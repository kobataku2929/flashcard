import { StudyService } from '../../src/services/StudyService';
import { FlashcardRepositoryImpl } from '../../src/repositories/FlashcardRepository';
import { StudySessionRepository } from '../../src/repositories/StudySessionRepository';
import { Flashcard, StudySettings } from '../../src/types';

// Mock the repositories
jest.mock('../../src/repositories/FlashcardRepository');
jest.mock('../../src/repositories/StudySessionRepository');

const mockFlashcardRepository = FlashcardRepositoryImpl as jest.MockedClass<typeof FlashcardRepositoryImpl>;
const mockStudySessionRepository = StudySessionRepository as jest.MockedClass<typeof StudySessionRepository>;

describe('StudyService', () => {
  let studyService: StudyService;
  let mockFlashcardRepo: jest.Mocked<FlashcardRepositoryImpl>;
  let mockSessionRepo: jest.Mocked<StudySessionRepository>;

  const mockFlashcards: Flashcard[] = [
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFlashcardRepo = new mockFlashcardRepository() as jest.Mocked<FlashcardRepositoryImpl>;
    mockSessionRepo = new mockStudySessionRepository() as jest.Mocked<StudySessionRepository>;
    
    studyService = new StudyService();
    
    // Replace the repositories with mocks
    (studyService as any).flashcardRepository = mockFlashcardRepo;
    (studyService as any).studySessionRepository = mockSessionRepo;
  });

  describe('startStudySession', () => {
    it('should create a study session and return cards', async () => {
      const mockSession = {
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        totalCards: 0,
        correctCount: 0,
        folderId: null,
      };

      mockSessionRepo.create.mockResolvedValue(mockSession);
      mockFlashcardRepo.findAll.mockResolvedValue(mockFlashcards);

      const result = await studyService.startStudySession();

      expect(mockSessionRepo.create).toHaveBeenCalledWith({ folderId: undefined });
      expect(mockFlashcardRepo.findAll).toHaveBeenCalled();
      expect(result.session).toEqual(mockSession);
      expect(result.cards).toEqual(mockFlashcards);
    });

    it('should get cards from specific folder when folderId is provided', async () => {
      const folderId = 1;
      const mockSession = {
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        totalCards: 0,
        correctCount: 0,
        folderId,
      };

      mockSessionRepo.create.mockResolvedValue(mockSession);
      mockFlashcardRepo.findByFolderId.mockResolvedValue(mockFlashcards);

      const result = await studyService.startStudySession(folderId);

      expect(mockSessionRepo.create).toHaveBeenCalledWith({ folderId });
      expect(mockFlashcardRepo.findByFolderId).toHaveBeenCalledWith(folderId);
      expect(result.session).toEqual(mockSession);
      expect(result.cards).toEqual(mockFlashcards);
    });
  });

  describe('shuffleCards', () => {
    it('should shuffle cards randomly', () => {
      const originalCards = [...mockFlashcards];
      const shuffledCards = studyService.shuffleCards(mockFlashcards);

      expect(shuffledCards).toHaveLength(originalCards.length);
      expect(shuffledCards).toEqual(expect.arrayContaining(originalCards));
      // Note: Due to randomness, we can't guarantee the order will be different
      // but we can ensure all cards are present
    });

    it('should not modify the original array', () => {
      const originalCards = [...mockFlashcards];
      studyService.shuffleCards(mockFlashcards);

      expect(mockFlashcards).toEqual(originalCards);
    });
  });

  describe('applyStudySettings', () => {
    const settings: StudySettings = {
      shuffleCards: true,
      showTimer: true,
      autoAdvance: false,
      sessionSize: 1,
    };

    it('should apply shuffle when enabled', () => {
      const result = studyService.applyStudySettings(mockFlashcards, {
        ...settings,
        shuffleCards: true,
      });

      expect(result).toHaveLength(1); // sessionSize limit
      expect(result[0]).toEqual(expect.objectContaining({
        id: expect.any(Number),
        word: expect.any(String),
      }));
    });

    it('should limit session size when specified', () => {
      const result = studyService.applyStudySettings(mockFlashcards, {
        ...settings,
        shuffleCards: false,
        sessionSize: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockFlashcards[0]);
    });

    it('should return all cards when sessionSize is not specified', () => {
      const result = studyService.applyStudySettings(mockFlashcards, {
        ...settings,
        shuffleCards: false,
        sessionSize: undefined,
      });

      expect(result).toHaveLength(mockFlashcards.length);
      expect(result).toEqual(mockFlashcards);
    });
  });

  describe('recordStudyResult', () => {
    it('should create a study record', async () => {
      const mockRecord = {
        id: 1,
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1000,
        createdAt: '2023-01-01T00:00:00Z',
      };

      mockSessionRepo.createStudyRecord.mockResolvedValue(mockRecord);

      const result = await studyService.recordStudyResult(1, 1, 2, 1000);

      expect(mockSessionRepo.createStudyRecord).toHaveBeenCalledWith({
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1000,
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('endStudySession', () => {
    it('should calculate statistics and update session', async () => {
      const sessionId = 1;
      const mockRecords = [
        {
          id: 1,
          sessionId,
          flashcardId: 1,
          difficulty: 1, // easy
          responseTime: 1000,
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          sessionId,
          flashcardId: 2,
          difficulty: 3, // hard
          responseTime: 2000,
          createdAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockSessionRepo.getStudyRecordsBySession.mockResolvedValue(mockRecords);
      mockSessionRepo.update.mockResolvedValue({
        id: sessionId,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: expect.any(String),
        totalCards: 2,
        correctCount: 1,
        folderId: null,
      });

      const result = await studyService.endStudySession(sessionId);

      expect(mockSessionRepo.getStudyRecordsBySession).toHaveBeenCalledWith(sessionId);
      expect(mockSessionRepo.update).toHaveBeenCalledWith(sessionId, {
        endedAt: expect.any(String),
        totalCards: 2,
        correctCount: 1,
      });

      expect(result).toEqual({
        sessionId,
        totalCards: 2,
        correctCount: 1,
        averageResponseTime: 1500,
        difficultyBreakdown: {
          easy: 1,
          good: 0,
          hard: 1,
          again: 0,
        },
      });
    });
  });

  describe('calculateAccuracy', () => {
    it('should calculate correct accuracy percentage', () => {
      expect(studyService.calculateAccuracy(8, 10)).toBe(80);
      expect(studyService.calculateAccuracy(0, 10)).toBe(0);
      expect(studyService.calculateAccuracy(10, 10)).toBe(100);
    });

    it('should return 0 when total cards is 0', () => {
      expect(studyService.calculateAccuracy(0, 0)).toBe(0);
    });
  });

  describe('getDifficultyLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(studyService.getDifficultyLabel(1)).toBe('簡単');
      expect(studyService.getDifficultyLabel(2)).toBe('普通');
      expect(studyService.getDifficultyLabel(3)).toBe('難しい');
      expect(studyService.getDifficultyLabel(4)).toBe('もう一度');
    });
  });

  describe('getDifficultyColor', () => {
    it('should return correct colors for each difficulty', () => {
      expect(studyService.getDifficultyColor(1)).toBe('#4CAF50'); // Green
      expect(studyService.getDifficultyColor(2)).toBe('#2196F3'); // Blue
      expect(studyService.getDifficultyColor(3)).toBe('#FF9800'); // Orange
      expect(studyService.getDifficultyColor(4)).toBe('#F44336'); // Red
    });
  });
});