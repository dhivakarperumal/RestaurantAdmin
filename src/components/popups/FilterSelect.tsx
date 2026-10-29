import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BaseModal } from './BaseModal';
import { CheckIcon, ChevronDownIcon } from './LucideIcons';

export type FilterOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export function FilterSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: FilterOption<Value>[];
  onChange: (value: Value) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel =
    options.find(option => option.value === value)?.label ?? value;

  return (
    <>
      <View className="min-w-0 flex-1">
        <Pressable
          accessibilityLabel={`${label}: ${selectedLabel}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          onPress={() => setIsOpen(true)}
          className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3"
        >
          <Text
            className="min-w-0 flex-1 text-sm font-medium text-[#1E293B]"
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
          <ChevronDownIcon size={17} color="#64748B" />
        </Pressable>
      </View>

      <BaseModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Filter by ${label.toLowerCase()}`}
        subtitle="Choose an option to update the results."
        variant="bottom-sheet"
      >
        <ScrollView
          className="max-h-[360px]"
          contentContainerClassName="gap-1 pb-4"
          keyboardShouldPersistTaps="handled"
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityLabel={`${label}: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`my-0.5 min-h-12 flex-row items-center justify-between rounded-xl px-4 py-3 ${
                  isSelected
                    ? 'border border-[#116C0B]/20 bg-[#116C0B]/10'
                    : 'border border-transparent bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${
                    isSelected
                      ? 'font-bold text-[#116C0B]'
                      : 'font-medium text-[#334155]'
                  }`}
                >
                  {option.label}
                </Text>
                {isSelected ? <CheckIcon size={18} color="#116C0B" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BaseModal>
    </>
  );
}
