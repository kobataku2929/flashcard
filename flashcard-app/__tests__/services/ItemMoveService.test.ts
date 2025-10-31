import { ItemMoveService } from '@/services/ItemMoveService';
import { Folder, Flashcard } from '@/types';

const mockFolders: Folder[] = [
  {
    id: 1,
    name: 'Root Folder',
    parentId: null,
    itemCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Child Folder',
    parentId: 1,
    itemCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: 'Grandchild Folder',
    parentId: 2,
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    name: 'Another Root',
    parentId: null,
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockFlashcards: Flashcard[] = [
  {
    id: 1,
    word: 'hello',
    translation: 'こんにちは',
    folderId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    word: 'goodbye',
    translation: 'さようなら',
    folderId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('ItemMoveService', () => {
  describe('moveFlashcard', () => {
    it('should successfully move flashcard', async () => {
      const result = await ItemMoveService.moveFlashcard(1, 2);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should move flashcard to home folder', async () => {
      const result = await ItemMoveService.moveFlashcard(1, null);
      
      expect(result.success).toBe(true);
    });
  });

  describe('moveFolder', () => {
    it('should successfully move folder', async () => {
      const result = await ItemMoveService.moveFolder(2, 4, mockFolders);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should move folder to root', async () => {
      const result = await ItemMoveService.moveFolder(2, null, mockFolders);
      
      expect(result.success).toBe(true);
    });

    it('should prevent moving folder to itself', async () => {
      const result = await ItemMoveService.moveFolder(1, 1, mockFolders);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('フォルダを自分自身に移動することはできません');
    });

    it('should prevent moving folder to descendant', async () => {
      const result = await ItemMoveService.moveFolder(1, 2, mockFolders);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('フォルダを子フォルダに移動することはできません');
    });

    it('should prevent moving to non-existent folder', async () => {
      const result = await ItemMoveService.moveFolder(1, 999, mockFolders);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('移動先のフォルダが見つかりません');
    });

    it('should handle non-existent source folder', async () => {
      const result = await ItemMoveService.moveFolder(999, 1, mockFolders);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('移動するフォルダが見つかりません');
    });
  });

  describe('validateFolderMove', () => {
    it('should validate valid move', () => {
      const result = ItemMoveService.validateFolderMove(2, 4, mockFolders);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject move to self', () => {
      const result = ItemMoveService.validateFolderMove(1, 1, mockFolders);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('フォルダを自分自身に移動することはできません');
    });

    it('should reject move to descendant', () => {
      const result = ItemMoveService.validateFolderMove(1, 3, mockFolders);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('フォルダを子フォルダに移動することはできません');
    });
  });

  describe('isDescendant', () => {
    it('should identify direct child as descendant', () => {
      const result = ItemMoveService.isDescendant(2, 1, mockFolders);
      expect(result).toBe(true);
    });

    it('should identify grandchild as descendant', () => {
      const result = ItemMoveService.isDescendant(3, 1, mockFolders);
      expect(result).toBe(true);
    });

    it('should not identify sibling as descendant', () => {
      const result = ItemMoveService.isDescendant(4, 1, mockFolders);
      expect(result).toBe(false);
    });

    it('should not identify parent as descendant', () => {
      const result = ItemMoveService.isDescendant(1, 2, mockFolders);
      expect(result).toBe(false);
    });

    it('should handle non-existent folder', () => {
      const result = ItemMoveService.isDescendant(999, 1, mockFolders);
      expect(result).toBe(false);
    });
  });

  describe('getAvailableTargetFolders', () => {
    it('should return all folders for flashcard', () => {
      const result = ItemMoveService.getAvailableTargetFolders('flashcard', 1, mockFolders);
      expect(result).toHaveLength(4);
    });

    it('should exclude folder and descendants for folder move', () => {
      const result = ItemMoveService.getAvailableTargetFolders('folder', 1, mockFolders);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it('should exclude only self for leaf folder', () => {
      const result = ItemMoveService.getAvailableTargetFolders('folder', 3, mockFolders);
      
      expect(result).toHaveLength(3);
      expect(result.map(f => f.id)).toEqual([1, 2, 4]);
    });
  });

  describe('buildFolderHierarchy', () => {
    it('should build correct hierarchy', () => {
      const result = ItemMoveService.buildFolderHierarchy(mockFolders);
      
      expect(result).toHaveLength(4);
      
      // Root folders should be at level 0
      const rootFolders = result.filter(item => item.level === 0);
      expect(rootFolders).toHaveLength(2);
      expect(rootFolders.map(item => item.folder.name)).toEqual(['Another Root', 'Root Folder']);
      
      // Child folder should be at level 1
      const childFolders = result.filter(item => item.level === 1);
      expect(childFolders).toHaveLength(1);
      expect(childFolders[0].folder.name).toBe('Child Folder');
      
      // Grandchild folder should be at level 2
      const grandchildFolders = result.filter(item => item.level === 2);
      expect(grandchildFolders).toHaveLength(1);
      expect(grandchildFolders[0].folder.name).toBe('Grandchild Folder');
    });

    it('should build correct paths', () => {
      const result = ItemMoveService.buildFolderHierarchy(mockFolders);
      
      const grandchild = result.find(item => item.folder.name === 'Grandchild Folder');
      expect(grandchild?.path).toEqual(['Root Folder', 'Child Folder', 'Grandchild Folder']);
    });

    it('should handle empty folders array', () => {
      const result = ItemMoveService.buildFolderHierarchy([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFolderPath', () => {
    it('should return home for null folder', () => {
      const result = ItemMoveService.getFolderPath(null, mockFolders);
      expect(result).toBe('ホーム');
    });

    it('should return correct path for root folder', () => {
      const result = ItemMoveService.getFolderPath(1, mockFolders);
      expect(result).toBe('ホーム > Root Folder');
    });

    it('should return correct path for nested folder', () => {
      const result = ItemMoveService.getFolderPath(3, mockFolders);
      expect(result).toBe('ホーム > Root Folder > Child Folder > Grandchild Folder');
    });

    it('should handle non-existent folder', () => {
      const result = ItemMoveService.getFolderPath(999, mockFolders);
      expect(result).toBe('ホーム');
    });
  });

  describe('countAffectedItems', () => {
    it('should count affected items correctly', () => {
      const result = ItemMoveService.countAffectedItems(1, mockFolders, mockFlashcards);
      
      expect(result.folders).toBe(2); // Child Folder and Grandchild Folder
      expect(result.flashcards).toBe(2); // One in folder 1, one in folder 2
    });

    it('should count leaf folder correctly', () => {
      const result = ItemMoveService.countAffectedItems(3, mockFolders, mockFlashcards);
      
      expect(result.folders).toBe(0);
      expect(result.flashcards).toBe(0);
    });

    it('should handle folder with no items', () => {
      const result = ItemMoveService.countAffectedItems(4, mockFolders, mockFlashcards);
      
      expect(result.folders).toBe(0);
      expect(result.flashcards).toBe(0);
    });
  });

  describe('getDescendantFolders', () => {
    it('should get all descendants', () => {
      const result = ItemMoveService.getDescendantFolders(1, mockFolders);
      
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toEqual(['Child Folder', 'Grandchild Folder']);
    });

    it('should return empty for leaf folder', () => {
      const result = ItemMoveService.getDescendantFolders(3, mockFolders);
      expect(result).toHaveLength(0);
    });

    it('should handle non-existent folder', () => {
      const result = ItemMoveService.getDescendantFolders(999, mockFolders);
      expect(result).toHaveLength(0);
    });
  });
});