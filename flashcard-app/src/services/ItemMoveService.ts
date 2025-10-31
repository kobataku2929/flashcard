import { Folder, Flashcard } from '@/types';
import { AppError, ERROR_CODES } from '@/types/errors';

export interface MoveResult {
  success: boolean;
  error?: string;
}

export class ItemMoveService {
  /**
   * Move a flashcard to a different folder
   */
  static async moveFlashcard(
    flashcardId: number,
    targetFolderId: number | null,
    // Repository would be injected here in real implementation
    flashcardRepository?: any
  ): Promise<MoveResult> {
    try {
      // TODO: Integrate with FlashcardRepository when available
      // await flashcardRepository.updateFolder(flashcardId, targetFolderId);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AppError 
          ? error.message 
          : '単語カードの移動に失敗しました',
      };
    }
  }

  /**
   * Move a folder to a different parent folder
   */
  static async moveFolder(
    folderId: number,
    targetParentId: number | null,
    folders: Folder[],
    // Repository would be injected here in real implementation
    folderRepository?: any
  ): Promise<MoveResult> {
    try {
      // Validate move operation
      const validation = this.validateFolderMove(folderId, targetParentId, folders);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // TODO: Integrate with FolderRepository when available
      // await folderRepository.updateParent(folderId, targetParentId);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AppError 
          ? error.message 
          : 'フォルダの移動に失敗しました',
      };
    }
  }

  /**
   * Validate folder move operation
   */
  static validateFolderMove(
    folderId: number,
    targetParentId: number | null,
    folders: Folder[]
  ): { isValid: boolean; error?: string } {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return {
        isValid: false,
        error: '移動するフォルダが見つかりません',
      };
    }

    // Cannot move to itself
    if (folderId === targetParentId) {
      return {
        isValid: false,
        error: 'フォルダを自分自身に移動することはできません',
      };
    }

    // Cannot move to a descendant folder (would create circular reference)
    if (targetParentId && this.isDescendant(targetParentId, folderId, folders)) {
      return {
        isValid: false,
        error: 'フォルダを子フォルダに移動することはできません',
      };
    }

    // Check if target parent exists (if not null)
    if (targetParentId && !folders.find(f => f.id === targetParentId)) {
      return {
        isValid: false,
        error: '移動先のフォルダが見つかりません',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if a folder is a descendant of another folder
   */
  static isDescendant(
    potentialDescendantId: number,
    ancestorId: number,
    folders: Folder[]
  ): boolean {
    const descendant = folders.find(f => f.id === potentialDescendantId);
    if (!descendant) return false;

    let currentId = descendant.parentId;
    while (currentId !== null) {
      if (currentId === ancestorId) {
        return true;
      }
      
      const parent = folders.find(f => f.id === currentId);
      if (!parent) break;
      
      currentId = parent.parentId;
    }

    return false;
  }

  /**
   * Get all possible target folders for moving an item
   */
  static getAvailableTargetFolders(
    itemType: 'folder' | 'flashcard',
    itemId: number,
    folders: Folder[]
  ): Folder[] {
    if (itemType === 'flashcard') {
      // Flashcards can be moved to any folder
      return folders;
    }

    // For folders, exclude the folder itself and its descendants
    return folders.filter(folder => {
      if (folder.id === itemId) return false;
      return !this.isDescendant(folder.id, itemId, folders);
    });
  }

  /**
   * Build folder hierarchy for display in move dialog
   */
  static buildFolderHierarchy(folders: Folder[]): Array<{
    folder: Folder;
    level: number;
    path: string[];
  }> {
    const hierarchy: Array<{
      folder: Folder;
      level: number;
      path: string[];
    }> = [];

    const addFoldersRecursively = (
      parentId: number | null,
      level: number,
      path: string[]
    ) => {
      const childFolders = folders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      childFolders.forEach(folder => {
        const currentPath = [...path, folder.name];
        hierarchy.push({
          folder,
          level,
          path: currentPath,
        });
        
        // Recursively add child folders
        addFoldersRecursively(folder.id, level + 1, currentPath);
      });
    };

    addFoldersRecursively(null, 0, []);
    return hierarchy;
  }

  /**
   * Get folder path as string
   */
  static getFolderPath(folderId: number | null, folders: Folder[]): string {
    if (folderId === null) return 'ホーム';

    const path: string[] = [];
    let currentId: number | null = folderId;

    while (currentId !== null) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      
      path.unshift(folder.name);
      currentId = folder.parentId ?? null;
    }

    return path.length > 0 ? `ホーム > ${path.join(' > ')}` : 'ホーム';
  }

  /**
   * Count items that would be affected by folder move
   */
  static countAffectedItems(
    folderId: number,
    folders: Folder[],
    flashcards: Flashcard[]
  ): { folders: number; flashcards: number } {
    const descendantFolders = this.getDescendantFolders(folderId, folders);
    const allAffectedFolderIds = [folderId, ...descendantFolders.map(f => f.id)];
    
    const affectedFlashcards = flashcards.filter(fc => 
      allAffectedFolderIds.includes(fc.folderId as number)
    );

    return {
      folders: descendantFolders.length,
      flashcards: affectedFlashcards.length,
    };
  }

  /**
   * Get all descendant folders of a given folder
   */
  static getDescendantFolders(folderId: number, folders: Folder[]): Folder[] {
    const descendants: Folder[] = [];
    
    const addDescendantsRecursively = (parentId: number) => {
      const children = folders.filter(f => f.parentId === parentId);
      children.forEach(child => {
        descendants.push(child);
        addDescendantsRecursively(child.id);
      });
    };

    addDescendantsRecursively(folderId);
    return descendants;
  }
}