import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XIcon,
} from './LucideIcons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastNotificationProps = {
  visible: boolean;
  onDismiss: () => void;
  type?: ToastType;
  title?: string;
  message: string;
  durationMs?: number; // default 4000
  position?: 'top' | 'bottom';
};

export function ToastNotification({
  visible,
  onDismiss,
  type = 'info',
  title,
  message,
  durationMs = 4000,
  position = 'top',
}: ToastNotificationProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(position === 'top' ? -100 : 100);
      opacity.setValue(0);
    }
  }, [visible, durationMs, position, translateY, opacity]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#F0FDF4',
          border: '#BBF7D0',
          text: '#166534',
          titleColor: '#14532D',
          icon: <CheckCircle2Icon size={20} color="#15803D" />,
        };
      case 'error':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#991B1B',
          titleColor: '#7F1D1D',
          icon: <AlertCircleIcon size={20} color="#DC2626" />,
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
          titleColor: '#78350F',
          icon: <AlertTriangleIcon size={20} color="#D97706" />,
        };
      case 'info':
      default:
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          text: '#1E40AF',
          titleColor: '#1E3A8A',
          icon: <InfoIcon size={20} color="#2563EB" />,
        };
    }
  };

  const theme = getTheme();
  const topOffset = Math.max(insets.top, 16) + 10;
  const bottomOffset = Math.max(insets.bottom, 16) + 10;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        position === 'top' ? { top: topOffset } : { bottom: bottomOffset },
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        accessibilityRole="alert"
        style={[
          styles.toastCard,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.iconContainer}>{theme.icon}</View>

        <View style={styles.textContainer}>
          {title ? (
            <Text style={[styles.title, { color: theme.titleColor }]}>
              {title}
            </Text>
          ) : null}
          <Text style={[styles.message, { color: theme.text }]}>
            {message}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleDismiss}
          style={styles.closeButton}
        >
          <XIcon size={16} color="#64748B" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    left: 20,
    position: 'absolute',
    right: 20,
    zIndex: 99999,
  },
  toastCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: '100%',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
});
