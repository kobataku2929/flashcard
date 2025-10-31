// Settings section component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingItem {
  type: 'switch' | 'select' | 'action';
  key: string;
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value?: any;
  options?: { label: string; value: any }[];
  onPress?: () => void;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

interface Props {
  title: string;
  items: SettingItem[];
  style?: any;
}

export function SettingsSection({ title, items, style }: Props) {
  const renderSettingItem = (item: SettingItem, index: number) => {
    const isLast = index === items.length - 1;
    
    return (
      <View key={item.key} style={[styles.settingItem, isLast && styles.lastItem]}>
        <TouchableOpacity
          style={styles.settingContent}
          onPress={item.onPress}
          disabled={item.type === 'switch' || item.disabled}
          activeOpacity={item.type === 'action' ? 0.7 : 1}
        >
          {item.icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={20} color="#6366f1" />
            </View>
          )}
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, item.disabled && styles.disabledText]}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={[styles.description, item.disabled && styles.disabledText]}>
                {item.description}
              </Text>
            )}
          </View>
          
          <View style={styles.controlContainer}>
            {item.type === 'switch' && (
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                disabled={item.disabled}
                trackColor={{ false: '#f3f4f6', true: '#6366f1' }}
                thumbColor={item.value ? '#fff' : '#9ca3af'}
              />
            )}
            
            {item.type === 'select' && (
              <View style={styles.selectValue}>
                <Text style={styles.selectText}>
                  {item.options?.find(opt => opt.value === item.value)?.label || item.value}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            )}
            
            {item.type === 'action' && (
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.itemsContainer}>
        {items.map(renderSettingItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  itemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  disabledText: {
    color: '#9ca3af',
  },
  controlContainer: {
    marginLeft: 12,
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
});