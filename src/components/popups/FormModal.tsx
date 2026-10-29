import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { BaseModal, BaseModalProps } from './BaseModal';
import { AlertCircleIcon, CheckCircle2Icon } from './LucideIcons';

export type FormModalProps = Omit<BaseModalProps, 'children' | 'footer'> & {
  children: React.ReactNode;
  onSave?: () => void | Promise<void>;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  footerExtra?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  saveButtonColor?: string;
};

export function FormModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  variant = 'auto',
  maxWidth = 540,
  maxHeightPercent = 90,
  children,
  onSave,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  isSaving = false,
  isSaveDisabled = false,
  errorMessage,
  successMessage,
  footerExtra,
  contentContainerStyle,
  saveButtonColor = '#064E3B',
  ...rest
}: FormModalProps) {
  const isSubmitDisabled = isSaving || isSaveDisabled;

  const footer = (
    <View style={styles.footerContainer}>
      {footerExtra}

      <View style={styles.actionButtons}>
        {cancelLabel ? (
          <Pressable
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
              isSaving && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        ) : null}

        {onSave ? (
          <Pressable
            accessibilityLabel={saveLabel}
            accessibilityRole="button"
            disabled={isSubmitDisabled}
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: saveButtonColor },
              pressed && styles.buttonPressed,
              isSubmitDisabled && styles.saveButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveText}>{saveLabel}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <BaseModal
      footer={footer}
      icon={icon}
      maxHeightPercent={maxHeightPercent}
      maxWidth={maxWidth}
      onClose={isSaving ? () => { } : onClose}
      scrollable
      subtitle={subtitle}
      title={title}
      variant={variant}
      visible={visible}
      contentContainerStyle={[styles.formContent, contentContainerStyle]}
      {...rest}
    >
      {/* Inline Error Banner */}
      {errorMessage ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <AlertCircleIcon size={18} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Inline Success Banner */}
      {successMessage ? (
        <View accessibilityRole="alert" style={styles.successBanner}>
          <CheckCircle2Icon size={18} color="#15803D" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {children}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  formContent: {
    gap: 16,
    padding: 20,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#DC2626',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successText: {
    color: '#15803D',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  footerContainer: {
    gap: 12,
  },
  actionButtons: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 110,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  cancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    elevation: 3,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 130,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  saveButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
