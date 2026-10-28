import { Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import colors from '../theme/colors';

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
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#123B2D' }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          minHeight: 68,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', flex: 1 }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 12,
              height: 42,
              justifyContent: 'center',
              marginRight: 10,
              width: 42,
            }}
          >
            <Image
              accessibilityLabel="Buy Food logo"
              resizeMode="contain"
              source={require('../images/buy-food-logo.png')}
              style={{ height: 34, width: 34 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              Chef workspace
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: '#CDE5D6', fontSize: 12, marginTop: 2 }}
            >
              {activeTitle} · {name}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Account and log out"
          accessibilityRole="button"
          onPress={confirmLogout}
          style={{
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            height: 36,
            justifyContent: 'center',
            marginLeft: 10,
            width: 36,
          }}
        >
          <Text style={{ color: '#123B2D', fontSize: 15, fontWeight: '800' }}>
            {initial}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default ChefHeader;
