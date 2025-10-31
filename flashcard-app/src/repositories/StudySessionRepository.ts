import { DatabaseManager } from '../database/DatabaseManager';
import {
  StudySession,
  StudyRecord,
  CreateStudySession,
  UpdateStudySession,
  StudyDifficulty,
  StudyStatistics,
} from '../types';
import { handleDatabaseError } from '../database/utils';

export class StudySessionRepository {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  async create(session: CreateStudySession): Promise<StudySession> {
    try {
      const database = await this.db.getDatabase();
      const result = await database.runAsync(
        `INSERT INTO study_sessions (folder_id, started_at, total_cards, correct_count)
         VALUES (?, datetime('now'), 0, 0)`,
        [session.folderId || null]
      );

      const newSession = await this.findById(result.lastInsertRowId!);
      if (!newSession) {
        throw new Error('Failed to create study session');
      }

      return newSession;
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to create study session');
    }
  }

  async findById(id: number): Promise<StudySession | null> {
    try {
      const database = await this.db.getDatabase();
      const row = await database.getFirstAsync(
        'SELECT * FROM study_sessions WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        startedAt: row.started_at,
        endedAt: row.ended_at || undefined,
        totalCards: row.total_cards,
        correctCount: row.correct_count,
        folderId: row.folder_id,
      };
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to find study session');
    }
  }

  async update(id: number, session: UpdateStudySession): Promise<StudySession> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (session.endedAt !== undefined) {
        updates.push('ended_at = ?');
        values.push(session.endedAt);
      }

      if (session.totalCards !== undefined) {
        updates.push('total_cards = ?');
        values.push(session.totalCards);
      }

      if (session.correctCount !== undefined) {
        updates.push('correct_count = ?');
        values.push(session.correctCount);
      }

      if (updates.length === 0) {
        const existing = await this.findById(id);
        if (!existing) {
          throw new Error('Study session not found');
        }
        return existing;
      }

      values.push(id);
      const database = await this.db.getDatabase();
      await database.runAsync(
        `UPDATE study_sessions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to update study session');
      }

      return updated;
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to update study session');
    }
  }

  async getRecentSessions(limit: number = 10): Promise<StudySession[]> {
    try {
      const database = await this.db.getDatabase();
      const rows = await database.getAllAsync(
        `SELECT * FROM study_sessions 
         WHERE ended_at IS NOT NULL 
         ORDER BY started_at DESC 
         LIMIT ?`,
        [limit]
      );

      const sessions: StudySession[] = [];
      for (const row of rows) {
        sessions.push({
          id: row.id,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          totalCards: row.total_cards,
          correctCount: row.correct_count,
          folderId: row.folder_id,
        });
      }

      return sessions;
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to get recent sessions');
    }
  }

  async getStatistics(): Promise<StudyStatistics> {
    try {
      const database = await this.db.getDatabase();
      
      // Get total sessions
      const sessionsResult = await database.getFirstAsync(
        'SELECT COUNT(*) as count FROM study_sessions WHERE ended_at IS NOT NULL'
      );
      const totalSessions = sessionsResult?.count || 0;

      // Get total cards studied
      const cardsResult = await database.getFirstAsync(
        'SELECT SUM(total_cards) as total FROM study_sessions WHERE ended_at IS NOT NULL'
      );
      const totalCards = cardsResult?.total || 0;

      // Get average accuracy
      const accuracyResult = await database.getFirstAsync(
        `SELECT 
           AVG(CASE WHEN total_cards > 0 THEN (correct_count * 100.0 / total_cards) ELSE 0 END) as accuracy
         FROM study_sessions 
         WHERE ended_at IS NOT NULL AND total_cards > 0`
      );
      const averageAccuracy = accuracyResult?.accuracy || 0;

      // Get streak days (simplified version)
      const streakResult = await database.getFirstAsync(
        `SELECT COUNT(DISTINCT DATE(started_at)) as streak 
         FROM study_sessions 
         WHERE ended_at IS NOT NULL 
         AND DATE(started_at) >= DATE('now', '-7 days')`
      );
      const streakDays = streakResult?.streak || 0;

      // Get last study date
      const lastStudyResult = await database.getFirstAsync(
        `SELECT MAX(started_at) as last_study 
         FROM study_sessions 
         WHERE ended_at IS NOT NULL`
      );
      const lastStudyDate = lastStudyResult?.last_study;

      return {
        totalSessions,
        totalCards,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        streakDays,
        lastStudyDate: lastStudyDate || undefined,
      };
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to get study statistics');
    }
  }

  // Study Records methods
  async createStudyRecord(record: Omit<StudyRecord, 'id' | 'createdAt'>): Promise<StudyRecord> {
    try {
      const database = await this.db.getDatabase();
      const result = await database.runAsync(
        `INSERT INTO study_records (flashcard_id, session_id, difficulty, response_time, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [record.flashcardId, record.sessionId, record.difficulty, record.responseTime || null]
      );

      const newRecord = await this.findStudyRecordById(result.lastInsertRowId!);
      if (!newRecord) {
        throw new Error('Failed to create study record');
      }

      return newRecord;
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to create study record');
    }
  }

  async findStudyRecordById(id: number): Promise<StudyRecord | null> {
    try {
      const database = await this.db.getDatabase();
      const row = await database.getFirstAsync(
        'SELECT * FROM study_records WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        flashcardId: row.flashcard_id,
        sessionId: row.session_id,
        difficulty: row.difficulty,
        responseTime: row.response_time,
        createdAt: row.created_at,
      };
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to find study record');
    }
  }

  async getStudyRecordsBySession(sessionId: number): Promise<StudyRecord[]> {
    try {
      const database = await this.db.getDatabase();
      const rows = await database.getAllAsync(
        'SELECT * FROM study_records WHERE session_id = ? ORDER BY created_at',
        [sessionId]
      );

      const records: StudyRecord[] = [];
      for (const row of rows) {
        records.push({
          id: row.id,
          flashcardId: row.flashcard_id,
          sessionId: row.session_id,
          difficulty: row.difficulty,
          responseTime: row.response_time,
          createdAt: row.created_at,
        });
      }

      return records;
    } catch (error) {
      throw handleDatabaseError(error, 'Failed to get study records');
    }
  }
}