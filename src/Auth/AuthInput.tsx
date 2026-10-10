import { Text, TextInput, View, type TextInputProps } from 'react-native';
import colors from '../theme/colors';

type AuthInputProps = TextInputProps & {
  label: string;
};

function AuthInput({ label, ...inputProps }: AuthInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.textPrimary }}>
        {label}
      </Text>
      <TextInput
        className="rounded-xl border px-4 py-3 text-base"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.textPrimary,
        }}
        placeholderTextColor={colors.textSecondary}
        {...inputProps}
      />
    </View>
  );
}

export default AuthInput;
