import { Pressable, Text, View } from 'react-native';
import {
  DeliveryScooterIcon,
  TableOrderIcon,
  TakeawayBagIcon,
} from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';
import { BaseModal } from '../../components/popups';
import type { NewOrderType } from '../Navigation/DashboardTypes';

const orderTypes: {
  type: NewOrderType;
  title: string;
  description: string;
  Icon: typeof TableOrderIcon;
}[] = [
  {
    type: 'DINE_IN',
    title: 'Dine-In / Table',
    description: 'Choose a table and send items to the kitchen.',
    Icon: TableOrderIcon,
  },
  {
    type: 'HOME_DELIVERY',
    title: 'Home Delivery',
    description: 'Create an order for delivery to a customer.',
    Icon: DeliveryScooterIcon,
  },
  {
    type: 'PICK_UP',
    title: 'Pick Up',
    description: 'Prepare an order for customer collection.',
    Icon: TakeawayBagIcon,
  },
];

export default function OrderTypeSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: NewOrderType) => void;
}) {
  return (
    <BaseModal
      accessibilityLabel="Select Order Type"
      closeOnBackdropPress
      onClose={onClose}
      title="Select Order Type"
      subtitle="Choose how this order will be served."
      variant="bottom-sheet"
      visible={visible}
      maxHeightPercent={80}
      contentContainerStyle={{
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 8,
      }}
    >
      {orderTypes.map(({ type, title, description, Icon }) => (
        <Pressable
          accessibilityLabel={title}
          accessibilityRole="button"
          key={type}
          onPress={() => onSelect(type)}
          className="flex-row items-center gap-3 rounded-2xl border border-[#DCE8D8] bg-white p-3.5"
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
            borderColor: pressed ? colors.primaryLight : colors.borderLight,
          })}
        >
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#F0F7EE]">
            <Icon color={colors.primary} size={25} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-[#012711]">{title}</Text>
            <Text className="mt-1 text-xs leading-4 text-[#6B7280]">
              {description}
            </Text>
          </View>
          <Text className="text-xl font-semibold text-[#81C238]">›</Text>
        </Pressable>
      ))}
    </BaseModal>
  );
}
