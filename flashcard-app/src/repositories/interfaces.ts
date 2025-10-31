// Repository interfaces

import { Flashcard, Folder, CreateFlashcard, CreateFolder, UpdateFlashcard, UpdateFolder } from '../types';

export interface FlashcardRepository {
  create(flashcard: CreateFlashcard): Promise<Flashcard>;
  findById(id: number): Promise<Flashcard | null>;
  findByFolderId(folderId: number | null): Promise<Flashcard[]>;
  update(id: number, flashcard: UpdateFlashcard): Promise<Flashcard>;
  delete(id: number): Promise<void>;
  findAll(): Promise<Flashcard[]>;
  search(query: string): Promise<Flashcard[]>;
  getSearchSuggestions(query: string, limit?: number): Promise<string[]>;
  moveToFolder(id: number, folderId: number | null): Promise<void>;
}

export interface FolderRepository {
  create(folder: CreateFolder): Promise<Folder>;
  findById(id: number): Promise<Folder | null>;
  findByParentId(parentId: number | null): Promise<Folder[]>;
  update(id: number, folder: UpdateFolder): Promise<Folder>;
  delete(id: number): Promise<void>;
  move(id: number, newParentId: number | null): Promise<void>;
  findAll(): Promise<Folder[]>;
  findWithChildren(id: number): Promise<Folder | null>;
  findPath(id: number): Promise<Folder[]>;
}