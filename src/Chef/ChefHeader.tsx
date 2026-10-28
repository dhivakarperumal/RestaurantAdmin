import { Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';

type ChefHeaderProps = {
  user: HeaderUser | null;
  activeTitle: string;
  onLogout: () => void;
};

function ChefHeader({ user, activeTitle, onLogout }: ChefHeaderProps) {
  const name = user?.name?.trim() || user?.username?.trim() || 'Chef';
  const initial = name.charAt(0).toUpperCase();

  const confirmLogout = () => {
    Alert.alert('Log out?', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  };

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
          onPress={confirmLogout}
          className="ml-2.5 h-9 w-9 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-[15px] font-extrabold text-[#123B2D]">
            {initial}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default ChefHeader;
