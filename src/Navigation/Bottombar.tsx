import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import colors from '../theme/colors';

export type BottomBarTab = {
  key: string;
  label: string;
  icon?: ReactNode | ((color: string) => ReactNode);
};

type BottombarProps = {
  tabs: BottomBarTab[];
  activeTab: string;
  onTabPress: (key: string) => void;
};

function Bottombar({ tabs, activeTab, onTabPress }: BottombarProps) {
  return (
    <View
      className="flex-row items-center justify-around border-t pb-2 pt-2"
      style={{ backgroundColor: colors.surface, borderTopColor: colors.border }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;
        const iconColor = isActive ? colors.primary : colors.textSecondary;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            className="min-h-12 flex-1 flex-col items-center justify-center gap-1"
          >
            {typeof tab.icon === 'function' ? tab.icon(iconColor) : tab.icon}
            <Text
              className={`text-xs ${isActive ? 'font-semibold' : ''}`}
              style={{
                color: isActive ? colors.primary : colors.textSecondary,
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

export default Bottombar;
