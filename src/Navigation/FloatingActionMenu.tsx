import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../theme/colors';
import { CustomersIcon, PlusIcon, ProductIcon } from './NavigationIcons';
import AddCategoryIcon from './AddCategoryIcon';

type FloatingActionMenuProps = {
  onAddProduct: () => void;
  onAddCategory: () => void;
  onAddCustomers: () => void;
};

const menuActions = [
  { label: 'Add Product', Icon: ProductIcon, color: colors.primary },
  { label: 'Add Category', Icon: AddCategoryIcon, color: colors.secondary },
  { label: 'Add Cusions', Icon: CustomersIcon, color: colors.info },
] as const;

function FloatingActionMenu({
  onAddProduct,
  onAddCategory,
  onAddCustomers,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const menuProgress = useRef(new Animated.Value(0)).current;
  const menuAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 900,
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 900,
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseScale]);

  useEffect(() => {
    menuAnimation.current?.stop();
    const animation = Animated.timing(menuProgress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? 220 : 160,
      useNativeDriver: true,
    });
    menuAnimation.current = animation;
    animation.start();
  }, [isOpen, menuProgress]);

  useEffect(
    () => () => {
      menuAnimation.current?.stop();
      pulseScale.stopAnimation();
      menuProgress.stopAnimation();
    },
    [menuProgress, pulseScale],
  );

  const handleAction = (action: (typeof menuActions)[number]['label']) => {
    setIsOpen(false);
    if (action === 'Add Product') {
      onAddProduct();
    } else if (action === 'Add Category') {
      onAddCategory();
    } else {
      onAddCustomers();
    }
  };

  const iconRotation = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isOpen ? (
        <Pressable
          accessibilityLabel="Dismiss quick actions"
          accessibilityRole="button"
          onPress={() => setIsOpen(false)}
          style={{
            bottom: 68,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        />
      ) : null}

      <View
        accessibilityElementsHidden={!isOpen}
        importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={{
          bottom: 148,
          gap: 10,
          position: 'absolute',
          right: 20,
        }}
      >
        {menuActions.map(({ label, Icon, color: iconColor }) => (
          <Animated.View
            key={label}
            style={{
              opacity: menuProgress,
              transform: [
                {
                  translateY: menuProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            }}
          >
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              onPress={() => handleAction(label)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 28,
                borderWidth: 1,
                elevation: 7,
                flexDirection: 'row',
                gap: 11,
                minHeight: 52,
                paddingHorizontal: 15,
                shadowColor: '#111827',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: `${iconColor}18`,
                  borderRadius: 16,
                  height: 32,
                  justifyContent: 'center',
                  width: 32,
                }}
              >
                <Icon color={iconColor} size={18} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        style={{
          bottom: 82,
          position: 'absolute',
          right: 20,
          transform: [{ scale: pulseScale }],
          zIndex: 2,
        }}
      >
        <Pressable
          accessibilityLabel={isOpen ? 'Close quick actions' : 'Open quick actions'}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          onPress={() => setIsOpen(open => !open)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderRadius: 30,
            elevation: 9,
            height: 58,
            justifyContent: 'center',
            shadowColor: '#111827',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 7,
            width: 58,
          })}
        >
          <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
            <PlusIcon color={colors.textOnPrimary} size={25} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default FloatingActionMenu;
