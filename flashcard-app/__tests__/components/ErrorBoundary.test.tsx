// ErrorBoundary component tests

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { Text } from 'react-native';

// Mock ErrorService
jest.mock('../../src/services/ErrorService', () => ({
  ErrorService: {
    getInstance: () => ({
      logUnhandledError: jest.fn(),
    }),
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('renders error UI when child component throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('予期しないエラーが発生しました')).toBeTruthy();
    expect(getByText('再試行')).toBeTruthy();
    expect(getByText('アプリを再読み込み')).toBeTruthy();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('resets error state when retry button is pressed', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(getByText('予期しないエラーが発生しました')).toBeTruthy();

    // Press retry button
    fireEvent.press(getByText('再試行'));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show normal content
    expect(getByText('No error')).toBeTruthy();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = (error: Error) => (
      <Text>Custom error: {error.message}</Text>
    );

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error: Test error')).toBeTruthy();
  });

  it('shows debug information in development mode', () => {
    // Mock __DEV__ to be true
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('デバッグ情報:')).toBeTruthy();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  it('hides debug information in production mode', () => {
    // Mock __DEV__ to be false
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('デバッグ情報:')).toBeNull();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });
});