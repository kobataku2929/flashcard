import { FlashcardRepositoryImpl } from '../repositories/FlashcardRepository';
import { StudySessionRepository } from '../repositories/StudySessionRepository';
import {
  Flashcard,
  StudySession,
  StudyRecord,
  StudyDifficulty,
  StudySettings,
  StudyResult,
  CreateStudySession,
} from '../types';

export class StudyService {
  private flashcardRepository: FlashcardRepositoryImpl;
  private studySessionRepository: StudySessionRepository;

  constructor() {
    this.flashcardRepository = new FlashcardRepositoryImpl();
    this.studySessionRepository = new StudySessionRepository();
  }

  async startStudySession(folderId?: number | null): Promise<{
    session: StudySession;
    cards: Flashcard[];
  }> {
    try {
      // Create new study session
      const sessionData: CreateStudySession = { folderId };
      const session = await this.studySessionRepository.create(sessionData);

      // Get cards for the session
      const cards = await this.getCardsForStudy(folderId);

      return { session, cards };
    } catch (error) {
      throw new Error(`Failed to start study session: ${error}`);
    }
  }

  async getCardsForStudy(folderId?: number | null): Promise<Flashcard[]> {
    try {
      if (folderId) {
        return await this.flashcardRepository.findByFolderId(folderId);
      } else {
        // Get all cards if no folder specified
        return await this.flashcardRepository.findAll();
      }
    } catch (error) {
      throw new Error(`Failed to get cards for study: ${error}`);
    }
  }

  shuffleCards(cards: Flashcard[]): Flashcard[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async recordStudyResult(
    sessionId: number,
    flashcardId: number,
    difficulty: StudyDifficulty,
    responseTime?: number
  ): Promise<StudyRecord> {
    try {
      return await this.studySessionRepository.createStudyRecord({
        sessionId,
        flashcardId,
        difficulty,
        responseTime,
      });
    } catch (error) {
      throw new Error(`Failed to record study result: ${error}`);
    }
  }

  async endStudySession(sessionId: number): Promise<StudyResult> {
    try {
      // Get all study records for this session
      const records = await this.studySessionRepository.getStudyRecordsBySession(sessionId);
      
      // Calculate statistics
      const totalCards = records.length;
      const correctCount = records.filter(r => r.difficulty === 1 || r.difficulty === 2).length;
      const averageResponseTime = records.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalCards;
      
      const difficultyBreakdown = {
        easy: records.filter(r => r.difficulty === 1).length,
        good: records.filter(r => r.difficulty === 2).length,
        hard: records.filter(r => r.difficulty === 3).length,
        again: records.filter(r => r.difficulty === 4).length,
      };

      // Update session with final statistics
      await this.studySessionRepository.update(sessionId, {
        endedAt: new Date().toISOString(),
        totalCards,
        correctCount,
      });

      return {
        sessionId,
        totalCards,
        correctCount,
        averageResponseTime: Math.round(averageResponseTime),
        difficultyBreakdown,
      };
    } catch (error) {
      throw new Error(`Failed to end study session: ${error}`);
    }
  }

  async getStudyStatistics() {
    try {
      return await this.studySessionRepository.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get study statistics: ${error}`);
    }
  }

  async getRecentSessions(limit: number = 10) {
    try {
      return await this.studySessionRepository.getRecentSessions(limit);
    } catch (error) {
      throw new Error(`Failed to get recent sessions: ${error}`);
    }
  }

  calculateAccuracy(correctCount: number, totalCards: number): number {
    if (totalCards === 0) return 0;
    return Math.round((correctCount / totalCards) * 100);
  }

  getDifficultyLabel(difficulty: StudyDifficulty): string {
    switch (difficulty) {
      case 1:
        return '簡単';
      case 2:
        return '普通';
      case 3:
        return '難しい';
      case 4:
        return 'もう一度';
      default:
        return '不明';
    }
  }

  getDifficultyColor(difficulty: StudyDifficulty): string {
    switch (difficulty) {
      case 1:
        return '#4CAF50'; // Green
      case 2:
        return '#2196F3'; // Blue
      case 3:
        return '#FF9800'; // Orange
      case 4:
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  }

  applyStudySettings(cards: Flashcard[], settings: StudySettings): Flashcard[] {
    let processedCards = [...cards];

    // Apply shuffle if enabled
    if (settings.shuffleCards) {
      processedCards = this.shuffleCards(processedCards);
    }

    // Apply session size limit if specified
    if (settings.sessionSize && settings.sessionSize > 0) {
      processedCards = processedCards.slice(0, settings.sessionSize);
    }

    return processedCards;
  }
}