/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';
import { useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import Bottombar, { type BottomBarTab } from './src/Navigation/Bottombar';
import {
  DashboardIcon,
  MenuIcon,
  OrdersIcon,
  ProfileIcon,
} from './src/Navigation/NavigationIcons';
import TopHeader from './src/Navigation/TopHeader';
import colors from './src/theme/colors';

const { height, width } = Dimensions.get('window');
const fallbackWindowMetrics = {
  frame: { x: 0, y: 0, width, height },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

const navigationTabs: BottomBarTab[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: color => <DashboardIcon color={color} />,
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: color => <OrdersIcon color={color} />,
  },
  {
    key: 'menu',
    label: 'Menu',
    icon: color => <MenuIcon color={color} />,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: color => <ProfileIcon color={color} />,
  },
];

function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? fallbackWindowMetrics}>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <TopHeader
        title="Restaurant Admin"
        subtitle="Manage your restaurant"
      />
      <View
        className="flex-1 items-center justify-center px-6"
        style={styles.content}
      >
        <Text className="text-2xl font-bold" style={styles.heading}>
          Dashboard
        </Text>
        <Text className="mt-2 text-center" style={styles.message}>
          Your restaurant overview will appear here.
        </Text>
      </View>
      <Bottombar
        tabs={navigationTabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  message: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default App;
