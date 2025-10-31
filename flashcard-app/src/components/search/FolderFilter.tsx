// Folder Filter Component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../../types';
import { getFolderRepository } from '../../repositories';

interface Props {
  selectedFolderId?: number | null;
  onFolderSelect: (folderId?: number | null) => void;
  style?: any;
}

export function FolderFilter({ selectedFolderId, onFolderSelect, style }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const folderRepo = getFolderRepository();
      const allFolders = await folderRepo.findAll();
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedFolderName = (): string => {
    if (selectedFolderId === null) {
      return 'Root Folder';
    }
    if (selectedFolderId === undefined) {
      return 'All Folders';
    }
    
    const folder = folders.find(f => f.id === selectedFolderId);
    return folder ? folder.name : 'Unknown Folder';
  };

  const handleFolderSelect = (folderId?: number | null) => {
    onFolderSelect(folderId);
    setIsModalVisible(false);
  };

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        selectedFolderId === item.id && styles.selectedFolderItem
      ]}
      onPress={() => handleFolderSelect(item.id)}
    >
      <View style={styles.folderItemContent}>
        <Ionicons 
          name="folder" 
          size={20} 
          color={selectedFolderId === item.id ? '#6366f1' : '#6b7280'} 
        />
        <Text style={[
          styles.folderItemText,
          selectedFolderId === item.id && styles.selectedFolderItemText
        ]}>
          {item.name}
        </Text>
        {item.itemCount !== undefined && (
          <Text style={styles.folderItemCount}>
            ({item.itemCount})
          </Text>
        )}
      </View>
      {selectedFolderId === item.id && (
        <Ionicons name="checkmark" size={20} color="#6366f1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.filterButtonContent}>
          <Ionicons name="folder-outline" size={20} color="#6b7280" />
          <Text style={styles.filterButtonText}>
            {getSelectedFolderName()}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Folder</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[
              { id: undefined, name: 'All Folders', itemCount: undefined },
              { id: null, name: 'Root Folder (No Folder)', itemCount: undefined },
              ...folders
            ]}
            renderItem={renderFolderItem}
            keyExtractor={(item) => item.id?.toString() || 'all'}
            style={styles.folderList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  folderList: {
    flex: 1,
    paddingTop: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
  },
  selectedFolderItem: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  folderItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderItemText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  selectedFolderItemText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  folderItemCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});