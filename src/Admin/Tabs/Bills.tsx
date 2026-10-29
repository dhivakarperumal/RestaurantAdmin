import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import { PlusIcon, ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';
import BillPreview, { type BillPreviewItem } from './BillPreview';

export type BillFood = {
  id: string;
  name: string;
  category: string;
  productId?: string;
  cuisineId?: string;
  description?: string;
  image?: string;
  price: number | null;
  stock?: string;
  status?: string;
  variantDetails: string[];
};

type BillsProps = {
  billingItems: BillPreviewItem[];
  onAddFood: (food: BillFood) => void;
  onRemoveBillingItem: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onOpenBilling: () => void;
  onConfirmBill: () => void;
  onBillPreviewVisibilityChange: (isVisible: boolean) => void;
};

type FoodRecord = Record<string, unknown>;

function isRecord(value: unknown): value is FoodRecord {
  return typeof value === 'object' && value !== null;
}

function readFoods(payload: unknown, depth = 0): FoodRecord[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of ['foods', 'products', 'items', 'data']) {
    if (key in payload) {
      const rows = readFoods(payload[key], depth + 1);
      if (rows.length || Array.isArray(payload[key])) {
        return rows;
      }
    }
  }
  return [];
}

function firstText(...values: unknown[]) {
  return values.find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  )?.trim();
}

function normalizePrice(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getFoodPrice(food: FoodRecord): number | null {
  for (const key of [
    'final_price',
    'finalPrice',
    'selling_price',
    'sellingPrice',
    'selling_rate',
    'sellingRate',
    'price',
    'unit_price',
    'unitPrice',
    'price_per_unit',
    'food_price',
    'foodPrice',
    'food_rate',
    'foodRate',
    'base_price',
    'mrp',
    'variant_price',
    'amount',
  ]) {
    const price = normalizePrice(food[key]);
    if (price !== null) {
      return price;
    }
  }
  const variants = readFoodVariants(
    food.size_variants ?? food.variants ?? food.food_variants,
  );
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (isRecord(variant)) {
        const price = getFoodPrice(variant);
        if (price !== null) {
          return price;
        }
      }
    }
  }
  return null;
}

function readFoodVariants(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function resolveImage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const image = value.trim();
    if (!image) {
      return undefined;
    }
    if (image.startsWith('{') || image.startsWith('[')) {
      try {
        return resolveImage(JSON.parse(image) as unknown);
      } catch {
        return undefined;
      }
    }
    if (/^(https?:|data:image\/|file:|content:)/i.test(image)) {
      return image;
    }
    if (image.startsWith('//')) {
      const protocol = API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:';
      return `${protocol}${image}`;
    }
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${apiRoot}/${image.replace(/^\.?\//, '')}`;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = resolveImage(entry);
      if (image) {
        return image;
      }
    }
  } else if (isRecord(value)) {
    for (const key of ['url', 'image_url', 'imageUrl', 'image', 'src', 'path']) {
      const image = resolveImage(value[key]);
      if (image) {
        return image;
      }
    }
  }
  return undefined;
}

function toBillFood(food: FoodRecord, index: number): BillFood {
  const name =
    firstText(food.food_name, food.product_name, food.productName, food.name) ||
    'Unnamed food';
  const rawId = food.food_id ?? food.id ?? `${name}-${index}`;
  const rawStock =
    food.current_stock ?? food.stock_quantity ?? food.stock ?? food.quantity;
  const parsedStock = normalizePrice(rawStock);
  const rawVariants = readFoodVariants(
    food.size_variants ?? food.variants ?? food.food_variants,
  );
  const variantDetails = rawVariants.length
    ? rawVariants.filter(isRecord).map(variant => {
        const variantName = firstText(
          variant.size,
          variant.size_name,
          variant.variant_name,
          variant.name,
        );
        const variantPrice = getFoodPrice(variant);
        if (variantName && variantPrice !== null) {
          return `${variantName} · ${formatCurrency(variantPrice)}`;
        }
        if (variantName) {
          return variantName;
        }
        return variantPrice === null ? '' : formatCurrency(variantPrice);
      }).filter(Boolean)
    : [];
  return {
    id: String(rawId),
    name,
    category: firstText(
      food.category_name,
      food.category,
      food.subcategory_name,
      food.sub_category,
      food.cuisine_name,
      food.cuisine,
    ) ||
      'Uncategorized',
    productId: firstText(food.food_id, food.product_id, food.id),
    cuisineId: firstText(food.cuisine_id),
    description: firstText(
      food.description,
      food.food_description,
      food.details,
      food.ingredients,
    ),
    image: resolveImage(
      food.food_images ?? food.food_image ?? food.image_url ?? food.image,
    ),
    price: getFoodPrice(food),
    stock: parsedStock === null ? undefined : String(parsedStock),
    status: firstText(food.status, food.food_status, food.availability),
    variantDetails,
  };
}

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
  billingItems,
  onAddFood,
  onRemoveBillingItem,
  onQuantityChange,
  onOpenBilling,
  onConfirmBill,
  onBillPreviewVisibilityChange,
}: BillsProps) {
  const [foods, setFoods] = useState<BillFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.min(screenWidth, 1100) - 32;
  const gap = 12;
  const cardWidth = (contentWidth - gap) / 2;
  const total = billingItems.reduce(
    (sum, item) => sum + (item.amount ?? 0) * item.quantity,
    0,
  );
  const openBillPreview = () => {
    setIsPreviewOpen(true);
    onBillPreviewVisibilityChange(true);
  };
  const closeBillPreview = () => {
    setIsPreviewOpen(false);
    onBillPreviewVisibilityChange(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadFoods = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/foods', { signal: controller.signal });
        if (isActive) {
          setFoods(readFoods(response.data).map(toBillFood));
        }
      } catch (loadError) {
        if (isActive && !controller.signal.aborted) {
          setError(
            isRecord(loadError) && typeof loadError.message === 'string'
              ? loadError.message
              : 'Unable to load food items. Please try again.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadFoods();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [retry]);

  if (isPreviewOpen) {
    return (
      <BillPreview
        items={billingItems}
        onRemoveItem={onRemoveBillingItem}
        onQuantityChange={onQuantityChange}
        onConfirm={onConfirmBill}
        onBack={closeBillPreview}
      />
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => setRetry(current => current + 1)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
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

      {billingItems.length ? (
        <View className="mb-4 rounded-xl border border-[#E5E7EB] bg-white p-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-[#012711]">Bill preview</Text>
            <Text className="text-xs font-semibold text-[#6B7280]">
              {billingItems.length} {billingItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          {billingItems.slice(0, 3).map(item => (
            <View key={item.id} className="mt-2 flex-row items-center justify-between gap-3">
              <Text numberOfLines={1} className="min-w-0 flex-1 text-xs text-[#374151]">
                {item.name} × {item.quantity}
              </Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {item.amount === null
                  ? 'Price needed'
                  : formatCurrency(item.amount * item.quantity)}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityLabel="Review bill"
            accessibilityRole="button"
            onPress={openBillPreview}
            className="mt-3 items-center rounded-lg bg-[#116C0B] px-4 py-2.5"
          >
            <Text className="text-sm font-bold text-white">Review bill</Text>
          </Pressable>
        </View>
      ) : null}

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
            onPress={() => setRetry(count => count + 1)}
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
              {food.productId ? (
                <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#9CA3AF]">
                  ID: {food.productId}
                </Text>
              ) : null}
              {food.cuisineId ? (
                <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#9CA3AF]">
                  Cuisine ID: {food.cuisineId}
                </Text>
              ) : null}
              {food.description ? (
                <Text numberOfLines={2} className="mt-1 text-[11px] leading-4 text-[#6B7280]">
                  {food.description}
                </Text>
              ) : null}
              <View className="mt-2 flex-row items-center justify-between gap-2">
                <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-bold text-[#111827]">
                  {food.price === null ? 'Price unavailable' : formatCurrency(food.price)}
                </Text>
                <Pressable
                  accessibilityLabel={`Add ${food.name} to billing`}
                  accessibilityRole="button"
                  onPress={() => onAddFood(food)}
                  className="h-9 w-9 items-center justify-center rounded-full bg-[#116C0B]"
                >
                  <PlusIcon color="#FFFFFF" size={19} />
                </Pressable>
              </View>
              {food.variantDetails.length ? (
                <Text className="mt-2 text-[10px] leading-4 text-[#6B7280]">
                  {food.variantDetails.join('  ·  ')}
                </Text>
              ) : null}
              {(food.stock || food.status) ? (
                <Text className="mt-1 text-[10px] text-[#6B7280]">
                  {[food.stock ? `${food.stock} in stock` : null, food.status]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default Bills;