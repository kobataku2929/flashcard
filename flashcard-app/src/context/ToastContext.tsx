// Toast Context for managing toast notifications

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ToastMessage, ToastContextType, ToastType } from '../types';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      duration: 3000,
      autoHide: true,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast if enabled
    if (newToast.autoHide && newToast.duration) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const contextValue: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience functions for common toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    showSuccess: (title: string, message?: string) => 
      showToast({ type: 'success', title, message }),
    
    showError: (title: string, message?: string) => 
      showToast({ type: 'error', title, message }),
    
    showWarning: (title: string, message?: string) => 
      showToast({ type: 'warning', title, message }),
    
    showInfo: (title: string, message?: string) => 
      showToast({ type: 'info', title, message }),
  };
};