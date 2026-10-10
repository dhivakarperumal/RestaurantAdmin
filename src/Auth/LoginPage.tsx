import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import AuthInput from './AuthInput';
import colors from '../theme/colors';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from './AuthIcons';

export type LoginValues = {
  identifier: string;
  password: string;
};

type LoginPageProps = {
  notice?: string;
  onLogin?: (values: LoginValues) => Promise<void>;
  onShowRegister: () => void;
};

function LoginPage({ notice, onLogin, onShowRegister }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }

    if (
      identifier.includes('@') &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())
    ) {
      setError('Enter a valid email address or username.');
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
    <View
      style={{
        alignSelf: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 26,
        borderWidth: 1,
        elevation: 3,
        maxWidth: 460,
        padding: 26,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        width: '100%',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 29, fontWeight: '800' }}>
        Welcome Back!
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 28, marginTop: 8 }}>
        Sign in to manage your finances.
      </Text>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            color: colors.success,
            fontSize: 13,
            marginBottom: 18,
            padding: 12,
          }}
        >
          {notice}
        </Text>
      ) : null}

      <AuthInput
        autoCapitalize="none"
        autoComplete="username"
        autoCorrect={false}
        icon={MailIcon}
        label="Email or Username"
        onChangeText={setIdentifier}
        placeholder="you@example.com or username"
        returnKeyType="next"
        value={identifier}
      />
      <AuthInput
        autoComplete="password"
        icon={LockIcon}
        label="Password"
        onChangeText={setPassword}
        placeholder="Enter your password"
        returnKeyType="done"
        rightAccessory={
          <Pressable
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setShowPassword(visible => !visible)}
            style={{ padding: 6 }}
          >
            {showPassword ? (
              <EyeOffIcon color={colors.textSecondary} size={20} />
            ) : (
              <EyeIcon color={colors.textSecondary} size={20} />
            )}
          </Pressable>
        }
        secureTextEntry={!showPassword}
        value={password}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert(
            'Forgot password?',
            'Please contact your administrator to reset your password.',
          )
        }
        style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -5 }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
          Forgot Password?
        </Text>
      </Pressable>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 13, marginBottom: 14 }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel="Login"
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={handleLogin}
        style={{
          backgroundColor: colors.primary,
          alignItems: 'center',
          borderRadius: 14,
          flexDirection: 'row',
          gap: 9,
          justifyContent: 'center',
          minHeight: 54,
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? <ActivityIndicator color={colors.textOnPrimary} /> : null}
        <Text style={{ color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' }}>
          {isSubmitting ? 'Signing in…' : 'Login'}
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 22 }}>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>OR</Text>
        <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          Don&apos;t have an account?{' '}
        </Text>
        <Pressable
          accessibilityLabel="Register"
          accessibilityRole="button"
          onPress={onShowRegister}
        >
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
            Register
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default LoginPage;
