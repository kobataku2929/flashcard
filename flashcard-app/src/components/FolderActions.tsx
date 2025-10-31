import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Folder } from '@/types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface FolderActionsProps {
  folder: Folder;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => Promise<void>;
  onOpen: (folder: Folder) => void;
  onMove?: (folder: Folder) => void;
  style?: any;
  showItemCount?: boolean;
}

export const FolderActions: React.FC<FolderActionsProps> = ({
  folder,
  onEdit,
  onDelete,
  onOpen,
  onMove,
  style,
  showItemCount = true,
}) => {
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenPress = () => {
    onOpen(folder);
  };

  const handleEditPress = () => {
    onEdit(folder);
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(folder);
      setDeleteDialogVisible(false);
    } catch (error) {
      Alert.alert(
        'エラー',
        'フォルダの削除に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteDialogVisible(false);
    }
  };

  const handleMovePress = () => {
    if (onMove) {
      onMove(folder);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.folderHeader}
        onPress={handleOpenPress}
        activeOpacity={0.8}
      >
        <View style={styles.folderIcon}>
          <Text style={styles.folderIconText}>📁</Text>
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName} numberOfLines={1}>
            {folder.name}
          </Text>
          <View style={styles.folderMeta}>
            {showItemCount && (
              <Text style={styles.itemCount}>
                {folder.itemCount || 0} 個のアイテム
              </Text>
            )}
            <Text style={styles.createdDate}>
              作成日: {formatDate(folder.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.openButton]}
          onPress={handleOpenPress}
          activeOpacity={0.8}
        >
          <Text style={styles.openButtonText}>📂 開く</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEditPress}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>✏️ 編集</Text>
        </TouchableOpacity>

        {onMove && (
          <TouchableOpacity
            style={[styles.actionButton, styles.moveButton]}
            onPress={handleMovePress}
            activeOpacity={0.8}
          >
            <Text style={styles.moveButtonText}>📁 移動</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeletePress}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
        </TouchableOpacity>
      </View>

      <DeleteConfirmDialog
        visible={deleteDialogVisible}
        title="フォルダを削除"
        message={`「${folder.name}」を削除しますか？\nフォルダ内のすべてのアイテムも削除されます。\nこの操作は取り消せません。`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  folderIcon: {
    marginRight: 12,
  },
  folderIconText: {
    fontSize: 24,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  folderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#34C759',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  moveButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  moveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});