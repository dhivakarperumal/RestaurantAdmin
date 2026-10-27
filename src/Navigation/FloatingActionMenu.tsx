import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import colors from '../theme/colors';
import { MenuIcon, PlusIcon, ProductIcon } from './NavigationIcons';
import AddCategoryIcon from './AddCategoryIcon';

type FloatingActionMenuProps = {
  onAddProduct: () => void;
  onAddCategory: () => void;
  onAddCuisine: () => void;
};

const menuActions = [
  { label: 'Add Product', Icon: ProductIcon, color: colors.primary },
  { label: 'Add Category', Icon: AddCategoryIcon, color: colors.secondary },
  { label: 'Add Cuisine', Icon: MenuIcon, color: colors.info },
] as const;

function FloatingActionMenu({
  onAddProduct,
  onAddCategory,
  onAddCuisine,
}: FloatingActionMenuProps) {
  const insets = useSafeAreaInsets();
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
    menuAnimation.current = Animated.timing(menuProgress, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      isInteraction: false,
      useNativeDriver: true,
    });
    menuAnimation.current.start();
  }, [isOpen, menuProgress]);

  const handleAction = (label: (typeof menuActions)[number]['label']) => {
    setIsOpen(false);
    if (label === 'Add Product') {
      onAddProduct();
      return;
    }
    if (label === 'Add Category') {
      onAddCategory();
      return;
    }
    onAddCuisine();
  };

  const iconRotation = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Animated Brand-Tinted Backdrop Overlay */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFill,
          {
            bottom: 64 + insets.bottom,
            opacity: menuProgress,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Dismiss quick actions"
          accessibilityRole="button"
          onPress={() => setIsOpen(false)}
          style={StyleSheet.absoluteFill}
        >
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
          >
            <Defs>
              <LinearGradient
                id="backdropGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#021A0A" stopOpacity="0.45" />
                <Stop offset="100%" stopColor="#052E10" stopOpacity="0.65" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#backdropGrad)"
            />
          </Svg>
        </Pressable>
      </Animated.View>

      {/* Floating Action Menu Options List */}
      <View
        accessibilityElementsHidden={!isOpen}
        importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={{
          bottom: 148 + insets.bottom,
          gap: 11,
          position: 'absolute',
          right: 20,
          zIndex: 3,
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
                    outputRange: [22, 0],
                  }),
                },
                {
                  scale: menuProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            }}
          >
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              onPress={() => handleAction(label)}
              className="flex-row items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.96 : 1 }],
                backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                elevation: 9,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
                shadowRadius: 8,
              })}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: `${iconColor}15`,
                  borderColor: `${iconColor}35`,
                }}
              >
                <Icon color={iconColor} size={20} />
              </View>
              <Text className="text-sm font-bold text-[#012711]">
                {label}
              </Text>
              <View className="ml-1 opacity-40">
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="m9 18 6-6-6-6"
                    stroke="#012711"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* Floating Action Button with Gradient Background & Pulse Glow */}
      <Animated.View
        style={{
          bottom: 78 + insets.bottom,
          position: 'absolute',
          right: 20,
          transform: [{ scale: pulseScale }],
          zIndex: 4,
        }}
      >
        {/* Soft pulse glow aura behind the FAB button */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -5,
            left: -5,
            right: -5,
            bottom: -5,
            borderRadius: 36,
            backgroundColor: isOpen ? '#EF4444' : '#116C0B',
            opacity: isOpen ? 0.2 : 0.28,
            transform: [{ scale: isOpen ? 1 : pulseScale }],
          }}
        />

        <Pressable
          accessibilityLabel={
            isOpen ? 'Close quick actions' : 'Open quick actions'
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          onPress={() => setIsOpen(open => !open)}
          className="relative h-[60px] w-[60px] items-center justify-center rounded-full overflow-hidden border border-white/30 shadow-xl"
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.94 : 1 }],
            elevation: 10,
            shadowColor: isOpen ? '#EF4444' : '#052E10',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
          })}
        >
          {/* Button SVG gradient background */}
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
          >
            <Defs>
              <LinearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={isOpen ? '#B91C1C' : '#052E10'} />
                <Stop offset="50%" stopColor={isOpen ? '#DC2626' : '#0B4D1A'} />
                <Stop offset="100%" stopColor={isOpen ? '#EF4444' : '#147524'} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#fabGrad)"
            />
          </Svg>

          <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
            <PlusIcon color="#FFFFFF" size={26} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default FloatingActionMenu;
