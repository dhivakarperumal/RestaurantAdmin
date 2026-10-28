import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';

type FoodRow = Record<string, unknown>;

export type ServerOrderTable = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: string | number;
  status?: string;
};

type CartItem = {
  food: FoodRow;
  quantity: number;
};

function readRows(payload: unknown, keys: string[]): FoodRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      item => typeof item === 'object' && item !== null,
    ) as FoodRow[];
  }
  if (typeof payload !== 'object' || payload === null) return [];
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (key in record) {
      const result = readRows(record[key], keys);
      if (result.length || Array.isArray(record[key])) return result;
    }
  }
  return [];
}

function textValue(row: FoodRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const value = String(raw).trim();
      if (value) return value;
    }
  }
  return fallback;
}

function priceValue(row: FoodRow): number {
  const price = Number(textValue(row, ['price', 'food_price', 'selling_price'], '0'));
  return Number.isFinite(price) ? price : 0;
}

function imageUri(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const source = value.trim();
  if (/^(https?:|data:image\/|file:|content:)/i.test(source)) return source;
  const root = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${root}/${source.replace(/^\.?\//, '')}`;
}

function foodImage(food: FoodRow): string | undefined {
  for (const key of ['food_images', 'food_image', 'food_image_url', 'image_url', 'image']) {
    const uri = imageUri(food[key]);
    if (uri) return uri;
  }
  return undefined;
}

function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ServerItems({
  table,
  onBack,
}: {
  table: ServerOrderTable;
  onBack: () => void;
}) {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeBill, setActiveBill] = useState<unknown>(null);

  const tableId = String(table.id ?? table.table_id ?? '');
  const tableLabel = String(table.table_number ?? table.id ?? table.table_id ?? '');

  const loadData = useCallback(async () => {
    setLoading(true);
    setBillLoading(true);
    setError('');
    const [foodResult, billResult] = await Promise.allSettled([
      api.get('/foods', { params: { include_unavailable: true } }),
      api.get(`/table-bills/active/${tableId}`),
    ]);

    if (foodResult.status === 'fulfilled') {
      setFoods(readRows(foodResult.value.data, ['data', 'foods', 'items']));
    } else {
      setError('Unable to load foods. Please try again.');
    }
    if (billResult.status === 'fulfilled') {
      setActiveBill(billResult.value.data);
    }
    setLoading(false);
    setBillLoading(false);
  }, [tableId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return foods;
    return foods.filter(food =>
      [
        textValue(food, ['food_name', 'name']),
        textValue(food, ['category_name', 'category']),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [foods, search]);

  const quantityFor = (food: FoodRow) =>
    cart.find(item => item.food === food)?.quantity ?? 0;

  const changeQuantity = (food: FoodRow, amount: number) => {
    setCart(current => {
      const existing = current.find(item => item.food === food);
      const nextQuantity = (existing?.quantity ?? 0) + amount;
      if (nextQuantity <= 0) {
        return current.filter(item => item.food !== food);
      }
      if (existing) {
        return current.map(item =>
          item.food === food ? { ...item, quantity: nextQuantity } : item,
        );
      }
      return [...current, { food, quantity: nextQuantity }];
    });
  };

  const total = cart.reduce(
    (sum, item) => sum + priceValue(item.food) * item.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sendToKitchen = async () => {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    try {
      const billRecord =
        activeBill && typeof activeBill === 'object'
          ? (activeBill as Record<string, unknown>)
          : {};
      const billData =
        billRecord.data && typeof billRecord.data === 'object'
          ? (billRecord.data as Record<string, unknown>)
          : billRecord;
      const items = cart.map(({ food, quantity }) => ({
        food_id: food.id ?? food.food_id ?? food.foodId,
        food_name: textValue(food, ['food_name', 'name'], 'Food'),
        quantity,
        price: priceValue(food),
      }));
      await api.post('/kitchen-orders', {
        table_id: tableId,
        table_number: tableLabel,
        items,
        total_amount: total,
        status: 'pending',
        ...(billData.bill_id || billData.id
          ? { bill_id: billData.bill_id ?? billData.id }
          : {}),
      });
      setCart([]);
      Alert.alert('Order sent', `The order for Table ${tableLabel} was sent to the kitchen.`);
    } catch (requestError) {
      const message =
        requestError && typeof requestError === 'object' && 'message' in requestError
          ? String((requestError as { message?: unknown }).message)
          : 'Unable to send the order to the kitchen.';
      Alert.alert('Order failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="px-4 pb-8 pt-4">
      <View className="mb-4 flex-row items-center">
        <Pressable
          accessibilityLabel="Back to assigned tables"
          onPress={onBack}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-2xl text-[#012711]">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-[#012711]">
            Add Items
          </Text>
          <Text className="mt-1 text-xs font-semibold text-[#64748B]">
            Table {tableLabel} · {table.no_of_seats ?? 4} seats
          </Text>
        </View>
        <View className="rounded-full bg-[#DCFCE7] px-3 py-2">
          <Text className="text-xs font-extrabold capitalize text-[#15803D]">
            {table.status ?? 'Occupied'}
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white p-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search foods"
          placeholderTextColor="#94A3B8"
          className="h-10 text-sm text-[#0F172A]"
        />
      </View>

      {billLoading ? (
        <View className="mb-3 flex-row items-center rounded-xl bg-[#FFF7ED] p-3">
          <ActivityIndicator size="small" color="#FF7800" />
          <Text className="ml-2 text-xs font-semibold text-[#9A3412]">
            Loading active bill...
          </Text>
        </View>
      ) : activeBill ? (
        <View className="mb-3 rounded-xl bg-[#F0FDF4] p-3">
          <Text className="text-xs font-bold text-[#166534]">
            Active bill loaded for this table
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color="#FF7800" />
          <Text className="mt-3 text-sm text-[#64748B]">Loading foods...</Text>
        </View>
      ) : error ? (
        <Text className="rounded-xl bg-[#FEF2F2] p-4 text-center text-sm font-semibold text-[#B91C1C]">
          {error}
        </Text>
      ) : visibleFoods.length ? (
        visibleFoods.map((food, index) => {
          const quantity = quantityFor(food);
          const image = foodImage(food);
          return (
            <View
              key={String(food.id ?? food.food_id ?? index)}
              className="mb-3 flex-row items-center rounded-2xl border border-[#E2E8F0] bg-white p-3"
            >
              {image ? (
                <Image source={{ uri: image }} className="h-16 w-16 rounded-xl" />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#FFF7ED]">
                  <Text className="text-2xl">🍽</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-sm font-extrabold text-[#0F172A]">
                  {textValue(food, ['food_name', 'name'], 'Food')}
                </Text>
                <Text className="mt-1 text-xs text-[#64748B]">
                  {textValue(food, ['category_name', 'category'], 'Main course')}
                </Text>
                <Text className="mt-1 text-sm font-extrabold text-[#116C0B]">
                  {formatPrice(priceValue(food))}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  accessibilityLabel="Decrease food quantity"
                  onPress={() => changeQuantity(food, -1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <Text className="text-lg font-bold text-[#475569]">−</Text>
                </Pressable>
                <Text className="mx-3 min-w-[16px] text-center text-sm font-extrabold text-[#0F172A]">
                  {quantity}
                </Text>
                <Pressable
                  accessibilityLabel="Increase food quantity"
                  onPress={() => changeQuantity(food, 1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-[#FFF0DE]"
                >
                  <Text className="text-lg font-bold text-[#EA580C]">+</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : (
        <Text className="py-12 text-center text-sm text-[#64748B]">
          No foods found.
        </Text>
      )}

      <View className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-[#64748B]">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </Text>
          <Text className="text-xl font-extrabold text-[#012711]">
            {formatPrice(total)}
          </Text>
        </View>
        <Pressable
          disabled={!cart.length || submitting}
          onPress={() => void sendToKitchen()}
          className={`h-12 items-center justify-center rounded-xl ${
            cart.length && !submitting ? 'bg-[#116C0B]' : 'bg-[#CBD5E1]'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-extrabold text-white">Send Order to Kitchen</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}