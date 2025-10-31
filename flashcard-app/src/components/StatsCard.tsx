// Statistics card component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  onPress?: () => void;
}

interface Props {
  stats: StatItem[];
  style?: any;
}

export function StatsCard({ stats, style }: Props) {
  const renderStatItem = (stat: StatItem, index: number) => {
    const Component = stat.onPress ? TouchableOpacity : View;
    
    return (
      <Component
        key={index}
        style={[
          styles.statItem,
          index < stats.length - 1 && styles.statItemBorder,
        ]}
        onPress={stat.onPress}
        activeOpacity={stat.onPress ? 0.7 : 1}
      >
        <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
          <Ionicons name={stat.icon} size={24} color={stat.color} />
        </View>
        <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </Component>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {stats.map(renderStatItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
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
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});