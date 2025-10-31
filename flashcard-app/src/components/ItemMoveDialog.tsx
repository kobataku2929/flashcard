import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { Folder } from '@/types';

interface ItemMoveDialogProps {
  visible: boolean;
  itemName: string;
  itemType: 'folder' | 'flashcard';
  folders: Folder[];
  currentFolderId: number | null;
  onMove: (targetFolderId: number | null) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FolderOption {
  id: number | null;
  name: string;
  level: number;
  disabled: boolean;
}

export const ItemMoveDialog: React.FC<ItemMoveDialogProps> = ({
  visible,
  itemName,
  itemType,
  folders,
  currentFolderId,
  onMove,
  onCancel,
  isLoading = false,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(currentFolderId);
  const [isMoving, setIsMoving] = useState(false);

  const { width, height } = Dimensions.get('window');
  const dialogWidth = Math.min(width - 40, 400);
  const dialogHeight = Math.min(height - 100, 500);

  // Build folder hierarchy for display
  const buildFolderOptions = (): FolderOption[] => {
    const options: FolderOption[] = [];
    
    // Add home option
    options.push({
      id: null,
      name: 'ホーム',
      level: 0,
      disabled: currentFolderId === null,
    });

    // Build folder tree
    const addFoldersRecursively = (parentId: number | null, level: number) => {
      const childFolders = folders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      childFolders.forEach(folder => {
        options.push({
          id: folder.id,
          name: folder.name,
          level,
          disabled: folder.id === currentFolderId,
        });
        
        // Recursively add child folders
        addFoldersRecursively(folder.id, level + 1);
      });
    };

    addFoldersRecursively(null, 1);
    return options;
  };

  const folderOptions = buildFolderOptions();

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onCancel();
      return;
    }

    setIsMoving(true);
    try {
      await onMove(selectedFolderId);
    } finally {
      setIsMoving(false);
    }
  };

  const renderFolderOption = ({ item }: { item: FolderOption }) => {
    const isSelected = item.id === selectedFolderId;
    const indentWidth = item.level * 20;

    return (
      <TouchableOpacity
        style={[
          styles.folderOption,
          isSelected && styles.folderOptionSelected,
          item.disabled && styles.folderOptionDisabled,
        ]}
        onPress={() => !item.disabled && setSelectedFolderId(item.id)}
        disabled={item.disabled}
        activeOpacity={0.7}
      >
        <View style={[styles.folderOptionContent, { marginLeft: indentWidth }]}>
          <Text style={styles.folderIcon}>
            {item.id === null ? '🏠' : '📁'}
          </Text>
          <Text style={[
            styles.folderName,
            isSelected && styles.folderNameSelected,
            item.disabled && styles.folderNameDisabled,
          ]}>
            {item.name}
          </Text>
          {item.disabled && (
            <Text style={styles.currentLabel}>現在の場所</Text>
          )}
        </View>
        {isSelected && !item.disabled && (
          <Text style={styles.selectedIcon}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  const getItemTypeText = () => {
    return itemType === 'folder' ? 'フォルダ' : '単語カード';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { width: dialogWidth, maxHeight: dialogHeight }]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {getItemTypeText()}を移動
            </Text>
            <Text style={styles.subtitle}>
              「{itemName}」の移動先を選択してください
            </Text>
          </View>
          
          <View style={styles.content}>
            <FlatList
              data={folderOptions}
              renderItem={renderFolderOption}
              keyExtractor={(item) => `folder-${item.id}`}
              showsVerticalScrollIndicator={false}
              style={styles.folderList}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isMoving || isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.moveButton,
                (isMoving || isLoading || selectedFolderId === currentFolderId) && styles.buttonDisabled
              ]}
              onPress={handleMove}
              disabled={isMoving || isLoading || selectedFolderId === currentFolderId}
              activeOpacity={0.8}
            >
              <Text style={styles.moveButtonText}>
                {isMoving ? '移動中...' : '移動'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    maxHeight: 300,
  },
  folderList: {
    paddingVertical: 10,
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  folderOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  folderOptionDisabled: {
    backgroundColor: '#f5f5f5',
  },
  folderOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  folderName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  folderNameSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  folderNameDisabled: {
    color: '#999',
  },
  currentLabel: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 10,
  },
  selectedIcon: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  moveButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});