// Repository factory and exports

import { FlashcardRepository, FolderRepository } from './interfaces';
import { FlashcardRepositoryImpl } from './FlashcardRepository';
import { FolderRepositoryImpl } from './FolderRepository';
import { SearchRepository } from './SearchRepository';

// Singleton instances
let flashcardRepository: FlashcardRepository | null = null;
let folderRepository: FolderRepository | null = null;
let searchRepository: SearchRepository | null = null;

/**
 * Get the flashcard repository instance
 */
export function getFlashcardRepository(): FlashcardRepository {
  if (!flashcardRepository) {
    flashcardRepository = new FlashcardRepositoryImpl();
  }
  return flashcardRepository;
}

/**
 * Get the folder repository instance
 */
export function getFolderRepository(): FolderRepository {
  if (!folderRepository) {
    folderRepository = new FolderRepositoryImpl();
  }
  return folderRepository;
}

/**
 * Get the search repository instance
 */
export function getSearchRepository(): SearchRepository {
  if (!searchRepository) {
    searchRepository = SearchRepository.getInstance();
  }
  return searchRepository;
}

/**
 * Reset repository instances (for testing)
 */
export function resetRepositories(): void {
  flashcardRepository = null;
  folderRepository = null;
  searchRepository = null;
}

// Export types and interfaces
export type { FlashcardRepository, FolderRepository };
export { FlashcardRepositoryImpl, FolderRepositoryImpl, SearchRepository };