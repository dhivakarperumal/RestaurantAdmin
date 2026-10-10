import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
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
  style,
}: {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor:
            pressed || isHovered ? '#F3F4F6' : 'transparent',
          borderRadius: 12,
          height: 44,
          justifyContent: 'center',
          width: 44,
        },
        style,
      ]}
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
      style={{
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        elevation: 3,
        height: 72,
        position: 'relative',
        zIndex: 10,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: compact ? 12 : 24,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', flex: 1 }}>
          <IconButton
            accessibilityLabel="Toggle sidebar"
            onPress={onToggleSidebar}
            style={{ marginRight: compact ? 8 : 16 }}
          >
            <HamburgerIcon color={colors.textPrimary} size={22} />
          </IconButton>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderRadius: 12,
              height: 40,
              justifyContent: 'center',
              width: 40,
            }}
          >
            <Text style={{ color: colors.surface, fontSize: 21, fontWeight: '800' }}>
              R
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontSize: compact ? 15 : 18,
              fontWeight: '700',
              marginLeft: 10,
            }}
          >
            Restaurant Admin
          </Text>
        </View>

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <IconButton
            accessibilityLabel={`Notifications, ${badgeCount} unread`}
            onPress={onOpenNotifications}
          >
            <View>
              <BellIcon color={colors.textSecondary} size={21} />
              {badgeCount > 0 ? (
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.error,
                    borderColor: colors.surface,
                    borderRadius: 9,
                    borderWidth: 1.5,
                    height: 18,
                    justifyContent: 'center',
                    minWidth: 18,
                    paddingHorizontal: 4,
                    position: 'absolute',
                    right: -9,
                    top: -8,
                  }}
                >
                  <Text style={{ color: colors.surface, fontSize: 10, fontWeight: '700' }}>
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
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor:
                pressed || isAvatarHovered ? '#DBEAFE' : '#EFF6FF',
              borderColor: isProfileOpen ? colors.primary : '#DBEAFE',
              borderRadius: 24,
              borderWidth: 1,
              height: 42,
              justifyContent: 'center',
              width: 42,
            })}
          >
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              {initial}
            </Text>
          </Pressable>
        </View>
      </View>

      {isProfileOpen ? (
        <View
          accessibilityViewIsModal
          style={{
            height: Math.max(0, height - 72),
            left: 0,
            position: 'absolute',
            right: 0,
            top: 72,
            zIndex: 20,
          }}
        >
          <Pressable
            accessibilityLabel="Close profile menu"
            onPress={() => setIsProfileOpen(false)}
            style={{ ...absoluteFill }}
          />
          <View
            style={{
              alignSelf: 'flex-end',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              borderWidth: 1,
              elevation: 12,
              marginHorizontal: compact ? 12 : 24,
              maxWidth: '92%',
              overflow: 'hidden',
              shadowColor: '#111827',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
              shadowRadius: 18,
              width: 300,
              zIndex: 21,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#EFF6FF',
                  borderRadius: 22,
                  height: 44,
                  justifyContent: 'center',
                  width: 44,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '700' }}>
                  {initial}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}
                >
                  {userName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}
                >
                  {user?.email?.trim() || ' '}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: colors.border, height: 1 }} />
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

const absoluteFill: ViewStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
};

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
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor:
          pressed || isHovered ? '#F9FAFB' : colors.surface,
        flexDirection: 'row',
        gap: 12,
        minHeight: 48,
        paddingHorizontal: 18,
      })}
    >
      {icon}
      <Text
        style={{
          color: destructive ? colors.error : colors.textPrimary,
          fontSize: 14,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      {label === 'Profile' ? (
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          style={{ marginLeft: 'auto' }}
        >
          <Path
            d="m9 18 6-6-6-6"
            stroke={colors.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}

export default TopHeader;
