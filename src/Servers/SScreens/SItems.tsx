import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api, { API_BASE_URL } from '../../../api';

/* ==========================================================================
   Types
   ========================================================================== */

export type ServerOrderTable = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: string | number;
  status?: string;
  assigned_server_id?: string | number | null;
  assigned_employee_id?: string | number | null;
  server_id?: string | number | null;
};

type FoodRow = Record<string, unknown>;

type CartItem = {
  food: FoodRow;
  quantity: number;
};

type TableStatus = 'available' | 'occupied' | 'reserved';

const tableApiStatus: Record<TableStatus, 'Available' | 'Occupied' | 'Reserved'> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
};

/* ==========================================================================
   Helper Functions & Parsers
   ========================================================================== */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRows(payload: unknown, keys: string[]): FoodRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      item => typeof item === 'object' && item !== null,
    ) as FoodRow[];
  }
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    if (key in payload) {
      const result = readRows(payload[key], keys);
      if (result.length || Array.isArray(payload[key])) return result;
    }
  }
  return [];
}

function textValue(row: FoodRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const value = String(raw).trim();
      if (value && value !== 'null' && value !== 'undefined') return value;
    }
  }
  return fallback;
}

function priceValue(row: FoodRow): number {
  const price = Number(
    textValue(
      row,
      ['final_price', 'price', 'food_price', 'selling_price', 'mrp'],
      '0',
    ),
  );
  return Number.isFinite(price) ? price : 0;
}

function mrpValue(row: FoodRow): number {
  const mrp = Number(textValue(row, ['mrp', 'original_price', 'market_price'], '0'));
  return Number.isFinite(mrp) ? mrp : 0;
}

function imageUri(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^(https?:|data:image\/|file:|content:)/i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('//')) {
      const protocol = API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:';
      return `${protocol}${trimmed}`;
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return imageUri(JSON.parse(trimmed) as unknown);
      } catch {
        return undefined;
      }
    }
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${apiRoot}/${trimmed.replace(/^\.?\//, '')}`;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const uri = imageUri(entry);
      if (uri) return uri;
    }
  }
  if (isRecord(value)) {
    return (
      imageUri(value.url) ||
      imageUri(value.image_url) ||
      imageUri(value.imageUrl) ||
      imageUri(value.image) ||
      imageUri(value.src) ||
      imageUri(value.path)
    );
  }
  return undefined;
}

function foodImage(food: FoodRow): string | undefined {
  for (const key of [
    'food_images',
    'food_image',
    'food_image_url',
    'image_url',
    'image',
    'images',
  ]) {
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

function getFoodType(food: FoodRow): 'veg' | 'non-veg' | 'egg' {
  const typeStr = textValue(
    food,
    ['food_type', 'type', 'food_preference', 'dietary'],
  ).toLowerCase();
  if (typeStr.includes('egg')) return 'egg';
  if (typeStr.includes('non') || typeStr === 'non-veg' || typeStr === 'nonveg') {
    return 'non-veg';
  }
  if (typeStr.includes('veg') || typeStr === 'vegan') {
    return 'veg';
  }
  const isVeg = food.is_veg;
  if (isVeg === false || isVeg === 0 || isVeg === '0' || isVeg === 'false') {
    return 'non-veg';
  }
  if (isVeg === true || isVeg === 1 || isVeg === '1' || isVeg === 'true') {
    return 'veg';
  }
  const name = textValue(food, ['food_name', 'product_name', 'name']).toLowerCase();
  if (/(chicken|mutton|fish|prawn|pork|beef|meat|crab|lamb|tikka|kebab)/i.test(name)) {
    return 'non-veg';
  }
  if (/egg/i.test(name)) return 'egg';
  return 'veg';
}

function isItemAvailable(food: FoodRow): boolean {
  if (
    food.is_effectively_available === false ||
    food.is_effectively_available === 0 ||
    food.is_effectively_available === 'false'
  ) {
    return false;
  }
  if (
    food.is_available === false ||
    food.is_available === 0 ||
    food.is_available === 'false'
  ) {
    return false;
  }
  const status = String(food.status || '').toLowerCase();
  if (status === 'inactive' || status === 'disabled') {
    return false;
  }
  return true;
}

/* ==========================================================================
   Crisp SVG Icons
   ========================================================================== */

function ArrowLeftSvg({ color = '#012711', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CloseSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function TableSvg({ color = '#86EFAC', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6.5" width="16" height="5.5" rx="1.8" stroke={color} strokeWidth="2" />
      <Path d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function UsersSvg({ color = '#86EFAC', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path d="M2 20a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CartSvg({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashSvg({ color = '#EF4444', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FlameSvg({ color = '#EA580C', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.5 3.5 3 5 4.5 7.5C18 12 18 14.5 17 17c-1 2.5-3 4-5 4s-4-1.5-5-4c-1-2.5-1-5 .5-7.5C9 7 11.5 5.5 12 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* Veg / Non-Veg / Egg Standard Indicator Badge */
function DietaryBadge({ type }: { type: 'veg' | 'non-veg' | 'egg' }) {
  const isVeg = type === 'veg';
  const isEgg = type === 'egg';
  const color = isVeg ? '#15803D' : isEgg ? '#D97706' : '#B91C1C';

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor: color,
        borderRadius: 4,
        borderWidth: 1.5,
        height: 15,
        justifyContent: 'center',
        width: 15,
      }}
    >
      {isVeg || isEgg ? (
        <View
          style={{
            backgroundColor: color,
            borderRadius: 9999,
            height: 6.5,
            width: 6.5,
          }}
        />
      ) : (
        <Svg width={7} height={7} viewBox="0 0 10 10">
          <Path d="M5 1L9 8H1L5 1Z" fill={color} />
        </Svg>
      )}
    </View>
  );
}

/* ==========================================================================
   Main ServerItems Component
   ========================================================================== */

export default function ServerItems({
  table,
  tables = [],
  onBack,
  onTableChange,
  onTableStatusChange,
}: {
  table: ServerOrderTable;
  tables?: ServerOrderTable[];
  onBack: () => void;
  onTableChange?: (table: ServerOrderTable) => void;
  onTableStatusChange?: (status: string) => void;
}) {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [loading, setLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeBill, setActiveBill] = useState<unknown>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  const [tableStatus, setTableStatus] = useState<TableStatus>(
    (String(table.status || 'occupied').toLowerCase() as TableStatus) || 'occupied',
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const tableId = String(table.id ?? table.table_id ?? '');
  const tableLabel = String(table.table_number ?? table.id ?? table.table_id ?? '1');
  const seats = table.no_of_seats ?? 4;

  useEffect(() => {
    setCart([]);
    setOrderNotes('');
    setIsReviewOpen(false);
    setTableStatus(
      (String(table.status || 'occupied').toLowerCase() as TableStatus) || 'occupied',
    );
  }, [tableId, table.status]);

  // Load foods and table bill
  const loadData = useCallback(async () => {
    setLoading(true);
    setBillLoading(true);
    setError('');

    const [foodResult, billResult] = await Promise.allSettled([
      api.get('/foods', { params: { include_unavailable: true } }),
      tableId ? api.get(`/table-bills/active/${tableId}`) : Promise.reject(),
    ]);

    if (foodResult.status === 'fulfilled') {
      const rows = readRows(foodResult.value.data, ['data', 'foods', 'items']);
      setFoods(rows);
    } else {
      setError('Unable to load food menu. Please pull down to refresh.');
    }

    if (billResult.status === 'fulfilled') {
      setActiveBill(billResult.value.data);
    } else {
      setActiveBill(null);
    }

    setLoading(false);
    setBillLoading(false);
  }, [tableId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Extract unique category names
  const categories = useMemo(() => {
    const set = new Set<string>();
    foods.forEach(f => {
      const cat = textValue(f, ['category_name', 'category']);
      if (cat) set.add(cat);
    });
    return ['All', ...Array.from(set)];
  }, [foods]);

  // Filtered foods by search, category, and dietary preference
  const visibleFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter(food => {
      // Search match
      if (q) {
        const name = textValue(food, ['food_name', 'name', 'product_name']).toLowerCase();
        const cat = textValue(food, ['category_name', 'category']).toLowerCase();
        const sub = textValue(food, ['subcategory_name', 'subcategory']).toLowerCase();
        const cuisine = textValue(food, ['cuisine_name', 'cuisine']).toLowerCase();
        const matches =
          name.includes(q) || cat.includes(q) || sub.includes(q) || cuisine.includes(q);
        if (!matches) return false;
      }

      // Category filter
      if (selectedCategory !== 'All') {
        const cat = textValue(food, ['category_name', 'category']);
        if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Dietary filter
      if (dietFilter !== 'all') {
        const fType = getFoodType(food);
        if (dietFilter === 'veg' && fType !== 'veg') return false;
        if (dietFilter === 'non-veg' && fType !== 'non-veg') return false;
      }

      return true;
    });
  }, [foods, search, selectedCategory, dietFilter]);

  // Cart operations
  const quantityFor = (food: FoodRow) => {
    const id = food.id ?? food.food_id ?? food.foodId;
    return (
      cart.find(
        item =>
          String(item.food.id ?? item.food.food_id ?? item.food.foodId) === String(id),
      )?.quantity ?? 0
    );
  };

  const changeQuantity = (food: FoodRow, amount: number) => {
    const id = String(food.id ?? food.food_id ?? food.foodId);
    setCart(current => {
      const existing = current.find(
        item =>
          String(item.food.id ?? item.food.food_id ?? item.food.foodId) === id,
      );
      const nextQuantity = (existing?.quantity ?? 0) + amount;
      if (nextQuantity <= 0) {
        return current.filter(
          item =>
            String(item.food.id ?? item.food.food_id ?? item.food.foodId) !== id,
        );
      }
      if (existing) {
        return current.map(item =>
          String(item.food.id ?? item.food.food_id ?? item.food.foodId) === id
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      }
      return [...current, { food, quantity: nextQuantity }];
    });
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + priceValue(item.food) * item.quantity, 0),
    [cart],
  );

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  // Update table status
  const updateTableStatus = async (status: TableStatus) => {
    if (updatingStatus || status === tableStatus) return;
    setUpdatingStatus(true);
    try {
      await api
        .put(`/server-tables/${tableId}`, {
          status: tableApiStatus[status],
        })
        .catch(async () => {
          return await api.patch(`/server-tables/${tableId}`, {
            status: tableApiStatus[status],
          });
        });
      setTableStatus(status);
      onTableStatusChange?.(status);
    } catch (requestError) {
      const message =
        requestError && typeof requestError === 'object' && 'message' in requestError
          ? String((requestError as { message?: unknown }).message)
          : 'Unable to update the table status.';
      Alert.alert('Status update failed', message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Send Order to Kitchen
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
        food_name: textValue(food, ['food_name', 'name', 'product_name'], 'Food'),
        quantity,
        price: priceValue(food),
      }));

      await api.post('/kitchen-orders', {
        table_id: tableId,
        table_number: tableLabel,
        items,
        total_amount: total,
        status: 'pending',
        notes: orderNotes.trim() || undefined,
        ...(billData.bill_id || billData.id
          ? { bill_id: billData.bill_id ?? billData.id }
          : {}),
      });

      // Also ensure table status is updated to Occupied
      if (tableStatus !== 'occupied') {
        void updateTableStatus('occupied');
      }

      setCart([]);
      setOrderNotes('');
      setIsReviewOpen(false);
      Alert.alert(
        'Order Sent Successfully! 🍽️',
        `The order for Table ${tableLabel} (${itemCount} items · ${formatPrice(total)}) has been sent to the kitchen.`,
        [
          { text: 'Add More Items', style: 'cancel' },
          { text: 'Back to Tables', onPress: onBack },
        ],
      );
    } catch (requestError) {
      const message =
        requestError && typeof requestError === 'object' && 'message' in requestError
          ? String((requestError as { message?: unknown }).message)
          : 'Unable to send the order to the kitchen. Please check connection and try again.';
      Alert.alert('Order Placement Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="px-4 pb-28 pt-3">
      {/* ====================================================================
          Top Navigation Bar & Table Hero Card
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          overflow: 'hidden',
          padding: 18,
          shadowColor: '#012711',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}
      >
        {/* Glow ambient circle */}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 120, 0, 0.12)',
            borderRadius: 90,
            height: 180,
            position: 'absolute',
            right: -30,
            top: -40,
            width: 180,
          }}
        />

        {/* Back button and quick badges */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Back to tables"
            accessibilityRole="button"
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/30"
          >
            <ArrowLeftSvg color="#FFFFFF" size={20} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-[#114D26] px-3 py-1">
              <TableSvg color="#86EFAC" size={14} />
              <Text className="text-[11px] font-bold text-[#86EFAC]">
                TABLE {tableLabel}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <UsersSvg color="#B8D7BE" size={13} />
              <Text className="text-[11px] font-bold text-[#B8D7BE]">
                {seats} SEATS
              </Text>
            </View>
          </View>
        </View>

        {/* Title and table header */}
        <View className="mt-3">
          <Text className="text-2xl font-black text-white">
            Table {tableLabel} · Add Items
          </Text>
          <Text className="mt-1 text-xs text-[#CBD5E1]">
            Tap items to take table order and dispatch directly to kitchen
          </Text>
        </View>

        {tables.length > 1 && onTableChange ? (
          <Pressable
            accessibilityLabel="Choose table"
            accessibilityRole="button"
            onPress={() => setIsTablePickerOpen(true)}
            className="mt-3 flex-row items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 active:bg-white/20"
          >
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-[#B8D7BE]">
                Ordering for
              </Text>
              <Text className="mt-0.5 text-sm font-extrabold text-white">
                Table {tableLabel}
              </Text>
            </View>
            <Text className="text-sm font-black text-[#86EFAC]">Change table</Text>
          </Pressable>
        ) : null}

        {/* Live Table Seating Status Switcher */}
        <View className="mt-4 flex-row items-center gap-2">
          {(
            [
              { id: 'available', label: 'Available', color: '#15803D' },
              { id: 'occupied', label: 'Occupied', color: '#EA580C' },
              { id: 'reserved', label: 'Reserved', color: '#4F46E5' },
            ] as const
          ).map(opt => {
            const isSelected = tableStatus === opt.id;
            return (
              <Pressable
                key={opt.id}
                disabled={updatingStatus}
                onPress={() => void updateTableStatus(opt.id)}
                style={{
                  alignItems: 'center',
                  backgroundColor: isSelected ? opt.color : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isSelected ? opt.color : 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  borderWidth: 1,
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  paddingVertical: 7,
                }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? '#FFFFFF' : opt.color,
                    borderRadius: 9999,
                    height: 6,
                    marginRight: 6,
                    width: 6,
                  }}
                />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: isSelected ? '800' : '600',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active Bill / Cart summary strip */}
        <View className="mt-3.5 flex-row items-center justify-between border-t border-white/10 pt-3">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <Text className="text-xs font-semibold text-[#B8D7BE]">
              {billLoading
                ? 'Checking active bill...'
                : activeBill
                ? 'Active bill running'
                : 'New order session'}
            </Text>
          </View>

          {itemCount > 0 ? (
            <View className="rounded-full bg-[#114D26] px-2.5 py-0.5">
              <Text className="text-xs font-black text-[#86EFAC]">
                {itemCount} in Cart · {formatPrice(total)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ====================================================================
          Full-Width Search Bar
          ==================================================================== */}
      <View className="mt-4 w-full flex-row items-center rounded-2xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 shadow-sm">
        <SearchSvg size={18} color="#64748B" />
        <TextInput
          accessibilityLabel="Search foods"
          placeholder="Search dishes, rice, noodles, drinks..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          className="ml-2.5 flex-1 text-sm font-medium text-[#0F172A]"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} className="p-1">
            <CloseSvg size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* ====================================================================
          Dietary Filters (All / Veg / Non-Veg)
          ==================================================================== */}
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => setDietFilter('all')}
          style={{
            backgroundColor: dietFilter === 'all' ? '#116C0B' : '#FFFFFF',
            borderColor: dietFilter === 'all' ? '#116C0B' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color: dietFilter === 'all' ? '#FFFFFF' : '#475569',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            All Foods ({foods.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDietFilter('veg')}
          style={{
            alignItems: 'center',
            backgroundColor: dietFilter === 'veg' ? '#15803D' : '#FFFFFF',
            borderColor: dietFilter === 'veg' ? '#15803D' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <DietaryBadge type="veg" />
          <Text
            style={{
              color: dietFilter === 'veg' ? '#FFFFFF' : '#475569',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            Veg Only
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDietFilter('non-veg')}
          style={{
            alignItems: 'center',
            backgroundColor: dietFilter === 'non-veg' ? '#B91C1C' : '#FFFFFF',
            borderColor: dietFilter === 'non-veg' ? '#B91C1C' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <DietaryBadge type="non-veg" />
          <Text
            style={{
              color: dietFilter === 'non-veg' ? '#FFFFFF' : '#475569',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            Non-Veg
          </Text>
        </Pressable>
      </View>

      {/* ====================================================================
          Category Pills (Horizontal Scroll)
          ==================================================================== */}
      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 py-1">
          <View className="flex-row gap-2">
            {categories.map(cat => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    backgroundColor: isSelected ? '#062D16' : '#FFFFFF',
                    borderColor: isSelected ? '#062D16' : '#E2E8F0',
                    borderRadius: 9999,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : '#475569',
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {/* ====================================================================
          Food Items List
          ==================================================================== */}
      <View className="mt-4">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#116C0B" />
            <Text className="mt-3 text-sm font-semibold text-[#64748B]">
              Loading food catalog...
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <Text className="text-center font-bold text-red-700">{error}</Text>
            <Pressable
              onPress={() => void loadData()}
              className="mt-3 self-center rounded-xl bg-red-600 px-4 py-2"
            >
              <Text className="text-xs font-bold text-white">Retry Loading</Text>
            </Pressable>
          </View>
        ) : visibleFoods.length ? (
          visibleFoods.map((food, index) => {
            const id = String(food.id ?? food.food_id ?? index);
            const name = textValue(food, ['food_name', 'name', 'product_name'], 'Food Item');
            const categoryName = textValue(food, ['category_name', 'category'], 'Main Course');
            const subcategoryName = textValue(food, ['subcategory_name', 'subcategory']);
            const cuisineName = textValue(food, ['cuisine_name', 'cuisine']);
            const portionSize = textValue(food, ['portion_size', 'portion']);
            const isSpicy = Boolean(food.is_spicy || food.spicy);
            const prepTime = Number(food.preparation_time ?? food.prep_time ?? 0);
            const foodType = getFoodType(food);
            const isAvailable = isItemAvailable(food);

            const price = priceValue(food);
            const mrp = mrpValue(food);
            const hasDiscount = mrp > price;
            const discountPercent = hasDiscount
              ? Math.round(((mrp - price) / mrp) * 100)
              : Number(textValue(food, ['discount'], '0'));

            const image = foodImage(food);
            const quantity = quantityFor(food);

            return (
              <View
                key={id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: quantity > 0 ? '#116C0B' : '#E2E8F0',
                  borderRadius: 20,
                  borderWidth: quantity > 0 ? 1.5 : 1,
                  elevation: 2,
                  marginBottom: 12,
                  overflow: 'hidden',
                  padding: 14,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                }}
              >
                <View className="flex-row items-start">
                  {/* Food Image / Placeholder */}
                  <View className="relative">
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        className="h-20 w-20 rounded-2xl bg-[#F8FAFC]"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-20 w-20 items-center justify-center rounded-2xl bg-[#F0FDF4]">
                        <Text className="text-3xl">🍲</Text>
                      </View>
                    )}

                    {/* Veg / Non-Veg badge top-left corner */}
                    <View className="absolute left-1.5 top-1.5 rounded bg-white p-0.5 shadow-sm">
                      <DietaryBadge type={foodType} />
                    </View>
                  </View>

                  {/* Food Details Info */}
                  <View className="ml-3.5 flex-1 pr-1">
                    {/* Category & Tags Strip */}
                    <View className="flex-row flex-wrap items-center gap-1.5">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        {cuisineName ? `${cuisineName} · ` : ''}
                        {subcategoryName || categoryName}
                      </Text>

                      {portionSize ? (
                        <View className="rounded bg-[#F1F5F9] px-1.5 py-0.5">
                          <Text className="text-[9px] font-bold text-[#475569]">
                            {portionSize}
                          </Text>
                        </View>
                      ) : null}

                      {isSpicy ? (
                        <View className="flex-row items-center gap-0.5 rounded bg-[#FFF7ED] px-1.5 py-0.5">
                          <FlameSvg color="#EA580C" size={10} />
                          <Text className="text-[9px] font-bold text-[#EA580C]">Spicy</Text>
                        </View>
                      ) : null}

                      {prepTime > 0 ? (
                        <Text className="text-[10px] font-medium text-[#94A3B8]">
                          ⏱️ {prepTime}m
                        </Text>
                      ) : null}
                    </View>

                    {/* Food Name */}
                    <Text
                      numberOfLines={2}
                      className="mt-1 text-sm font-extrabold text-[#0F172A]"
                    >
                      {name}
                    </Text>

                    {/* Price and Discount */}
                    <View className="mt-1.5 flex-row items-baseline gap-2">
                      <Text className="text-base font-black text-[#116C0B]">
                        {formatPrice(price)}
                      </Text>

                      {hasDiscount ? (
                        <Text className="text-xs text-[#94A3B8] line-through">
                          {formatPrice(mrp)}
                        </Text>
                      ) : null}

                      {discountPercent > 0 ? (
                        <View className="rounded bg-[#DCFCE7] px-1.5 py-0.5">
                          <Text className="text-[9px] font-extrabold text-[#15803D]">
                            {discountPercent}% OFF
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Quantity Stepper / Add Button */}
                  <View className="items-end justify-center self-center pl-1">
                    {!isAvailable ? (
                      <View className="rounded-xl bg-[#F1F5F9] px-2.5 py-1.5">
                        <Text className="text-[10px] font-bold text-[#94A3B8]">
                          Sold Out
                        </Text>
                      </View>
                    ) : quantity === 0 ? (
                      <Pressable
                        accessibilityLabel={`Add ${name}`}
                        accessibilityRole="button"
                        onPress={() => changeQuantity(food, 1)}
                        className="rounded-xl border border-[#116C0B] bg-[#F0FDF4] px-4 py-2 active:bg-[#DCFCE7]"
                      >
                        <Text className="text-xs font-black text-[#116C0B]">+ ADD</Text>
                      </Pressable>
                    ) : (
                      <View className="flex-row items-center rounded-xl border border-[#116C0B] bg-[#F0FDF4] p-1 shadow-sm">
                        <Pressable
                          accessibilityLabel="Decrease quantity"
                          accessibilityRole="button"
                          onPress={() => changeQuantity(food, -1)}
                          className="h-7 w-7 items-center justify-center rounded-lg bg-white active:bg-slate-100"
                        >
                          <Text className="text-base font-bold text-[#116C0B]">−</Text>
                        </Pressable>

                        <Text className="mx-2.5 min-w-[16px] text-center text-xs font-black text-[#012711]">
                          {quantity}
                        </Text>

                        <Pressable
                          accessibilityLabel="Increase quantity"
                          accessibilityRole="button"
                          onPress={() => changeQuantity(food, 1)}
                          className="h-7 w-7 items-center justify-center rounded-lg bg-[#116C0B] active:bg-[#062D16]"
                        >
                          <Text className="text-base font-bold text-white">+</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Text className="text-2xl">🔍</Text>
            </View>
            <Text className="mt-3 text-base font-bold text-[#0F172A]">
              No food items found
            </Text>
            <Text className="mt-1 text-center text-xs text-[#64748B]">
              {search
                ? `No dishes matched "${search}".`
                : 'No food items in this category or dietary filter.'}
            </Text>
            {search || selectedCategory !== 'All' || dietFilter !== 'all' ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setDietFilter('all');
                }}
                className="mt-4 rounded-xl bg-[#116C0B] px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">Reset Filters</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* ====================================================================
          Bottom Cart Summary Bar (When items are in cart)
          ==================================================================== */}
      {cart.length > 0 ? (
        <View
          style={{
            backgroundColor: '#062D16',
            borderRadius: 22,
            elevation: 8,
            marginTop: 16,
            padding: 16,
            shadowColor: '#012711',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#86EFAC]">
                {itemCount} ITEM{itemCount === 1 ? '' : 'S'} SELECTED
              </Text>
              <Text className="mt-0.5 text-2xl font-black text-white">
                {formatPrice(total)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsReviewOpen(true)}
              className="flex-row items-center gap-2 rounded-xl bg-[#FF7800] px-4 py-3 active:bg-[#EA580C]"
            >
              <CartSvg color="#FFFFFF" size={18} />
              <Text className="text-sm font-extrabold text-white">
                Review Order →
              </Text>
            </Pressable>
          </View>

          {/* Quick Direct Kitchen Send CTA */}
          <Pressable
            disabled={submitting}
            onPress={() => void sendToKitchen()}
            className="mt-3 h-12 flex-row items-center justify-center rounded-xl bg-[#116C0B] active:bg-[#0F5A09]"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-sm font-black text-white">
                Send Directly to Kitchen
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="Send KOT Preview"
            onPress={() => setIsReviewOpen(true)}
            className="mt-2 h-12 flex-row items-center justify-center rounded-xl border border-[#FF7800] bg-white active:bg-[#FFF7ED]"
          >
            <Text className="text-sm font-black text-[#EA580C]">
              Send KOT Preview
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={isTablePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTablePickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/60 px-5"
          onPress={() => setIsTablePickerOpen(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-2xl bg-white p-5"
            onPress={event => event.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-[#012711]">Choose table</Text>
              <Pressable
                accessibilityLabel="Close table picker"
                onPress={() => setIsTablePickerOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <CloseSvg size={16} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tables.map(option => {
                const optionId = String(option.id ?? option.table_id ?? '');
                const optionLabel = String(
                  option.table_number ?? option.id ?? option.table_id ?? '1',
                );
                const isCurrent = optionId === tableId;
                return (
                  <Pressable
                    key={optionId}
                    accessibilityLabel={`Select Table ${optionLabel}`}
                    onPress={() => {
                      setIsTablePickerOpen(false);
                      if (!isCurrent) onTableChange?.(option);
                    }}
                    className={`mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                      isCurrent
                        ? 'border-[#116C0B] bg-[#F0FDF4]'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >
                    <View>
                      <Text className="text-sm font-extrabold text-[#0F172A]">
                        Table {optionLabel}
                      </Text>
                      <Text className="mt-0.5 text-xs font-semibold text-[#64748B]">
                        {option.no_of_seats ?? 4} seats
                      </Text>
                    </View>
                    {isCurrent ? (
                      <Text className="text-xs font-black text-[#116C0B]">Selected</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====================================================================
          Review & Send Order Modal Bottom Sheet
          ==================================================================== */}
      <Modal
        visible={isReviewOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReviewOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setIsReviewOpen(false)} />
          <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3.5">
              <View>
                <Text className="text-xl font-extrabold text-[#012711]">
                  Order for Table {tableLabel}
                </Text>
                <Text className="text-xs font-semibold text-[#64748B]">
                  {itemCount} item{itemCount === 1 ? '' : 's'} · Total: {formatPrice(total)}
                </Text>
              </View>

              <Pressable
                onPress={() => setIsReviewOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <CloseSvg size={16} />
              </Pressable>
            </View>

            {/* Cart Items List */}
            <ScrollView
              className="mt-3 max-h-72"
              showsVerticalScrollIndicator={false}
            >
              {cart.map(({ food, quantity }) => {
                const id = String(food.id ?? food.food_id);
                const name = textValue(food, ['food_name', 'name', 'product_name'], 'Food');
                const price = priceValue(food);
                const foodType = getFoodType(food);
                const lineTotal = price * quantity;

                return (
                  <View
                    key={id}
                    className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3"
                  >
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-1.5">
                        <DietaryBadge type={foodType} />
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-sm font-bold text-[#0F172A]"
                        >
                          {name}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-xs font-semibold text-[#116C0B]">
                        {formatPrice(price)} each ·{' '}
                        <Text className="font-extrabold text-[#0F172A]">
                          {formatPrice(lineTotal)}
                        </Text>
                      </Text>
                    </View>

                    {/* Stepper */}
                    <View className="flex-row items-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-1">
                      <Pressable
                        onPress={() => changeQuantity(food, -1)}
                        className="h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xs"
                      >
                        <Text className="text-base font-bold text-[#475569]">−</Text>
                      </Pressable>
                      <Text className="mx-2 min-w-[16px] text-center text-xs font-extrabold text-[#0F172A]">
                        {quantity}
                      </Text>
                      <Pressable
                        onPress={() => changeQuantity(food, 1)}
                        className="h-7 w-7 items-center justify-center rounded-lg bg-[#116C0B]"
                      >
                        <Text className="text-base font-bold text-white">+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Special Kitchen Instructions */}
            <View className="mt-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Kitchen Instructions (Optional)
              </Text>
              <TextInput
                value={orderNotes}
                onChangeText={setOrderNotes}
                placeholder="e.g. Less spicy, serve drinks first, no onions..."
                placeholderTextColor="#94A3B8"
                className="mt-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs text-[#0F172A]"
              />
            </View>

            {/* Bill Summary Strip */}
            <View className="mt-4 flex-row items-center justify-between rounded-xl bg-[#F0FDF4] p-3">
              <View>
                <Text className="text-xs font-bold text-[#166534]">
                  Table {tableLabel} Subtotal
                </Text>
                <Text className="text-[11px] text-[#4B7A58]">
                  {activeBill ? 'Will link to active bill' : 'Opens new table session'}
                </Text>
              </View>
              <Text className="text-xl font-black text-[#116C0B]">
                {formatPrice(total)}
              </Text>
            </View>

            {/* Send to Kitchen Button */}
            <Pressable
              disabled={submitting || !cart.length}
              onPress={() => void sendToKitchen()}
              className="mt-4 h-12 flex-row items-center justify-center rounded-xl bg-[#116C0B] active:bg-[#0F5A09]"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-black text-white">
                  Send Order to Kitchen 👨‍🍳
                </Text>
              )}
            </Pressable>

            {/* Clear Cart Button */}
            <Pressable
              onPress={() => {
                setCart([]);
                setIsReviewOpen(false);
              }}
              className="mt-2.5 flex-row items-center justify-center py-2"
            >
              <TrashSvg color="#EF4444" size={14} />
              <Text className="ml-1 text-xs font-bold text-[#EF4444]">
                Clear Cart
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
