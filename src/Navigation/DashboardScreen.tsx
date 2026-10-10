import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import {
  BellIcon,
  DashboardIcon,
  ProfileIcon,
} from './NavigationIcons';
import TopHeader, { type HeaderUser } from './TopHeader';

type DashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type DashboardPage = 'dashboard' | 'profile';

function DashboardScreen({ user, onLogout }: DashboardScreenProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState<DashboardPage>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const isWide = width >= 768;
  const userName =
    user?.name?.trim() || user?.username?.trim() || 'Restaurant Admin';
  const userEmail = user?.email?.trim() || 'No email on file';
  const userInitial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.username?.trim().charAt(0).toUpperCase() ||
    'U';

  const showPage = (nextPage: DashboardPage) => {
    setPage(nextPage);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await onLogout();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : 'Unable to log out. Please try again.',
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <TopHeader
        user={user}
        unreadNotifications={0}
        onToggleSidebar={() => {
          setIsNotificationsOpen(false);
          setIsSidebarOpen(open => !open);
        }}
        onOpenNotifications={() => {
          setIsSidebarOpen(false);
          setIsNotificationsOpen(open => !open);
        }}
        onOpenProfile={() => showPage('profile')}
        onLogout={handleLogout}
      />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {isWide && isSidebarOpen ? (
          <View style={{ width: 256 }}>
            <Sidebar activePage={page} onNavigate={showPage} />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          {logoutError ? (
            <Text
              accessibilityRole="alert"
              style={{
                backgroundColor: '#FEF2F2',
                color: colors.error,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              {logoutError}
            </Text>
          ) : null}

          {page === 'dashboard' ? (
            <DashboardContent userName={userName} />
          ) : (
            <ProfileContent
              userName={userName}
              userEmail={userEmail}
              initial={userInitial}
            />
          )}
        </View>
      </View>

      {!isWide && isSidebarOpen ? (
        <View style={{ ...overlayFill, top: 72, zIndex: 30 }}>
          <Pressable
            accessibilityLabel="Close sidebar"
            onPress={() => setIsSidebarOpen(false)}
            style={{ ...overlayFill, backgroundColor: '#11182766' }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              bottom: 0,
              left: 0,
              position: 'absolute',
              top: 0,
              width: Math.min(width - 48, 280),
            }}
          >
            <Sidebar activePage={page} onNavigate={showPage} />
          </View>
        </View>
      ) : null}

      {isNotificationsOpen ? (
        <View style={{ ...overlayFill, top: 72, zIndex: 25 }}>
          <Pressable
            accessibilityLabel="Close notifications"
            onPress={() => setIsNotificationsOpen(false)}
            style={{ ...overlayFill, backgroundColor: '#11182733' }}
          />
          <View
            style={{
              alignSelf: 'flex-end',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              borderWidth: 1,
              elevation: 10,
              marginHorizontal: width < 480 ? 12 : 24,
              marginTop: 8,
              maxWidth: '92%',
              padding: 20,
              shadowColor: '#111827',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              width: 320,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: 10,
                marginBottom: 6,
              }}
            >
              <BellIcon color={colors.textPrimary} size={19} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                Notifications
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
              You’re all caught up. New notifications will appear here.
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const overlayFill = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
};

function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRightColor: colors.border,
        borderRightWidth: 1,
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 20,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 12,
          marginLeft: 12,
          textTransform: 'uppercase',
        }}
      >
        Workspace
      </Text>
      <SidebarItem
        active={activePage === 'dashboard'}
        icon={<DashboardIcon color={activePage === 'dashboard' ? colors.primary : colors.textSecondary} />}
        label="Dashboard"
        onPress={() => onNavigate('dashboard')}
      />
      <SidebarItem
        active={activePage === 'profile'}
        icon={<ProfileIcon color={activePage === 'profile' ? colors.primary : colors.textSecondary} />}
        label="Profile"
        onPress={() => onNavigate('profile')}
      />
    </View>
  );
}

function SidebarItem({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor:
          pressed || isHovered || active ? '#EFF6FF' : 'transparent',
        borderRadius: 10,
        flexDirection: 'row',
        gap: 12,
        minHeight: 46,
        paddingHorizontal: 12,
        marginBottom: 4,
      })}
    >
      {icon}
      <Text
        style={{
          color: active ? colors.primary : colors.textPrimary,
          fontSize: 14,
          fontWeight: active ? '600' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DashboardContent({ userName }: { userName: string }) {
  return (
    <ScrollView
      contentContainerStyle={{
        alignSelf: 'center',
        maxWidth: 1120,
        paddingHorizontal: 24,
        paddingVertical: 32,
        width: '100%',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '700' }}>
        Good to see you, {userName}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 8 }}>
        Here’s what’s happening with your restaurant today.
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          marginTop: 28,
          padding: 22,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>
          Dashboard
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>
          Your restaurant overview will appear here.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProfileContent({
  userName,
  userEmail,
  initial,
}: {
  userName: string;
  userEmail: string;
  initial: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        alignSelf: 'center',
        maxWidth: 800,
        paddingHorizontal: 24,
        paddingVertical: 32,
        width: '100%',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '700' }}>
        Profile
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 8 }}>
        Your account details.
      </Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 16,
          marginTop: 28,
          padding: 22,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#EFF6FF',
            borderRadius: 30,
            height: 60,
            justifyContent: 'center',
            width: 60,
          }}
        >
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>
            {initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>
            {userName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
            {userEmail}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default DashboardScreen;
