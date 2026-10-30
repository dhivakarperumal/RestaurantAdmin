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
      {stats.map(stat => {
        const cardClassName = `relative min-h-[100px] w-[48%] flex-row items-center overflow-hidden rounded-2xl border bg-[#FFFEF8] px-2 ${
          stat.isSelected ? 'border-[#07513A]' : 'border-[#E8C654]'
        }`;
        const cardContent = (
          <>
            <View
              pointerEvents="none"
              className="absolute -bottom-9 -right-7 h-28 w-28 rounded-full bg-[#F0F6E9]"
            />
            <View
              pointerEvents="none"
              className="absolute -bottom-1 -right-1 h-8 w-14 rounded-tl-full bg-[#E5B92E]"
            />
            <View
              className="flex-1 flex-row items-center"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <View className="h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-[#EAF4E7]">
                <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#07513A]">
                  {stat.icon}
                </View>
              </View>
              <View className="min-w-0 flex-1 justify-center py-3 pl-2">
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
                <Text
                  numberOfLines={2}
                  className="text-[9px] leading-3 text-[#667085]"
                >
                  {stat.hint}
                </Text>
              </View>
            </View>
          </>
        );

        return stat.onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(stat.isSelected) }}
            key={stat.label}
            onPress={stat.onPress}
            className={cardClassName}
          >
            {cardContent}
          </Pressable>
        ) : (
          <View key={stat.label} className={cardClassName}>
            {cardContent}
          </View>
        );
      })}
    </View>
  );
}

export default ChefStatCards;
