import React, { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { ChevronDownIcon, CheckIcon } from './PrinterIcons';

type PrinterSelectProps<T extends string> = {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
};

export function PrinterSelect<T extends string>({ label, options, value, onChange }: PrinterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View className="mb-4">
        <Text className="mb-1.5 text-[13px] font-semibold text-[#1E293B]">{label}</Text>
        <Pressable
          className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5"
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label}`}
        >
          <Text className="text-[14px] text-[#0F172A]">{value}</Text>
          <ChevronDownIcon />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
          accessibilityLabel="Close selector"
        />
        <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
          <Text className="mb-4 mt-3 text-base font-bold text-[#0F172A]">{label}</Text>
          <FlatList
            data={options}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <Pressable
                className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3.5"
                onPress={() => { onChange(item); setOpen(false); }}
                accessibilityRole="button"
              >
                <Text
                  className="text-[15px]"
                  style={{ color: item === value ? '#10B981' : '#1E293B', fontWeight: item === value ? '700' : '500' }}
                >
                  {item}
                </Text>
                {item === value && <CheckIcon />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
