import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthInput from './AuthInput';
import colors from '../theme/colors';

export type LoginValues = {
  identifier: string;
  password: string;
};

type LoginPageProps = {
  onLogin?: (values: LoginValues) => Promise<void>;
  onShowRegister: () => void;
};

function LoginPage({ onLogin, onShowRegister }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError('Enter your email or phone number and password.');
      return;
    }

    if (!onLogin) {
      setError('Login is not connected to an authentication service yet.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onLogin({ identifier: identifier.trim(), password });
    } catch (submitError) {
      setError(
        typeof submitError === 'object' &&
          submitError !== null &&
          'message' in submitError &&
          typeof submitError.message === 'string'
          ? submitError.message
          : 'Unable to log in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="w-full max-w-md self-center rounded-3xl p-6">
      <Text className="mb-2 text-3xl font-bold" style={{ color: colors.textPrimary }}>
        Welcome back
      </Text>
      <Text className="mb-8 text-base" style={{ color: colors.textSecondary }}>
        Sign in to manage your restaurant.
      </Text>

      <AuthInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email or phone number"
        onChangeText={setIdentifier}
        placeholder="you@example.com"
        returnKeyType="next"
        value={identifier}
      />
      <AuthInput
        autoComplete="password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Enter your password"
        returnKeyType="done"
        secureTextEntry
        value={password}
      />

      {error ? (
        <Text className="mb-4 text-sm" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className="items-center rounded-xl px-4 py-4"
        disabled={isSubmitting}
        onPress={handleLogin}
        style={{
          backgroundColor: colors.primary,
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        <Text className="font-semibold text-white">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>

      <View className="mt-6 flex-row justify-center">
        <Text style={{ color: colors.textSecondary }}>
          Don&apos;t have an account?{' '}
        </Text>
        <Pressable accessibilityRole="button" onPress={onShowRegister}>
          <Text className="font-semibold" style={{ color: colors.primary }}>
            Create account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default LoginPage;
