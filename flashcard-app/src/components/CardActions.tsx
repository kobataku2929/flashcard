import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Flashcard } from '@/types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface CardActionsProps {
  flashcard: Flashcard;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcard: Flashcard) => Promise<void>;
  onMove?: (flashcard: Flashcard) => void;
  style?: any;
}

export const CardActions: React.FC<CardActionsProps> = ({
  flashcard,
  onEdit,
  onDelete,
  onMove,
  style,
}) => {
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditPress = () => {
    onEdit(flashcard);
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(flashcard);
      setDeleteDialogVisible(false);
    } catch (error) {
      Alert.alert(
        'エラー',
        '単語カードの削除に失敗しました。もう一度お試しください。'
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
      onMove(flashcard);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardWord} numberOfLines={1}>
          {flashcard.word}
        </Text>
        <Text style={styles.cardTranslation} numberOfLines={1}>
          {flashcard.translation}
        </Text>
        {flashcard.memo && (
          <Text style={styles.cardMemo} numberOfLines={2}>
            {flashcard.memo}
          </Text>
        )}
      </View>

      <View style={styles.actionButtons}>
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
        title="単語カードを削除"
        message={`「${flashcard.word}」を削除しますか？\nこの操作は取り消せません。`}
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
  cardInfo: {
    marginBottom: 15,
  },
  cardWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardTranslation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  cardMemo: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  moveButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  moveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});