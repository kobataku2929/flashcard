// Flashcard-specific hooks

import { useMemo } from 'react';
import { useAppContext } from '@/context';
import { Flashcard } from '@/types';

export function useFlashcards() {
  const { state, actions } = useAppContext();

  // Get flashcards for current folder
  const currentFolderFlashcards = useMemo(() => {
    const currentFolderId = state.currentFolder?.id;
    return state.flashcards.filter(card => 
      currentFolderId ? card.folderId === currentFolderId : !card.folderId
    );
  }, [state.flashcards, state.currentFolder]);

  // Get flashcards by folder ID
  const getFlashcardsByFolder = (folderId: number | null) => {
    return state.flashcards.filter(card => 
      folderId ? card.folderId === folderId : !card.folderId
    );
  };

  // Get flashcard by ID
  const getFlashcardById = (id: number): Flashcard | undefined => {
    return state.flashcards.find(card => card.id === id);
  };

  // Get flashcard statistics
  const flashcardStats = useMemo(() => {
    const total = state.flashcards.length;
    const inCurrentFolder = currentFolderFlashcards.length;
    const withMemo = state.flashcards.filter(card => card.memo).length;
    const withPronunciation = state.flashcards.filter(card => 
      card.wordPronunciation || card.translationPronunciation
    ).length;

    return {
      total,
      inCurrentFolder,
      withMemo,
      withPronunciation,
    };
  }, [state.flashcards, currentFolderFlashcards]);

  return {
    // Data
    flashcards: state.flashcards,
    currentFolderFlashcards,
    flashcardStats,
    loading: state.loading,
    error: state.error,

    // Actions
    loadFlashcards: actions.loadFlashcards,
    createFlashcard: actions.createFlashcard,
    updateFlashcard: actions.updateFlashcard,
    deleteFlashcard: actions.deleteFlashcard,
    searchFlashcards: actions.searchFlashcards,
    moveFlashcard: (id: number, folderId?: number) => 
      actions.moveItem(id, 'flashcard', folderId),

    // Utilities
    getFlashcardsByFolder,
    getFlashcardById,
  };
}