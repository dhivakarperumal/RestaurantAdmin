import { Pressable, Text, View } from 'react-native';
import { ReceiptIcon } from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';
import type { ChefOrderPage } from './ChefOrdersScreen';

type ChefMoreScreenProps = {
  onSelectPage: (
    page: ChefOrderPage | 'event-orders' | 'inventory' | 'back-home',
  ) => void;
};

const orderPages: { key: ChefOrderPage; label: string; subtitle: string }[] = [
  { key: 'kitchen', label: 'Kitchen Orders', subtitle: 'Dining tickets for kitchen preparation.' },
  { key: 'home-delivery', label: 'Home Delivery Orders', subtitle: 'Customer orders for home delivery.' },
  { key: 'pickup', label: 'Pickup Orders', subtitle: 'Orders prepared for customer pickup.' },
  { key: 'dining', label: 'Dining Orders', subtitle: 'Kitchen tickets from dining tables.' },
  { key: 'new', label: 'New Order', subtitle: 'New customer orders waiting to be prepared.' },
  { key: 'all', label: 'All Orders', subtitle: 'Review all customer orders.' },
  { key: 'delivery', label: 'Delivery Orders', subtitle: 'Assign active deliveries to available partners.' },
  { key: 'cancelled', label: 'Cancelled Orders', subtitle: 'Review cancelled customer orders.' },
];

function MenuRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
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
        <ReceiptIcon color={colors.primary} size={18} />
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
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        KITCHEN TOOLS
      </Text>
      <Text className="mt-1 text-2xl font-bold text-[#012711]">More</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Open other tools for your kitchen workspace.
      </Text>

      <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-[1px] text-[#6B7280]">
        Orders
      </Text>
      <View className="gap-2">
        {orderPages.map(page => (
          <MenuRow
            key={page.key}
            title={page.label}
            subtitle={page.subtitle}
            onPress={() => onSelectPage(page.key)}
          />
        ))}
        <MenuRow
          title="Event Orders"
          subtitle="Confirmed catering orders and kitchen progress."
          onPress={() => onSelectPage('event-orders')}
        />
      </View>

      <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-[1px] text-[#6B7280]">
        Kitchen
      </Text>
      <View className="gap-2">
        <MenuRow
          title="Inventory Requests"
          subtitle="Track kitchen stock requests."
          onPress={() => onSelectPage('inventory')}
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
