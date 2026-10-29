import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XIcon } from './LucideIcons';

export type BaseModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'auto' | 'bottom-sheet' | 'center';
  maxWidth?: number;
  maxHeightPercent?: number; // 0 to 100
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function BaseModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  variant = 'auto',
  maxWidth = 540,
  maxHeightPercent = 90,
  showCloseButton = true,
  closeOnBackdropPress = true,
  headerRight,
  footer,
  scrollable = false,
  avoidKeyboard = true,
  bodyStyle,
  containerStyle,
  contentContainerStyle,
  accessibilityLabel,
}: BaseModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;
  const isCenter = variant === 'center' || (variant === 'auto' && isDesktop);

  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onClose();
          return true;
        },
      );
      return () => {
        backHandler.remove();
      };
    } else {
      backdropAnim.setValue(0);
    }
  }, [visible, onClose, backdropAnim]);

  if (!visible) return null;

  const content = (
    <View
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="none"
      style={[
        isCenter ? styles.centerCard : styles.bottomSheetCard,
        {
          maxWidth: isCenter ? maxWidth : '100%',
          maxHeight: `${maxHeightPercent}%`,
        },
        !isCenter && {
          paddingBottom: Math.max(insets.bottom, 16),
        },
        containerStyle,
      ]}
    >
      {/* Mobile Drag Indicator */}
      {!isCenter ? (
        <View style={styles.dragPillContainer}>
          <View style={styles.dragPill} />
        </View>
      ) : null}

      {/* Header */}
      {title || subtitle || icon || showCloseButton || headerRight ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
            <View style={styles.titleColumn}>
              {title ? (
                <Text numberOfLines={2} style={styles.title}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={2} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.headerActions}>
            {headerRight}
            {showCloseButton ? (
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
                <XIcon size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Body */}
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={[styles.body, bodyStyle]}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, bodyStyle]}>{children}</View>
      )}

      {/* Footer */}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal
      animationType={isCenter ? 'fade' : 'slide'}
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View
          style={[
            styles.wrapper,
            isCenter ? styles.wrapperCenter : styles.wrapperBottom,
          ]}
        >
          {/* Animated Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.backdrop,
              { opacity: backdropAnim },
            ]}
          >
            <Pressable
              accessibilityLabel="Dismiss backdrop"
              onPress={closeOnBackdropPress ? onClose : undefined}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Card / Sheet */}
          {content}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  wrapperCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  wrapperBottom: {
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  centerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: '100%',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    elevation: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    width: '100%',
  },
  dragPillContainer: {
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingTop: 10,
    paddingBottom: 12,
  },

  dragPill: {
    backgroundColor: '#A7F3D0',
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderBottomColor: '#065F46',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    paddingRight: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    backgroundColor: '#065F46',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  body: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
});
