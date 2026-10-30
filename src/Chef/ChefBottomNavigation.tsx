import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CustomersIcon,
  HomeIcon,
  MenuIcon,
  MoreIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../Admin/Navigation/NavigationIcons';

const styles = StyleSheet.create({
  container: {
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  },
  activeIcon: {
    backgroundColor: '#07513A',
    borderRadius: 17,
  },
});

export type ChefTab =
  | 'dashboard'
  | 'foods'
  | 'orders'
  | 'event-orders'
  | 'attendance'
  | 'more';

type ChefTabItem = {
  key: ChefTab;
  label: string;
  icon: (color: string) => ReactNode;
};

const tabs: ChefTabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: color => <HomeIcon color={color} size={23} />,
  },
  {
    key: 'foods',
    label: 'Foods',
    icon: color => <MenuIcon color={color} size={20} />,
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: color => <OrdersIcon color={color} size={23} />,
  },
  {
    key: 'event-orders',
    label: 'Event Orders',
    icon: color => <ReceiptIcon color={color} size={23} />,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: color => <CustomersIcon color={color} size={23} />,
  },
  {
    key: 'more',
    label: 'More',
    icon: color => <MoreIcon color={color} size={23} />,
  },
];

function ChefBottomNavigation({
  activeTab,
  onTabPress,
}: {
  activeTab: ChefTab;
  onTabPress: (tab: ChefTab) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      className="mx-3 mb-2 flex-row items-center rounded-[28px] border border-white bg-white px-1.5 pt-2 shadow-2xl"
      style={[
        styles.container,
        {
          minHeight: 84 + Math.max(insets.bottom, 6),
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1.5 h-[4px] w-[48px] -translate-x-1/2 rounded-full bg-[#D9DEDC]"
      />
      {tabs.map(tab => {
        const selected = activeTab === tab.key;
        const iconColor = selected ? '#F3D889' : '#59645F';
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            className="min-h-[70px] flex-1 items-center justify-center px-px"
          >
            <View
              className="min-h-[72px] min-w-[72px] items-center justify-center px-1.5 py-1"
            >
              <View
                className="h-[46px] w-[46px] items-center justify-center"
                style={selected ? styles.activeIcon : undefined}
              >
                {tab.icon(iconColor)}
              </View>
              <Text
                numberOfLines={1}
                className={`mt-1 text-[9px] ${
                  selected
                    ? 'font-extrabold text-[#07513A]'
                    : 'font-medium text-[#59645F]'
                }`}
              >
                {tab.label}
              </Text>
              <View
                className={`mt-1 h-[4px] rounded-full ${
                  selected ? 'w-[38px] bg-[#D4A843]' : 'w-[7px] bg-[#DEE3E0]'
                }`}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default ChefBottomNavigation;
