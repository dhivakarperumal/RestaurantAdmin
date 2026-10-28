import type { ComponentType } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import colors from '../../theme/colors';

type MoreFeatureIconProps = {
  color: string;
  size?: number;
};

export type MoreFeature = {
  title: string;
  subtitle: string;
  icon: ComponentType<MoreFeatureIconProps>;
  action?: string;
};

type MorePageProps = {
  features: MoreFeature[];
  onSelectFeature: (feature: string) => void;
};

function MorePage({ features, onSelectFeature }: MorePageProps) {
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        TOOLS
      </Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">More</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Everything you need to run your business.
      </Text>
      <View className="mt-[22px] gap-3">
        {features.map(feature => {
          const Icon = feature.icon;
          return (
            <Pressable
              accessibilityLabel={`Open ${feature.title}`}
              accessibilityRole="button"
              key={feature.title}
              onPress={() => onSelectFeature(feature.title)}
              className="min-h-[76px] w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F3F7FF' : colors.surface,
              })}
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
                <Icon color={colors.primary} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#012711]">
                  {feature.title}
                </Text>
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
                  {feature.subtitle}
                </Text>
              </View>
              <Text className="text-xl text-[#9CA3AF]">›</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default MorePage;