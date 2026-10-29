import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
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
      style={{ backgroundColor: '#FCFAF5' }}
    >
      <View
        pointerEvents="none"
        style={{ ...StyleSheet.absoluteFill, overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 800">
          <Circle cx="46" cy="135" r="63" fill="#E8EDDF" opacity="0.7" />
          <Circle cx="350" cy="330" r="98" fill="#E8EDDF" opacity="0.55" />
          <Path
            d="M8 167c28 10 43 29 47 56-23-8-39-26-47-56Zm16-28c25 15 37 37 34 64-21-13-33-34-34-64Zm22 69c13-23 32-35 58-35-12 22-31 34-58 35Zm294 354c-3-28 7-51 30-68 3 26-7 48-30 68Zm27-38c17-21 39-29 65-23-15 19-36 27-65 23Zm-20 61c18-21 41-28 67-21-16 19-38 26-67 21Z"
            fill="#76986B"
            opacity="0.7"
          />
          <Path
            d="m55 223-24-43m24 52-14-57m9 66 44-33m235 336 17-52m-3 65 48-28m-64 44 55-17"
            fill="none"
            stroke="#587A53"
            strokeLinecap="round"
            strokeWidth="2"
            opacity="0.75"
          />
        </Svg>
      </View>
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
            <View style={{ alignSelf: 'center', width: '100%' }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Image
                  accessibilityLabel="Buy Food logo"
                  resizeMode="contain"
                  source={require('../images/buy-food-logo.png')}
                  style={{ height: 110, marginBottom: 10, width: 110 }}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 22,
                    fontWeight: '800',
                  }}
                >
                  Restaurant Admin
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  Manage your restaurant from anywhere
                </Text>
              </View>
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
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AuthScreen;
