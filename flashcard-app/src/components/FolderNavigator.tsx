import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Folder } from '@/types';

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface FolderNavigatorProps {
  currentFolder: Folder | null;
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: number | null) => void;
  onCreateFolder?: () => void;
  onImport?: () => void;
  style?: any;
}

export const FolderNavigator: React.FC<FolderNavigatorProps> = ({
  currentFolder,
  breadcrumbs,
  onNavigate,
  onCreateFolder,
  onImport,
  style,
}) => {
  const handleBreadcrumbPress = (folderId: number | null) => {
    onNavigate(folderId);
  };

  const handleBackPress = () => {
    if (currentFolder?.parentId !== undefined) {
      onNavigate(currentFolder.parentId);
    }
  };

  const renderBreadcrumb = (item: BreadcrumbItem, index: number) => {
    const isLast = index === breadcrumbs.length - 1;
    
    return (
      <View key={`${item.id}-${index}`} style={styles.breadcrumbContainer}>
        <TouchableOpacity
          style={[
            styles.breadcrumbItem,
            isLast && styles.breadcrumbItemActive
          ]}
          onPress={() => handleBreadcrumbPress(item.id)}
          disabled={isLast}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.breadcrumbText,
            isLast && styles.breadcrumbTextActive
          ]}>
            {item.name}
          </Text>
        </TouchableOpacity>
        
        {!isLast && (
          <Text style={styles.breadcrumbSeparator}>›</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header with back button and current folder info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentFolder && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ 戻る</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.currentFolderName}>
            {currentFolder ? currentFolder.name : 'ホーム'}
          </Text>
          {currentFolder && (
            <Text style={styles.itemCount}>
              {currentFolder.itemCount || 0} 個のアイテム
            </Text>
          )}
        </View>
        
        <View style={styles.headerRight}>
          {/* Placeholder for future actions */}
        </View>
      </View>

      {/* Breadcrumb navigation */}
      <View style={styles.breadcrumbSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScrollContent}
        >
          <View style={styles.breadcrumbList}>
            {breadcrumbs.map(renderBreadcrumb)}
          </View>
        </ScrollView>
      </View>

      {/* Action buttons */}
      <View style={styles.actionSection}>
        {onCreateFolder && (
          <TouchableOpacity
            style={[styles.actionButton, styles.createFolderButton]}
            onPress={onCreateFolder}
            activeOpacity={0.8}
          >
            <Text style={styles.createFolderButtonText}>📁 新しいフォルダ</Text>
          </TouchableOpacity>
        )}
        
        {onImport && (
          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={onImport}
            activeOpacity={0.8}
          >
            <Text style={styles.importButtonText}>📥 TSVインポート</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 60,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  currentFolderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  breadcrumbSection: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  breadcrumbScrollContent: {
    paddingVertical: 4,
  },
  breadcrumbList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  breadcrumbItemActive: {
    backgroundColor: '#e3f2fd',
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#007AFF',
  },
  breadcrumbTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 4,
  },
  actionSection: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  createFolderButton: {
    backgroundColor: '#34C759',
  },
  importButton: {
    backgroundColor: '#007AFF',
  },
  createFolderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});