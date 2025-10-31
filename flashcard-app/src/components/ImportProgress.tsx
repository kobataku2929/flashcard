// Import progress component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  progress: number; // 0-1
  status: 'idle' | 'parsing' | 'importing' | 'completed' | 'error';
  currentStep?: string;
  totalItems?: number;
  processedItems?: number;
  errors?: string[];
}

export function ImportProgress({
  progress,
  status,
  currentStep,
  totalItems = 0,
  processedItems = 0,
  errors = [],
}: Props) {
  const getStatusIcon = () => {
    switch (status) {
      case 'parsing':
      case 'importing':
        return 'sync-outline';
      case 'completed':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'document-outline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'parsing':
      case 'importing':
        return '#6366f1';
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'parsing':
        return 'ファイルを解析中...';
      case 'importing':
        return 'データをインポート中...';
      case 'completed':
        return 'インポート完了';
      case 'error':
        return 'エラーが発生しました';
      default:
        return '待機中';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name={getStatusIcon()}
          size={24}
          color={getStatusColor()}
          style={status === 'parsing' || status === 'importing' ? styles.spinning : undefined}
        />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {(status === 'parsing' || status === 'importing') && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: getStatusColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {currentStep && (
        <Text style={styles.stepText}>{currentStep}</Text>
      )}

      {totalItems > 0 && (
        <Text style={styles.itemsText}>
          {processedItems} / {totalItems} 件処理済み
        </Text>
      )}

      {errors.length > 0 && (
        <View style={styles.errorsContainer}>
          <Text style={styles.errorsTitle}>
            エラー ({errors.length}件)
          </Text>
          {errors.slice(0, 3).map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
          {errors.length > 3 && (
            <Text style={styles.moreErrors}>
              他 {errors.length - 3} 件のエラー
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  spinning: {
    // Add rotation animation if needed
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 40,
    textAlign: 'right',
  },
  stepText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  errorsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 2,
  },
  moreErrors: {
    fontSize: 12,
    color: '#dc2626',
    fontStyle: 'italic',
    marginTop: 4,
  },
});