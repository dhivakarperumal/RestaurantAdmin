import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
          className={`relative min-h-[132px] w-[48%] flex-row items-center overflow-hidden rounded-2xl border bg-[#FFFEF8] px-2 ${
            stat.isSelected ? 'border-[#07513A]' : 'border-[#E8C654]'
          }`}
        >
          <View
            pointerEvents="none"
            className="absolute -bottom-9 -right-7 h-28 w-28 rounded-full bg-[#F0F6E9]"
          />
          <Svg
            pointerEvents="none"
            width="100%"
            height="100%"
            viewBox="0 0 200 132"
            preserveAspectRatio="none"
            className="absolute inset-0"
          >
            <Path
              d="M168 132 C183 128 191 119 200 106 L200 132 Z"
              fill="#E5B92E"
            />
            <Path
              d="M170 132 C185 128 194 119 200 110"
              fill="none"
              stroke="#F8D56A"
              strokeWidth="2"
            />
          </Svg>
          <View className="z-10 h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-[#EAF4E7]">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#07513A]">
              {stat.icon}
            </View>
          </View>
          <View className="z-10 min-w-0 flex-1 justify-center py-3 pl-2">
            <Text
              numberOfLines={1}
              className="text-[9px] font-extrabold uppercase tracking-[0.35px] text-[#07513A]"
            >
              {stat.label}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              className="mt-0.5 text-[26px] font-extrabold leading-[30px] text-[#06452F]"
            >
              {isLoading ? '...' : stat.value}
            </Text>
            <View className="mb-1 mt-1 h-[3px] w-8 rounded-full bg-[#E5B92E]" />
            <Text numberOfLines={2} className="text-[9px] leading-3 text-[#667085]">
              {stat.hint}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export default ChefStatCards;
