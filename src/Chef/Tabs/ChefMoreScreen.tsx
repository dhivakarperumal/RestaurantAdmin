import { Pressable, Text, View } from 'react-native';
import { ProductIcon, ReceiptIcon } from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';

type ChefMoreScreenProps = {
  onSelectPage: (page: 'inventory' | 'stock' | 'back-home') => void;
};

function MenuRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: 'inventory' | 'stock';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Open ${title}`}
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[68px] w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3"
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F3F7FF' : colors.surface,
      })}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF]">
        {icon === 'inventory' ? (
          <ReceiptIcon color={colors.primary} size={18} />
        ) : (
          <ProductIcon color={colors.primary} size={18} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-[#012711]">{title}</Text>
        <Text className="mt-0.5 text-[10px] leading-4 text-[#6B7280]">
          {subtitle}
        </Text>
      </View>
      <Text className="text-xl text-[#9CA3AF]">›</Text>
    </Pressable>
  );
}

function ChefMoreScreen({ onSelectPage }: ChefMoreScreenProps) {
  return (
    <View className="mx-auto w-full max-w-[1100px] px-1 pb-7 pt-2">
      {/* <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        KITCHEN TOOLS
      </Text> */}
      <Text className="mt-1 text-2xl font-bold text-[#012711]">More</Text>
      <Text className="mt-1 mb-2 text-sm leading-[21px] text-[#6B7280]">
        Open other tools for your kitchen workspace.
      </Text>

      {/* <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-[1px] text-[#6B7280]">
        Inventory
      </Text> */}
      <View className="gap-2">
        <MenuRow
          title="Inventory Requests"
          subtitle="Track kitchen stock requests."
          icon="inventory"
          onPress={() => onSelectPage('inventory')}
        />
        <MenuRow
          title="Stock Details"
          subtitle="Check current food stock levels."
          icon="stock"
          onPress={() => onSelectPage('stock')}
        />
      </View>

      <Pressable
        accessibilityLabel="Back Home"
        accessibilityRole="button"
        onPress={() => onSelectPage('back-home')}
        className="mt-5 min-h-11 items-center justify-center rounded-xl bg-[#F0F7EE]"
      >
        <Text className="text-sm font-bold text-[#116C0B]">Back Home</Text>
      </Pressable>
    </View>
  );
}

export default ChefMoreScreen;
