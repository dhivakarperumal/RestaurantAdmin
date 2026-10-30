import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export type ChefStat = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  onPress?: () => void;
  isSelected?: boolean;
};

function ChefStatCards({
  stats,
  isLoading = false,
}: {
  stats: ChefStat[];
  isLoading?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {stats.map(stat => (
        <Pressable
          accessibilityRole={stat.onPress ? 'button' : undefined}
          accessibilityState={
            stat.onPress ? { selected: Boolean(stat.isSelected) } : undefined
          }
          disabled={!stat.onPress}
          key={stat.label}
          onPress={stat.onPress}
          className={`min-h-[104px] w-[48%] flex-row overflow-hidden rounded-2xl border bg-[#FFFEF8] ${
            stat.isSelected ? 'border-[#07513A]' : 'border-[#E8C654]'
          }`}
        >
          <View className="w-[28%] items-center justify-center rounded-r-[26px] bg-[#07513A] px-1">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#0A6447]">
              {stat.icon}
            </View>
          </View>
          <View className="min-w-0 flex-1 justify-center py-3 pl-3 pr-2">
            <Text
              numberOfLines={1}
              className="text-[9px] font-extrabold uppercase tracking-[0.55px] text-[#07513A]"
            >
              {stat.label}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              className="mt-1 text-[24px] font-extrabold leading-[29px] text-[#06452F]"
            >
              {isLoading ? '...' : stat.value}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[9px] text-[#667085]">
              {stat.hint}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export default ChefStatCards;
