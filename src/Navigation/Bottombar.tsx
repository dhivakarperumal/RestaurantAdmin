import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

export type BottomBarTab<Key extends string = string> = {
  key: Key;
  label: string;
  icon?: ReactNode | ((color: string) => ReactNode);
};

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
              backgroundColor: pressed ? '#F3F7FF' : 'transparent',
              borderRadius: 12,
              flex: 1,
              gap: 4,
              justifyContent: 'center',
              minHeight: 54,
            })}
          >
            {typeof tab.icon === 'function' ? tab.icon(iconColor) : tab.icon}
            <Text
              style={{
                color: isActive ? colors.primary : colors.textSecondary,
                fontSize: 10,
                fontWeight: isActive ? '700' : '500',
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

export default Bottombar;
