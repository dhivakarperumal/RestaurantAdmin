import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
    <View
      className="min-w-0 flex-1"
      style={{ zIndex: isOpen ? 20 : 1, elevation: isOpen ? 20 : 0 }}
    >
      <Pressable
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(open => !open)}
        className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3"
      >
        <Text
          className="min-w-0 flex-1 text-sm font-medium text-[#1E293B]"
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <View
          style={{
            transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
          }}
        >
          <ChevronDownIcon size={17} color="#64748B" />
        </View>
      </Pressable>

      {isOpen ? (
        <View
          className="absolute left-0 right-0 top-[48px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg"
          style={{ elevation: 12, zIndex: 20 }}
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
                className={`min-h-12 flex-row items-center justify-between border-b border-[#F1F5F9] px-3 ${
                  isSelected ? 'bg-[#F0FDF4]' : 'bg-white'
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
        </View>
      ) : null}
    </View>
  );
}
