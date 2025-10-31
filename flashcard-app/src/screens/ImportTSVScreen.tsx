// TSV import screen component

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { useAppContext } from '../context/AppContext';
import { ImportService } from '../services/ImportService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ImportProgress } from '../components/ImportProgress';
import { useToastHelpers } from '../context/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportTSV'>;

export default function ImportTSVScreen({ navigation }: Props) {
  const { actions } = useAppContext();
  const { showSuccess, showError, showWarning } = useToastHelpers();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
    total: number;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    phase: string;
  } | null>(null);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/tab-separated-values', 'text/plain', 'text/csv', '*/*'],
        copyToCacheDirectory: false, // Don't copy to cache, read directly
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result);
        setImportResult(null);
      }
    } catch (error) {
      console.error('Failed to select file:', error);
      showError('ファイルの選択に失敗しました');
    }
  };

  const handleImport = async () => {
    if (!selectedFile?.assets[0]) return;

    try {
      setImporting(true);
      setImportProgress({ current: 0, total: 0, phase: 'ファイルを読み込み中...' });
      
      const file = selectedFile.assets[0];
      
      // Parse TSV file
      setImportProgress({ current: 0, total: 0, phase: 'TSVファイルを解析中...' });
      const result = await ImportService.importFromFile(file);
      
      if (result.flashcards.length === 0) {
        showError('有効なデータが見つかりませんでした');
        return;
      }
      
      // Create flashcards with progress tracking using batch import
      setImportProgress({ 
        current: 0, 
        total: result.flashcards.length, 
        phase: 'カードを作成中...' 
      });
      
      // Use batch import for better performance
      const batchResult = await ImportService.batchCreateFlashcards(
        result.flashcards,
        (processed, total) => {
          setImportProgress({ 
            current: processed, 
            total, 
            phase: 'カードを作成中...' 
          });
        }
      );
      
      // Reload flashcards to update the app state
      await actions.loadFlashcards();
      
      setImportResult({
        success: batchResult.created,
        errors: [...result.errors, ...batchResult.errors],
        total: result.flashcards.length,
      });
      
      const totalErrors = result.errors.length + batchResult.errors.length;
      
      if (totalErrors === 0) {
        showSuccess(`${batchResult.created}枚のカードをインポートしました`);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        showWarning(
          `${batchResult.created}枚のカードをインポートしました`,
          `${totalErrors}件のエラーがありました`
        );
      }
    } catch (error) {
      console.error('Failed to import TSV:', error);
      showError('TSVファイルのインポートに失敗しました');
      setImportResult({
        success: 0,
        errors: ['インポート処理中にエラーが発生しました'],
        total: 0,
      });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TSVファイルをインポート</Text>
          <Text style={styles.description}>
            TSV（タブ区切り）形式のファイルから単語カードを一括インポートできます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ファイル形式</Text>
          <Text style={styles.formatText}>
            単語{'\t'}読み方{'\t'}翻訳{'\t'}翻訳読み方{'\t'}メモ
          </Text>
          <Text style={styles.note}>
            ※ 読み方、翻訳読み方、メモは省略可能です
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleSelectFile}
            disabled={importing}
          >
            <Ionicons name="document-outline" size={24} color="#6366f1" />
            <Text style={styles.selectButtonText}>
              {selectedFile ? 'ファイルを変更' : 'ファイルを選択'}
            </Text>
          </TouchableOpacity>

          {selectedFile?.assets[0] && (
            <View style={styles.fileInfo}>
              <View style={styles.fileInfoHeader}>
                <Ionicons name="document" size={20} color="#10b981" />
                <Text style={styles.fileName}>{selectedFile.assets[0].name}</Text>
                <TouchableOpacity onPress={handleClearFile}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.fileSize}>
                {Math.round((selectedFile.assets[0].size || 0) / 1024)} KB
              </Text>
            </View>
          )}
        </View>

        {selectedFile && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.importButton,
                importing && styles.importButtonDisabled,
              ]}
              onPress={handleImport}
              disabled={importing}
            >
              {importing ? (
                <LoadingSpinner size="small" color="#fff" />
              ) : (
                <Ionicons name="cloud-upload" size={24} color="#fff" />
              )}
              <Text style={styles.importButtonText}>
                {importing ? 'インポート中...' : 'インポート開始'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {importProgress && (
          <View style={styles.section}>
            <ImportProgress
              current={importProgress.current}
              total={importProgress.total}
              phase={importProgress.phase}
            />
          </View>
        )}

        {importResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>インポート結果</Text>
            <View style={styles.resultCard}>
              <Text style={styles.successText}>
                成功: {importResult.success}枚のカード
              </Text>
              {importResult.errors.length > 0 && (
                <View style={styles.errorsContainer}>
                  <Text style={styles.errorTitle}>
                    エラー: {importResult.errors.length}件
                  </Text>
                  {importResult.errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  formatText: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    color: '#374151',
  },
  note: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 8,
  },
  fileInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginLeft: 8,
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
  },
  importButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  importButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8,
  },
  errorsContainer: {
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 2,
  },
});