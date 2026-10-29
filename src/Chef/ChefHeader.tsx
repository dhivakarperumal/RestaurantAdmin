import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import { ConfirmDialog } from '../components/popups';

type ChefHeaderProps = {
  user: HeaderUser | null;
  activeTitle: string;
  onLogout: () => void;
};

function ChefHeader({ user, activeTitle, onLogout }: ChefHeaderProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const name = user?.name?.trim() || user?.username?.trim() || 'Chef';
  const initial = name.charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={['top']} className="bg-[#123B2D]">
      <View
        className="min-h-[68px] flex-row items-center justify-between px-4"
      >
        <View className="flex-1 flex-row items-center">
          <View
            className="mr-2.5 h-[42px] w-[42px] items-center justify-center rounded-xl bg-white"
          >
            <Image
              accessibilityLabel="Buy Food logo"
              resizeMode="contain"
              source={require('../images/buy-food-logo.png')}
              className="h-[34px] w-[34px]"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-white">
              Chef workspace
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-xs text-[#CDE5D6]"
            >
              {activeTitle} · {name}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Account and log out"
          accessibilityRole="button"
          onPress={() => setIsLogoutConfirmOpen(true)}
          className="ml-2.5 h-9 w-9 items-center justify-center rounded-full bg-white active:bg-gray-100"
        >
          <Text className="text-[15px] font-extrabold text-[#123B2D]">
            {initial}
          </Text>
        </Pressable>
      </View>

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
    </SafeAreaView>
  );
}

export default ChefHeader;
