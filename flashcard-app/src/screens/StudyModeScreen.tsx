import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParamList } from '../navigation/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FlashcardRepositoryImpl } from '../repositories/FlashcardRepository';
import { FolderRepositoryImpl } from '../repositories/FolderRepository';
import { useToastHelpers } from '../context/ToastContext';
import { StudySettings } from '../types';

type Props = NativeStackScreenProps<StudyStackParamList, 'StudyMode'>;

export default function StudyModeScreen({ route, navigation }: Props) {
  const params = route.params || {};
  const { folderId } = params;
  const { showError } = useToastHelpers();
  
  const [loading, setLoading] = useState(true);
  const [cardCount, setCardCount] = useState(0);
  const [folderName, setFolderName] = useState<string>('');
  const [settings, setSettings] = useState<StudySettings>({
    shuffleCards: true,
    showTimer: true,
    autoAdvance: false,
    sessionSize: undefined,
  });

  const flashcardRepository = new FlashcardRepositoryImpl();
  const folderRepository = new FolderRepositoryImpl();

  useEffect(() => {
    loadData();
  }, [folderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get card count
      if (folderId !== undefined && folderId !== null) {
        const cards = await flashcardRepository.findByFolderId(folderId);
        setCardCount(cards.length);
        
        // Get folder name
        const folder = await folderRepository.findById(folderId);
        setFolderName(folder?.name || '不明なフォルダ');
      } else {
        const cards = await flashcardRepository.findAll();
        setCardCount(cards.length);
        setFolderName('すべてのカード');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStudy = () => {
    if (cardCount === 0) {
      Alert.alert('エラー', '学習するカードがありません。');
      return;
    }

    // Navigate to study session with settings
    navigation.navigate('StudySession', {
      cardIds: [], // Will be loaded in StudySession
      folderId,
      settings,
    });
  };

  const updateSetting = <K extends keyof StudySettings>(
    key: K,
    value: StudySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>データを読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>学習モード</Text>
        <Text style={styles.subtitle}>{folderName}</Text>
        <Text style={styles.cardCount}>{cardCount}枚のカード</Text>
      </View>

      {/* Study Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>学習設定</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>カードをシャッフル</Text>
            <Text style={styles.settingDescription}>
              カードの順序をランダムにします
            </Text>
          </View>
          <Switch
            value={settings.shuffleCards}
            onValueChange={(value) => updateSetting('shuffleCards', value)}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={settings.shuffleCards ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>タイマー表示</Text>
            <Text style={styles.settingDescription}>
              各カードの回答時間を表示します
            </Text>
          </View>
          <Switch
            value={settings.showTimer}
            onValueChange={(value) => updateSetting('showTimer', value)}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={settings.showTimer ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>自動進行</Text>
            <Text style={styles.settingDescription}>
              理解度選択後に自動で次のカードに進みます
            </Text>
          </View>
          <Switch
            value={settings.autoAdvance}
            onValueChange={(value) => updateSetting('autoAdvance', value)}
            trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
            thumbColor={settings.autoAdvance ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Session Size Options */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>セッションサイズ</Text>
        
        <View style={styles.sessionSizeOptions}>
          <TouchableOpacity
            style={[
              styles.sessionSizeOption,
              !settings.sessionSize && styles.sessionSizeOptionActive
            ]}
            onPress={() => updateSetting('sessionSize', undefined)}
          >
            <Text style={[
              styles.sessionSizeOptionText,
              !settings.sessionSize && styles.sessionSizeOptionTextActive
            ]}>
              すべて ({cardCount}枚)
            </Text>
          </TouchableOpacity>

          {[10, 20, 50].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sessionSizeOption,
                settings.sessionSize === size && styles.sessionSizeOptionActive
              ]}
              onPress={() => updateSetting('sessionSize', size)}
              disabled={cardCount < size}
            >
              <Text style={[
                styles.sessionSizeOptionText,
                settings.sessionSize === size && styles.sessionSizeOptionTextActive,
                cardCount < size && styles.sessionSizeOptionTextDisabled
              ]}>
                {size}枚
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Study Statistics Preview */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>学習予定</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {settings.sessionSize || cardCount}
            </Text>
            <Text style={styles.statLabel}>学習カード数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.ceil((settings.sessionSize || cardCount) * 0.5)}
            </Text>
            <Text style={styles.statLabel}>予想時間(分)</Text>
          </View>
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[
          styles.startButton,
          cardCount === 0 && styles.startButtonDisabled
        ]}
        onPress={handleStartStudy}
        disabled={cardCount === 0}
      >
        <Text style={[
          styles.startButtonText,
          cardCount === 0 && styles.startButtonTextDisabled
        ]}>
          学習を開始
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 16,
    color: '#9ca3af',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionSizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sessionSizeOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  sessionSizeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sessionSizeOptionTextActive: {
    color: '#fff',
  },
  sessionSizeOptionTextDisabled: {
    color: '#9ca3af',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  startButtonTextDisabled: {
    color: '#d1d5db',
  },
});