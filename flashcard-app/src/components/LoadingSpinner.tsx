// Loading spinner component

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

export function LoadingSpinner({ size = 'large', color = '#6366f1', style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});