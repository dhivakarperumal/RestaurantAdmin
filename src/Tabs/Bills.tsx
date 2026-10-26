import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { PlusIcon, ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../theme/colors';

export type BillFood = {
  id: string;
  name: string;
  category: string;
  image?: string;
  price: number | null;
};

type BillsProps = {
  foods: BillFood[];
  billingItems: { amount: number }[];
  isLoading: boolean;
  error: string;
  onAddFood: (food: BillFood) => void;
  onOpenBilling: () => void;
  onRefresh: () => void;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FoodImage({ food }: { food: BillFood }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [food.image]);

  return (
    <View className="w-full overflow-hidden rounded-lg bg-[#F0F7EE]" style={{ aspectRatio: 1.32 }}>
      {food.image && !hasError ? (
        <Image
          accessibilityLabel={`${food.name} image`}
          onError={() => setHasError(true)}
          resizeMode="cover"
          source={{ uri: food.image }}
          className="h-full w-full"
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <ProductIcon color={colors.primary} size={32} />
        </View>
      )}
    </View>
  );
}

function Bills({
  foods,
  billingItems,
  isLoading,
  error,
  onAddFood,
  onOpenBilling,
  onRefresh,
}: BillsProps) {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.min(screenWidth, 1100) - 32;
  const gap = 12;
  const cardWidth = (contentWidth - gap) / 2;
  const total = billingItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <ScrollView
      contentContainerStyle={{
        alignSelf: 'center',
        maxWidth: 1100,
        paddingBottom: 28,
        paddingHorizontal: 16,
        paddingTop: 20,
        width: '100%',
      }}
    >
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-[#012711]">Add food to billing</Text>
          <Text className="mt-1 text-xs text-[#6B7280]">Select menu items to build a bill.</Text>
        </View>
        <Pressable
          accessibilityLabel={`View billing, ${billingItems.length} ${billingItems.length === 1 ? 'item' : 'items'}`}
          accessibilityRole="button"
          onPress={onOpenBilling}
          className="rounded-xl bg-[#116C0B] px-3 py-2.5"
        >
          <Text className="text-xs font-bold text-white">
            Bill · {billingItems.length} · {formatCurrency(total)}
          </Text>
        </Pressable>
      </View>

      {isLoading && foods.length === 0 ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-[#6B7280]">Loading food items...</Text>
        </View>
      ) : error && foods.length === 0 ? (
        <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <Text accessibilityRole="alert" className="text-center text-sm text-[#DC2626]">
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry loading food items"
            accessibilityRole="button"
            onPress={onRefresh}
            className="rounded-xl bg-[#116C0B] px-4 py-2.5"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : foods.length === 0 ? (
        <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <ProductIcon color={colors.textSecondary} size={28} />
          <Text className="text-base font-bold text-[#012711]">No food items found</Text>
          <Text className="text-center text-sm text-[#6B7280]">
            Add food to your menu to start building a bill.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ columnGap: gap, rowGap: gap }}>
          {foods.map(food => (
            <View
              key={food.id}
              className="rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-sm"
              style={{ width: cardWidth }}
            >
              <FoodImage food={food} />
              <Text numberOfLines={1} className="mt-2 text-sm font-semibold text-[#111827]">
                {food.name}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-xs text-[#6B7280]">
                {food.category}
              </Text>
              <View className="mt-2 flex-row items-center justify-between gap-2">
                <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-bold text-[#111827]">
                  {food.price === null ? 'Price unavailable' : formatCurrency(food.price)}
                </Text>
                <Pressable
                  accessibilityLabel={`Add ${food.name} to billing`}
                  accessibilityRole="button"
                  disabled={food.price === null}
                  onPress={() => onAddFood(food)}
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    food.price === null ? 'bg-[#D1D5DB]' : 'bg-[#FF5A00]'
                  }`}
                >
                  <PlusIcon color="#FFFFFF" size={19} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default Bills;