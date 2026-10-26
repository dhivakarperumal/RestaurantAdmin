import React from 'react';
import { Text, TextInput, View } from 'react-native';

type PrinterInputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'number-pad' | 'numbers-and-punctuation' | 'decimal-pad';
};

export function PrinterInput({ label, placeholder, value, onChangeText, keyboardType = 'default' }: PrinterInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[13px] font-semibold text-[#1E293B]">{label}</Text>
      <TextInput
        className="min-h-[44px] rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 text-[14px] text-[#0F172A]"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}
