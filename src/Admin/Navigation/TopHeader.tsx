import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  BellIcon,
  HamburgerIcon,
} from './NavigationIcons';
import colors from '../../theme/colors';

export type HeaderUser = {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
};

type TopHeaderProps = {
  user: HeaderUser | null;
  unreadNotifications: number;
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

const HEADER_HEIGHT = 70;

function getUserName(user: HeaderUser | null) {
  return user?.name?.trim() || user?.username?.trim() || 'Restaurant Admin';
}

function IconButton({
  accessibilityLabel,
  children,
  onPress,
  className,
}: {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-xl border border-white/20 ${className ?? ''}`}
      style={({ pressed }) => ({
        backgroundColor:
          pressed
            ? 'rgba(255, 255, 255, 0.24)'
            : isHovered
            ? 'rgba(255, 255, 255, 0.18)'
            : 'rgba(255, 255, 255, 0.12)',
      })}
    >
      {children}
    </Pressable>
  );
}

function TopHeader({
  user,
  unreadNotifications,
  onToggleSidebar,
  onOpenNotifications,
  onOpenProfile,
  onLogout,
}: TopHeaderProps) {
  const { width } = useWindowDimensions();
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const userName = getUserName(user);
  const initial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.username?.trim().charAt(0).toUpperCase() ||
    'U';
  const badgeCount = Math.max(0, Math.floor(unreadNotifications));
  const compact = width < 480;

  const confirmLogout = () => {
    Alert.alert(
      'Log out?',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: onLogout },
      ],
      { cancelable: true },
    );
  };

  const openAccountActions = () => {
    Alert.alert(
      'Account',
      `${userName}\n${user?.email?.trim() || 'admin@buyfood.com'}`,
      [
        { text: 'Profile', onPress: onOpenProfile },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: confirmLogout,
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="relative z-10 overflow-visible"
      style={{
        backgroundColor: '#052E10',
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      }}
    >
      <StatusBar barStyle="light-content" />

      {/* Modern gradient & ambient glow background */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#052E10" stopOpacity="1" />
            <Stop offset="45%" stopColor="#0B4D1A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#147524" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="glowG" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primaryLight} stopOpacity="0.26" />
            <Stop offset="100%" stopColor={colors.primaryLight} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="accentG" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primaryLight} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={colors.primaryLight} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#headerGrad)" />
        <Circle cx="88%" cy="25%" r="120" fill="url(#glowG)" />
        <Circle cx="12%" cy="85%" r="90" fill="url(#accentG)" />
        <Path
          d="M-40 65 Q 110 20, 260 55 T 560 38 T 860 62"
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1.5"
        />
      </Svg>

      {/* Header main content bar */}
      <View
        style={{ height: HEADER_HEIGHT }}
        className={`flex-row items-center justify-between ${compact ? 'px-3' : 'px-5'}`}
      >
        <View className="flex-1 flex-row items-center">
          <IconButton
            accessibilityLabel="Toggle sidebar"
            onPress={onToggleSidebar}
            className={compact ? 'mr-2' : 'mr-3'}
          >
            <HamburgerIcon color="#FFFFFF" size={20} />
          </IconButton>

          <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white shadow-sm overflow-hidden">
            <Image
              accessibilityLabel="Buy Food logo"
              resizeMode="contain"
              source={require('../../images/buy-food-logo.png')}
              className="h-8 w-8"
            />
          </View>

          <View className="ml-2.5 flex-row items-center">
            <Text
              numberOfLines={1}
              className={`font-extrabold tracking-tight text-white ${compact ? 'text-[16px]' : 'text-[19px]'}`}
            >
              Buy Food
            </Text>
            <View className="ml-2 rounded-md border border-emerald-300/30 bg-emerald-400/20 px-1.5 py-0.5">
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                Admin
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2.5">
          <IconButton
            accessibilityLabel={`Notifications, ${badgeCount} unread`}
            onPress={onOpenNotifications}
          >
            <View>
              <BellIcon color="#FFFFFF" size={20} />
              {badgeCount > 0 ? (
                <View className="absolute -right-[9px] -top-2 h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-[#0B4D1A] bg-[#EF4444] px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </IconButton>

          <Pressable
            accessibilityLabel={`Open account actions for ${userName}`}
            accessibilityRole="button"
            onHoverIn={() => setIsAvatarHovered(true)}
            onHoverOut={() => setIsAvatarHovered(false)}
            onPress={openAccountActions}
            className="relative h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/95"
            style={({ pressed }) => ({
              backgroundColor:
                pressed || isAvatarHovered
                  ? '#FFFFFF'
                  : 'rgba(255, 255, 255, 0.95)',
            })}
          >
            <Text className="text-[16px] font-black text-[#0B4D1A]">
              {initial}
            </Text>
            <View className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-[#0B4D1A] bg-[#22C55E]" />
          </Pressable>
        </View>
      </View>

      {/* Subtle bottom highlight divider */}
      <View className="h-px w-full bg-white/10" />
    </SafeAreaView>
  );
}

export default TopHeader;
