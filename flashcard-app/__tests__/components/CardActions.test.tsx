import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CardActions } from '@/components/CardActions';
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

describe('CardActions', () => {
  const defaultProps = {
    flashcard: mockFlashcard,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render flashcard information', () => {
    const { getByText } = render(<CardActions {...defaultProps} />);

    expect(getByText('hello')).toBeTruthy();
    expect(getByText('こんにちは')).toBeTruthy();
    expect(getByText('This is a greeting')).toBeTruthy();
  });

  it('should render flashcard without memo', () => {
    const flashcardWithoutMemo = { ...mockFlashcard, memo: undefined };
    const { getByText, queryByText } = render(
      <CardActions {...defaultProps} flashcard={flashcardWithoutMemo} />
    );

    expect(getByText('hello')).toBeTruthy();
    expect(getByText('こんにちは')).toBeTruthy();
    expect(queryByText('This is a greeting')).toBeNull();
  });

  it('should call onEdit when edit button is pressed', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <CardActions {...defaultProps} onEdit={onEdit} />
    );

    fireEvent.press(getByText('✏️ 編集'));
    expect(onEdit).toHaveBeenCalledWith(mockFlashcard);
  });

  it('should show move button when onMove is provided', () => {
    const onMove = jest.fn();
    const { getByText } = render(
      <CardActions {...defaultProps} onMove={onMove} />
    );

    expect(getByText('📁 移動')).toBeTruthy();
  });

  it('should not show move button when onMove is not provided', () => {
    const { queryByText } = render(<CardActions {...defaultProps} />);

    expect(queryByText('📁 移動')).toBeNull();
  });

  it('should call onMove when move button is pressed', () => {
    const onMove = jest.fn();
    const { getByText } = render(
      <CardActions {...defaultProps} onMove={onMove} />
    );

    fireEvent.press(getByText('📁 移動'));
    expect(onMove).toHaveBeenCalledWith(mockFlashcard);
  });

  it('should show delete confirmation dialog when delete button is pressed', () => {
    const { getByText } = render(<CardActions {...defaultProps} />);

    fireEvent.press(getByText('🗑️ 削除'));

    expect(getByText('単語カードを削除')).toBeTruthy();
    expect(getByText('「hello」を削除しますか？\nこの操作は取り消せません。')).toBeTruthy();
  });

  it('should call onDelete when deletion is confirmed', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <CardActions {...defaultProps} onDelete={onDelete} />
    );

    // Open delete dialog
    fireEvent.press(getByText('🗑️ 削除'));

    // Confirm deletion
    fireEvent.press(getByText('削除'));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(mockFlashcard);
    });
  });

  it('should close dialog when deletion is cancelled', () => {
    const { getByText, queryByText } = render(<CardActions {...defaultProps} />);

    // Open delete dialog
    fireEvent.press(getByText('🗑️ 削除'));
    expect(getByText('単語カードを削除')).toBeTruthy();

    // Cancel deletion
    fireEvent.press(getByText('キャンセル'));

    // Dialog should be closed
    expect(queryByText('単語カードを削除')).toBeNull();
  });

  it('should show error alert when deletion fails', async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
    const { getByText } = render(
      <CardActions {...defaultProps} onDelete={onDelete} />
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
    const onDelete = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { getByText } = render(
      <CardActions {...defaultProps} onDelete={onDelete} />
    );

    // Open delete dialog and confirm
    fireEvent.press(getByText('🗑️ 削除'));
    fireEvent.press(getByText('削除'));

    expect(getByText('削除中...')).toBeTruthy();
  });

  it('should handle long text content', () => {
    const longTextFlashcard = {
      ...mockFlashcard,
      word: 'This is a very long word that should be truncated',
      translation: 'これは非常に長い翻訳テキストで切り詰められるべきです',
      memo: 'This is a very long memo that should be truncated after two lines. '.repeat(5),
    };

    const { getByText } = render(
      <CardActions {...defaultProps} flashcard={longTextFlashcard} />
    );

    expect(getByText('This is a very long word that should be truncated')).toBeTruthy();
    expect(getByText('これは非常に長い翻訳テキストで切り詰められるべきです')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <CardActions 
        {...defaultProps} 
        style={customStyle}
        testID="card-actions"
      />
    );

    // Note: Testing style application would require more complex setup
    // This is a placeholder for style testing
  });

  it('should handle special characters in flashcard content', () => {
    const specialCharFlashcard = {
      ...mockFlashcard,
      word: 'café & résumé',
      translation: 'カフェ & 履歴書',
      memo: 'Special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./',
    };

    const { getByText } = render(
      <CardActions {...defaultProps} flashcard={specialCharFlashcard} />
    );

    expect(getByText('café & résumé')).toBeTruthy();
    expect(getByText('カフェ & 履歴書')).toBeTruthy();
    expect(getByText('Special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./')).toBeTruthy();
  });
});