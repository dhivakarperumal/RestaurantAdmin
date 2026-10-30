import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { CustomAlert as Alert } from '../components/popups';
import AuthInput from './AuthInput';
import colors from '../theme/colors';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from './AuthIcons';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions to continue.');
      return;
    }

    if (!onRegister) {
      setError('Registration is not connected to an authentication service yet.');
      return;
    }

    setError('');
    setIsRegistered(false);
    setIsSubmitting(true);
    try {
      await onRegister({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      setIsRegistered(true);
      onShowLogin();
    } catch (submitError) {
      setError(
        typeof submitError === 'object' &&
          submitError !== null &&
          'message' in submitError &&
          typeof submitError.message === 'string'
          ? submitError.message
          : 'Unable to create your account. Please try again.',
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
        Create Account
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 25, marginTop: 8 }}>
        Start managing your money smarter.
      </Text>

      <AuthInput
        autoCapitalize="words"
        autoComplete="name"
        icon={UserIcon}
        label="Full Name"
        onChangeText={setUsername}
        placeholder="Your name"
        value={username}
      />
      <AuthInput
        autoCapitalize="none"
        autoComplete="email"
        icon={MailIcon}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <AuthInput
        autoComplete="tel"
        keyboardType="phone-pad"
        icon={UserIcon}
        label="Phone number"
        onChangeText={setPhone}
        placeholder="Your phone number"
        value={phone}
      />
      <AuthInput
        autoComplete="new-password"
        icon={LockIcon}
        label="Password"
        onChangeText={setPassword}
        placeholder="Create a password"
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
      <AuthInput
        autoComplete="new-password"
        icon={LockIcon}
        label="Confirm password"
        onChangeText={setConfirmPassword}
        placeholder="Enter your password again"
        returnKeyType="done"
        rightAccessory={
          <Pressable
            accessibilityLabel={
              showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
            }
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setShowConfirmPassword(visible => !visible)}
            style={{ padding: 6 }}
          >
            {showConfirmPassword ? (
              <EyeOffIcon color={colors.textSecondary} size={20} />
            ) : (
              <EyeIcon color={colors.textSecondary} size={20} />
            )}
          </Pressable>
        }
        secureTextEntry={!showConfirmPassword}
        value={confirmPassword}
      />

      <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 17 }}>
        <Pressable
          accessibilityLabel="Accept Terms and Conditions"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          onPress={() => setAcceptedTerms(accepted => !accepted)}
          style={{ alignItems: 'center', flexDirection: 'row' }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: acceptedTerms ? colors.primary : colors.surface,
              borderColor: acceptedTerms ? colors.primary : colors.border,
              borderRadius: 5,
              borderWidth: 1,
              height: 20,
              justifyContent: 'center',
              marginRight: 10,
              width: 20,
            }}
          >
            {acceptedTerms ? (
              <Text style={{ color: colors.textOnPrimary, fontSize: 14, fontWeight: '800' }}>
                ✓
              </Text>
            ) : null}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            I agree to the
          </Text>
        </Pressable>
        <Text
          onPress={() =>
            Alert.alert(
              'Terms and Conditions',
              'By creating an account, you agree to use your Buy Food account responsibly and keep your account credentials secure.',
            )
          }
          style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 }}
        >
          Terms and Conditions
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 13, marginBottom: 14 }}>
          {error}
        </Text>
      ) : null}
      {isRegistered ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.success, fontSize: 13, marginBottom: 14 }}
        >
          Account created successfully. Please log in to continue.
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel="Create account"
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={handleRegister}
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
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 22 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          Already have an account?{' '}
        </Text>
        <Pressable accessibilityRole="button" onPress={onShowLogin}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
            Login
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default RegisterPage;
