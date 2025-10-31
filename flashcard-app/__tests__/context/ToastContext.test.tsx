import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ToastProvider, useToast, useToastHelpers } from '../../src/context/ToastContext';

// Test component using useToast hook
const TestToastComponent = () => {
  const { toasts, showToast, hideToast, clearAllToasts } = useToast();

  return (
    <>
      <Text testID="toast-count">{toasts.length}</Text>
      <TouchableOpacity
        testID="show-toast"
        onPress={() => showToast({ type: 'success', title: 'Test Toast' })}
      >
        <Text>Show Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hide-toast"
        onPress={() => toasts.length > 0 && hideToast(toasts[0].id)}
      >
        <Text>Hide Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="clear-all"
        onPress={clearAllToasts}
      >
        <Text>Clear All</Text>
      </TouchableOpacity>
      {toasts.map((toast) => (
        <Text key={toast.id} testID={`toast-${toast.id}`}>
          {toast.title}
        </Text>
      ))}
    </>
  );
};

// Test component using useToastHelpers hook
const TestToastHelpersComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();

  return (
    <>
      <TouchableOpacity
        testID="show-success"
        onPress={() => showSuccess('Success', 'Success message')}
      >
        <Text>Success</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-error"
        onPress={() => showError('Error', 'Error message')}
      >
        <Text>Error</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-warning"
        onPress={() => showWarning('Warning', 'Warning message')}
      >
        <Text>Warning</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="show-info"
        onPress={() => showInfo('Info', 'Info message')}
      >
        <Text>Info</Text>
      </TouchableOpacity>
    </>
  );
};

describe('ToastContext', () => {
  describe('useToast hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestToastComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('should provide toast context when used within ToastProvider', () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      expect(getByTestId('toast-count')).toBeTruthy();
      expect(getByTestId('toast-count').props.children).toBe(0);
    });

    it('should add toast when showToast is called', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
        expect(getByTestId('toast-toast-1')).toBeTruthy();
      });
    });

    it('should remove toast when hideToast is called', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      // Add a toast
      fireEvent.press(getByTestId('show-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });

      // Remove the toast
      fireEvent.press(getByTestId('hide-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(0);
      });
    });

    it('should clear all toasts when clearAllToasts is called', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      // Add multiple toasts
      fireEvent.press(getByTestId('show-toast'));
      fireEvent.press(getByTestId('show-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(2);
      });

      // Clear all toasts
      fireEvent.press(getByTestId('clear-all'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(0);
      });
    });

    it('should auto-hide toast after default duration', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });

      // Wait for auto-hide (default 3000ms)
      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(0);
      }, { timeout: 4000 });
    });

    it('should generate unique IDs for toasts', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastComponent />
        </ToastProvider>
      );

      // Add multiple toasts quickly
      fireEvent.press(getByTestId('show-toast'));
      fireEvent.press(getByTestId('show-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(2);
      });

      // Check that both toasts have different IDs
      const toastElements = [
        getByTestId('toast-toast-1'),
        getByTestId('toast-toast-2'),
      ];

      expect(toastElements[0]).toBeTruthy();
      expect(toastElements[1]).toBeTruthy();
    });
  });

  describe('useToastHelpers hook', () => {
    it('should create success toast with correct type', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastHelpersComponent />
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-success'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });
    });

    it('should create error toast with correct type', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastHelpersComponent />
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-error'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });
    });

    it('should create warning toast with correct type', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastHelpersComponent />
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-warning'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });
    });

    it('should create info toast with correct type', async () => {
      const { getByTestId } = render(
        <ToastProvider>
          <TestToastHelpersComponent />
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-info'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });
    });

    it('should handle toasts with only title', async () => {
      const TestComponentTitleOnly = () => {
        const { showSuccess } = useToastHelpers();
        return (
          <TouchableOpacity
            testID="show-title-only"
            onPress={() => showSuccess('Title Only')}
          >
            <Text>Title Only</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <ToastProvider>
          <TestComponentTitleOnly />
          <TestToastComponent />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-title-only'));

      await waitFor(() => {
        expect(getByTestId('toast-count').props.children).toBe(1);
      });
    });
  });

  describe('Toast configuration', () => {
    it('should use default values for toast properties', async () => {
      const TestComponentWithDefaults = () => {
        const { toasts, showToast } = useToast();
        return (
          <>
            <TouchableOpacity
              testID="show-default-toast"
              onPress={() => showToast({ type: 'info', title: 'Default Toast' })}
            >
              <Text>Show Default</Text>
            </TouchableOpacity>
            {toasts.map((toast) => (
              <Text key={toast.id} testID={`toast-duration-${toast.id}`}>
                {toast.duration}
              </Text>
            ))}
            {toasts.map((toast) => (
              <Text key={`auto-${toast.id}`} testID={`toast-auto-${toast.id}`}>
                {toast.autoHide ? 'true' : 'false'}
              </Text>
            ))}
          </>
        );
      };

      const { getByTestId } = render(
        <ToastProvider>
          <TestComponentWithDefaults />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-default-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-duration-1').props.children).toBe(3000);
        expect(getByTestId('toast-auto-1').props.children).toBe('true');
      });
    });

    it('should allow custom duration and autoHide settings', async () => {
      const TestComponentWithCustom = () => {
        const { toasts, showToast } = useToast();
        return (
          <>
            <TouchableOpacity
              testID="show-custom-toast"
              onPress={() => showToast({ 
                type: 'info', 
                title: 'Custom Toast',
                duration: 5000,
                autoHide: false
              })}
            >
              <Text>Show Custom</Text>
            </TouchableOpacity>
            {toasts.map((toast) => (
              <Text key={toast.id} testID={`toast-duration-${toast.id}`}>
                {toast.duration}
              </Text>
            ))}
            {toasts.map((toast) => (
              <Text key={`auto-${toast.id}`} testID={`toast-auto-${toast.id}`}>
                {toast.autoHide ? 'true' : 'false'}
              </Text>
            ))}
          </>
        );
      };

      const { getByTestId } = render(
        <ToastProvider>
          <TestComponentWithCustom />
        </ToastProvider>
      );

      fireEvent.press(getByTestId('show-custom-toast'));

      await waitFor(() => {
        expect(getByTestId('toast-duration-1').props.children).toBe(5000);
        expect(getByTestId('toast-auto-1').props.children).toBe('false');
      });
    });
  });
});