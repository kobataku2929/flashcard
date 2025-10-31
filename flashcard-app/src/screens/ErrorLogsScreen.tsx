// Error logs screen for debugging (development only)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorService, ErrorLog } from '../services/ErrorService';

export default function ErrorLogsScreen() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byseverity: Record<ErrorLog['severity'], number>;
    recent: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const errorService = ErrorService.getInstance();

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = async () => {
    try {
      const [logs, errorStats] = await Promise.all([
        errorService.getErrorLogs(),
        errorService.getErrorStats(),
      ]);
      setErrorLogs(logs);
      setStats(errorStats);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadErrorLogs();
    setRefreshing(false);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'ログをクリア',
      'すべてのエラーログを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await errorService.clearErrorLogs();
            await loadErrorLogs();
            Alert.alert('完了', 'エラーログをクリアしました');
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const report = await errorService.generateErrorReport();
      // TODO: Implement file export functionality
      Alert.alert(
        'エクスポート',
        `${report.logs.length}件のエラーログをエクスポートしました`
      );
    } catch (error) {
      Alert.alert('エラー', 'ログのエクスポートに失敗しました');
    }
  };

  const getSeverityColor = (severity: ErrorLog['severity']) => {
    switch (severity) {
      case 'low':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      case 'critical':
        return '#7c2d12';
      default:
        return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: ErrorLog['severity']) => {
    switch (severity) {
      case 'low':
        return '低';
      case 'medium':
        return '中';
      case 'high':
        return '高';
      case 'critical':
        return '重大';
      default:
        return '不明';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  const renderErrorLog = (log: ErrorLog, index: number) => (
    <View key={log.id} style={styles.logItem}>
      <View style={styles.logHeader}>
        <View style={styles.logInfo}>
          <Text style={styles.logTitle}>{log.error.name}</Text>
          <Text style={styles.logTimestamp}>
            {formatTimestamp(log.timestamp)}
          </Text>
        </View>
        <View style={styles.logBadges}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(log.severity) },
            ]}
          >
            <Text style={styles.severityText}>
              {getSeverityLabel(log.severity)}
            </Text>
          </View>
          {!log.handled && (
            <View style={styles.unhandledBadge}>
              <Text style={styles.unhandledText}>未処理</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.logMessage} numberOfLines={2}>
        {log.error.message}
      </Text>

      {log.context && (
        <View style={styles.contextContainer}>
          {log.context.component && (
            <Text style={styles.contextText}>
              コンポーネント: {log.context.component}
            </Text>
          )}
          {log.context.action && (
            <Text style={styles.contextText}>
              アクション: {log.context.action}
            </Text>
          )}
        </View>
      )}

      {__DEV__ && log.error.stack && (
        <TouchableOpacity
          style={styles.stackTraceButton}
          onPress={() => {
            Alert.alert(
              'スタックトレース',
              log.error.stack,
              [{ text: 'OK' }],
              { cancelable: true }
            );
          }}
        >
          <Text style={styles.stackTraceButtonText}>
            スタックトレースを表示
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!__DEV__) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAvailable}>
          <Ionicons name="lock-closed" size={48} color="#9ca3af" />
          <Text style={styles.notAvailableText}>
            この機能は開発モードでのみ利用可能です
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>エラーログ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleExportLogs}
          >
            <Ionicons name="download-outline" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearLogs}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>総数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.recent}</Text>
            <Text style={styles.statLabel}>24時間以内</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {stats.byseverity.critical}
            </Text>
            <Text style={styles.statLabel}>重大</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {errorLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.emptyStateText}>エラーログはありません</Text>
          </View>
        ) : (
          errorLogs.map(renderErrorLog)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  logBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  unhandledBadge: {
    backgroundColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unhandledText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
  },
  logMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  contextContainer: {
    marginBottom: 8,
  },
  contextText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  stackTraceButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  stackTraceButtonText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  notAvailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notAvailableText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
});