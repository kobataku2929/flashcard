import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CardEditor } from '@/components/CardEditor';
import { CardActions } from '@/components/CardActions';
import { Flashcard, CreateFlashcard } from '@/types';

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

describe('Card Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Card Creation Flow', () => {
    it('should create new card with complete data', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} folderId={5} />
      );

      // Fill in all fields
      fireEvent.changeText(getByPlaceholderText('例: hello'), 'goodbye');
      fireEvent.changeText(getByPlaceholderText('例: həˈloʊ'), 'ɡʊdˈbaɪ');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'さようなら');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'さようなら');
      fireEvent.changeText(getByPlaceholderText('例: よく使われる挨拶の言葉'), 'farewell greeting');

      // Save the card
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          word: 'goodbye',
          wordPronunciation: 'ɡʊdˈbaɪ',
          translation: 'さようなら',
          translationPronunciation: 'さようなら',
          memo: 'farewell greeting',
          folderId: 5,
        });
      });
    });

    it('should create card with minimal required data', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} />
      );

      // Fill only required fields
      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      // Save the card
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

    it('should handle validation errors during creation', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} />
      );

      // Try to save without filling required fields
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(getByText('単語は必須です')).toBeTruthy();
        expect(getByText('翻訳は必須です')).toBeTruthy();
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} />
      );

      // Fill required fields
      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');

      // Try to save
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          '単語カードの保存に失敗しました。もう一度お試しください。'
        );
      });
    });
  });

  describe('Card Editing Flow', () => {
    it('should edit existing card', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByDisplayValue, getByText } = render(
        <CardEditor flashcard={mockFlashcard} onSave={onSave} onCancel={onCancel} />
      );

      // Modify the word
      fireEvent.changeText(getByDisplayValue('hello'), 'hi');

      // Save changes
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

    it('should detect unsaved changes when cancelling', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByDisplayValue, getByText } = render(
        <CardEditor flashcard={mockFlashcard} onSave={onSave} onCancel={onCancel} />
      );

      // Make changes
      fireEvent.changeText(getByDisplayValue('hello'), 'hi');

      // Try to cancel
      fireEvent.press(getByText('キャンセル'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '確認',
        '変更が保存されていません。破棄しますか？',
        expect.any(Array)
      );
    });

    it('should allow cancelling without changes', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByText } = render(
        <CardEditor flashcard={mockFlashcard} onSave={onSave} onCancel={onCancel} />
      );

      // Cancel without making changes
      fireEvent.press(getByText('キャンセル'));

      expect(onCancel).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Card Deletion Flow', () => {
    it('should delete card after confirmation', async () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      // Open delete dialog
      fireEvent.press(getByText('🗑️ 削除'));

      // Confirm deletion
      fireEvent.press(getByText('削除'));

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith(mockFlashcard);
      });
    });

    it('should cancel deletion when user cancels', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();

      const { getByText, queryByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      // Open delete dialog
      fireEvent.press(getByText('🗑️ 削除'));
      expect(getByText('単語カードを削除')).toBeTruthy();

      // Cancel deletion
      fireEvent.press(getByText('キャンセル'));

      // Dialog should be closed
      expect(queryByText('単語カードを削除')).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));

      const { getByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      // Open delete dialog and confirm
      fireEvent.press(getByText('🗑️ 削除'));
      fireEvent.press(getByText('削除'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          '単語カードの削除に失敗しました。もう一度お試しください。'
        );
      });
    });

    it('should show loading state during deletion', async () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      // Open delete dialog and confirm
      fireEvent.press(getByText('🗑️ 削除'));
      fireEvent.press(getByText('削除'));

      expect(getByText('削除中...')).toBeTruthy();
    });
  });

  describe('Card Actions Integration', () => {
    it('should trigger edit action', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();

      const { getByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      fireEvent.press(getByText('✏️ 編集'));
      expect(onEdit).toHaveBeenCalledWith(mockFlashcard);
    });

    it('should trigger move action when available', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onMove = jest.fn();

      const { getByText } = render(
        <CardActions 
          flashcard={mockFlashcard} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onMove={onMove}
        />
      );

      fireEvent.press(getByText('📁 移動'));
      expect(onMove).toHaveBeenCalledWith(mockFlashcard);
    });

    it('should display card information correctly', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();

      const { getByText } = render(
        <CardActions flashcard={mockFlashcard} onEdit={onEdit} onDelete={onDelete} />
      );

      expect(getByText('hello')).toBeTruthy();
      expect(getByText('こんにちは')).toBeTruthy();
      expect(getByText('This is a greeting')).toBeTruthy();
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate and clear errors dynamically', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText, queryByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} />
      );

      // Trigger validation
      fireEvent.press(getByText('保存'));
      await waitFor(() => {
        expect(getByText('単語は必須です')).toBeTruthy();
      });

      // Start typing to clear error
      fireEvent.changeText(getByPlaceholderText('例: hello'), 'test');
      expect(queryByText('単語は必須です')).toBeNull();

      // Fill translation and save
      fireEvent.changeText(getByPlaceholderText('例: こんにちは'), 'テスト');
      fireEvent.press(getByText('保存'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should handle whitespace trimming', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <CardEditor onSave={onSave} onCancel={onCancel} />
      );

      // Enter data with whitespace
      fireEvent.changeText(getByPlaceholderText('例: hello'), '  hello  ');
      fireEvent.changeText(getByPlaceholderText('例: həˈloʊ'), '  ');
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
  });
});