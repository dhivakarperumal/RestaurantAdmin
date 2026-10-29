import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api, { API_BASE_URL } from '../../../api';
import { DetailsModal } from '../../components/popups';

/* ==========================================================================
   Types & Utilities
   ========================================================================== */

type FoodRow = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRows(payload: unknown, keys: string[] = ['data']): FoodRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (row): row is FoodRow => typeof row === 'object' && row !== null,
    );
  }
  if (typeof payload !== 'object' || payload === null) return [];
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (key in record) {
      const result = readRows(record[key], keys);
      if (result.length > 0 || Array.isArray(record[key])) return result;
    }
  }
  return [];
}

function textValue(row: FoodRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const text = String(raw).trim();
      if (text) return text;
    }
  }
  return fallback;
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

function imageValue(row: FoodRow): string | undefined {
  for (const key of [
    'food_images',
    'food_image',
    'food_image_url',
    'image_url',
    'image',
  ]) {
    const uri = imageUri(row[key]);
    if (uri) return uri;
  }
  return undefined;
}

function formatPrice(amount: unknown): string {
  const num = Number(amount || 0);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getFoodType(food: FoodRow): 'veg' | 'non-veg' {
  const typeStr = textValue(
    food,
    ['food_type', 'type', 'food_preference', 'dietary'],
  ).toLowerCase();
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
  if (/(chicken|mutton|fish|prawn|egg|pork|beef|meat|crab|lamb|tikka|kebab)/i.test(name)) {
    return 'non-veg';
  }
  return 'veg';
}

function getStockInfo(food: FoodRow): { quantity: number; status: 'in_stock' | 'low_stock' | 'out_of_stock' } {
  const raw = food.stock ?? food.current_stock ?? food.stock_quantity;
  if (raw === undefined || raw === null || raw === '') {
    return { quantity: 50, status: 'in_stock' };
  }
  const num = Number(raw);
  if (isNaN(num) || num <= 0) return { quantity: 0, status: 'out_of_stock' };
  if (num <= 5) return { quantity: num, status: 'low_stock' };
  return { quantity: num, status: 'in_stock' };
}

/* ==========================================================================
   Crisp SVG Icons
   ========================================================================== */

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

function GridViewSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function ListViewSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h16M4 12h16M4 18h16"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function UtensilsSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 12v9M15 3c2 2 3 5 3 7h-4V3M16 10v11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparklesSvg({ color = '#F59E0B', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 3 1.9 4.8L18.7 9.7l-4.8 1.9L12 16.5l-1.9-4.9-4.9-1.9 4.9-1.9L12 3ZM19 17l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* Veg & Non-Veg Standard Indicators */
function DietaryBadge({ type }: { type: 'veg' | 'non-veg' }) {
  const isVeg = type === 'veg';
  const color = isVeg ? '#15803D' : '#B91C1C';
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor: color,
        borderRadius: 4,
        borderWidth: 1.5,
        height: 16,
        justifyContent: 'center',
        width: 16,
      }}
    >
      {isVeg ? (
        <View
          style={{
            backgroundColor: color,
            borderRadius: 9999,
            height: 7,
            width: 7,
          }}
        />
      ) : (
        <Svg width={8} height={8} viewBox="0 0 10 10">
          <Path d="M5 1L9 8H1L5 1Z" fill={color} />
        </Svg>
      )}
    </View>
  );
}

/* ==========================================================================
   Main ServerFoods Component
   ========================================================================== */

export default function ServerFoods() {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [categories, setCategories] = useState<FoodRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodRow | null>(null);

  const loadFoods = useCallback(async () => {
    setError('');
    try {
      const [foodsResponse, categoriesResponse] = await Promise.all([
        api.get('/foods'),
        api.get('/categories'),
      ]);
      setFoods(readRows(foodsResponse.data, ['data', 'foods', 'items']));
      setCategories(
        readRows(categoriesResponse.data, ['data', 'categories', 'items']),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load food items.',
      );
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await loadFoods();
    setLoading(false);
  }, [loadFoods]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFoods();
    setRefreshing(false);
  }, [loadFoods]);

  useEffect(() => {
    void initData();
  }, [initData]);

  const categoryNames = useMemo(() => {
    const names = categories
      .map(row => textValue(row, ['category_name', 'name', 'title']))
      .filter(Boolean);

    // Also collect categories from foods if category API is empty
    if (names.length === 0) {
      const set = new Set<string>();
      foods.forEach(f => {
        const c = textValue(f, ['category_name', 'category']);
        if (c) set.add(c);
      });
      return ['All', ...Array.from(set)];
    }

    return ['All', ...Array.from(new Set(names))];
  }, [categories, foods]);

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return foods.filter(food => {
      const name = textValue(
        food,
        ['food_name', 'product_name', 'productName', 'name'],
        'Menu item',
      );
      const foodCategory = textValue(food, ['category_name', 'category']);
      const foodType = getFoodType(food);

      const matchesCategory =
        selectedCategory === 'All' || foodCategory === selectedCategory;
      const matchesDiet =
        dietFilter === 'all' || foodType === dietFilter;
      const matchesSearch =
        !query || `${name} ${foodCategory}`.toLowerCase().includes(query);

      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [dietFilter, foods, search, selectedCategory]);

  const vegCount = useMemo(() => {
    return foods.filter(f => getFoodType(f) === 'veg').length;
  }, [foods]);

  const nonVegCount = useMemo(() => {
    return foods.filter(f => getFoodType(f) === 'non-veg').length;
  }, [foods]);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF7800', '#116C0B']}
          tintColor="#FF7800"
        />
      }
      contentContainerClassName="px-4 pb-12 pt-3"
    >
      {/* ====================================================================
          Hero Header
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          overflow: 'hidden',
          padding: 20,
          shadowColor: '#012711',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}
      >
        {/* Glow circle */}
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

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <Text className="text-[11px] font-bold tracking-widest text-[#B8D7BE]">
              RESTAURANT MENU & CATALOG
            </Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-[11px] font-bold text-[#86EFAC]">
              {foods.length} ITEMS
            </Text>
          </View>
        </View>

        <Text className="mt-3 text-2xl font-black text-white">
          Food Management
        </Text>
        <Text className="mt-1 text-xs text-[#CBD5E1]">
          Explore dish availability, pricing, portions, and categories
        </Text>

        {/* Quick Counter Pills inside Banner */}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#86EFAC]">VEG ITEMS</Text>
            <Text className="text-lg font-extrabold text-white">{vegCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#FCA5A5]">NON-VEG</Text>
            <Text className="text-lg font-extrabold text-white">{nonVegCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#FDBA74]">SECTIONS</Text>
            <Text className="text-lg font-extrabold text-white">{categoryNames.length - 1}</Text>
          </View>
        </View>
      </View>

      {/* ====================================================================
          Search Bar & View Switcher
          ==================================================================== */}
      <View className="mt-4 flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-2xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 shadow-sm">
          <SearchSvg color="#64748B" size={18} />
          <TextInput
            accessibilityLabel="Search foods"
            value={search}
            onChangeText={setSearch}
            placeholder="Search dish or beverage..."
            placeholderTextColor="#94A3B8"
            className="ml-2 flex-1 text-sm text-[#0F172A]"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} className="p-1">
              <CloseSvg color="#64748B" size={16} />
            </Pressable>
          ) : null}
        </View>

        {/* View Mode Toggle */}
        <View className="flex-row rounded-2xl border border-[#CBD5E1] bg-white p-1 shadow-sm">
          <Pressable
            onPress={() => setViewMode('list')}
            className={`rounded-xl p-2 ${viewMode === 'list' ? 'bg-[#116C0B]' : 'bg-transparent'}`}
          >
            <ListViewSvg color={viewMode === 'list' ? '#FFFFFF' : '#64748B'} size={18} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('grid')}
            className={`rounded-xl p-2 ${viewMode === 'grid' ? 'bg-[#116C0B]' : 'bg-transparent'}`}
          >
            <GridViewSvg color={viewMode === 'grid' ? '#FFFFFF' : '#64748B'} size={18} />
          </Pressable>
        </View>
      </View>

      {/* ====================================================================
          Dietary Filter Pills
          ==================================================================== */}
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => setDietFilter('all')}
          style={{
            backgroundColor: dietFilter === 'all' ? '#116C0B' : '#FFFFFF',
            borderColor: dietFilter === 'all' ? '#116C0B' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: dietFilter === 'all' ? '#FFFFFF' : '#475569',
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            All Diets
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
          style={{
            alignItems: 'center',
            backgroundColor: dietFilter === 'veg' ? '#DCFCE7' : '#FFFFFF',
            borderColor: dietFilter === 'veg' ? '#16A34A' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <DietaryBadge type="veg" />
          <Text
            style={{
              color: dietFilter === 'veg' ? '#15803D' : '#475569',
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            Veg Only
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
          style={{
            alignItems: 'center',
            backgroundColor: dietFilter === 'non-veg' ? '#FEE2E2' : '#FFFFFF',
            borderColor: dietFilter === 'non-veg' ? '#DC2626' : '#E2E8F0',
            borderRadius: 9999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <DietaryBadge type="non-veg" />
          <Text
            style={{
              color: dietFilter === 'non-veg' ? '#B91C1C' : '#475569',
              fontSize: 11,
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3 py-1"
      >
        <View className="flex-row gap-2">
          {categoryNames.map(name => {
            const isSelected = selectedCategory === name;
            return (
              <Pressable
                key={name}
                accessibilityLabel={`Filter foods by ${name}`}
                accessibilityRole="button"
                onPress={() => setSelectedCategory(name)}
                style={{
                  backgroundColor: isSelected ? '#FF7800' : '#FFFFFF',
                  borderColor: isSelected ? '#FF7800' : '#E2E8F0',
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
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ====================================================================
          Foods List or Grid Rendering
          ==================================================================== */}
      <View className="mt-4">
        {loading ? (
          <View className="items-center rounded-2xl bg-white p-12">
            <ActivityIndicator size="large" color="#FF7800" />
            <Text className="mt-3 text-sm font-semibold text-[#64748B]">
              Loading food catalog...
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-2xl border border-[#FECACA] bg-white p-5">
            <Text accessibilityRole="alert" className="text-sm font-semibold text-[#B91C1C]">
              {error}
            </Text>
            <Pressable
              onPress={() => void loadFoods()}
              className="mt-3 self-start rounded-xl bg-[#DC2626] px-4 py-2"
            >
              <Text className="text-xs font-bold text-white">Retry Loading</Text>
            </Pressable>
          </View>
        ) : filteredFoods.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFF7ED]">
              <UtensilsSvg color="#EA580C" size={28} />
            </View>
            <Text className="mt-3 text-base font-bold text-[#0F172A]">
              No food items found
            </Text>
            <Text className="mt-1 text-center text-xs text-[#64748B]">
              {search
                ? `No dishes matched "${search}". Try checking your spelling or clearing filters.`
                : 'No food items in this category.'}
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
                <Text className="text-xs font-bold text-white">Clear All Filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : viewMode === 'list' ? (
          /* ================================================================
             LIST VIEW
             ================================================================ */
          <View className="gap-3">
            {filteredFoods.map((food, index) => {
              const name = textValue(
                food,
                ['food_name', 'product_name', 'productName', 'name'],
                'Menu item',
              );
              const foodCategory = textValue(
                food,
                ['category_name', 'category'],
                'Main',
              );
              const price = textValue(
                food,
                ['final_price', 'selling_price', 'price', 'unit_price', 'mrp'],
                '0',
              );
              const image = imageValue(food);
              const dietary = getFoodType(food);
              const stock = getStockInfo(food);

              return (
                <Pressable
                  key={`${textValue(food, ['food_id', 'id'], String(index))}-${index}`}
                  onPress={() => setSelectedFood(food)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 18,
                    borderWidth: 1,
                    elevation: 1,
                    flexDirection: 'row',
                    overflow: 'hidden',
                    padding: 12,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                  }}
                >
                  {/* Dish Thumbnail */}
                  {image ? (
                    <Image
                      accessibilityLabel={`${name} image`}
                      source={{ uri: image }}
                      style={{
                        borderRadius: 14,
                        height: 84,
                        width: 84,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#FFF7ED',
                        borderRadius: 14,
                        height: 84,
                        justifyContent: 'center',
                        width: 84,
                      }}
                    >
                      <UtensilsSvg color="#EA580C" size={26} />
                    </View>
                  )}

                  {/* Dish Details */}
                  <View className="ml-3 flex-1 justify-between">
                    <View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5">
                          <DietaryBadge type={dietary} />
                          <View className="rounded-md bg-[#FFF7ED] px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-[#EA580C]">
                              {foodCategory}
                            </Text>
                          </View>
                        </View>

                        {/* Stock badge */}
                        {stock.status === 'out_of_stock' ? (
                          <View className="rounded-md bg-[#FEE2E2] px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-[#DC2626]">
                              Sold Out
                            </Text>
                          </View>
                        ) : stock.status === 'low_stock' ? (
                          <View className="rounded-md bg-[#FEF3C7] px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-[#B45309]">
                              {stock.quantity} left
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text
                        numberOfLines={1}
                        className="mt-1 text-sm font-extrabold text-[#0F172A]"
                      >
                        {name}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-black text-[#116C0B]">
                        {formatPrice(price)}
                      </Text>
                      <View className="rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200">
                        <Text className="text-[11px] font-bold text-[#475569]">
                          Details ›
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* ================================================================
             GRID VIEW (2 Columns)
             ================================================================ */
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {filteredFoods.map((food, index) => {
              const name = textValue(
                food,
                ['food_name', 'product_name', 'productName', 'name'],
                'Menu item',
              );
              const foodCategory = textValue(
                food,
                ['category_name', 'category'],
                'Main',
              );
              const price = textValue(
                food,
                ['final_price', 'selling_price', 'price', 'unit_price', 'mrp'],
                '0',
              );
              const image = imageValue(food);
              const dietary = getFoodType(food);
              const stock = getStockInfo(food);

              return (
                <Pressable
                  key={`${textValue(food, ['food_id', 'id'], String(index))}-${index}`}
                  onPress={() => setSelectedFood(food)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 18,
                    borderWidth: 1,
                    elevation: 1,
                    overflow: 'hidden',
                    width: '48.5%',
                  }}
                >
                  {/* Image banner */}
                  {image ? (
                    <Image
                      accessibilityLabel={`${name} image`}
                      source={{ uri: image }}
                      style={{
                        height: 110,
                        width: '100%',
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#FFF7ED',
                        height: 110,
                        justifyContent: 'center',
                        width: '100%',
                      }}
                    >
                      <UtensilsSvg color="#EA580C" size={30} />
                    </View>
                  )}

                  {/* Dietary float pill */}
                  <View
                    style={{
                      left: 8,
                      position: 'absolute',
                      top: 8,
                    }}
                  >
                    <DietaryBadge type={dietary} />
                  </View>

                  <View className="p-3">
                    <View className="flex-row items-center justify-between">
                      <Text
                        numberOfLines={1}
                        className="text-[10px] font-bold uppercase text-[#EA580C]"
                      >
                        {foodCategory}
                      </Text>
                      {stock.status === 'out_of_stock' ? (
                        <Text className="text-[10px] font-bold text-[#DC2626]">
                          Out
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      numberOfLines={1}
                      className="mt-1 text-xs font-bold text-[#0F172A]"
                    >
                      {name}
                    </Text>

                    <Text className="mt-1 text-sm font-extrabold text-[#116C0B]">
                      {formatPrice(price)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ====================================================================
          Dish Details Modal
          ==================================================================== */}
      {selectedFood ? (
        <DetailsModal
          visible={!!selectedFood}
          onClose={() => setSelectedFood(null)}
          title={textValue(
            selectedFood,
            ['food_name', 'product_name', 'name'],
            'Dish Details',
          )}
          subtitle={textValue(
            selectedFood,
            ['category_name', 'category'],
            'Main Menu',
          )}
          badge={{
            label: getFoodType(selectedFood) === 'veg' ? 'Vegetarian' : 'Non-Veg',
            bg: getFoodType(selectedFood) === 'veg' ? '#F0FDF4' : '#FEF2F2',
            text: getFoodType(selectedFood) === 'veg' ? '#15803D' : '#DC2626',
            border: getFoodType(selectedFood) === 'veg' ? '#DCFCE7' : '#FECACA',
          }}
          footer={
            <Pressable
              onPress={() => setSelectedFood(null)}
              className="min-h-12 w-full items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#02480B]"
            >
              <Text className="text-sm font-bold text-white">Done</Text>
            </Pressable>
          }
        >
          <View className="gap-4">
            {/* Large Image Banner */}
            {imageValue(selectedFood) ? (
              <Image
                source={{ uri: imageValue(selectedFood) }}
                className="h-44 w-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="h-28 w-full items-center justify-center rounded-2xl bg-[#FFF7ED]">
                <UtensilsSvg color="#EA580C" size={40} />
              </View>
            )}

            {/* Categories & Price */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="rounded-xl bg-[#FFF7ED] px-3 py-1.5">
                  <Text className="text-xs font-bold text-[#EA580C]">
                    {textValue(
                      selectedFood,
                      ['category_name', 'category'],
                      'Main Menu',
                    )}
                  </Text>
                </View>
                <View className="rounded-xl bg-[#F0FDF4] px-3 py-1.5">
                  <Text className="text-xs font-bold text-[#15803D]">
                    {getFoodType(selectedFood) === 'veg' ? 'Vegetarian' : 'Non-Veg'}
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-black text-[#116C0B]">
                {formatPrice(
                  textValue(selectedFood, [
                    'final_price',
                    'selling_price',
                    'price',
                    'unit_price',
                  ]),
                )}
              </Text>
            </View>

            {/* Description & Ingredients */}
            <View className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Description & Notes
              </Text>
              <Text className="mt-1 text-xs leading-5 text-[#475569]">
                {textValue(
                  selectedFood,
                  ['description', 'details', 'ingredients'],
                  'Freshly prepared dish with authentic restaurant kitchen herbs and spices. Prepared to order.',
                )}
              </Text>
            </View>

            {/* Stock & Availability */}
            <View className="flex-row items-center justify-between rounded-2xl border border-[#E2E8F0] p-4 bg-white">
              <Text className="text-xs font-semibold text-[#64748B]">
                Kitchen Availability
              </Text>
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    backgroundColor:
                      getStockInfo(selectedFood).status === 'out_of_stock'
                        ? '#DC2626'
                        : '#10B981',
                    borderRadius: 9999,
                    height: 8,
                    width: 8,
                  }}
                />
                <Text
                  style={{
                    color:
                      getStockInfo(selectedFood).status === 'out_of_stock'
                        ? '#DC2626'
                        : '#15803D',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {getStockInfo(selectedFood).status === 'out_of_stock'
                    ? 'Sold Out'
                    : 'Available in Kitchen'}
                </Text>
              </View>
            </View>
          </View>
        </DetailsModal>
      ) : null}
    </ScrollView>
  );
}
