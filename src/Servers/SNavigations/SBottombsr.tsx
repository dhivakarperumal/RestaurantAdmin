import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CustomersIcon,
  HomeIcon,
  MenuIcon,
  MoreIcon,
  ProductIcon,
} from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';

export type ServerTab = 'home' | 'tables' | 'foods' | 'attendee' | 'more';

const tabs: { key: ServerTab; label: string; icon: typeof HomeIcon }[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'tables', label: 'Tables', icon: MenuIcon },
  { key: 'foods', label: 'Foods', icon: ProductIcon },
  { key: 'attendee', label: 'Attendee', icon: CustomersIcon },
  { key: 'more', label: 'More', icon: MoreIcon },
];

export default function ServerBottomBar({
  activeTab,
  onPress,
}: {
  activeTab: ServerTab;
  onPress: (tab: ServerTab) => void;
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
        justifyContent: 'space-around',
        minHeight: 62 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingTop: 4,
      }}
    >
      {tabs.map(tab => {
        const selected = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.key}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onPress(tab.key)}
            style={{
              alignItems: 'center',
              flex: 1,
              gap: 4,
              justifyContent: 'center',
              minHeight: 54,
            }}
          >
            <Icon color={selected ? colors.primary : colors.textSecondary} size={21} />
            <Text
              style={{
                color: selected ? colors.primary : colors.textSecondary,
                fontSize: 10,
                fontWeight: selected ? '700' : '500',
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