import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import LoginPage, { type LoginValues } from './LoginPage';

type AuthScreenProps = {
  onLogin?: (values: LoginValues) => Promise<void>;
};

function AuthScreen({ onLogin }: AuthScreenProps) {
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <LoginPage onLogin={onLogin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AuthScreen;
