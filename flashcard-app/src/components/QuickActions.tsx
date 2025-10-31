// Quick actions component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
  onPress: () => void;
}

interface Props {
  actions: Action[];
  title?: string;
  style?: any;
}

export function QuickActions({ actions, title = 'クイックアクション', style }: Props) {
  const renderAction = (action: Action, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.actionItem}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
        <Ionicons name={action.icon} size={24} color={action.color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionLabel}>{action.label}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actionsContainer}>
        {actions.map(renderAction)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
});