import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellIcon } from '../../Admin/Navigation/NavigationIcons';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import {
  ActionSheet,
  ClockIcon,
  ConfirmDialog,
  LogOutIcon,
  UserIcon,
} from '../../components/popups';

export default function ServerTopHeader({
  user,
  onLogout,
  onClockOut,
  onOpenProfile,
}: {
  user: HeaderUser;
  onLogout: () => void;
  onClockOut: () => Promise<void>;
  onOpenProfile?: () => void;
}) {
  const name = user.name?.trim() || user.username?.trim() || 'Team member';
  const initial = name.charAt(0).toUpperCase();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  return (
    <SafeAreaView
      edges={['top']}
      className="bg-[#012711]"
      style={{ elevation: 100, position: 'relative', zIndex: 100 }}
    >
      <View className="relative flex-row items-center justify-between px-5 pb-4 pt-3">
        {/* Left Side Logo & User Info */}
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white shadow-sm overflow-hidden">
            <Image
              accessibilityLabel="Restaurant logo"
              resizeMode="contain"
              source={require('../../images/buy-food-logo.png')}
              className="h-8 w-8"
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[10px] font-extrabold uppercase tracking-widest text-[#B8D7BE]">
                RESTAURANT TEAM
              </Text>
              <View className="rounded bg-emerald-400/20 px-1 py-0.5">
                <Text className="text-[9px] font-extrabold text-[#86EFAC]">
                  SERVER
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} className="mt-0.5 text-base font-black text-white">
              Hello, {name}
            </Text>
          </View>
        </View>

        {/* Right Side Notification & Profile Avatar */}
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#114D26]"
        >
          <BellIcon color="#FFFFFF" size={21} />
        </Pressable>
        <Pressable
          accessibilityLabel="Open profile menu"
          accessibilityRole="button"
          onPress={() => setIsProfileMenuOpen(true)}
          className="relative h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white shadow-md active:bg-gray-100"
        >
          <Text className="text-lg font-black text-[#012711]">{initial}</Text>
          <View className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#012711] bg-[#22C55E]" />
        </Pressable>
      </View>

      {/* Profile Actions Sheet */}
      <ActionSheet
        visible={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        title={name}
        subtitle={user.email?.trim() || 'Restaurant Server'}
        actions={[
          {
            id: 'profile',
            label: 'My Profile',
            description: 'View ID badge and personal details',
            icon: <UserIcon color="#116C0B" size={20} />,
            onPress: () => {
              setIsProfileMenuOpen(false);
              if (onOpenProfile) onOpenProfile();
            },
          },
          {
            id: 'checkout',
            label: 'Check Out / Clock Out',
            description: 'End your working shift for today',
            icon: <ClockIcon color="#C2410C" size={20} />,
            onPress: () => {
              setIsProfileMenuOpen(false);
              setIsCheckoutConfirmOpen(true);
            },
          },
          {
            id: 'logout',
            label: 'Log Out',
            description: 'Sign out of the server app',
            icon: <LogOutIcon color="#DC2626" size={20} />,
            destructive: true,
            onPress: () => {
              setIsProfileMenuOpen(false);
              setIsLogoutConfirmOpen(true);
            },
          },
        ]}
      />

      {/* Clock Out Confirmation Dialog */}
      <ConfirmDialog
        visible={isCheckoutConfirmOpen}
        onClose={() => setIsCheckoutConfirmOpen(false)}
        title="Check Out Shift"
        message="Are you sure you want to clock out and conclude your active server shift?"
        itemName={name}
        confirmLabel="Check Out"
        variantType="warning"
        isLoading={isCheckingOut}
        onConfirm={async () => {
          setIsCheckingOut(true);
          try {
            await onClockOut();
          } finally {
            setIsCheckingOut(false);
            setIsCheckoutConfirmOpen(false);
          }
        }}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Sign Out"
        message="Are you sure you want to log out of the Restaurant Server app?"
        itemName={name}
        confirmLabel="Log Out"
        variantType="danger"
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          onLogout();
        }}
      />
    </SafeAreaView>
  );
}
