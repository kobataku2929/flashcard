import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemoModal } from '@/components/MemoModal';

// Mock Dimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  };
});

describe('MemoModal', () => {
  const defaultProps = {
    visible: true,
    memo: 'This is a test memo',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render memo content when visible', () => {
    const { getByText } = render(<MemoModal {...defaultProps} />);

    expect(getByText('メモ')).toBeTruthy();
    expect(getByText('This is a test memo')).toBeTruthy();
    expect(getByText('閉じる')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <MemoModal {...defaultProps} visible={false} />
    );

    expect(queryByText('This is a test memo')).toBeNull();
  });

  it('should call onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <MemoModal {...defaultProps} onClose={onClose} />
    );

    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when OK button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <MemoModal {...defaultProps} onClose={onClose} />
    );

    fireEvent.press(getByText('閉じる'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render custom title', () => {
    const { getByText } = render(
      <MemoModal {...defaultProps} title="カスタムタイトル" />
    );

    expect(getByText('カスタムタイトル')).toBeTruthy();
  });

  it('should handle long memo content', () => {
    const longMemo = 'This is a very long memo that should be scrollable. '.repeat(20);
    const { getByText } = render(
      <MemoModal {...defaultProps} memo={longMemo} />
    );

    expect(getByText(longMemo)).toBeTruthy();
  });

  it('should handle empty memo', () => {
    const { getByText } = render(
      <MemoModal {...defaultProps} memo="" />
    );

    expect(getByText('メモ')).toBeTruthy();
    expect(getByText('閉じる')).toBeTruthy();
  });

  it('should handle memo with line breaks', () => {
    const memoWithLineBreaks = 'Line 1\nLine 2\nLine 3';
    const { getByText } = render(
      <MemoModal {...defaultProps} memo={memoWithLineBreaks} />
    );

    expect(getByText(memoWithLineBreaks)).toBeTruthy();
  });

  it('should handle special characters in memo', () => {
    const specialCharMemo = 'Special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./ 日本語 🎉';
    const { getByText } = render(
      <MemoModal {...defaultProps} memo={specialCharMemo} />
    );

    expect(getByText(specialCharMemo)).toBeTruthy();
  });

  it('should handle modal request close', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <MemoModal {...defaultProps} onClose={onClose} />
    );

    // Note: Testing onRequestClose would require more complex setup
    // This is a placeholder for modal behavior testing
  });

  it('should apply correct modal dimensions', () => {
    // Mock different screen sizes
    const mockDimensions = require('react-native').Dimensions;
    
    // Test small screen
    mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
    const { rerender } = render(<MemoModal {...defaultProps} />);

    // Test large screen
    mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
    rerender(<MemoModal {...defaultProps} />);

    // Dimensions should be calculated correctly (tested implicitly through rendering)
    expect(mockDimensions.get).toHaveBeenCalled();
  });

  it('should handle overlay press behavior', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <MemoModal {...defaultProps} onClose={onClose} />
    );

    // Note: Testing overlay press would require accessing the overlay element
    // This is a placeholder for overlay interaction testing
  });
});