// Settings screen component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';

import { useAppContext } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useToastHelpers } from '../context/ToastContext';
import { SettingsSection } from '../components/SettingsSection';
import { DatabaseManager } from '../database/DatabaseManager';

export default function SettingsScreen() {
  const { actions } = useAppContext();
  const { state: settingsState, updateSetting, resetSettings } = useSettings();
  const { showSuccess, showError } = useToastHelpers();

  const handleResetData = () => {
    Alert.alert(
      'データをリセット',
      'すべてのカードとフォルダが削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const dbManager = DatabaseManager.getInstance();
              await dbManager.reset();
              // Reload data after reset
              await actions.loadFlashcards();
              await actions.loadFolders();
              showSuccess('データをリセットしました');
            } catch (error) {
              showError('データのリセットに失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const dbManager = DatabaseManager.getInstance();
      const exportSQL = await dbManager.exportDatabase();
      // TODO: Implement file sharing
      Alert.alert('エクスポート完了', 'データベースをエクスポートしました');
    } catch (error) {
      Alert.alert('エラー', 'データのエクスポートに失敗しました');
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      '設定をリセット',
      'すべての設定がデフォルト値に戻ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          onPress: async () => {
            await resetSettings();
            Alert.alert('完了', '設定をリセットしました');
          },
        },
      ]
    );
  };

  const handleDatabaseHealth = async () => {
    try {
      const dbManager = DatabaseManager.getInstance();
      const health = await dbManager.checkHealth();
      
      if (health.isHealthy) {
        Alert.alert(
          'データベース状態',
          `データベースは正常です\nバージョン: ${health.version}`
        );
      } else {
        Alert.alert(
          'データベースエラー',
          `問題が検出されました:\n${health.errors.join('\n')}`
        );
      }
    } catch (error) {
      Alert.alert('エラー', 'データベースの確認に失敗しました');
    }
  };

  if (settingsState.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>設定を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection
          title="表示設定"
          items={[
            {
              type: 'switch',
              key: 'darkMode',
              title: 'ダークモード',
              description: 'アプリの外観をダークテーマに変更',
              icon: 'moon-outline',
              value: settingsState.settings.darkMode,
              onChange: (value) => updateSetting('darkMode', value),
            },
            {
              type: 'switch',
              key: 'animations',
              title: 'アニメーション',
              description: 'カードのアニメーションを有効にする',
              icon: 'play-outline',
              value: settingsState.settings.animations,
              onChange: (value) => updateSetting('animations', value),
            },
            {
              type: 'select',
              key: 'fontSize',
              title: 'フォントサイズ',
              description: 'テキストの大きさを調整',
              icon: 'text-outline',
              value: settingsState.settings.fontSize,
              options: [
                { label: '小', value: 'small' },
                { label: '中', value: 'medium' },
                { label: '大', value: 'large' },
              ],
              onPress: () => {
                Alert.alert('情報', 'フォントサイズ設定は今後実装予定です');
              },
            },
          ]}
        />

        <SettingsSection
          title="学習設定"
          items={[
            {
              type: 'select',
              key: 'studyMode',
              title: '学習モード',
              description: 'デフォルトの学習モードを設定',
              icon: 'school-outline',
              value: settingsState.settings.studyMode,
              options: [
                { label: 'フラッシュカード', value: 'flashcard' },
                { label: 'クイズ', value: 'quiz' },
                { label: 'ミックス', value: 'mixed' },
              ],
              onPress: () => {
                Alert.alert('情報', '学習モード設定は今後実装予定です');
              },
            },
            {
              type: 'select',
              key: 'reviewInterval',
              title: '復習間隔',
              description: 'カードの復習間隔を設定',
              icon: 'time-outline',
              value: settingsState.settings.reviewInterval,
              options: [
                { label: '毎日', value: 1 },
                { label: '2日', value: 2 },
                { label: '3日', value: 3 },
                { label: '1週間', value: 7 },
              ],
              onPress: () => {
                Alert.alert('情報', '復習間隔設定は今後実装予定です');
              },
            },
            {
              type: 'switch',
              key: 'soundEnabled',
              title: '音声再生',
              description: '発音の自動再生を有効にする',
              icon: 'volume-high-outline',
              value: settingsState.settings.soundEnabled,
              onChange: (value) => updateSetting('soundEnabled', value),
            },
          ]}
        />

        <SettingsSection
          title="データ管理"
          items={[
            {
              type: 'action',
              key: 'exportData',
              title: 'データをエクスポート',
              description: 'カードデータをファイルに保存',
              icon: 'download-outline',
              onPress: handleExportData,
            },
            {
              type: 'action',
              key: 'databaseHealth',
              title: 'データベース状態確認',
              description: 'データベースの整合性をチェック',
              icon: 'checkmark-circle-outline',
              onPress: handleDatabaseHealth,
            },
            {
              type: 'action',
              key: 'resetSettings',
              title: '設定をリセット',
              description: 'すべての設定をデフォルトに戻す',
              icon: 'refresh-outline',
              onPress: handleResetSettings,
            },
            {
              type: 'action',
              key: 'resetData',
              title: 'データをリセット',
              description: 'すべてのカードとフォルダを削除',
              icon: 'trash-outline',
              onPress: handleResetData,
            },
          ]}
        />

        <SettingsSection
          title="アプリ情報"
          items={[
            {
              type: 'action',
              key: 'version',
              title: 'バージョン 1.0.0',
              description: 'ビルド 1',
              icon: 'information-circle-outline',
            },
            {
              type: 'action',
              key: 'help',
              title: 'ヘルプ',
              description: '使い方とよくある質問',
              icon: 'help-circle-outline',
              onPress: () => {
                Alert.alert('情報', 'ヘルプ機能は今後実装予定です');
              },
            },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});