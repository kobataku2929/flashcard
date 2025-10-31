import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useToast } from '../context/ToastContext';
import { ToastMessage, ToastType } from '../types';

const { width: screenWidth } = Dimensions.get('window');

interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-screenWidth)).current;

  React.useEffect(() => {
    // Slide in and fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleHide = () => {
    // Slide out and fade out animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return styles.successToast;
      case 'error':
        return styles.errorToast;
      case 'warning':
        return styles.warningToast;
      case 'info':
        return styles.infoToast;
      default:
        return styles.infoToast;
    }
  };

  const getIconText = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        getToastStyle(toast.type),
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleHide}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIconText(toast.type)}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message && <Text style={styles.message}>{toast.message}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastContainer: {
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  successToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  warningToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
});