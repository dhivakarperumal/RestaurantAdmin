import React from 'react';
import { Switch, Text, View } from 'react-native';

type PrinterToggleProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
};

export function PrinterToggle({
  label,
  description,
  value,
  onChange,
  isLast = false,
}: PrinterToggleProps) {
  return (
    <View
      className={`min-h-[68px] flex-row items-center justify-between gap-3 py-3 ${
        isLast ? '' : 'border-b border-[#F1F5F9]'
      }`}
    >
      <View className="flex-1 pr-1">
        <Text className="text-[13px] font-semibold text-[#1E293B]">
          {label}
        </Text>
        {description ? (
          <Text className="mt-1 text-[11px] leading-4 text-[#64748B]">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: '#10B981' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  );
}
