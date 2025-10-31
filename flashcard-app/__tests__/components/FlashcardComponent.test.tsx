import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlashcardComponent } from '@/components/FlashcardComponent';
import { Flashcard } from '@/types';

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => '0deg'),
      })),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  };
});

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

describe('FlashcardComponent', () => {
  it('should render flashcard with word on front', () => {
    const { getByText } = render(
      <FlashcardComponent flashcard={mockFlashcard} />
    );

    expect(getByText('hello')).toBeTruthy();
    expect(getByText('/həˈloʊ/')).toBeTruthy();
    expect(getByText('表面')).toBeTruthy();
  });

  it('should render translation on back after flip', () => {
    const { getByText } = render(
      <FlashcardComponent flashcard={mockFlashcard} />
    );

    // Initially should show front
    expect(getByText('hello')).toBeTruthy();
    
    // The back content is also rendered but hidden by animation
    expect(getByText('こんにちは')).toBeTruthy();
    expect(getByText('裏面')).toBeTruthy();
  });

  it('should show memo button when memo exists', () => {
    const { getByText } = render(
      <FlashcardComponent flashcard={mockFlashcard} />
    );

    expect(getByText('📝 メモ')).toBeTruthy();
  });

  it('should not show memo button when memo does not exist', () => {
    const flashcardWithoutMemo = { ...mockFlashcard, memo: undefined };
    const { queryByText } = render(
      <FlashcardComponent flashcard={flashcardWithoutMemo} />
    );

    expect(queryByText('📝 メモ')).toBeNull();
  });

  it('should not show memo button when showMemoButton is false', () => {
    const { queryByText } = render(
      <FlashcardComponent 
        flashcard={mockFlashcard} 
        showMemoButton={false}
      />
    );

    expect(queryByText('📝 メモ')).toBeNull();
  });

  it('should call onMemoPress when memo button is pressed', () => {
    const onMemoPress = jest.fn();
    const { getByText } = render(
      <FlashcardComponent 
        flashcard={mockFlashcard} 
        onMemoPress={onMemoPress}
      />
    );

    fireEvent.press(getByText('📝 メモ'));
    expect(onMemoPress).toHaveBeenCalledTimes(1);
  });

  it('should handle flashcard without pronunciation', () => {
    const flashcardNoPronunciation = {
      ...mockFlashcard,
      wordPronunciation: undefined,
      translationPronunciation: undefined,
    };

    const { queryByText } = render(
      <FlashcardComponent flashcard={flashcardNoPronunciation} />
    );

    expect(queryByText('/həˈloʊ/')).toBeNull();
    expect(queryByText('/こんにちは/')).toBeNull();
    expect(getByText('hello')).toBeTruthy();
    expect(getByText('こんにちは')).toBeTruthy();
  });

  it('should update flip hint text based on current side', () => {
    const { getByText } = render(
      <FlashcardComponent flashcard={mockFlashcard} />
    );

    // Initially should show hint to flip to back
    expect(getByText('タップして裏面を表示')).toBeTruthy();
  });

  it('should handle card flip interaction', () => {
    const { getByText } = render(
      <FlashcardComponent flashcard={mockFlashcard} />
    );

    const flipHint = getByText('タップして裏面を表示');
    fireEvent.press(flipHint);

    // Animation should be triggered (mocked)
    expect(require('react-native').Animated.timing).toHaveBeenCalled();
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <FlashcardComponent 
        flashcard={mockFlashcard} 
        style={customStyle}
        testID="flashcard-container"
      />
    );

    // Note: Testing style application would require more complex setup
    // This is a placeholder for style testing
  });

  it('should handle long text content', () => {
    const longTextFlashcard = {
      ...mockFlashcard,
      word: 'This is a very long word that might overflow the card',
      translation: 'これは非常に長い翻訳テキストでカードからはみ出る可能性があります',
    };

    const { getByText } = render(
      <FlashcardComponent flashcard={longTextFlashcard} />
    );

    expect(getByText('This is a very long word that might overflow the card')).toBeTruthy();
    expect(getByText('これは非常に長い翻訳テキストでカードからはみ出る可能性があります')).toBeTruthy();
  });

  it('should handle special characters in content', () => {
    const specialCharFlashcard = {
      ...mockFlashcard,
      word: 'café',
      wordPronunciation: 'kæˈfeɪ',
      translation: 'カフェ',
      translationPronunciation: 'カフェ',
    };

    const { getByText } = render(
      <FlashcardComponent flashcard={specialCharFlashcard} />
    );

    expect(getByText('café')).toBeTruthy();
    expect(getByText('/kæˈfeɪ/')).toBeTruthy();
    expect(getByText('カフェ')).toBeTruthy();
  });
});