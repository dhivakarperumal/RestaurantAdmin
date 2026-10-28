import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';

type FoodRow = Record<string, unknown>;

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

function textValue(row: FoodRow, keys: string[], fallback = '') {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const text = String(raw).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function imageValue(row: FoodRow) {
  const image = textValue(row, [
    'food_images',
    'food_image',
    'food_image_url',
    'image_url',
    'image',
  ]);
  if (!image || image.startsWith('http') || image.startsWith('data:')) return image;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}/${image.replace(/^\/+/, '')}`;
}

export default function ServerFoods() {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [categories, setCategories] = useState<FoodRow[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFoods = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFoods();
  }, [loadFoods]);

  const categoryNames = useMemo(() => {
    const names = categories
      .map(row => textValue(row, ['category_name', 'name', 'title']))
      .filter(Boolean);
    return ['All', ...Array.from(new Set(names))];
  }, [categories]);

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return foods.filter(food => {
      const name = textValue(
        food,
        ['food_name', 'product_name', 'productName', 'name'],
        'Menu item',
      );
      const foodCategory = textValue(food, ['category_name', 'category']);
      return (
        (category === 'All' || foodCategory === category) &&
        (!query || `${name} ${foodCategory}`.toLowerCase().includes(query))
      );
    });
  }, [category, foods, search]);

  return (
    <View className="flex-1">
      <Text className="text-2xl font-extrabold text-[#012711]">Food Management</Text>
      <Text className="mt-1 text-sm text-[#64748B]">
        Browse menu items and availability.
      </Text>
      <TextInput
        accessibilityLabel="Search foods"
        value={search}
        onChangeText={setSearch}
        placeholder="Search foods"
        placeholderTextColor="#94A3B8"
        className="mt-5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#012711]"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-3"
      >
        {categoryNames.map(name => (
          <Pressable
            key={name}
            accessibilityLabel={`Filter foods by ${name}`}
            accessibilityRole="button"
            onPress={() => setCategory(name)}
            className={`rounded-full border px-4 py-2 ${
              category === name
                ? 'border-[#F97316] bg-[#F97316]'
                : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <Text className={category === name ? 'text-xs font-bold text-white' : 'text-xs font-bold text-[#475569]'}>
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <View className="items-center rounded-2xl bg-white p-8">
          <ActivityIndicator color="#F97316" />
          <Text className="mt-3 text-sm text-[#64748B]">Loading foods...</Text>
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-[#FECACA] bg-white p-5">
          <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
            {error}
          </Text>
        </View>
      ) : filteredFoods.length === 0 ? (
        <View className="rounded-2xl bg-white p-5">
          <Text className="text-center text-sm text-[#64748B]">
            No food items found.
          </Text>
        </View>
      ) : (
        filteredFoods.map((food, index) => {
          const name = textValue(
            food,
            ['food_name', 'product_name', 'productName', 'name'],
            'Menu item',
          );
          const foodCategory = textValue(
            food,
            ['category_name', 'category'],
            'Menu',
          );
          const price = textValue(
            food,
            ['final_price', 'selling_price', 'price', 'unit_price', 'mrp'],
          );
          const image = imageValue(food);
          return (
            <View
              key={`${textValue(food, ['food_id', 'id'], String(index))}-${index}`}
              className="mb-3 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
            >
              {image ? (
                <Image
                  accessibilityLabel={`${name} image`}
                  source={{ uri: image }}
                  className="h-36 w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-20 items-center justify-center bg-[#FFF0DE]">
                  <Text className="text-3xl">🍽️</Text>
                </View>
              )}
              <View className="p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-bold text-[#012711]">{name}</Text>
                    <Text className="mt-1 text-xs text-[#64748B]">{foodCategory}</Text>
                  </View>
                  {price ? (
                    <Text className="font-extrabold text-[#F97316]">₹{price}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
