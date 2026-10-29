import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import {
  HomeIcon,
  MoreIcon,
  OrdersIcon,
  PlusIcon,
  ProductIcon,
} from './NavigationIcons';

export type BottomBarTab<Key extends string = string> = {
  key: Key;
  label: string;
  icon?: ReactNode | ((color: string) => ReactNode);
};

export type AppTab = 'home' | 'billing' | 'items' | 'add' | 'orders' | 'more';

type BottombarProps<Key extends string> = {
  tabs: BottomBarTab<Key>[];
  activeTab: Key;
  onTabPress: (key: Key) => void;
};

function Bottombar<Key extends string>({
  tabs,
  activeTab,
  onTabPress,
}: BottombarProps<Key>) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        elevation: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        minHeight: 62 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingTop: 4,
        paddingHorizontal: 4,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;
        const isAddTab = tab.key === 'add';
        const iconColor = isActive ? colors.primary : colors.textSecondary;

        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor:
                pressed && !isAddTab ? colors.surfaceSecondary : 'transparent',
              borderRadius: 12,
              flex: 1,
              gap: isAddTab ? 0 : 4,
              justifyContent: 'center',
              minHeight: 54,
              transform: [{ scale: pressed && isAddTab ? 0.96 : 1 }],
            })}
          >
            {isAddTab ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                  borderColor: colors.primaryLight,
                  borderRadius: 23,
                  borderWidth: 2,
                  elevation: 5,
                  height: 46,
                  justifyContent: 'center',
                  shadowColor: colors.primaryDark,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.24,
                  shadowRadius: 5,
                  transform: [{ translateY: -8 }],
                  width: 46,
                }}
              >
                {typeof tab.icon === 'function'
                  ? tab.icon(colors.textOnPrimary)
                  : tab.icon}
              </View>
            ) : (
              typeof tab.icon === 'function' ? tab.icon(iconColor) : tab.icon
            )}
            <Text
              style={{
                color: isAddTab || isActive ? colors.primary : colors.textSecondary,
                fontSize: 10,
                fontWeight: isAddTab || isActive ? '700' : '500',
                textAlign: 'center',
                width: '100%',
              }}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BottomNavigation({
  activeTab,
  onPressTab,
}: {
  activeTab: AppTab;
  onPressTab: (tab: AppTab) => void;
}) {
  const tabs: BottomBarTab<AppTab>[] = [
    {
      key: 'home',
      label: 'Home',
      icon: color => <HomeIcon color={color} size={21} />,
    },
    {
      key: 'items',
      label: 'Items',
      icon: color => <ProductIcon color={color} size={21} />,
    },
    {
      key: 'add',
      label: 'Add',
      icon: color => <PlusIcon color={color} size={21} />,
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: color => <OrdersIcon color={color} size={21} />,
    },
    {
      key: 'more',
      label: 'More',
      icon: color => <MoreIcon color={color} size={21} />,
    },
  ];

  return (
    <Bottombar tabs={tabs} activeTab={activeTab} onTabPress={onPressTab} />
  );
}

export default Bottombar;
