import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { FolderEditor } from '@/components/FolderEditor';
import { FolderActions } from '@/components/FolderActions';
import { FolderNavigator } from '@/components/FolderNavigator';
import { ItemMoveDialog } from '@/components/ItemMoveDialog';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { ItemMoveService } from '@/services/ItemMoveService';
import { Folder, CreateFolder } from '@/types';

// Mock Alert
jest.spyOn(Alert, 'alert');

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
    name: 'Another Root',
    parentId: null,
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('Folder Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Folder Creation Flow', () => {
    it('should create new folder with valid data', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      // Fill folder name
      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), 'New Folder');

      // Save the folder
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          name: 'New Folder',
          parentId: null,
        });
      });
    });

    it('should create folder in parent folder', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} parentFolderId={1} />
      );

      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), 'Child Folder');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          name: 'Child Folder',
          parentId: 1,
        });
      });
    });

    it('should validate required folder name', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      // Try to save without folder name
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(getByText('フォルダ名は必須です')).toBeTruthy();
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('should validate folder name length', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      // Enter name that's too long
      const longName = 'a'.repeat(51);
      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), longName);
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(getByText('フォルダ名は50文字以内で入力してください')).toBeTruthy();
      });
    });

    it('should handle save errors gracefully', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), 'Test Folder');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          'フォルダの保存に失敗しました。もう一度お試しください。'
        );
      });
    });
  });

  describe('Folder Editing Flow', () => {
    it('should edit existing folder', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByDisplayValue, getByText } = render(
        <FolderEditor folder={mockFolders[0]} onSave={onSave} onCancel={onCancel} />
      );

      // Modify folder name
      fireEvent.changeText(getByDisplayValue('Root Folder'), 'Updated Root');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          name: 'Updated Root',
          parentId: null,
        });
      });
    });

    it('should detect unsaved changes when cancelling', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByDisplayValue, getByText } = render(
        <FolderEditor folder={mockFolders[0]} onSave={onSave} onCancel={onCancel} />
      );

      // Make changes
      fireEvent.changeText(getByDisplayValue('Root Folder'), 'Modified');

      // Try to cancel
      fireEvent.press(getByText('キャンセル'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '確認',
        '変更が保存されていません。破棄しますか？',
        expect.any(Array)
      );
    });
  });

  describe('Folder Actions Flow', () => {
    it('should trigger edit action', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onOpen = jest.fn();

      const { getByText } = render(
        <FolderActions 
          folder={mockFolders[0]} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onOpen={onOpen}
        />
      );

      fireEvent.press(getByText('✏️ 編集'));
      expect(onEdit).toHaveBeenCalledWith(mockFolders[0]);
    });

    it('should trigger open action', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onOpen = jest.fn();

      const { getByText } = render(
        <FolderActions 
          folder={mockFolders[0]} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onOpen={onOpen}
        />
      );

      fireEvent.press(getByText('📂 開く'));
      expect(onOpen).toHaveBeenCalledWith(mockFolders[0]);
    });

    it('should delete folder after confirmation', async () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const onOpen = jest.fn();

      const { getByText } = render(
        <FolderActions 
          folder={mockFolders[0]} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onOpen={onOpen}
        />
      );

      // Open delete dialog
      fireEvent.press(getByText('🗑️ 削除'));

      // Confirm deletion
      fireEvent.press(getByText('削除'));

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith(mockFolders[0]);
      });
    });

    it('should handle deletion errors', async () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const onOpen = jest.fn();

      const { getByText } = render(
        <FolderActions 
          folder={mockFolders[0]} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onOpen={onOpen}
        />
      );

      // Open delete dialog and confirm
      fireEvent.press(getByText('🗑️ 削除'));
      fireEvent.press(getByText('削除'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          'フォルダの削除に失敗しました。もう一度お試しください。'
        );
      });
    });
  });

  describe('Folder Navigation Flow', () => {
    it('should navigate between folders', () => {
      const onNavigate = jest.fn();
      const breadcrumbs = [
        { id: null, name: 'ホーム' },
        { id: 1, name: 'Root Folder' },
      ];

      const { getByText } = render(
        <FolderNavigator 
          currentFolder={mockFolders[0]}
          breadcrumbs={breadcrumbs}
          onNavigate={onNavigate}
        />
      );

      // Navigate to home via breadcrumb
      fireEvent.press(getByText('ホーム'));
      expect(onNavigate).toHaveBeenCalledWith(null);
    });

    it('should navigate back to parent', () => {
      const onNavigate = jest.fn();
      const folderWithParent = { ...mockFolders[1], parentId: 1 };
      const breadcrumbs = [
        { id: null, name: 'ホーム' },
        { id: 1, name: 'Root Folder' },
        { id: 2, name: 'Child Folder' },
      ];

      const { getByText } = render(
        <FolderNavigator 
          currentFolder={folderWithParent}
          breadcrumbs={breadcrumbs}
          onNavigate={onNavigate}
        />
      );

      fireEvent.press(getByText('‹ 戻る'));
      expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('should trigger create folder action', () => {
      const onNavigate = jest.fn();
      const onCreateFolder = jest.fn();

      const { getByText } = render(
        <FolderNavigator 
          currentFolder={null}
          breadcrumbs={[{ id: null, name: 'ホーム' }]}
          onNavigate={onNavigate}
          onCreateFolder={onCreateFolder}
        />
      );

      fireEvent.press(getByText('📁 新しいフォルダ'));
      expect(onCreateFolder).toHaveBeenCalled();
    });
  });

  describe('Item Move Flow', () => {
    it('should move item to different folder', async () => {
      const onMove = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByText } = render(
        <ItemMoveDialog 
          visible={true}
          itemName="Test Item"
          itemType="flashcard"
          folders={mockFolders}
          currentFolderId={1}
          onMove={onMove}
          onCancel={onCancel}
        />
      );

      // Select different folder
      fireEvent.press(getByText('Another Root'));
      fireEvent.press(getByText('移動'));

      await waitFor(() => {
        expect(onMove).toHaveBeenCalledWith(3);
      });
    });

    it('should validate folder move operations', () => {
      // Test circular reference prevention
      const result = ItemMoveService.validateFolderMove(1, 2, mockFolders);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('フォルダを子フォルダに移動することはできません');
    });

    it('should prevent moving folder to itself', () => {
      const result = ItemMoveService.validateFolderMove(1, 1, mockFolders);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('フォルダを自分自身に移動することはできません');
    });
  });

  describe('Folder Hierarchy Management', () => {
    it('should build correct folder hierarchy', () => {
      const hierarchy = ItemMoveService.buildFolderHierarchy(mockFolders);
      
      expect(hierarchy).toHaveLength(3);
      
      // Check root folders
      const rootFolders = hierarchy.filter(item => item.level === 0);
      expect(rootFolders).toHaveLength(2);
      
      // Check child folder
      const childFolders = hierarchy.filter(item => item.level === 1);
      expect(childFolders).toHaveLength(1);
      expect(childFolders[0].folder.name).toBe('Child Folder');
    });

    it('should generate correct folder paths', () => {
      const path = ItemMoveService.getFolderPath(2, mockFolders);
      expect(path).toBe('ホーム > Root Folder > Child Folder');
    });

    it('should identify descendant relationships', () => {
      expect(ItemMoveService.isDescendant(2, 1, mockFolders)).toBe(true);
      expect(ItemMoveService.isDescendant(3, 1, mockFolders)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty folder name gracefully', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      // Enter only whitespace
      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), '   ');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(getByText('フォルダ名は必須です')).toBeTruthy();
      });
    });

    it('should handle special characters in folder names', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      const specialName = 'フォルダ & 特殊文字 @#$%';
      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), specialName);
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          name: specialName,
          parentId: null,
        });
      });
    });

    it('should handle broken folder hierarchy in navigation', () => {
      const brokenFolders: Folder[] = [
        {
          id: 1,
          name: 'Orphan',
          parentId: 999, // Non-existent parent
          itemCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const hierarchy = ItemMoveService.buildFolderHierarchy(brokenFolders);
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].level).toBe(0);
    });

    it('should handle concurrent folder operations', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <FolderEditor onSave={onSave} onCancel={onCancel} />
      );

      fireEvent.changeText(getByPlaceholderText('例: 英語の基本単語'), 'Test');
      
      // Simulate rapid button presses
      fireEvent.press(getByText('保存'));
      fireEvent.press(getByText('保存'));

      // Should only call once due to loading state
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });
  });
});