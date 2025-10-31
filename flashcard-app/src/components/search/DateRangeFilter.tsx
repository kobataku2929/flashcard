// Date Range Filter Component

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
import DateTimePicker from '@react-native-community/datetimepicker';
import { DateRange, DateRangeOption } from '../../types/search';
import { FilterService } from '../../services/FilterService';

interface Props {
  selectedDateRange?: DateRange;
  onDateRangeSelect: (dateRange?: DateRange) => void;
  style?: any;
}

export function DateRangeFilter({ selectedDateRange, onDateRangeSelect, style }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(
    selectedDateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const [tempEndDate, setTempEndDate] = useState<Date>(
    selectedDateRange?.endDate || new Date()
  );

  const filterService = FilterService.getInstance();
  const presetRanges = filterService.getDateRangeOptions ? filterService.getDateRangeOptions() : [];

  const getSelectedRangeText = (): string => {
    if (!selectedDateRange) {
      return 'Any Date';
    }

    const { startDate, endDate } = selectedDateRange;
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  };

  const handlePresetSelect = (preset: DateRangeOption) => {
    onDateRangeSelect(preset.value);
    setIsModalVisible(false);
  };

  const handleCustomRangeApply = () => {
    if (tempStartDate > tempEndDate) {
      // Swap dates if start is after end
      onDateRangeSelect({
        startDate: tempEndDate,
        endDate: tempStartDate
      });
    } else {
      onDateRangeSelect({
        startDate: tempStartDate,
        endDate: tempEndDate
      });
    }
    setIsModalVisible(false);
  };

  const handleClearFilter = () => {
    onDateRangeSelect(undefined);
    setIsModalVisible(false);
  };

  const renderPresetItem = (preset: DateRangeOption) => (
    <TouchableOpacity
      key={preset.label}
      style={styles.presetItem}
      onPress={() => handlePresetSelect(preset)}
    >
      <Text style={styles.presetItemText}>{preset.label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.filterButtonContent}>
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          <Text style={styles.filterButtonText}>
            {getSelectedRangeText()}
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
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Clear Filter Option */}
            <TouchableOpacity
              style={[styles.presetItem, styles.clearItem]}
              onPress={handleClearFilter}
            >
              <Text style={[styles.presetItemText, styles.clearItemText]}>
                Any Date (Clear Filter)
              </Text>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
            </TouchableOpacity>

            {/* Preset Ranges */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Select</Text>
              {presetRanges.map(renderPresetItem)}
            </View>

            {/* Custom Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Range</Text>
              
              <View style={styles.customRangeContainer}>
                <View style={styles.datePickerRow}>
                  <Text style={styles.dateLabel}>From:</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {tempStartDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerRow}>
                  <Text style={styles.dateLabel}>To:</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {tempEndDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleCustomRangeApply}
                >
                  <Text style={styles.applyButtonText}>Apply Custom Range</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Date Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartPicker(false);
                if (selectedDate) {
                  setTempStartDate(selectedDate);
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndPicker(false);
                if (selectedDate) {
                  setTempEndDate(selectedDate);
                }
              }}
            />
          )}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
  },
  clearItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  presetItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  clearItemText: {
    color: '#ef4444',
  },
  customRangeContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    color: '#1f2937',
    width: 60,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  applyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});