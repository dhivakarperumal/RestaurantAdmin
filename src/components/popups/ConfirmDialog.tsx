import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BaseModal } from './BaseModal';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  Trash2Icon,
} from './LucideIcons';

export type ConfirmDialogProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  variantType?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  errorMessage?: string | null;
  maxWidth?: number;
};

export function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  variantType,
  isLoading = false,
  errorMessage,
  maxWidth = 440,
}: ConfirmDialogProps) {
  const type =
    variantType || (isDestructive ? 'danger' : 'info');

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2Icon size={26} color="#DC2626" />;
      case 'warning':
        return <AlertTriangleIcon size={26} color="#D97706" />;
      case 'success':
        return <CheckCircle2Icon size={26} color="#15803D" />;
      case 'info':
      default:
        return <InfoIcon size={26} color="#2563EB" />;
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case 'danger':
        return { backgroundColor: '#FEE2E2', borderColor: '#FECACA' };
      case 'warning':
        return { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' };
      case 'success':
        return { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' };
      case 'info':
      default:
        return { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' };
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return { backgroundColor: '#DC2626' };
      case 'warning':
        return { backgroundColor: '#D97706' };
      case 'success':
        return { backgroundColor: '#15803D' };
      case 'info':
      default:
        return { backgroundColor: '#116C0B' };
    }
  };

  return (
    <BaseModal
      closeOnBackdropPress={!isLoading}
      maxWidth={maxWidth}
      onClose={isLoading ? () => {} : onClose}
      showCloseButton={!isLoading}
      variant="center"
      visible={visible}
      containerStyle={styles.dialogContainer}
    >
      <View style={styles.dialogBody}>
        {/* Prominent Circular Icon Badge */}
        <View style={[styles.iconBadge, getBadgeStyle()]}>{getIcon()}</View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Item Name Pill */}
        {itemName ? (
          <View style={styles.itemPill}>
            <Text numberOfLines={2} style={styles.itemText}>
              “{itemName}”
            </Text>
          </View>
        ) : null}

        {/* Message */}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {/* Error Alert */}
        {errorMessage ? (
          <View accessibilityRole="alert" style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={confirmLabel}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmButton,
              getConfirmButtonStyle(),
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  dialogContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  dialogBody: {
    alignItems: 'center',
    padding: 24,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1.5,
    height: 60,
    justifyContent: 'center',
    marginBottom: 16,
    width: 60,
  },
  title: {
    color: '#012711',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  itemPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  itemText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: 14,
    elevation: 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
