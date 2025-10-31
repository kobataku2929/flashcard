import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CreateFlashcard, Flashcard } from '../types';

interface CardEditorProps {
  flashcard?: Flashcard;
  folderId?: number;
  onSave: (flashcard: CreateFlashcard) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  word: string;
  wordPronunciation: string;
  translation: string;
  translationPronunciation: string;
  memo: string;
}

interface FormErrors {
  word?: string;
  translation?: string;
}

export const CardEditor: React.FC<CardEditorProps> = ({
  flashcard,
  folderId,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    word: '',
    wordPronunciation: '',
    translation: '',
    translationPronunciation: '',
    memo: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!flashcard;

  useEffect(() => {
    if (flashcard) {
      setFormData({
        word: flashcard.word,
        wordPronunciation: flashcard.wordPronunciation || '',
        translation: flashcard.translation,
        translationPronunciation: flashcard.translationPronunciation || '',
        memo: flashcard.memo || '',
      });
    }
  }, [flashcard]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.word.trim()) {
      newErrors.word = '単語は必須です';
    }

    if (!formData.translation.trim()) {
      newErrors.translation = '翻訳は必須です';
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
      const flashcardData: CreateFlashcard = {
        word: formData.word.trim(),
        wordPronunciation: formData.wordPronunciation.trim() || undefined,
        translation: formData.translation.trim(),
        translationPronunciation: formData.translationPronunciation.trim() || undefined,
        memo: formData.memo.trim() || undefined,
        folderId: folderId || null,
      };

      await onSave(flashcardData);
    } catch (error) {
      Alert.alert(
        'エラー',
        '単語カードの保存に失敗しました。もう一度お試しください。'
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
    if (!flashcard) {
      return Object.values(formData).some(value => value.trim() !== '');
    }

    return (
      formData.word !== flashcard.word ||
      formData.wordPronunciation !== (flashcard.wordPronunciation || '') ||
      formData.translation !== flashcard.translation ||
      formData.translationPronunciation !== (flashcard.translationPronunciation || '') ||
      formData.memo !== (flashcard.memo || '')
    );
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? '単語カードを編集' : '新しい単語カード'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Word Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>単語 *</Text>
            <TextInput
              style={[styles.input, errors.word && styles.inputError]}
              value={formData.word}
              onChangeText={(value) => updateFormData('word', value)}
              placeholder="例: hello"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.word && <Text style={styles.errorText}>{errors.word}</Text>}
          </View>

          {/* Word Pronunciation Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>単語の発音 (任意)</Text>
            <TextInput
              style={styles.input}
              value={formData.wordPronunciation}
              onChangeText={(value) => updateFormData('wordPronunciation', value)}
              placeholder="例: həˈloʊ"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Translation Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>翻訳 *</Text>
            <TextInput
              style={[styles.input, errors.translation && styles.inputError]}
              value={formData.translation}
              onChangeText={(value) => updateFormData('translation', value)}
              placeholder="例: こんにちは"
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            {errors.translation && <Text style={styles.errorText}>{errors.translation}</Text>}
          </View>

          {/* Translation Pronunciation Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>翻訳の発音 (任意)</Text>
            <TextInput
              style={styles.input}
              value={formData.translationPronunciation}
              onChangeText={(value) => updateFormData('translationPronunciation', value)}
              placeholder="例: こんにちは"
              placeholderTextColor="#999"
              autoCorrect={false}
            />
          </View>

          {/* Memo Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>メモ (任意)</Text>
            <TextInput
              style={[styles.input, styles.memoInput]}
              value={formData.memo}
              onChangeText={(value) => updateFormData('memo', value)}
              placeholder="例: よく使われる挨拶の言葉"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
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
  memoInput: {
    height: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
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