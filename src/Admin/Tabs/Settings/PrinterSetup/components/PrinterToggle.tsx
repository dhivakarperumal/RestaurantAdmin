import React from 'react';
import { Switch, Text, View } from 'react-native';

type PrinterToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function PrinterToggle({ label, value, onChange }: PrinterToggleProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3">
      <Text className="flex-1 text-sm font-medium text-[#1E293B]">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: '#10B981' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  );
}
