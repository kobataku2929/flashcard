// App context actions

import { Dispatch } from 'react';
import { AppAction } from './types';
import { Flashcard, Folder, CreateFlashcard, CreateFolder, UpdateFlashcard, UpdateFolder } from '../types';
import { getFlashcardRepository, getFolderRepository } from '../repositories';
import { DatabaseManager } from '../database/DatabaseManager';
import { AppError } from '../types/errors';
import { ErrorService } from '../services/ErrorService';
import { SearchService } from '../services/SearchService';
import { SearchFilters, SortOption } from '../types/search';

export function useAppActions(dispatch: Dispatch<AppAction>) {
  const flashcardRepo = getFlashcardRepository();
  const folderRepo = getFolderRepository();
  const searchService = SearchService.getInstance();

  // Utility function to handle errors
  const handleError = async (error: any, operation: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    console.error(`Error in ${operation}:`, error);
    
    // Log error to ErrorService
    const errorService = ErrorService.getInstance();
    await errorService.logHandledError(
      error instanceof Error ? error : new Error(String(error)),
      'AppContext',
      operation,
      severity
    );
    
    const message = error instanceof AppError ? error.message : `Failed to ${operation}`;
    dispatch({ type: 'SET_ERROR', payload: message });
  };

  // Initialize the application
  const initializeApp = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Initialize database
      await DatabaseManager.getInstance().initialize();
      
      // Load initial data without individual loading states
      const [flashcards, folders] = await Promise.all([
        flashcardRepo.findAll(),
        folderRepo.findAll(),
      ]);
      
      // Set data and clear loading in one action
      dispatch({ type: 'SET_INITIAL_DATA', payload: { flashcards, folders } });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      await handleError(error, 'initialize app', 'critical');
    }
  };

  // Flashcard actions
  const loadFlashcards = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      const flashcards = await flashcardRepo.findAll();
      dispatch({ type: 'SET_FLASHCARDS', payload: flashcards });
    } catch (error) {
      await handleError(error, 'load flashcards', 'high');
    }
  };

  const loadFlashcard = async (id: number): Promise<Flashcard> => {
    try {
      const flashcard = await flashcardRepo.findById(id);
      if (!flashcard) {
        throw new Error(`Flashcard with id ${id} not found`);
      }
      return flashcard;
    } catch (error) {
      await handleError(error, 'load flashcard', 'medium');
      throw error;
    }
  };

  const createFlashcard = async (flashcard: CreateFlashcard) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const created = await flashcardRepo.create(flashcard);
      dispatch({ type: 'ADD_FLASHCARD', payload: created });
    } catch (error) {
      await handleError(error, 'create flashcard', 'medium');
    }
  };

  const updateFlashcard = async (id: number, flashcard: UpdateFlashcard) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updated = await flashcardRepo.update(id, flashcard);
      dispatch({ type: 'UPDATE_FLASHCARD', payload: { id, flashcard: updated } });
    } catch (error) {
      await handleError(error, 'update flashcard', 'medium');
    }
  };

  const deleteFlashcard = async (id: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await flashcardRepo.delete(id);
      dispatch({ type: 'REMOVE_FLASHCARD', payload: id });
    } catch (error) {
      await handleError(error, 'delete flashcard', 'medium');
    }
  };

  const searchFlashcards = async (query: string): Promise<Flashcard[]> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const results = await flashcardRepo.search(query);
      dispatch({ type: 'SET_FLASHCARDS', payload: results });
      return results;
    } catch (error) {
      await handleError(error, 'search flashcards', 'low');
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Real-time search (doesn't update global state)
  const searchFlashcardsRealTime = async (query: string, filters?: Partial<SearchFilters>): Promise<Flashcard[]> => {
    try {
      // Create default filters if not provided
      const defaultFilters: SearchFilters = {
        sortBy: SortOption.RELEVANCE,
        sortOrder: 'desc',
        ...filters
      };

      const results = await searchService.search(query, defaultFilters);
      return results.map(result => result.flashcard);
    } catch (error) {
      await handleError(error, 'real-time search flashcards', 'low');
      return [];
    }
  };

  // Enhanced search with full SearchResult objects
  const searchFlashcardsEnhanced = async (query: string, filters: SearchFilters) => {
    try {
      const results = await searchService.search(query, filters);
      return results;
    } catch (error) {
      await handleError(error, 'enhanced search flashcards', 'low');
      return [];
    }
  };

  // Folder actions
  const loadFolders = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      const folders = await folderRepo.findAll();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      await handleError(error, 'load folders', 'high');
    }
  };

  const createFolder = async (folder: CreateFolder) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const created = await folderRepo.create(folder);
      dispatch({ type: 'ADD_FOLDER', payload: created });
    } catch (error) {
      await handleError(error, 'create folder', 'medium');
    }
  };

  const updateFolder = async (id: number, folder: UpdateFolder) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updated = await folderRepo.update(id, folder);
      dispatch({ type: 'UPDATE_FOLDER', payload: { id, folder: updated } });
    } catch (error) {
      await handleError(error, 'update folder', 'medium');
    }
  };

  const deleteFolder = async (id: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await folderRepo.delete(id);
      dispatch({ type: 'REMOVE_FOLDER', payload: id });
    } catch (error) {
      await handleError(error, 'delete folder', 'medium');
    }
  };

  // Navigation actions
  const navigateToFolder = (folder?: Folder) => {
    dispatch({ type: 'SET_CURRENT_FOLDER', payload: folder });
  };

  const moveItem = async (itemId: number, itemType: 'folder' | 'flashcard', targetFolderId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (itemType === 'flashcard') {
        await flashcardRepo.moveToFolder(itemId, targetFolderId || null);
        // Reload flashcards to reflect the change
        await loadFlashcards();
      } else {
        await folderRepo.move(itemId, targetFolderId || null);
        // Reload folders to reflect the change
        await loadFolders();
      }
    } catch (error) {
      await handleError(error, `move ${itemType}`, 'medium');
    }
  };

  // Batch create flashcards
  const createFlashcardsBatch = async (flashcards: CreateFlashcard[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const created = await flashcardRepo.createMany(flashcards);
      
      // Add all created flashcards to state
      for (const flashcard of created) {
        dispatch({ type: 'ADD_FLASHCARD', payload: flashcard });
      }
      
      return created;
    } catch (error) {
      await handleError(error, 'create flashcards batch', 'medium');
      throw error;
    }
  };

  // Import actions
  const importFromTSV = async (tsvContent: string, targetFolderId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Parse TSV content
      const lines = tsvContent.trim().split('\n');
      const flashcards: CreateFlashcard[] = [];
      
      for (const line of lines) {
        const columns = line.split('\t');
        if (columns.length >= 2) { // Changed from 3 to 2 - only word and translation required
          const flashcard: CreateFlashcard = {
            word: columns[0]?.trim() || '',
            wordPronunciation: columns[1]?.trim() || undefined,
            translation: columns[2]?.trim() || '',
            translationPronunciation: columns[3]?.trim() || undefined,
            memo: columns[4]?.trim() || undefined,
            folderId: targetFolderId,
          };
          
          if (flashcard.word && flashcard.translation) {
            flashcards.push(flashcard);
          }
        }
      }
      
      // Create flashcards in batch using the new method
      await createFlashcardsBatch(flashcards);
      
      // Reload flashcards to ensure consistency
      await loadFlashcards();
    } catch (error) {
      await handleError(error, 'import from TSV', 'high');
    }
  };

  // Utility actions
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: undefined });
  };

  return {
    initializeApp,
    loadFlashcards,
    loadFlashcard,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    searchFlashcards,
    searchFlashcardsRealTime,
    searchFlashcardsEnhanced,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    navigateToFolder,
    moveItem,
    importFromTSV,
    clearError,
  };
}