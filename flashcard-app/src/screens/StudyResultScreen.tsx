import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParamList } from '../navigation/types';
import { StudyResult } from '../types';

type Props = NativeStackScreenProps<StudyStackParamList, 'StudyResult'>;

export default function StudyResultScreen({ route, navigation }: Props) {
  const params = route.params || {};
  const { result, sessionDuration = 0 } = params;

  // Handle case where result is undefined
  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>学習結果が見つかりません</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const accuracy = result.totalCards > 0 
    ? Math.round((result.correctCount / result.totalCards) * 100) 
    : 0;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}分${remainingSeconds}秒`
      : `${remainingSeconds}秒`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'good': return '#2196F3';
      case 'hard': return '#FF9800';
      case 'again': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return '簡単';
      case 'good': return '普通';
      case 'hard': return '難しい';
      case 'again': return 'もう一度';
      default: return '不明';
    }
  };

  const handleStudyAgain = () => {
    navigation.popToTop();
  };

  const handleGoHome = () => {
    navigation.navigate('Home' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>学習完了！</Text>
          <Text style={styles.subtitle}>お疲れさまでした</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>{accuracy}%</Text>
            <Text style={styles.mainStatLabel}>正答率</Text>
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{result.correctCount}</Text>
              <Text style={styles.statLabel}>正解</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{result.totalCards}</Text>
              <Text style={styles.statLabel}>総カード数</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(sessionDuration)}</Text>
              <Text style={styles.statLabel}>学習時間</Text>
            </View>
          </View>
        </View>

        {/* Difficulty Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>理解度別内訳</Text>
          <View style={styles.breakdownGrid}>
            {Object.entries(result.difficultyBreakdown).map(([difficulty, count]) => (
              <View key={difficulty} style={styles.breakdownItem}>
                <View 
                  style={[
                    styles.breakdownIndicator, 
                    { backgroundColor: getDifficultyColor(difficulty) }
                  ]} 
                />
                <Text style={styles.breakdownLabel}>
                  {getDifficultyLabel(difficulty)}
                </Text>
                <Text style={styles.breakdownValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>学習のポイント</Text>
          <View style={styles.insights}>
            {accuracy >= 80 && (
              <View style={styles.insight}>
                <Text style={styles.insightIcon}>🎉</Text>
                <Text style={styles.insightText}>
                  素晴らしい成績です！この調子で続けましょう。
                </Text>
              </View>
            )}
            {accuracy >= 60 && accuracy < 80 && (
              <View style={styles.insight}>
                <Text style={styles.insightIcon}>👍</Text>
                <Text style={styles.insightText}>
                  良い成績です。もう少し復習すると更に向上します。
                </Text>
              </View>
            )}
            {accuracy < 60 && (
              <View style={styles.insight}>
                <Text style={styles.insightIcon}>💪</Text>
                <Text style={styles.insightText}>
                  復習を重ねることで必ず上達します。諦めずに続けましょう。
                </Text>
              </View>
            )}
            {result.difficultyBreakdown.again > 0 && (
              <View style={styles.insight}>
                <Text style={styles.insightIcon}>🔄</Text>
                <Text style={styles.insightText}>
                  「もう一度」のカードは後で復習することをお勧めします。
                </Text>
              </View>
            )}
            {result.averageResponseTime > 0 && (
              <View style={styles.insight}>
                <Text style={styles.insightIcon}>⏱️</Text>
                <Text style={styles.insightText}>
                  平均回答時間: {Math.round(result.averageResponseTime / 1000)}秒
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={handleGoHome}
        >
          <Text style={styles.secondaryButtonText}>ホームに戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={handleStudyAgain}
        >
          <Text style={styles.primaryButtonText}>もう一度学習</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  breakdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  breakdownIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  insightsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  insights: {
    gap: 12,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});