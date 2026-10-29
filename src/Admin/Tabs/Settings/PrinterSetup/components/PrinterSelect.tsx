import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BaseModal, CheckIcon, ChevronDownIcon } from '../../../../../components/popups';

type PrinterSelectProps<T extends string> = {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
};

export function PrinterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: PrinterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View className="mb-4">
        <Text className="mb-1.5 text-[13px] font-semibold text-[#1E293B]">{label}</Text>
        <Pressable
          className="min-h-[48px] flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 active:bg-gray-100"
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label}`}
        >
          <Text className="text-[14px] font-medium text-[#0F172A]">{value}</Text>
          <ChevronDownIcon size={18} color="#64748B" />
        </Pressable>
      </View>

      <BaseModal
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`Choose a preferred ${label.toLowerCase()}`}
        variant="bottom-sheet"
      >
        <FlatList
          data={options}
          keyExtractor={item => item}
          renderItem={({ item }) => {
            const isSelected = item === value;
            return (
              <Pressable
                className={`my-1 flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${
                  isSelected ? 'bg-[#10B981]/10' : 'bg-transparent active:bg-gray-50'
                }`}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={item}
              >
                <Text
                  className="text-[15px]"
                  style={{
                    color: isSelected ? '#10B981' : '#1E293B',
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {item}
                </Text>
                {isSelected && <CheckIcon size={18} color="#10B981" />}
              </Pressable>
            );
          }}
        />
      </BaseModal>
    </>
  );
}
