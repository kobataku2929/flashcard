import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CreateFolder, Folder } from '@/types';

interface FolderEditorProps {
  folder?: Folder;
  parentFolderId?: number;
  onSave: (folder: CreateFolder) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
}

interface FormErrors {
  name?: string;
}

export const FolderEditor: React.FC<FolderEditorProps> = ({
  folder,
  parentFolderId,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!folder;

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name,
      });
    }
  }, [folder]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'フォルダ名は必須です';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'フォルダ名は50文字以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const folderData: CreateFolder = {
        name: formData.name.trim(),
        parentId: parentFolderId || null,
      };

      await onSave(folderData);
    } catch (error) {
      Alert.alert(
        'エラー',
        'フォルダの保存に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        '確認',
        '変更が保存されていません。破棄しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  const hasUnsavedChanges = (): boolean => {
    if (!folder) {
      return formData.name.trim() !== '';
    }

    return formData.name !== folder.name;
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditing ? 'フォルダを編集' : '新しいフォルダ'}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>フォルダ名 *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="例: 英語の基本単語"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          <Text style={styles.characterCount}>
            {formData.name.length}/50
          </Text>
        </View>

        {parentFolderId && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              📁 親フォルダ内に作成されます
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSaving || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            (isSaving || isLoading) && styles.buttonDisabled
          ]}
          onPress={handleSave}
          disabled={isSaving || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});