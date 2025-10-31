// Folder repository implementation

import { FolderRepository } from './interfaces';
import { Folder, CreateFolder, UpdateFolder } from '@/types';
import { DatabaseManager } from '@/database/DatabaseManager';
import { handleDatabaseError, parseTimestamp, validateRequiredFields } from '@/database/utils';
import { AppError, ERROR_CODES } from '@/types/errors';
// SQLiteDatabase type is handled by the adapter

export class FolderRepositoryImpl implements FolderRepository {
  
  private async getDb(): Promise<any> {
    return await DatabaseManager.getInstance().getDatabase();
  }
  
  async create(folder: CreateFolder): Promise<Folder> {
    try {
      validateRequiredFields(folder, ['name']);
      
      const db = await this.getDb();
      const result = await db.runAsync(
        'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
        [folder.name, folder.parentId || null]
      );

      const created = await this.findById(result.lastInsertRowId);
      if (!created) {
        throw new AppError('Failed to retrieve created folder', ERROR_CODES.DATABASE_ERROR);
      }

      return created;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleDatabaseError(error, 'create folder');
    }
  }

  async findById(id: number): Promise<Folder | null> {
    try {
      const db = await this.getDb();
      const row = await db.getFirstAsync(
        'SELECT * FROM folders WHERE id = ?',
        [id]
      );

      if (!row) return null;

      return this.mapRowToFolder(row as any);
    } catch (error) {
      handleDatabaseError(error, 'find folder by id');
    }
  }

  async findByParentId(parentId: number | null): Promise<Folder[]> {
    try {
      const db = await this.getDb();
      const query = parentId === null 
        ? 'SELECT * FROM folders WHERE parent_id IS NULL ORDER BY name ASC'
        : 'SELECT * FROM folders WHERE parent_id = ? ORDER BY name ASC';
      
      const params = parentId === null ? [] : [parentId];
      const rows = await db.getAllAsync(query, params);

      return rows.map((row: any) => this.mapRowToFolder(row as any));
    } catch (error) {
      handleDatabaseError(error, 'find folders by parent');
    }
  }

  async update(id: number, folder: UpdateFolder): Promise<Folder> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Folder not found', ERROR_CODES.FOLDER_NOT_FOUND);
      }

      const db = await this.getDb();
      await db.runAsync(
        'UPDATE folders SET name = ?, parent_id = ? WHERE id = ?',
        [
          folder.name ?? existing.name,
          folder.parentId ?? existing.parentId,
          id,
        ]
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new AppError('Failed to retrieve updated folder', ERROR_CODES.DATABASE_ERROR);
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleDatabaseError(error, 'update folder');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Folder not found', ERROR_CODES.FOLDER_NOT_FOUND);
      }

      // Check if folder has children
      const children = await this.findByParentId(id);
      if (children.length > 0) {
        throw new AppError(
          'Cannot delete folder with subfolders. Move or delete subfolders first.',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const db = await this.getDb();
      await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleDatabaseError(error, 'delete folder');
    }
  }

  async move(id: number, newParentId: number | null): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new AppError('Folder not found', ERROR_CODES.FOLDER_NOT_FOUND);
      }

      // Prevent moving folder into itself or its descendants
      if (newParentId !== null) {
        const isDescendant = await this.isDescendant(id, newParentId);
        if (isDescendant || id === newParentId) {
          throw new AppError(
            'Cannot move folder into itself or its descendants',
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      const db = await this.getDb();
      await db.runAsync(
        'UPDATE folders SET parent_id = ? WHERE id = ?',
        [newParentId, id]
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleDatabaseError(error, 'move folder');
    }
  }

  async findAll(): Promise<Folder[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync(
        'SELECT * FROM folders ORDER BY name ASC'
      );

      return rows.map((row: any) => this.mapRowToFolder(row as any));
    } catch (error) {
      handleDatabaseError(error, 'find all folders');
    }
  }

  async findWithChildren(id: number): Promise<Folder | null> {
    try {
      const folder = await this.findById(id);
      if (!folder) return null;

      const children = await this.findByParentId(id);
      folder.children = children;

      return folder;
    } catch (error) {
      handleDatabaseError(error, 'find folder with children');
    }
  }

  async findPath(id: number): Promise<Folder[]> {
    try {
      const path: Folder[] = [];
      let currentId: number | null = id;

      while (currentId !== null) {
        const folder = await this.findById(currentId);
        if (!folder) break;
        
        path.unshift(folder);
        currentId = folder.parentId ?? null;
      }

      return path;
    } catch (error) {
      handleDatabaseError(error, 'find folder path');
    }
  }

  private async isDescendant(ancestorId: number, descendantId: number): Promise<boolean> {
    try {
      const descendant = await this.findById(descendantId);
      if (!descendant || !descendant.parentId) return false;

      if (descendant.parentId === ancestorId) return true;

      return await this.isDescendant(ancestorId, descendant.parentId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get folder hierarchy (folder with all its ancestors)
   */
  async getHierarchy(id: number): Promise<Folder[]> {
    try {
      const hierarchy: Folder[] = [];
      let currentId: number | null = id;
      
      while (currentId !== null) {
        const folder = await this.findById(currentId);
        if (!folder) break;
        
        hierarchy.unshift(folder);
        currentId = folder.parentId ?? null;
      }
      
      return hierarchy;
    } catch (error) {
      handleDatabaseError(error, 'get folder hierarchy');
    }
  }

  /**
   * Check if folder exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const folder = await this.findById(id);
      return folder !== null;
    } catch (error) {
      console.error('Failed to check folder existence:', error);
      return false;
    }
  }

  /**
   * Get all descendant folders
   */
  async getDescendants(id: number): Promise<Folder[]> {
    try {
      const db = await this.getDb();
      
      // Use recursive CTE to get all descendants
      const rows = await db.getAllAsync(`
        WITH RECURSIVE folder_tree AS (
          SELECT id, name, parent_id, created_at, updated_at
          FROM folders
          WHERE parent_id = ?
          
          UNION ALL
          
          SELECT f.id, f.name, f.parent_id, f.created_at, f.updated_at
          FROM folders f
          INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT * FROM folder_tree
        ORDER BY name
      `, [id]);
      
      return rows.map((row: any) => this.mapRowToFolder(row as any));
    } catch (error) {
      handleDatabaseError(error, 'get descendant folders');
    }
  }

  /**
   * Move folder to a different parent
   */
  async move(id: number, newParentId: number | null): Promise<void> {
    try {
      const db = await this.getDb();
      
      // Validate that the folder exists
      const folder = await this.findById(id);
      if (!folder) {
        throw new AppError('Folder not found', 'NOT_FOUND');
      }
      
      // Validate that we're not creating a circular reference
      if (newParentId !== null) {
        const isDescendant = await this.isDescendant(id, newParentId);
        if (isDescendant) {
          throw new AppError('Cannot move folder to its own descendant', 'INVALID_OPERATION');
        }
      }
      
      await db.runAsync(
        'UPDATE folders SET parent_id = ?, updated_at = datetime("now") WHERE id = ?',
        [newParentId, id]
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleDatabaseError(error, 'move folder');
    }
  }

  /**
   * Get folder with item count
   */
  async findByIdWithItemCount(id: number): Promise<Folder | null> {
    try {
      const db = await this.getDb();
      const row = await db.getFirstAsync(`
        SELECT 
          f.id,
          f.name,
          f.parent_id,
          f.created_at,
          f.updated_at,
          (
            SELECT COUNT(*) 
            FROM flashcards fc 
            WHERE fc.folder_id = f.id
          ) + (
            SELECT COUNT(*) 
            FROM folders cf 
            WHERE cf.parent_id = f.id
          ) as item_count
        FROM folders f
        WHERE f.id = ?
      `, [id]);
      
      if (!row) return null;
      
      const folder = this.mapRowToFolder(row as any);
      (folder as any).itemCount = (row as any).item_count;
      return folder;
    } catch (error) {
      handleDatabaseError(error, 'find folder with item count');
    }
  }

  /**
   * Update item count for folder
   */
  async updateItemCount(id: number): Promise<void> {
    try {
      // This is a no-op since we calculate item count dynamically
      // Kept for interface compatibility
    } catch (error) {
      console.error('Failed to update item count:', error);
      // Don't throw error for item count update failures
    }
  }

  private mapRowToFolder(row: any): Folder {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at),
    };
  }
}