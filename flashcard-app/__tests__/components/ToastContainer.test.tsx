import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TouchableOpacity, Text } from 'react-native';
import { ToastContainer } from '../../src/components/ToastContainer';
import { ToastProvider, useToastHelpers } from '../../src/context/ToastContext';

// Test component to trigger toast notifications
const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();

  return (
    <>
      <TouchableOpacity
        testID="success-button"
        onPress={() => showSuccess('Success Title', 'Success message')}
      >
        <Text>Success</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="error-button"
        onPress={() => showError('Error Title', 'Error message')}
      >
        <Text>Error</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="warning-button"
        onPress={() => showWarning('Warning Title', 'Warning message')}
      >
        <Text>Warning</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="info-button"
        onPress={() => showInfo('Info Title', 'Info message')}
      >
        <Text>Info</Text>
      </TouchableOpacity>
    </>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    {children}
    <ToastContainer />
  </ToastProvider>
);

describe('ToastContainer', () => {
  it('should not render anything when there are no toasts', () => {
    const { queryByTestId } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(queryByTestId('toast-container')).toBeNull();
  });

  it('should display success toast with correct styling', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('success-button'));

    await waitFor(() => {
      expect(getByText('Success Title')).toBeTruthy();
      expect(getByText('Success message')).toBeTruthy();
      expect(getByText('✓')).toBeTruthy();
    });
  });

  it('should display error toast with correct styling', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('error-button'));

    await waitFor(() => {
      expect(getByText('Error Title')).toBeTruthy();
      expect(getByText('Error message')).toBeTruthy();
      expect(getByText('✕')).toBeTruthy();
    });
  });

  it('should display warning toast with correct styling', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('warning-button'));

    await waitFor(() => {
      expect(getByText('Warning Title')).toBeTruthy();
      expect(getByText('Warning message')).toBeTruthy();
      expect(getByText('⚠')).toBeTruthy();
    });
  });

  it('should display info toast with correct styling', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('info-button'));

    await waitFor(() => {
      expect(getByText('Info Title')).toBeTruthy();
      expect(getByText('Info message')).toBeTruthy();
      expect(getByText('ℹ')).toBeTruthy();
    });
  });

  it('should hide toast when tapped', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('success-button'));

    await waitFor(() => {
      expect(getByText('Success Title')).toBeTruthy();
    });

    // Tap the toast to hide it
    fireEvent.press(getByText('Success Title'));

    await waitFor(() => {
      expect(queryByText('Success Title')).toBeNull();
    }, { timeout: 1000 });
  });

  it('should auto-hide toast after specified duration', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('success-button'));

    await waitFor(() => {
      expect(getByText('Success Title')).toBeTruthy();
    });

    // Wait for auto-hide (default 3000ms)
    await waitFor(() => {
      expect(queryByText('Success Title')).toBeNull();
    }, { timeout: 4000 });
  });

  it('should display multiple toasts simultaneously', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('success-button'));
    fireEvent.press(getByTestId('error-button'));

    await waitFor(() => {
      expect(getByText('Success Title')).toBeTruthy();
      expect(getByText('Error Title')).toBeTruthy();
    });
  });

  it('should handle toast without message', async () => {
    const TestComponentWithoutMessage = () => {
      const { showSuccess } = useToastHelpers();
      return (
        <TouchableOpacity
          testID="success-no-message"
          onPress={() => showSuccess('Title Only')}
        >
          <Text>Success No Message</Text>
        </TouchableOpacity>
      );
    };

    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <TestComponentWithoutMessage />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('success-no-message'));

    await waitFor(() => {
      expect(getByText('Title Only')).toBeTruthy();
      // Should not have a message element
      expect(queryByText('undefined')).toBeNull();
    });
  });
});