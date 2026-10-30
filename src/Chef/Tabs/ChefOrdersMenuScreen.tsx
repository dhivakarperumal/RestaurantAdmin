import { Pressable, Text, View } from 'react-native';
import { OrdersIcon } from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';
import type { ChefOrderPage } from './ChefOrdersScreen';

type ChefOrdersMenuScreenProps = {
  onSelectPage: (page: ChefOrderPage) => void;
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

function ChefOrdersMenuScreen({ onSelectPage }: ChefOrdersMenuScreenProps) {
  return (
    <View className="mx-auto w-full max-w-[1100px] px-1 pb-7 pt-2">
     
      <Text className="mt-1 text-2xl font-bold text-[#012711]">Orders</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Choose an order view to review and update kitchen progress.
      </Text>
      <View className="mt-5 gap-2">
        {orderPages.map(page => (
          <Pressable
            accessibilityLabel={`Open ${page.label}`}
            accessibilityRole="button"
            key={page.key}
            onPress={() => onSelectPage(page.key)}
            className="min-h-[68px] w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#F3F7FF' : colors.surface,
            })}
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF]">
              <OrdersIcon color={colors.primary} size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-[#012711]">
                {page.label}
              </Text>
              <Text className="mt-0.5 text-[10px] leading-4 text-[#6B7280]">
                {page.subtitle}
              </Text>
            </View>
            <Text className="text-xl text-[#9CA3AF]">›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default ChefOrdersMenuScreen;
