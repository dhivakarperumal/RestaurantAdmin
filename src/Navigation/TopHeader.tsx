import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import colors from '../theme/colors';

type TopHeaderProps = {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
};

function TopHeader({ title, subtitle, rightContent }: TopHeaderProps) {
  return (
    <View
      className="min-h-16 flex-row items-center justify-between px-5 py-3"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-1">
        <Text
          className="text-xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="mt-0.5 text-sm"
            style={{ color: colors.textSecondary }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightContent}
    </View>
  );
}

export default TopHeader;
