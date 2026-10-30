import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CustomAlert as Alert } from '../components/popups';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import colors from '../theme/colors';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from './AuthIcons';

export type LoginValues = {
  identifier: string;
  password: string;
};

type LoginPageProps = {
  notice?: string;
  onLogin?: (values: LoginValues) => Promise<void>;
};

function LoginPage({ notice, onLogin }: LoginPageProps) {
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
        backgroundColor: '#FFFEFB',
        borderColor: '#EFE9DE',
        borderRadius: 30,
        borderWidth: 1,
        elevation: 10,
        maxWidth: 560,
        overflow: 'hidden',
        shadowColor: '#193D31',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.13,
        shadowRadius: 28,
        width: '100%',
      }}
    >
      <View style={{ height: 218, overflow: 'hidden' }}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 560 240"
          preserveAspectRatio="none"
          style={{ position: 'absolute' }}
        >
          <Path
            d="M0 0H560V210C470 222 420 184 338 197C246 211 192 245 96 220C53 209 25 213 0 222Z"
            fill="#064E3B"
          />
          <Circle cx="532" cy="16" r="87" fill="#D9B34B" opacity="0.15" />
          <Circle cx="514" cy="26" r="56" fill="#064E3B" opacity="0.7" />
        </Svg>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 26,
            paddingTop: 22,
          }}
        >
          <View>
            <Image
              accessibilityLabel="Buy Food logo"
              resizeMode="contain"
              source={require('../images/buy-food-logo.png')}
              style={{
                backgroundColor: '#FFFEFB',
                borderRadius: 21,
                height: 76,
                width: 76,
              }}
            />
            <Text
              style={{
                color: '#DDEDE3',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 3,
                marginTop: 13,
              }}
            >
              CHEF WORKSPACE
            </Text>
            <View
              style={{
                backgroundColor: '#E8B94F',
                borderRadius: 3,
                height: 4,
                marginTop: 10,
                width: 42,
              }}
            />
          </View>
          <ChefArtwork />
        </View>
      </View>

      <View style={{ marginTop: -4, paddingHorizontal: 28, paddingBottom: 26 }}>
        <View style={{ marginBottom: 22 }}>
          <Text
            style={{
              color: '#064E3B',
              fontSize: 34,
              fontWeight: '800',
              letterSpacing: -1,
            }}
          >
            Welcome <Text style={{ color: '#E4A525' }}>Back!</Text>
          </Text>
          <Text
            style={{
              color: '#82858A',
              fontSize: 15,
              lineHeight: 22,
              marginTop: 2,
            }}
          >
            Sign in to continue to your chef workspace
          </Text>
        </View>

        {notice ? (
          <Text
            accessibilityRole="alert"
            style={{
              backgroundColor: '#ECFDF3',
              borderRadius: 12,
              color: '#027A48',
              fontSize: 13,
              marginBottom: 16,
              padding: 12,
            }}
          >
            {notice}
          </Text>
        ) : null}

        <LoginField
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
          icon={<MailIcon color="#064E3B" size={22} />}
          label="Email or Username"
          onChangeText={setIdentifier}
          placeholder="you@example.com or username"
          returnKeyType="next"
          value={identifier}
        />
        <LoginField
          autoComplete="password"
          icon={<LockIcon color="#064E3B" size={22} />}
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter your password"
          returnKeyType="done"
          rightAccessory={
            <Pressable
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setShowPassword(visible => !visible)}
              style={{ padding: 8 }}
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
          style={{ alignSelf: 'flex-end', marginBottom: 19, marginTop: -4 }}
        >
          <Text
            style={{
              borderBottomColor: '#E4A525',
              borderBottomWidth: 1,
              color: '#064E3B',
              fontSize: 13,
              fontWeight: '700',
              paddingBottom: 2,
            }}
          >
            Forgot Password?
          </Text>
        </Pressable>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.error, fontSize: 13, marginBottom: 14 }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel="Login"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleLogin}
          style={{
            alignItems: 'center',
            backgroundColor: '#064E3B',
            borderRadius: 32,
            flexDirection: 'row',
            justifyContent: 'center',
            minHeight: 58,
            opacity: isSubmitting ? 0.75 : 1,
            shadowColor: '#064E3B',
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginRight: 9 }} />
          ) : null}
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
            {isSubmitting ? 'Signing in…' : 'Login'}
          </Text>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#F6CD62',
              borderRadius: 22,
              height: 42,
              justifyContent: 'center',
              position: 'absolute',
              right: 7,
              width: 42,
            }}
          >
            <ArrowIcon color="#064E3B" size={22} />
          </View>
        </Pressable>

      </View>
    </View>
  );
}

function LoginField({
  icon,
  label,
  rightAccessory,
  ...inputProps
}: {
  icon: React.ReactNode;
  label: string;
  rightAccessory?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#FFFEFB',
        borderColor: '#E5E9DD',
        borderRadius: 17,
        borderWidth: 1,
        flexDirection: 'row',
        marginBottom: 12,
        minHeight: 68,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#E8F1E2',
          borderRadius: 24,
          height: 46,
          justifyContent: 'center',
          marginRight: 12,
          width: 46,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          style={{
            color: '#263238',
            fontSize: 13,
            fontWeight: '600',
            marginBottom: 1,
          }}
        >
          {label}
        </Text>
        <TextInput
          placeholderTextColor="#96999D"
          style={{
            color: '#344054',
            fontSize: 14,
            minHeight: 24,
            padding: 0,
          }}
          {...inputProps}
        />
      </View>
      {rightAccessory}
    </View>
  );
}

function ChefArtwork() {
  return (
    <Svg width={190} height={178} viewBox="0 0 190 178">
      <Ellipse cx="103" cy="160" rx="66" ry="8" fill="#001E17" opacity="0.2" />
      <Path
        d="M28 117c-11-8-16-18-17-31 13 3 22 11 26 24m-26-24C6 75 4 65 6 55c11 7 17 17 18 29m13 26c4-17 13-27 28-32-1 16-8 28-24 36"
        fill="#A4BD61"
      />
      <Path
        d="M28 117 12 86m15 19L13 69m18 48 27-32"
        fill="none"
        stroke="#506E3C"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <Path
        d="M72 126c0-23 13-39 37-41 24 2 37 18 37 41v25H72Z"
        fill="#F4F0E7"
      />
      <Path
        d="M75 48c-1-12 9-21 20-20 5-18 33-18 39 1 11-2 20 7 19 18-1 12-10 18-22 18H93C82 65 76 59 75 48Z"
        fill="#FFFCF5"
        stroke="#E8E3D8"
        strokeWidth="3"
      />
      <Path
        d="M95 66v13m28-13v13m-28 1c9 7 19 7 28 0"
        fill="none"
        stroke="#D8D1C4"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <Path
        d="m51 69 34 47m-38-51 8-6 7 10-8 6Zm35 47 7 11"
        fill="none"
        stroke="#C78B48"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <Path d="M54 65c-3-7-2-15 3-18 5 0 9 5 12 12l-15 6Z" fill="#DFA66A" />
      <Path
        d="m143 91 16 21-7 6-16-21Zm9 27 9 12m-5-22 8 10m-15-6 8 10"
        fill="none"
        stroke="#D9A15F"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <Rect x="94" y="106" width="31" height="4" rx="2" fill="#D7D1C5" />
      <Circle cx="106" cy="91" r="2" fill="#D7D1C5" />
    </Svg>
  );
}

function ArrowIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12h15m-6-6 6 6-6 6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default LoginPage;
