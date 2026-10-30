import { useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import {
  BellIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LogoutIcon,
  ProfileIcon,
} from '../Admin/Navigation/NavigationIcons';
import { ConfirmDialog } from '../components/popups';

const styles = StyleSheet.create({
  header: {
    elevation: 12,
  },
  backgroundImage: {
    opacity: 0.96,
  },
  accountMenu: {
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
});

type ChefHeaderProps = {
  user: HeaderUser | null;
  activeTitle: string;
  onLogout: () => void;
  onOpenSettings: () => void;
  onAccountMenuOpenChange: (isOpen: boolean) => void;
};

function ChefHeader({
  user,
  activeTitle,
  onLogout,
  onOpenSettings,
  onAccountMenuOpenChange,
}: ChefHeaderProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const name = user?.name?.trim() || user?.username?.trim() || 'Chef';
  const initial = name.charAt(0).toUpperCase();
  const email = user?.email?.trim() || 'Chef workspace';

  const closeAccountMenu = () => {
    setIsAccountMenuOpen(false);
    onAccountMenuOpenChange(false);
  };

  const toggleAccountMenu = () => {
    const nextIsOpen = !isAccountMenuOpen;
    setIsAccountMenuOpen(nextIsOpen);
    onAccountMenuOpenChange(nextIsOpen);
  };

  return (
    <ImageBackground
      accessibilityLabel="Chef workspace header background"
      className="relative z-20 w-full"
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      source={require('../images/chefheader.png')}
      style={styles.header}
    >
      <SafeAreaView
        edges={['top']}
        className="bg-transparent"
      >
        <StatusBar barStyle="light-content" />
        <View className="min-h-[78px] flex-row items-center justify-between px-3 py-2">
          <View className="mr-2 flex-1 flex-row items-center">
            <View className="mr-2.5 h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#E8D19A] bg-white">
              <Image
                accessibilityLabel="Buy Food logo"
                resizeMode="contain"
                source={require('../images/buy-food-logo.png')}
                className="h-[38px] w-[38px]"
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-[15px] font-extrabold tracking-tight text-white"
              >
                Chef Workspace
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-[10px] text-[#D4E8DC]"
              >
                {activeTitle} · {name}
              </Text>
              <View className="mt-1 h-[2px] w-5 rounded-full bg-[#D4A843]" />
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10"
            >
              <BellIcon color="#FFFFFF" size={17} />
              <View className="absolute right-[7px] top-[6px] h-[7px] w-[7px] rounded-full border border-[#075238] bg-[#F04444]" />
            </Pressable>

            <Pressable
              accessibilityLabel={`Account menu for ${name}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isAccountMenuOpen }}
              onPress={toggleAccountMenu}
              className="h-9 flex-row items-center gap-1.5 rounded-full border border-[#D4A843] bg-[#0A523B]/90 py-1 pl-1 pr-2.5"
            >
              <View className="h-[27px] w-[27px] items-center justify-center rounded-full bg-[#F4DCAA]">
                <Text className="text-[13px] font-extrabold text-[#15513A]">
                  {initial}
                </Text>
              </View>
              {isAccountMenuOpen ? (
                <ChevronUpIcon color="#FFFFFF" size={14} />
              ) : (
                <ChevronDownIcon color="#FFFFFF" size={14} />
              )}
            </Pressable>
          </View>
        </View>

        {isAccountMenuOpen ? (
          <View
            accessibilityLabel="Account menu"
            className="absolute right-3 top-[100px] w-[224px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
            style={styles.accountMenu}
          >
            <View className="flex-row items-center border-b border-[#EEF0F2] px-3.5 py-3">
              <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-full bg-[#F8E5BE]">
                <Text className="text-sm font-extrabold text-[#15513A]">
                  {initial}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-xs font-extrabold text-[#123B2D]"
                >
                  {name}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[10px] text-[#7B8790]"
                >
                  {email}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Chef profile"
              accessibilityRole="button"
              onPress={closeAccountMenu}
              className="min-h-10 flex-row items-center px-3.5 active:bg-[#F3F7F5]"
            >
              <ProfileIcon color="#52665A" size={16} />
              <Text className="ml-2.5 text-xs font-medium text-[#374151]">
                Profile
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open chef settings"
              accessibilityRole="button"
              onPress={() => {
                closeAccountMenu();
                onOpenSettings();
              }}
              className="min-h-10 flex-row items-center border-b border-[#EEF0F2] px-3.5 active:bg-[#F3F7F5]"
            >
              <Text className="w-4 text-center text-sm text-[#52665A]">⚙</Text>
              <Text className="ml-2.5 text-xs font-medium text-[#374151]">
                Settings
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Log out"
              accessibilityRole="button"
              onPress={() => {
                closeAccountMenu();
                setIsLogoutConfirmOpen(true);
              }}
              className="min-h-10 flex-row items-center px-3.5 active:bg-red-50"
            >
              <LogoutIcon color="#DC2626" size={16} />
              <Text className="ml-2.5 text-xs font-semibold text-[#DC2626]">
                Log Out
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>

      <ConfirmDialog
        visible={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Sign Out"
        message="Are you sure you want to log out of the Chef workspace?"
        itemName={name}
        confirmLabel="Log Out"
        variantType="danger"
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          onLogout();
        }}
      />
    </ImageBackground>
  );
}

export default ChefHeader;
