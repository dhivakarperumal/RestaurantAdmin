import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import colors from '../../theme/colors';

export type ServerTab = 'home' | 'tables' | 'orders' | 'foods' | 'attendee' | 'more' | 'profile';

/* ==========================================================================
   Crisp Vector Icons tailored for Server Navigation
   ========================================================================== */

function HomeTabIcon({
  color,
  size = 22,
  active,
}: {
  color: string;
  size?: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-5a1 1 0 0 1-1-1v-4.5a1.5 1.5 0 0 0-1.5-1.5h-2a1.5 1.5 0 0 0-1.5 1.5V20a1 1 0 0 1-1 1h-5A1.5 1.5 0 0 1 3 20v-9.5z"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(17, 108, 11, 0.12)' : 'none'}
      />
    </Svg>
  );
}

function TablesTabIcon({
  color,
  size = 22,
  active,
}: {
  color: string;
  size?: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="6.5"
        width="16"
        height="5.5"
        rx="1.8"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        fill={active ? 'rgba(17, 108, 11, 0.12)' : 'none'}
      />
      <Path
        d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FoodsTabIcon({
  color,
  size = 22,
  active,
}: {
  color: string;
  size?: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 17h16M12 4v2M5 17c0-4.418 3.134-8 7-8s7 3.582 7 8M2 19h20"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(17, 108, 11, 0.12)' : 'none'}
      />
      <Circle
        cx="12"
        cy="4"
        r="1.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
      />
    </Svg>
  );
}

function MoreTabIcon({
  color,
  size = 22,
  active,
}: {
  color: string;
  size?: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        fill={active ? 'rgba(17, 108, 11, 0.15)' : 'none'}
      />
      <Rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        fill={active ? 'rgba(17, 108, 11, 0.15)' : 'none'}
      />
      <Rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        fill={active ? 'rgba(17, 108, 11, 0.15)' : 'none'}
      />
      <Rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        fill={active ? 'rgba(17, 108, 11, 0.15)' : 'none'}
      />
    </Svg>
  );
}

const tabs: {
  key: ServerTab;
  label: string;
  icon: React.ComponentType<{ color: string; size?: number; active: boolean }>;
}[] = [
  { key: 'home', label: 'Home', icon: HomeTabIcon },
  { key: 'tables', label: 'Tables', icon: TablesTabIcon },
  { key: 'orders', label: 'Orders', icon: FoodsTabIcon },
  { key: 'more', label: 'More', icon: MoreTabIcon },
];

function TabButton({
  tab,
  activeTab,
  onPress,
}: {
  tab: (typeof tabs)[number];
  activeTab: ServerTab;
  onPress: (tab: ServerTab) => void;
}) {
  const selected = tab.key === activeTab;
  const Icon = tab.icon;
  const activeColor = colors.primary || '#116C0B';
  const inactiveColor = '#64748B';

  return (
    <Pressable
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => onPress(tab.key)}
      style={{ alignItems: 'center', flex: 1, justifyContent: 'center', height: 48 }}
    >
      <Icon color={selected ? activeColor : inactiveColor} size={18} active={selected} />
      <Text
        style={{
          color: selected ? activeColor : inactiveColor,
          fontSize: 9.5,
          fontWeight: selected ? '800' : '600',
          marginTop: 1,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function ServerBottomBar({
  activeTab,
  onPress,
  onPlusPress,
}: {
  activeTab: ServerTab;
  onPress: (tab: ServerTab) => void;
  onPlusPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 6;

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E2E8F0',
        borderTopWidth: 1,
        elevation: 16,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          height: 48,
          justifyContent: 'space-around',
          paddingHorizontal: 6,
        }}
      >
        {tabs.slice(0, 2).map(tab => (
          <TabButton
            key={tab.key}
            tab={tab}
            activeTab={activeTab}
            onPress={onPress}
          />
        ))}
        <Pressable
          accessibilityLabel="Open assigned tables"
          accessibilityRole="button"
          onPress={onPlusPress}
          style={{ alignItems: 'center', flex: 1, justifyContent: 'center', height: 48 }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#116C0B',
              borderColor: '#FFFFFF',
              borderRadius: 9999,
              borderWidth: 2,
              elevation: 6,
              height: 40,
              justifyContent: 'center',
              marginTop: -14,
              shadowColor: '#052E10',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              width: 40,
            }}
          >
            <Text className="text-2xl font-light leading-6 text-white">+</Text>
          </View>
          <Text className="mt-0.5 text-[9.5px] font-extrabold text-[#116C0B]">
            Tables
          </Text>
        </Pressable>
        {tabs.slice(2).map(tab => (
          <TabButton
            key={tab.key}
            tab={tab}
            activeTab={activeTab}
            onPress={onPress}
          />
        ))}
      </View>
      {/* Seamless white bottom safe area background */}
      <View style={{ backgroundColor: '#FFFFFF', height: bottomInset }} />
    </View>
  );
}
