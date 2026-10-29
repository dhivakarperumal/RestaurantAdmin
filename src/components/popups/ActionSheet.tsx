import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BaseModal } from './BaseModal';

export type ActionItem = {
  id?: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  badge?: string;
  selected?: boolean;
};

export type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: ActionItem[];
  cancelLabel?: string;
  maxWidth?: number;
  variant?: 'auto' | 'bottom-sheet' | 'center';
};

export function ActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
  cancelLabel = 'Cancel',
  maxWidth = 480,
  variant = 'auto',
}: ActionSheetProps) {
  const footer = cancelLabel ? (
    <Pressable
      accessibilityLabel={cancelLabel}
      accessibilityRole="button"
      onPress={onClose}
      style={({ pressed }) => [
        styles.cancelButton,
        pressed && styles.cancelButtonPressed,
      ]}
    >
      <Text style={styles.cancelText}>{cancelLabel}</Text>
    </Pressable>
  ) : null;

  return (
    <BaseModal
      footer={footer}
      maxWidth={maxWidth}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      variant={variant}
      visible={visible}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.actionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {actions.map((action, index) => {
          const isDestructive = Boolean(action.destructive);
          const isSelected = Boolean(action.selected);

          return (
            <React.Fragment key={action.id || `${action.label}-${index}`}>
              {index > 0 && <View style={styles.separator} />}
              <Pressable
                accessibilityLabel={action.label}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: action.disabled,
                  selected: isSelected,
                }}
                disabled={action.disabled}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  isSelected && styles.actionItemSelected,
                  pressed && styles.actionItemPressed,
                  action.disabled && styles.actionItemDisabled,
                ]}
              >
                {action.icon ? (
                  <View
                    style={[
                      styles.actionIconContainer,
                      isDestructive && styles.destructiveIconContainer,
                      isSelected && styles.selectedIconContainer,
                    ]}
                  >
                    {action.icon}
                  </View>
                ) : null}

                <View style={styles.actionTextColumn}>
                  <Text
                    style={[
                      styles.actionLabel,
                      isDestructive && styles.destructiveLabel,
                      isSelected && styles.selectedLabel,
                    ]}
                  >
                    {action.label}
                  </Text>
                  {action.description ? (
                    <Text style={styles.actionDescription}>
                      {action.description}
                    </Text>
                  ) : null}
                </View>

                {action.badge ? (
                  <View
                    style={[
                      styles.badgeContainer,
                      isSelected && styles.selectedBadgeContainer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isSelected && styles.selectedBadgeText,
                      ]}
                    >
                      {action.badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionItem: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  actionItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  actionItemDisabled: {
    opacity: 0.45,
  },
  actionIconContainer: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 14,
    width: 38,
  },
  destructiveIconContainer: {
    backgroundColor: '#FEF2F2',
  },
  selectedIconContainer: {
    backgroundColor: '#DCFCE7',
  },
  actionTextColumn: {
    flex: 1,
  },
  actionLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveLabel: {
    color: '#DC2626',
  },
  selectedLabel: {
    color: '#116C0B',
  },
  actionDescription: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeContainer: {
    backgroundColor: '#BBF7D0',
  },
  badgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedBadgeText: {
    color: '#15803D',
  },
  separator: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginHorizontal: 12,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
