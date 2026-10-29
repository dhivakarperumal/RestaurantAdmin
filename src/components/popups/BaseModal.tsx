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
        <View className="items-center pb-1 pt-2.5" style={styles.dragPillContainer}>
          <View className="h-1 w-11 rounded-full bg-slate-300" style={styles.dragPill} />
        </View>
      ) : null}

      {/* Header */}
      {title || subtitle || icon || showCloseButton || headerRight ? (
        <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-3.5" style={styles.header}>
          <View className="flex-1 flex-row items-center pr-2.5" style={styles.headerLeft}>
            {icon ? <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-50" style={styles.iconWrapper}>{icon}</View> : null}
            <View className="flex-1" style={styles.titleColumn}>
              {title ? (
                <Text numberOfLines={2} className="text-lg font-extrabold text-[#012711]" style={styles.title}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={2} className="mt-0.5 text-xs font-medium text-slate-500" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center gap-2" style={styles.headerActions}>
            {headerRight}
            {showCloseButton ? (
              <Pressable
                accessibilityLabel="Close dialog"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                style={styles.closeButton}
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
      {footer ? (
        <View className="border-t border-slate-100 px-5 py-3.5" style={styles.footer}>
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal
      animationType={isCenter ? 'fade' : 'slide'}
      hardwareAccelerated
      onRequestClose={onClose}
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
    width: '100%',
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
