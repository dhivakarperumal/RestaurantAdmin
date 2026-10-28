import { useState } from 'react';
import { Alert, Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BellIcon,
  LogoutIcon,
  ProfileIcon,
} from '../../Admin/Navigation/NavigationIcons';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

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

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: onLogout },
    ]);
  };

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
          onPress={() => setIsProfileMenuOpen(open => !open)}
          className="relative h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white shadow-md"
        >
          <Text className="text-lg font-black text-[#012711]">{initial}</Text>
          <View className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#012711] bg-[#22C55E]" />
        </Pressable>
      </View>

      {/* Profile Popup Menu */}
      <Modal
        visible={isProfileMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileMenuOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close profile menu"
          accessibilityRole="button"
          onPress={() => setIsProfileMenuOpen(false)}
          className="flex-1 bg-black/20"
        >
          <View className="absolute right-5 top-16 w-56 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-lg">
            <View className="border-b border-[#E5E7EB] px-3 py-2">
              <Text className="font-bold text-[#012711]">{name}</Text>
              <Text className="mt-1 text-xs text-[#64748B]">
                {user.email?.trim() || 'Team member'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Open profile"
              accessibilityRole="button"
              onPress={() => {
                setIsProfileMenuOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3"
            >
              <ProfileIcon color="#116C0B" size={18} />
              <Text className="font-semibold text-[#334155]">Profile</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Logout"
              accessibilityRole="button"
              onPress={handleLogout}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3"
            >
              <LogoutIcon color="#B91C1C" size={18} />
              <Text className="font-semibold text-[#B91C1C]">Logout</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Check out"
              accessibilityRole="button"
              onPress={() => {
                setIsProfileMenuOpen(false);
                Alert.alert(
                  'Check out',
                  'Are you sure you want to check out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Check out',
                      style: 'destructive',
                      onPress: () => {
                        void onClockOut();
                      },
                    },
                  ],
                );
              }}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3"
            >
              <Text className="text-lg text-[#C2410C]">↪</Text>
              <Text className="font-semibold text-[#C2410C]">Check out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
