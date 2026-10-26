import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
  Platform,
} from 'react-native';
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
  const [registrationNotice, setRegistrationNotice] = useState('');

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 27 }}>
            <Image
              accessibilityLabel="Buy Food logo"
              resizeMode="contain"
              source={require('../images/buy-food-logo.png')}
              style={{ height: 150, marginBottom: 12, width: 150 }}
            />
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800' }}>
              Restaurant Admin
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              Manage your restaurant from anywhere
            </Text>
          </View>

          {page === 'login' ? (
            <LoginPage
              notice={registrationNotice}
              onLogin={onLogin}
              onShowRegister={() => {
                setRegistrationNotice('');
                setPage('register');
              }}
            />
          ) : (
            <RegisterPage
              onRegister={
                onRegister
                  ? async values => {
                      await onRegister(values);
                      setRegistrationNotice(
                        'Account created successfully. Please log in to continue.',
                      );
                    }
                  : undefined
              }
              onShowLogin={() => setPage('login')}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AuthScreen;
