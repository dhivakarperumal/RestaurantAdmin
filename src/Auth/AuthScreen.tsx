import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import LoginPage, { type LoginValues } from './LoginPage';
import RegisterPage, { type RegisterValues } from './RegisterPage';

type AuthScreenProps = {
  onLogin?: (values: LoginValues) => Promise<void>;
  onRegister?: (values: RegisterValues) => Promise<void>;
};

function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [page, setPage] = useState<'login' | 'register'>('login');

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-5 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <View
            className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-2xl font-bold text-white">R</Text>
          </View>
          <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Restaurant Admin
          </Text>
        </View>

        {page === 'login' ? (
          <LoginPage
            onLogin={onLogin}
            onShowRegister={() => setPage('register')}
          />
        ) : (
          <RegisterPage
            onRegister={onRegister}
            onShowLogin={() => setPage('login')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AuthScreen;
