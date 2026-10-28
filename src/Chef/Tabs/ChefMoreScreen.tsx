import { Pressable, Text, View } from 'react-native';
import { ReceiptIcon } from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';

type ChefMoreScreenProps = {
  onOpenEventOrders: () => void;
};

function ChefMoreScreen({ onOpenEventOrders }: ChefMoreScreenProps) {
  return (
    <View className="mx-auto w-full max-w-[1100px] px-1 pb-7 pt-2">
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        KITCHEN TOOLS
      </Text>
      <Text className="mt-1 text-2xl font-bold text-[#012711]">More</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Open other tools for your kitchen workspace.
      </Text>

      <Pressable
        accessibilityLabel="Open event catering orders"
        accessibilityRole="button"
        onPress={onOpenEventOrders}
        className="mt-5 min-h-[76px] w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#F3F7FF' : colors.surface,
        })}
      >
        <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
          <ReceiptIcon color={colors.primary} size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-[#012711]">
            Event Orders
          </Text>
          <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
            View confirmed catering orders and update kitchen progress.
          </Text>
        </View>
        <Text className="text-xl text-[#9CA3AF]">›</Text>
      </Pressable>
    </View>
  );
}

export default ChefMoreScreen;
