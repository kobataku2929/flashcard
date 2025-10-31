import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CardEditor } from '@/components/CardEditor';
import { Flashcard } from '@/types';

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockFlashcard: Flashcard = {
  id: 1,
  word: 'hello',
  wordPronunciation: 'həˈloʊ',
  translation: 'こんにちは',
  translationPronunciation: 'こんにちは',
  memo: 'This is a greeting',
  folderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CardEditor', () => {
  const defaultProps = {
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('New card creation', () => {
    it('should render form for new card', () => {
      const { getByText, getByPlaceholderText } = render(
        <CardEditor {...defaultProps} />
      );

      expect(getByText('新しい単語カード')).toBeTruthy();
      expect(getByPlaceholderText('例: hello')).toBeTruthy();
      expect(getByPlaceholderText('例: こんにちは')).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const { getByText } = render(<CardEditor {...defaultProps} />);

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(getByText('単語は必須です')).toBeTruthy();
        expect(getByText('翻訳は必須です')).toBeTruthy();
      });

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('should save new card with valid data', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'test',
          wordPronunciation: undefined,
          translation: 'テスト',
          translationPronunciation: undefined,
          memo: undefined,
          folderId: null,
        });
      });
    });

    it('should save card with all fields filled', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} folderId={5} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'hello');
      fireEvent.changeText(getByPlaceholderText('例: həˈloʊ'), 'həˈloʊ');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'こんにちは');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'こんにちは');
      fireEvent.changeText(getByPlaceholderText('例: よく使われる挨拶の言葉'), 'greeting');

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'hello',
          wordPronunciation: 'həˈloʊ',
          translation: 'こんにちは',
          translationPronunciation: 'こんにちは',
          memo: 'greeting',
          folderId: 5,
        });
      });
    });
  });

  describe('Card editing', () => {
    it('should render form for editing existing card', () => {
      const { getByText, getByDisplayValue } = render(
        <CardEditor {...defaultProps} flashcard={mockFlashcard} />
      );

      expect(getByText('単語カードを編集')).toBeTruthy();
      expect(getByDisplayValue('hello')).toBeTruthy();
      expect(getByDisplayValue('həˈloʊ')).toBeTruthy();
      expect(getByDisplayValue('こんにちは')).toBeTruthy();
      expect(getByDisplayValue('This is a greeting')).toBeTruthy();
    });

    it('should update existing card', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { getByDisplayValue, getByText } = render(
        <CardEditor {...defaultProps} flashcard={mockFlashcard} onSave={onSave} />
      );

      fireEvent.changeText(getByDisplayValue('hello'), 'hi');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'hi',
          wordPronunciation: 'həˈloʊ',
          translation: 'こんにちは',
          translationPronunciation: 'こんにちは',
          memo: 'This is a greeting',
          folderId: null,
        });
      });
    });

    it('should handle card without optional fields', () => {
      const cardWithoutOptionals = {
        ...mockFlashcard,
        wordPronunciation: undefined,
        translationPronunciation: undefined,
        memo: undefined,
      };

      const { getByDisplayValue, queryByDisplayValue } = render(
        <CardEditor {...defaultProps} flashcard={cardWithoutOptionals} />
      );

      expect(getByDisplayValue('hello')).toBeTruthy();
      expect(getByDisplayValue('こんにちは')).toBeTruthy();
      expect(queryByDisplayValue('həˈloʊ')).toBeNull();
    });
  });

  describe('Form validation', () => {
    it('should clear errors when user starts typing', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <CardEditor {...defaultProps} />
      );

      // Trigger validation errors
      fireEvent.press(getByText('保存'));
      await waitFor(() => {
        expect(getByText('単語は必須です')).toBeTruthy();
      });

      // Start typing to clear error
      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      expect(queryByText('単語は必須です')).toBeNull();
    });

    it('should trim whitespace from inputs', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), '  hello  ');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), '  こんにちは  ');

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'hello',
          wordPronunciation: undefined,
          translation: 'こんにちは',
          translationPronunciation: undefined,
          memo: undefined,
          folderId: null,
        });
      });
    });

    it('should convert empty strings to undefined for optional fields', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: həˈloʊ'), '   ');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'test',
          wordPronunciation: undefined,
          translation: 'テスト',
          translationPronunciation: undefined,
          memo: undefined,
          folderId: null,
        });
      });
    });
  });

  describe('Cancel behavior', () => {
    it('should call onCancel when no changes made', () => {
      const onCancel = jest.fn();
      const { getByText } = render(
        <CardEditor {...defaultProps} onCancel={onCancel} />
      );

      fireEvent.press(getByText('キャンセル'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should show confirmation when unsaved changes exist', () => {
      const onCancel = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onCancel={onCancel} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.press(getByText('キャンセル'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '確認',
        '変更が保存されていません。破棄しますか？',
        expect.any(Array)
      );
    });

    it('should detect changes in editing mode', () => {
      const onCancel = jest.fn();
      const { getByDisplayValue, getByText } = render(
        <CardEditor {...defaultProps} flashcard={mockFlashcard} onCancel={onCancel} />
      );

      fireEvent.changeText(getByDisplayValue('hello'), 'hi');
      fireEvent.press(getByText('キャンセル'));

      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should show error alert when save fails', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          '単語カードの保存に失敗しました。もう一度お試しください。'
        );
      });
    });

    it('should disable buttons when loading', () => {
      const { getByText } = render(
        <CardEditor {...defaultProps} isLoading={true} />
      );

      const saveButton = getByText('保存');
      const cancelButton = getByText('キャンセル');

      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
      expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should show saving state', async () => {
      const onSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { getByPlaceholderText, getByText } = render(
        <CardEditor {...defaultProps} onSave={onSave} />
      );

      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      fireEvent.press(getByText('保存'));

      expect(getByText('保存中...')).toBeTruthy();
    });
  });
});