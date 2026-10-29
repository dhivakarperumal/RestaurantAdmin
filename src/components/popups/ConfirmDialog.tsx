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
  XIcon,
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
  const type = variantType || (isDestructive ? 'danger' : 'info');

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

  const getConfirmBgColor = () => {
    switch (type) {
      case 'danger':
        return '#DC2626';
      case 'warning':
        return '#D97706';
      case 'success':
        return '#15803D';
      case 'info':
      default:
        return '#116C0B';
    }
  };

  return (
    <BaseModal
      closeOnBackdropPress={!isLoading}
      maxWidth={maxWidth}
      onClose={isLoading ? () => {} : onClose}
      showCloseButton={false}
      variant="center"
      visible={visible}
      containerStyle={styles.dialogContainer}
    >
      <View style={styles.dialogBody}>
        {!isLoading ? (
          <View style={styles.closeButtonRow}>
            <Pressable
              accessibilityLabel="Close dialog"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <XIcon size={18} color="#64748B" />
            </Pressable>
          </View>
        ) : null}

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
        <View
          className="w-full flex-row items-center justify-between gap-3 mt-5"
          style={styles.buttonRow}
        >
          <Pressable
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onClose}
            className="flex-1 h-12 min-h-[48px] flex-row items-center justify-center rounded-2xl border border-slate-300 bg-white active:bg-slate-100"
            style={styles.cancelButton}
          >
            <Text
              className="text-sm font-bold text-slate-700"
              style={styles.cancelText}
            >
              {cancelLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={confirmLabel}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onConfirm}
            className={`flex-1 h-12 min-h-[48px] flex-row items-center justify-center rounded-2xl active:opacity-90 ${
              type === 'danger'
                ? 'bg-[#DC2626]'
                : type === 'warning'
                ? 'bg-[#D97706]'
                : type === 'success'
                ? 'bg-[#15803D]'
                : 'bg-[#116C0B]'
            } ${isLoading ? 'opacity-60' : ''}`}
            style={[
              styles.confirmButton,
              { backgroundColor: getConfirmBgColor() },
              isLoading && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                className="text-sm font-bold text-white"
                style={styles.confirmText}
              >
                {confirmLabel}
              </Text>
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
    width: '100%',
  },
  dialogBody: {
    alignItems: 'center',
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  closeButtonRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonPressed: {
    backgroundColor: '#E2E8F0',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1.5,
    height: 60,
    justifyContent: 'center',
    marginBottom: 14,
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
    marginTop: 8,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 5,
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
    marginTop: 8,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    height: 48,
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
    flex: 1,
    height: 48,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
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
