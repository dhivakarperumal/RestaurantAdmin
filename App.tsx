/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StatusBar,
  Text,
} from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  getStoredUser,
  isLoggedIn,
  loginWithIdentifier,
  logoutUser,
  registerUser,
} from './api';
import AuthScreen from './src/Auth/AuthScreen';
import type { LoginValues } from './src/Auth/LoginPage';
import type { RegisterValues } from './src/Auth/RegisterPage';
import colors from './src/theme/colors';
import DashboardScreen from './src/Admin/Navigation/DashboardScreen';
import type { HeaderUser } from './src/Admin/Navigation/TopHeader';

const { height, width } = Dimensions.get('window');
const fallbackWindowMetrics = {
  frame: { x: 0, y: 0, width, height },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? fallbackWindowMetrics}>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [retrySessionCheck, setRetrySessionCheck] = useState(0);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      setIsCheckingSession(true);
      setSessionError('');
      try {
        const authenticated = await isLoggedIn();
        const storedUser = authenticated ? await getStoredUser() : null;
        if (isActive) {
          setUser(authenticated ? storedUser : null);
        }
      } catch (error) {
        if (isActive) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Unable to restore your session.',
          );
        }
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    };

    restoreSession();
    return () => {
      isActive = false;
    };
  }, [retrySessionCheck]);

  const handleLogin = async ({ identifier, password }: LoginValues) => {
    const result = await loginWithIdentifier(identifier, password);
    const storedUser = await getStoredUser();
    setUser(result.user ?? storedUser ?? null);
  };

  const handleRegister = async (values: RegisterValues) => {
    await registerUser(values);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  if (isCheckingSession) {
    return (
      <SafeAreaView
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (sessionError) {
    return (
      <SafeAreaView
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
          Could not restore your session
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          {sessionError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRetrySessionCheck(attempt => attempt + 1)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 10,
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '600' }}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return user ? (
    <DashboardScreen user={user} onLogout={handleLogout} />
  ) : (
    <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
  );
}

export default App;
