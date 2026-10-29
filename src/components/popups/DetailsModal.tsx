import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { BaseModal, BaseModalProps } from './BaseModal';

export type DetailsModalProps = Omit<BaseModalProps, 'children'> & {
  children: React.ReactNode;
  badge?: {
    label: string;
    bg?: string;
    text?: string;
    border?: string;
  };
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function DetailsModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  variant = 'auto',
  maxWidth = 580,
  maxHeightPercent = 92,
  children,
  footer,
  contentContainerStyle,
  ...rest
}: DetailsModalProps) {
  const headerRight = badge ? (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badge.bg || '#F0FDF4',
          borderColor: badge.border || '#DCFCE7',
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: badge.text || '#15803D' },
        ]}
      >
        {badge.label}
      </Text>
    </View>
  ) : undefined;

  return (
    <BaseModal
      footer={footer}
      headerRight={headerRight}
      icon={icon}
      maxHeightPercent={maxHeightPercent}
      maxWidth={maxWidth}
      onClose={onClose}
      scrollable
      subtitle={subtitle}
      title={title}
      variant={variant}
      visible={visible}
      contentContainerStyle={[styles.detailsContent, contentContainerStyle]}
      {...rest}
    >
      {children}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  detailsContent: {
    gap: 16,
    padding: 20,
  },
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
