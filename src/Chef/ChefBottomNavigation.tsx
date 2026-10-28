import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import {
  CustomersIcon,
  DashboardIcon,
  MenuIcon,
  ProductIcon,
  ReceiptIcon,
} from '../Admin/Navigation/NavigationIcons';

export type ChefTab =
  | 'dashboard'
  | 'foods'
  | 'inventory'
  | 'stock'
  | 'attendance';

type ChefTabItem = {
  key: ChefTab;
  label: string;
  icon: (color: string) => ReactNode;
};

const tabs: ChefTabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: color => <DashboardIcon color={color} size={20} />,
  },
  {
    key: 'foods',
    label: 'Foods',
    icon: color => <MenuIcon color={color} size={20} />,
  },
  {
    key: 'inventory',
    label: 'Inventory Request',
    icon: color => <ReceiptIcon color={color} size={20} />,
  },
  {
    key: 'stock',
    label: 'Stock Details',
    icon: color => <ProductIcon color={color} size={20} />,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: color => <CustomersIcon color={color} size={20} />,
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
      className="flex-row items-center border-t border-[#E5E7EB] bg-white px-0.5 pt-1 shadow-lg"
      style={{
        minHeight: 62 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 5),
      }}
    >
      {tabs.map(tab => {
        const selected = activeTab === tab.key;
        const iconColor = selected ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            className={`min-h-[52px] flex-1 items-center justify-center rounded-xl px-px ${
              selected ? 'bg-[#F0F7EE]' : 'bg-transparent'
            }`}
          >
            {tab.icon(iconColor)}
            <Text
              numberOfLines={1}
              className={`mt-[3px] text-[9px] ${
                selected
                  ? 'font-bold text-[#116C0B]'
                  : 'font-medium text-[#6B7280]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default ChefBottomNavigation;
