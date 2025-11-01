// Folder view screen component

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { HomeStackParamList } from '../navigation/types';
import { FolderNavigator } from '../components/FolderNavigator';
import { FolderContent } from '../components/FolderContent';
import { StatsCard } from '../components/StatsCard';
import { QuickActions } from '../components/QuickActions';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { useAppContext } from '../context/AppContext';
import { useToastHelpers } from '../context/ToastContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'FolderView'>;

export default function FolderViewScreen({ route, navigation }: Props) {
  const { folderId } = route.params || {};
  const { state, actions } = useAppContext();
  const { showSuccess, showError } = useToastHelpers();
  const { currentFolder, breadcrumbs, navigateToFolder, navigateUp } = useFolderNavigation({ folders: state.folders || [], initialFolderId: folderId });
  const [refreshing, setRefreshing] = useState(false);
  const rootNavigation = useNavigation();

  // Update navigation title based on current folder
  useEffect(() => {
    navigation.setOptions({
      title: currentFolder?.name || 'ホーム',
    });
  }, [currentFolder, navigation]);

  // Load folder data when screen focuses (only if not already initialized)
  useFocusEffect(
    useCallback(() => {
      if (state.isInitialized) {
        // Only refresh data if already initialized, without showing loading
        loadFolderData(false);
      }
    }, [folderId, state.isInitialized])
  );

  const loadFolderData = async (showLoading: boolean = true) => {
    try {
      // Load folders and flashcards for current folder
      await Promise.all([
        actions.loadFolders(showLoading),
        actions.loadFlashcards(showLoading),
      ]);
    } catch (error) {
      console.error('Failed to load folder data:', error);
      showError('データの読み込みに失敗しました');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFolderData(false); // Don't show loading spinner during pull-to-refresh
    setRefreshing(false);
  };

  const handleFolderPress = (folder: any) => {
    navigateToFolder(folder.id);
    navigation.setParams({ folderId: folder.id });
  };

  const handleCardPress = (card: any) => {
    navigation.navigate('CardDetail', { cardId: card.id });
  };

  const handleAddCard = () => {
    // Navigate to card editor with current folder ID
    try {
      (rootNavigation as any).navigate('CardEditor', { folderId });
    } catch (error) {
      console.error('Navigation error:', error);
      showError('画面の遷移に失敗しました');
    }
  };

  const handleAddFolder = () => {
    Alert.prompt(
      'フォルダを作成',
      'フォルダ名を入力してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '作成',
          onPress: async (folderName: string) => {
            if (folderName?.trim()) {
              try {
                await actions.createFolder({
                  name: folderName.trim(),
                  parentId: folderId || null,
                });
                await loadFolderData();
                showSuccess('フォルダを作成しました');
              } catch (error) {
                showError('フォルダの作成に失敗しました');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleImportTSV = () => {
    // Navigate to import TSV screen
    try {
      (rootNavigation as any).navigate('ImportTSV');
    } catch (error) {
      console.error('Navigation error:', error);
      showError('画面の遷移に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Breadcrumb navigation - fixed at top */}
        <FolderNavigator
          currentFolder={currentFolder}
          breadcrumbs={breadcrumbs}
          onNavigate={navigateToFolder}
        />

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Statistics card - only show on root level */}
          {!folderId && (
            <>
              <StatsCard
                stats={[
                  {
                    icon: 'document-text',
                    label: 'カード',
                    value: state.flashcards?.length || 0,
                    color: '#6366f1',
                  },
                  {
                    icon: 'folder',
                    label: 'フォルダ',
                    value: state.folders?.length || 0,
                    color: '#f59e0b',
                  },
                  {
                    icon: 'time',
                    label: '今日の学習',
                    value: 0, // TODO: Implement study tracking
                    color: '#10b981',
                  },
                ]}
                style={styles.statsCard}
              />
              
              <QuickActions
                actions={[
                  {
                    icon: 'add-circle',
                    label: '新しいカード',
                    description: '単語カードを作成',
                    color: '#6366f1',
                    onPress: handleAddCard,
                  },
                  {
                    icon: 'cloud-upload',
                    label: 'TSVインポート',
                    description: 'ファイルから一括インポート',
                    color: '#10b981',
                    onPress: handleImportTSV,
                  },
                  {
                    icon: 'school',
                    label: '学習を開始',
                    description: 'フラッシュカードで学習',
                    color: '#f59e0b',
                    onPress: () => console.log('Navigate to Study'),
                  },
                ]}
                style={styles.quickActions}
              />
            </>
          )}

          {/* Folder and card content */}
          <View style={styles.contentSection}>
            <FolderContent
              folders={state.folders || []}
              flashcards={state.flashcards || []}
              loading={state.loading}
              onFolderPress={handleFolderPress}
              onFlashcardPress={handleCardPress}
              emptyMessage={folderId ? 'このフォルダは空です' : 'まだカードがありません'}
              emptyHint={folderId ? 'カードやフォルダを追加してください' : '下のボタンからカードを作成するか、TSVファイルをインポートしてください'}
              enableVirtualization={false}
            />
          </View>
        </ScrollView>

        {/* Floating action buttons */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, styles.fabSecondary]}
            onPress={handleAddFolder}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fab, styles.fabSecondary]}
            onPress={handleImportTSV}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fab, styles.fabPrimary]}
            onPress={handleAddCard}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for FABs
  },
  contentSection: {
    flex: 1,
    minHeight: 400, // Ensure minimum height for content
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPrimary: {
    backgroundColor: '#007AFF',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabSecondary: {
    backgroundColor: '#6b7280',
  },
});