// FolderRepository tests

import { FolderRepositoryImpl } from '@/repositories/FolderRepository';
import { CreateFolder, UpdateFolder } from '@/types';
import { AppError, ERROR_CODES } from '@/types/errors';
import { setupTestDatabase, teardownTestDatabase, mockDatabase } from '../helpers/testDatabase';

describe('FolderRepository', () => {
  let repository: FolderRepositoryImpl;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = await setupTestDatabase();
    repository = new FolderRepositoryImpl();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('create', () => {
    it('should create a folder successfully', async () => {
      const folderData: CreateFolder = {
        name: 'English Vocabulary',
        parentId: null,
      };

      const mockCreatedFolder = {
        id: 1,
        name: 'English Vocabulary',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
      mockDb.getFirstAsync.mockResolvedValue(mockCreatedFolder);

      const result = await repository.create(folderData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
        ['English Vocabulary', null]
      );

      expect(result).toEqual({
        id: 1,
        name: 'English Vocabulary',
        parentId: null,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should create a subfolder successfully', async () => {
      const folderData: CreateFolder = {
        name: 'Basic Words',
        parentId: 1,
      };

      const mockCreatedFolder = {
        id: 2,
        name: 'Basic Words',
        parent_id: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 2, changes: 1 });
      mockDb.getFirstAsync.mockResolvedValue(mockCreatedFolder);

      const result = await repository.create(folderData);

      expect(result.parentId).toBe(1);
    });

    it('should throw error for missing name', async () => {
      const invalidData = {
        name: '',
      } as CreateFolder;

      await expect(repository.create(invalidData)).rejects.toThrow(AppError);
    });
  });

  describe('findById', () => {
    it('should find folder by id', async () => {
      const mockFolder = {
        id: 1,
        name: 'English Vocabulary',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockFolder);

      const result = await repository.findById(1);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM folders WHERE id = ?',
        [1]
      );

      expect(result).toEqual({
        id: 1,
        name: 'English Vocabulary',
        parentId: null,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when folder not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByParentId', () => {
    it('should find root folders when parentId is null', async () => {
      const mockFolders = [
        {
          id: 1,
          name: 'English',
          parent_id: null,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'Japanese',
          parent_id: null,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockFolders);

      const result = await repository.findByParentId(null);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM folders WHERE parent_id IS NULL ORDER BY name ASC',
        []
      );

      expect(result).toHaveLength(2);
    });

    it('should find subfolders by parent id', async () => {
      const mockSubfolders = [
        {
          id: 3,
          name: 'Basic',
          parent_id: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockSubfolders);

      const result = await repository.findByParentId(1);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM folders WHERE parent_id = ? ORDER BY name ASC',
        [1]
      );

      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBe(1);
    });
  });

  describe('update', () => {
    it('should update folder successfully', async () => {
      const existingFolder = {
        id: 1,
        name: 'English',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const updatedFolder = {
        ...existingFolder,
        name: 'English Vocabulary',
        updated_at: '2023-01-01T01:00:00.000Z',
      };

      const updateData: UpdateFolder = {
        name: 'English Vocabulary',
      };

      mockDb.getFirstAsync
        .mockResolvedValueOnce(existingFolder)
        .mockResolvedValueOnce(updatedFolder);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const result = await repository.update(1, updateData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE folders SET name = ?, parent_id = ? WHERE id = ?',
        ['English Vocabulary', null, 1]
      );

      expect(result.name).toBe('English Vocabulary');
    });

    it('should throw error when folder not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const updateData: UpdateFolder = { name: 'test' };

      await expect(repository.update(999, updateData)).rejects.toThrow(
        new AppError('Folder not found', ERROR_CODES.FOLDER_NOT_FOUND)
      );
    });
  });

  describe('delete', () => {
    it('should delete folder successfully when no children', async () => {
      const existingFolder = {
        id: 1,
        name: 'English',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(existingFolder);
      mockDb.getAllAsync.mockResolvedValue([]); // No children
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM folders WHERE id = ?',
        [1]
      );
    });

    it('should throw error when folder has children', async () => {
      const existingFolder = {
        id: 1,
        name: 'English',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const children = [
        {
          id: 2,
          name: 'Basic',
          parent_id: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockDb.getFirstAsync.mockResolvedValue(existingFolder);
      mockDb.getAllAsync.mockResolvedValue(children);

      await expect(repository.delete(1)).rejects.toThrow(
        new AppError(
          'Cannot delete folder with subfolders. Move or delete subfolders first.',
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    });

    it('should throw error when folder not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow(
        new AppError('Folder not found', ERROR_CODES.FOLDER_NOT_FOUND)
      );
    });
  });

  describe('move', () => {
    it('should move folder successfully', async () => {
      const existingFolder = {
        id: 2,
        name: 'Basic',
        parent_id: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(existingFolder);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.move(2, null);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE folders SET parent_id = ? WHERE id = ?',
        [null, 2]
      );
    });

    it('should throw error when trying to move folder into itself', async () => {
      const existingFolder = {
        id: 1,
        name: 'English',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(existingFolder);

      await expect(repository.move(1, 1)).rejects.toThrow(
        new AppError(
          'Cannot move folder into itself or its descendants',
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    });
  });

  describe('findPath', () => {
    it('should find folder path correctly', async () => {
      const rootFolder = {
        id: 1,
        name: 'English',
        parent_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const subFolder = {
        id: 2,
        name: 'Basic',
        parent_id: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockDb.getFirstAsync
        .mockResolvedValueOnce(subFolder)
        .mockResolvedValueOnce(rootFolder);

      const result = await repository.findPath(2);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('English');
      expect(result[1].name).toBe('Basic');
    });
  });
});