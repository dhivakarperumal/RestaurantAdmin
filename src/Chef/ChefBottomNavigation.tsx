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
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        elevation: 12,
        flexDirection: 'row',
        minHeight: 62 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 5),
        paddingHorizontal: 2,
        paddingTop: 4,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
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
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
              borderRadius: 10,
              flex: 1,
              justifyContent: 'center',
              minHeight: 52,
              paddingHorizontal: 1,
            })}
          >
            {tab.icon(iconColor)}
            <Text
              numberOfLines={1}
              style={{
                color: iconColor,
                fontSize: 9,
                fontWeight: selected ? '700' : '500',
                marginTop: 3,
              }}
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
