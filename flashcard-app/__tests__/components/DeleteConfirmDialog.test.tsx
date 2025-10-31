import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

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

describe('DeleteConfirmDialog', () => {
  const defaultProps = {
    visible: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog when visible', () => {
    const { getByText } = render(<DeleteConfirmDialog {...defaultProps} />);

    expect(getByText('Delete Item')).toBeTruthy();
    expect(getByText('Are you sure you want to delete this item?')).toBeTruthy();
    expect(getByText('削除')).toBeTruthy();
    expect(getByText('キャンセル')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <DeleteConfirmDialog {...defaultProps} visible={false} />
    );

    expect(queryByText('Delete Item')).toBeNull();
  });

  it('should call onConfirm when confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />
    );

    fireEvent.press(getByText('削除'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <DeleteConfirmDialog {...defaultProps} onCancel={onCancel} />
    );

    fireEvent.press(getByText('キャンセル'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    const { getByText } = render(
      <DeleteConfirmDialog {...defaultProps} isLoading={true} />
    );

    expect(getByText('削除中...')).toBeTruthy();
  });

  it('should disable buttons when loading', () => {
    const { getByText } = render(
      <DeleteConfirmDialog {...defaultProps} isLoading={true} />
    );

    const confirmButton = getByText('削除中...');
    const cancelButton = getByText('キャンセル');

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should use custom button texts', () => {
    const { getByText } = render(
      <DeleteConfirmDialog 
        {...defaultProps} 
        confirmText="Remove"
        cancelText="Keep"
      />
    );

    expect(getByText('Remove')).toBeTruthy();
    expect(getByText('Keep')).toBeTruthy();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long message that should be displayed properly in the dialog. '.repeat(5);
    const { getByText } = render(
      <DeleteConfirmDialog {...defaultProps} message={longMessage} />
    );

    expect(getByText(longMessage)).toBeTruthy();
  });

  it('should calculate dialog width based on screen size', () => {
    const mockDimensions = require('react-native').Dimensions;
    
    // Test small screen
    mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
    const { rerender } = render(<DeleteConfirmDialog {...defaultProps} />);

    // Test large screen
    mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
    rerender(<DeleteConfirmDialog {...defaultProps} />);

    expect(mockDimensions.get).toHaveBeenCalled();
  });
});