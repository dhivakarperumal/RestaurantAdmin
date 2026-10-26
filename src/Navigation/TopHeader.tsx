import { useState } from 'react';
import {
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import colors from '../theme/colors';
import {
  BellIcon,
  HamburgerIcon,
  LogoutIcon,
  ProfileIcon,
} from './NavigationIcons';

export type HeaderUser = {
  name?: string;
  username?: string;
  email?: string;
};

type TopHeaderProps = {
  user: HeaderUser | null;
  unreadNotifications: number;
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

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
      className={`h-11 w-11 items-center justify-center rounded-xl ${className ?? ''}`}
      style={({ pressed }) => ({
        backgroundColor: pressed || isHovered ? '#F3F4F6' : 'transparent',
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
  const { height, width } = useWindowDimensions();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const userName = getUserName(user);
  const initial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.username?.trim().charAt(0).toUpperCase() ||
    'U';
  const badgeCount = Math.max(0, Math.floor(unreadNotifications));
  const compact = width < 480;

  const openProfile = () => {
    setIsProfileOpen(false);
    onOpenProfile();
  };

  const logout = () => {
    setIsProfileOpen(false);
    onLogout();
  };

  return (
    <View
      className="relative z-10 h-[72px] border-b border-[#E5E7EB] bg-white shadow-sm"
    >
      <View
        className={`flex-1 flex-row items-center justify-between ${compact ? 'px-3' : 'px-6'}`}
      >
        <View className="flex-1 flex-row items-center">
          <IconButton
            accessibilityLabel="Toggle sidebar"
            onPress={onToggleSidebar}
            className={compact ? 'mr-2' : 'mr-4'}
          >
            <HamburgerIcon color={colors.textPrimary} size={22} />
          </IconButton>
          <Image
            accessibilityLabel="Buy Food logo"
            resizeMode="contain"
            source={require('../images/buy-food-logo.png')}
            className="h-10 w-10"
          />
          <Text
            numberOfLines={1}
            className={`ml-2.5 font-bold text-[#012711] ${compact ? 'text-[15px]' : 'text-lg'}`}
          >
            Buy Food
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <IconButton
            accessibilityLabel={`Notifications, ${badgeCount} unread`}
            onPress={onOpenNotifications}
          >
            <View>
              <BellIcon color={colors.textSecondary} size={21} />
              {badgeCount > 0 ? (
                <View className="absolute -right-[9px] -top-2 h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-white bg-[#DC2626] px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </IconButton>
          <Pressable
            accessibilityLabel={`Open profile menu for ${userName}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: isProfileOpen }}
            onHoverIn={() => setIsAvatarHovered(true)}
            onHoverOut={() => setIsAvatarHovered(false)}
            onPress={() => setIsProfileOpen(open => !open)}
            className={`h-[42px] w-[42px] items-center justify-center rounded-full border ${isProfileOpen ? 'border-[#116C0B]' : 'border-[#DBEAFE]'}`}
            style={({ pressed }) => ({
              backgroundColor:
                pressed || isAvatarHovered ? '#DBEAFE' : '#EFF6FF',
            })}
          >
            <Text className="text-base font-bold text-[#116C0B]">
              {initial}
            </Text>
          </Pressable>
        </View>
      </View>

      {isProfileOpen ? (
        <View
          accessibilityViewIsModal
          className="absolute left-0 right-0 top-[72px] z-20"
          style={{ height: Math.max(0, height - 72) }}
        >
          <Pressable
            accessibilityLabel="Close profile menu"
            onPress={() => setIsProfileOpen(false)}
            className="absolute inset-0"
          />
          <View
            className={`z-[21] w-[300px] max-w-[92%] self-end overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl ${compact ? 'mx-3' : 'mx-6'}`}
          >
            <View
              className="flex-row items-center gap-3 bg-[#F9FAFB] px-4 py-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Text className="text-[17px] font-bold text-[#116C0B]">
                  {initial}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-[#012711]"
                >
                  {userName}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-[3px] text-xs text-[#6B7280]"
                >
                  {user?.email?.trim() || ' '}
                </Text>
              </View>
            </View>
            <View className="h-px bg-[#E5E7EB]" />
            <MenuAction
              icon={<ProfileIcon color={colors.textSecondary} size={18} />}
              label="Profile"
              onPress={openProfile}
            />
            <MenuAction
              icon={<LogoutIcon color={colors.error} size={18} />}
              label="Logout"
              onPress={logout}
              destructive
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MenuAction({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 px-[18px]"
      style={({ pressed }) => ({
        backgroundColor:
          pressed || isHovered ? '#F9FAFB' : colors.surface,
      })}
    >
      {icon}
      <Text
        className={`text-sm font-medium ${destructive ? 'text-[#DC2626]' : 'text-[#012711]'}`}
      >
        {label}
      </Text>
      {label === 'Profile' ? (
        <View className="ml-auto">
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="m9 18 6-6-6-6"
              stroke={colors.textSecondary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}

export default TopHeader;
