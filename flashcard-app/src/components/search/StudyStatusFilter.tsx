// Study Status Filter Component

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudyStatus, StudyStatusOption } from '../../types/search';
import { FilterService } from '../../services/FilterService';

interface Props {
  selectedStatuses?: StudyStatus[];
  onStatusesSelect: (statuses?: StudyStatus[]) => void;
  style?: any;
}

export function StudyStatusFilter({ selectedStatuses = [], onStatusesSelect, style }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempSelectedStatuses, setTempSelectedStatuses] = useState<StudyStatus[]>(selectedStatuses);

  const filterService = FilterService.getInstance();
  const statusOptions = filterService.getStudyStatusOptions();

  const getSelectedStatusText = (): string => {
    if (!selectedStatuses || selectedStatuses.length === 0) {
      return 'Any Status';
    }

    if (selectedStatuses.length === 1) {
      const option = statusOptions.find(opt => opt.value === selectedStatuses[0]);
      return option ? option.label : 'Unknown Status';
    }

    return `${selectedStatuses.length} statuses`;
  };

  const getStatusIcon = (status: StudyStatus): string => {
    switch (status) {
      case StudyStatus.NEW:
        return 'add-circle-outline';
      case StudyStatus.LEARNING:
        return 'school-outline';
      case StudyStatus.MASTERED:
        return 'checkmark-circle-outline';
      case StudyStatus.NEEDS_REVIEW:
        return 'refresh-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusColor = (status: StudyStatus): string => {
    switch (status) {
      case StudyStatus.NEW:
        return '#3b82f6';
      case StudyStatus.LEARNING:
        return '#f59e0b';
      case StudyStatus.MASTERED:
        return '#10b981';
      case StudyStatus.NEEDS_REVIEW:
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleStatusToggle = (status: StudyStatus) => {
    const newStatuses = tempSelectedStatuses.includes(status)
      ? tempSelectedStatuses.filter(s => s !== status)
      : [...tempSelectedStatuses, status];
    
    setTempSelectedStatuses(newStatuses);
  };

  const handleApply = () => {
    onStatusesSelect(tempSelectedStatuses.length > 0 ? tempSelectedStatuses : undefined);
    setIsModalVisible(false);
  };

  const handleClear = () => {
    setTempSelectedStatuses([]);
    onStatusesSelect(undefined);
    setIsModalVisible(false);
  };

  const handleSelectAll = () => {
    const allStatuses = statusOptions.map(opt => opt.value);
    setTempSelectedStatuses(allStatuses);
  };

  const renderStatusOption = (option: StudyStatusOption) => {
    const isSelected = tempSelectedStatuses.includes(option.value);
    const statusColor = getStatusColor(option.value);

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.statusItem,
          isSelected && { ...styles.selectedStatusItem, borderColor: statusColor }
        ]}
        onPress={() => handleStatusToggle(option.value)}
      >
        <View style={styles.statusItemContent}>
          <Ionicons 
            name={getStatusIcon(option.value)} 
            size={24} 
            color={isSelected ? statusColor : '#6b7280'} 
          />
          <View style={styles.statusTextContainer}>
            <Text style={[
              styles.statusItemText,
              isSelected && { color: statusColor, fontWeight: '600' }
            ]}>
              {option.label}
            </Text>
            <Text style={styles.statusDescription}>
              {getStatusDescription(option.value)}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={statusColor} />
        )}
      </TouchableOpacity>
    );
  };

  const getStatusDescription = (status: StudyStatus): string => {
    switch (status) {
      case StudyStatus.NEW:
        return 'Cards you haven\'t studied yet';
      case StudyStatus.LEARNING:
        return 'Cards you\'re currently learning';
      case StudyStatus.MASTERED:
        return 'Cards you\'ve mastered';
      case StudyStatus.NEEDS_REVIEW:
        return 'Cards that need review';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.filterButtonContent}>
          <Ionicons name="stats-chart-outline" size={20} color="#6b7280" />
          <Text style={styles.filterButtonText}>
            {getSelectedStatusText()}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Study Status</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.quickActionText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.clearButton]}
                onPress={handleClear}
              >
                <Text style={[styles.quickActionText, styles.clearButtonText]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Options */}
            <View style={styles.statusList}>
              {statusOptions.map(renderStatusOption)}
            </View>

            {/* Apply Button */}
            <View style={styles.applyContainer}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>
                  Apply Filter ({tempSelectedStatuses.length} selected)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  clearButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  clearButtonText: {
    color: '#ef4444',
  },
  statusList: {
    paddingHorizontal: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedStatusItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
  },
  statusItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusItemText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  applyContainer: {
    padding: 16,
    paddingTop: 24,
  },
  applyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});