import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { ComponentType, ReactNode } from 'react';
import colors from '../theme/colors';
import type { AuthIconProps } from './AuthIcons';

type AuthInputProps = TextInputProps & {
  label: string;
  icon?: ComponentType<AuthIconProps>;
  rightAccessory?: ReactNode;
};

function AuthInput({ label, icon: Icon, rightAccessory, ...inputProps }: AuthInputProps) {
  return (
    <View style={{ gap: 7, marginBottom: 16 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 14,
          borderWidth: 1,
          flexDirection: 'row',
          minHeight: 54,
          paddingHorizontal: 14,
        }}
      >
        {Icon ? <Icon color={colors.textSecondary} size={19} /> : null}
        <TextInput
          style={{
            color: colors.textPrimary,
            flex: 1,
            fontSize: 15,
            minHeight: 52,
            paddingHorizontal: Icon ? 11 : 0,
            paddingVertical: 10,
          }}
          placeholderTextColor={colors.textSecondary}
          {...inputProps}
        />
        {rightAccessory}
      </View>
    </View>
  );
}

export default AuthInput;
