import { StudySessionRepository } from '../../src/repositories/StudySessionRepository';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { CreateStudySession, UpdateStudySession } from '../../src/types';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager');

const mockDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

describe('StudySessionRepository', () => {
  let repository: StudySessionRepository;
  let mockDb: any;
  let mockDbInstance: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockDbInstance = {
      getDatabase: jest.fn().mockResolvedValue(mockDb),
    } as any;

    mockDatabaseManager.getInstance.mockReturnValue(mockDbInstance);
    
    repository = new StudySessionRepository();
  });

  describe('create', () => {
    it('should create a new study session', async () => {
      const sessionData: CreateStudySession = { folderId: 1 };
      const mockResult = { lastInsertRowId: 1 };
      const mockSession = {
        id: 1,
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        total_cards: 0,
        correct_count: 0,
        folder_id: 1,
      };

      mockDb.runAsync.mockResolvedValue(mockResult);
      mockDb.getFirstAsync.mockResolvedValue(mockSession);

      const result = await repository.create(sessionData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO study_sessions'),
        [1]
      );
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM study_sessions WHERE id = ?',
        [1]
      );
      expect(result).toEqual({
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: undefined,
        totalCards: 0,
        correctCount: 0,
        folderId: 1,
      });
    });

    it('should create session with null folderId', async () => {
      const sessionData: CreateStudySession = { folderId: null };
      const mockResult = { lastInsertRowId: 1 };
      const mockSession = {
        id: 1,
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        total_cards: 0,
        correct_count: 0,
        folder_id: null,
      };

      mockDb.runAsync.mockResolvedValue(mockResult);
      mockDb.getFirstAsync.mockResolvedValue(mockSession);

      const result = await repository.create(sessionData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO study_sessions'),
        [null]
      );
      expect(result.folderId).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find session by id', async () => {
      const mockSession = {
        id: 1,
        started_at: '2023-01-01T00:00:00Z',
        ended_at: '2023-01-01T01:00:00Z',
        total_cards: 10,
        correct_count: 8,
        folder_id: 1,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockSession);

      const result = await repository.findById(1);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM study_sessions WHERE id = ?',
        [1]
      );
      expect(result).toEqual({
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: '2023-01-01T01:00:00Z',
        totalCards: 10,
        correctCount: 8,
        folderId: 1,
      });
    });

    it('should return null when session not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update session with provided fields', async () => {
      const updateData: UpdateStudySession = {
        endedAt: '2023-01-01T01:00:00Z',
        totalCards: 10,
        correctCount: 8,
      };

      const mockUpdatedSession = {
        id: 1,
        started_at: '2023-01-01T00:00:00Z',
        ended_at: '2023-01-01T01:00:00Z',
        total_cards: 10,
        correct_count: 8,
        folder_id: 1,
      };

      mockDb.runAsync.mockResolvedValue({});
      mockDb.getFirstAsync.mockResolvedValue(mockUpdatedSession);

      const result = await repository.update(1, updateData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE study_sessions SET ended_at = ?, total_cards = ?, correct_count = ? WHERE id = ?',
        ['2023-01-01T01:00:00Z', 10, 8, 1]
      );
      expect(result).toEqual({
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: '2023-01-01T01:00:00Z',
        totalCards: 10,
        correctCount: 8,
        folderId: 1,
      });
    });

    it('should return existing session when no updates provided', async () => {
      const mockSession = {
        id: 1,
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        total_cards: 0,
        correct_count: 0,
        folder_id: 1,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockSession);

      const result = await repository.update(1, {});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        startedAt: '2023-01-01T00:00:00Z',
        endedAt: undefined,
        totalCards: 0,
        correctCount: 0,
        folderId: 1,
      });
    });
  });

  describe('getRecentSessions', () => {
    it('should return recent completed sessions', async () => {
      const mockSessions = [
        {
          id: 2,
          started_at: '2023-01-02T00:00:00Z',
          ended_at: '2023-01-02T01:00:00Z',
          total_cards: 15,
          correct_count: 12,
          folder_id: 1,
        },
        {
          id: 1,
          started_at: '2023-01-01T00:00:00Z',
          ended_at: '2023-01-01T01:00:00Z',
          total_cards: 10,
          correct_count: 8,
          folder_id: null,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockSessions);

      const result = await repository.getRecentSessions(10);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ended_at IS NOT NULL'),
        [10]
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 2,
        startedAt: '2023-01-02T00:00:00Z',
        endedAt: '2023-01-02T01:00:00Z',
        totalCards: 15,
        correctCount: 12,
        folderId: 1,
      });
    });
  });

  describe('createStudyRecord', () => {
    it('should create a study record', async () => {
      const recordData = {
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1500,
      };

      const mockResult = { lastInsertRowId: 1 };
      const mockRecord = {
        id: 1,
        session_id: 1,
        flashcard_id: 1,
        difficulty: 2,
        response_time: 1500,
        created_at: '2023-01-01T00:00:00Z',
      };

      mockDb.runAsync.mockResolvedValue(mockResult);
      mockDb.getFirstAsync.mockResolvedValue(mockRecord);

      const result = await repository.createStudyRecord(recordData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO study_records'),
        [1, 1, 2, 1500]
      );
      expect(result).toEqual({
        id: 1,
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1500,
        createdAt: '2023-01-01T00:00:00Z',
      });
    });
  });

  describe('getStudyRecordsBySession', () => {
    it('should return all records for a session', async () => {
      const mockRecords = [
        {
          id: 1,
          session_id: 1,
          flashcard_id: 1,
          difficulty: 2,
          response_time: 1500,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          session_id: 1,
          flashcard_id: 2,
          difficulty: 1,
          response_time: 1000,
          created_at: '2023-01-01T00:01:00Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRecords);

      const result = await repository.getStudyRecordsBySession(1);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM study_records WHERE session_id = ? ORDER BY created_at',
        [1]
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        sessionId: 1,
        flashcardId: 1,
        difficulty: 2,
        responseTime: 1500,
        createdAt: '2023-01-01T00:00:00Z',
      });
    });
  });

  describe('getStatistics', () => {
    it('should calculate study statistics', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 5 }) // total sessions
        .mockResolvedValueOnce({ total: 50 }) // total cards
        .mockResolvedValueOnce({ accuracy: 85.5 }) // average accuracy
        .mockResolvedValueOnce({ streak: 3 }) // streak days
        .mockResolvedValueOnce({ last_study: '2023-01-01T00:00:00Z' }); // last study

      const result = await repository.getStatistics();

      expect(result).toEqual({
        totalSessions: 5,
        totalCards: 50,
        averageAccuracy: 85.5,
        streakDays: 3,
        lastStudyDate: '2023-01-01T00:00:00Z',
      });
    });

    it('should handle null values in statistics', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ total: null })
        .mockResolvedValueOnce({ accuracy: null })
        .mockResolvedValueOnce({ streak: null })
        .mockResolvedValueOnce({ last_study: null });

      const result = await repository.getStatistics();

      expect(result).toEqual({
        totalSessions: 0,
        totalCards: 0,
        averageAccuracy: 0,
        streakDays: 0,
        lastStudyDate: undefined,
      });
    });
  });
});