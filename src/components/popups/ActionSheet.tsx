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
      className="h-12 w-full flex-row items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 active:bg-slate-100"
      style={styles.cancelButton}
    >
      <Text className="text-sm font-bold text-slate-700" style={styles.cancelText}>
        {cancelLabel}
      </Text>
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
              {index > 0 && (
                <View className="my-1 h-px w-full bg-slate-100" style={styles.separator} />
              )}
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
                className={`w-full flex-row items-center min-h-[56px] px-3.5 py-3 rounded-2xl active:bg-slate-100 ${
                  isSelected ? 'bg-emerald-50' : 'bg-transparent'
                } ${action.disabled ? 'opacity-40' : ''}`}
                style={[
                  styles.actionItem,
                  isSelected && styles.actionItemSelected,
                  action.disabled && styles.actionItemDisabled,
                ]}
              >
                {action.icon ? (
                  <View
                    className={`mr-3.5 h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isDestructive
                        ? 'bg-red-50'
                        : isSelected
                        ? 'bg-emerald-100'
                        : 'bg-slate-100'
                    }`}
                    style={[
                      styles.actionIconContainer,
                      isDestructive && styles.destructiveIconContainer,
                      isSelected && styles.selectedIconContainer,
                    ]}
                  >
                    {action.icon}
                  </View>
                ) : null}

                <View className="flex-1" style={styles.actionTextColumn}>
                  <Text
                    className={`text-[15px] font-bold ${
                      isDestructive
                        ? 'text-red-600'
                        : isSelected
                        ? 'text-emerald-800'
                        : 'text-slate-900'
                    }`}
                    style={[
                      styles.actionLabel,
                      isDestructive && styles.destructiveLabel,
                      isSelected && styles.selectedLabel,
                    ]}
                  >
                    {action.label}
                  </Text>
                  {action.description ? (
                    <Text
                      className="mt-0.5 text-xs font-medium text-slate-500"
                      style={styles.actionDescription}
                    >
                      {action.description}
                    </Text>
                  ) : null}
                </View>

                {action.badge ? (
                  <View
                    className={`ml-2 rounded-lg px-2 py-0.5 ${
                      isSelected ? 'bg-emerald-200' : 'bg-slate-100'
                    }`}
                    style={[
                      styles.badgeContainer,
                      isSelected && styles.selectedBadgeContainer,
                    ]}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        isSelected ? 'text-emerald-900' : 'text-slate-600'
                      }`}
                      style={[
                        styles.badgeText,
                        isSelected && styles.selectedBadgeText,
                      ]}
                    >
                      {action.badge}
                    </Text>
                  </View>
                ) : null}

                <View className="ml-2">
                  <Text className="text-base font-bold text-slate-300">›</Text>
                </View>
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
