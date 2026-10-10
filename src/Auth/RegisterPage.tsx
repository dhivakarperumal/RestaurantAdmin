import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthInput from './AuthInput';
import colors from '../theme/colors';

export type RegisterValues = {
  username: string;
  email: string;
  phone: string;
  password: string;
};

type RegisterPageProps = {
  onRegister?: (values: RegisterValues) => Promise<void>;
  onShowLogin: () => void;
};

function RegisterPage({ onRegister, onShowLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Complete all fields to create your account.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!onRegister) {
      setError('Registration is not connected to an authentication service yet.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onRegister({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create your account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="w-full max-w-md self-center rounded-3xl p-6">
      <Text className="mb-2 text-3xl font-bold" style={{ color: colors.textPrimary }}>
        Create account
      </Text>
      <Text className="mb-8 text-base" style={{ color: colors.textSecondary }}>
        Get started managing your restaurant.
      </Text>

      <AuthInput
        autoCapitalize="words"
        autoComplete="name"
        label="Name"
        onChangeText={setUsername}
        placeholder="Your name"
        value={username}
      />
      <AuthInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <AuthInput
        autoComplete="tel"
        keyboardType="phone-pad"
        label="Phone number"
        onChangeText={setPhone}
        placeholder="Your phone number"
        value={phone}
      />
      <AuthInput
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Create a password"
        secureTextEntry
        value={password}
      />
      <AuthInput
        label="Confirm password"
        onChangeText={setConfirmPassword}
        placeholder="Enter your password again"
        returnKeyType="done"
        secureTextEntry
        value={confirmPassword}
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
        onPress={handleRegister}
        style={{
          backgroundColor: colors.primary,
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        <Text className="font-semibold text-white">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Text>
      </Pressable>

      <View className="mt-6 flex-row justify-center">
        <Text style={{ color: colors.textSecondary }}>
          Already have an account?{' '}
        </Text>
        <Pressable accessibilityRole="button" onPress={onShowLogin}>
          <Text className="font-semibold" style={{ color: colors.primary }}>
            Sign in
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default RegisterPage;
