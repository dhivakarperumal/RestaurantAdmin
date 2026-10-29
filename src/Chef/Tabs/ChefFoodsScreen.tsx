import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import { BaseModal } from '../../components/popups';

export type ChefFood = {
  food_id?: string | number;
  food_name?: string;
  category_name?: string;
  meal_type?: string;
  preparation_time?: number | string;
  final_price?: number | string;
  status?: string;
  stock_quantity?: number | string;
  food_images?: unknown;
  image?: unknown;
  image_url?: unknown;
  is_available?: boolean | number;
  is_effectively_available?: boolean;
  is_menu_visible?: boolean | number;
};

type ChefFoodsScreenProps = {
  foods: ChefFood[];
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onFoodVisibilityChange: (foodId: string | number, visible: boolean) => void;
};

type ViewMode = 'list' | 'card';

const pageSize = 10;
const backendBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown) {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response) && isRecord(response.data)) {
      const message = response.data.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }
  return 'Food visibility could not be updated.';
}

function isFoodVisible(food: ChefFood) {
  return food.is_menu_visible !== false && food.is_menu_visible !== 0;
}

function getFoodImage(food: ChefFood) {
  let image = Array.isArray(food.food_images)
    ? food.food_images[0]
    : food.food_images ?? food.image ?? food.image_url;

  if (typeof image === 'string' && image.trim().startsWith('[')) {
    try {
      const images: unknown = JSON.parse(image);
      image = Array.isArray(images) ? images[0] : image;
    } catch {
      image = image;
    }
  }

  if (typeof image !== 'string' || !image.trim()) {
    return null;
  }
  const imagePath = image.trim();
  if (/^(https?:|data:|blob:)/i.test(imagePath)) {
    return { uri: imagePath };
  }
  return {
    uri: `${backendBaseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`,
  };
}

function getAvailability(food: ChefFood, now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let activeMeal = 'Evening Snacks';
  if (minutes >= 6 * 60 && minutes < 11 * 60) {
    activeMeal = 'Breakfast';
  } else if (minutes >= 11 * 60 && minutes < 15 * 60) {
    activeMeal = 'Lunch';
  } else if (minutes >= 18 * 60 && minutes < 23 * 60) {
    activeMeal = 'Dinner';
  }

  const isScheduled = String(food.meal_type || '').trim().toLowerCase() === activeMeal.toLowerCase();
  const isEnabled =
    food.is_available !== false &&
    food.is_available !== 0 &&
    isFoodVisible(food) &&
    String(food.status || 'Active').toLowerCase() === 'active' &&
    Number(food.stock_quantity || 0) > 0;

  const available = isScheduled && isEnabled;
  return {
    available,
    label: available ? activeMeal : 'Unavailable',
  };
}

function VisibilitySwitch({
  value,
  disabled,
  label,
  onValueChange,
}: {
  value: boolean;
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      onValueChange={onValueChange}
      thumbColor="#FFFFFF"
      trackColor={{ false: '#CBD5E1', true: '#15803D' }}
      value={value}
    />
  );
}

function FoodImage({
  food,
  imageFailed,
  onImageError,
  className,
}: {
  food: ChefFood;
  imageFailed: boolean;
  onImageError: () => void;
  className: string;
}) {
  const source = imageFailed ? null : getFoodImage(food);

  return (
    <View className={`${className} items-center justify-center overflow-hidden rounded-xl bg-emerald-50`}>
      {source ? (
        <Image
          accessibilityLabel={food.food_name || 'Food image'}
          onError={onImageError}
          resizeMode="cover"
          source={source}
          className="h-full w-full"
        />
      ) : (
        <Text className="text-center text-[11px] font-semibold text-emerald-800">
          Food
        </Text>
      )}
    </View>
  );
}

function FoodSkeletonCard({ viewMode }: { viewMode: ViewMode }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`mb-3 rounded-2xl border border-slate-200 bg-white p-4 ${
        viewMode === 'card' ? 'w-full' : 'flex-row items-center'
      }`}
    >
      <View
        className={`rounded-xl bg-slate-100 ${
          viewMode === 'card' ? 'mb-3 h-40 w-full' : 'mr-3 h-16 w-16'
        }`}
      />
      <View className={viewMode === 'card' ? '' : 'min-w-0 flex-1'}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-2">
            <View className="h-4 w-2/3 rounded-md bg-slate-100" />
            <View className="h-3 w-1/3 rounded-md bg-slate-100" />
          </View>
          <View className="h-6 w-11 rounded-full bg-slate-100" />
        </View>
        <View className="mt-3 flex-row gap-2">
          <View className="h-6 w-20 rounded-full bg-slate-100" />
          <View className="h-6 w-14 rounded-full bg-slate-100" />
          <View className="h-6 w-16 rounded-full bg-slate-100" />
        </View>
        <View className="mt-3 flex-row gap-4 border-t border-slate-100 pt-3">
          <View className="h-3 w-28 rounded-md bg-slate-100" />
          <View className="h-3 w-20 rounded-md bg-slate-100" />
        </View>
      </View>
    </View>
  );
}

function ChefFoodsScreen({
  foods,
  isLoading,
  error,
  onRefresh,
  onFoodVisibilityChange,
}: ChefFoodsScreenProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [updatingFoodId, setUpdatingFoodId] = useState<string | number | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [visibilitySearch, setVisibilitySearch] = useState('');
  const [visibilityError, setVisibilityError] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string | number>>(
    () => new Set(),
  );
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(
        foods
          .map(food => String(food.category_name || '').trim())
          .filter(Boolean),
      )].sort((first, second) => first.localeCompare(second)),
    [foods],
  );

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return foods.filter(food => {
      const matchesCategory =
        categoryFilter === 'all' || food.category_name === categoryFilter;
      const matchesSearch = [food.food_name, food.category_name].some(value =>
        String(value || '').toLowerCase().includes(query),
      );
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, foods, search]);

  const filteredVisibilityFoods = useMemo(() => {
    const query = visibilitySearch.trim().toLowerCase();
    return foods.filter(food =>
      [food.food_name, food.category_name].some(value =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [foods, visibilitySearch]);

  const pageCount = Math.max(1, Math.ceil(filteredFoods.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOffset = (currentPage - 1) * pageSize;
  const visibleFoods = filteredFoods.slice(pageOffset, pageOffset + pageSize);
  const allFoodsVisible = foods.length > 0 && foods.every(isFoodVisible);
  const visibleCount = foods.filter(isFoodVisible).length;
  const activeCount = foods.filter(
    food => String(food.status || 'Active').toLowerCase() === 'active',
  ).length;

  const changeVisibility = async (food: ChefFood, visible: boolean) => {
    if (typeof food.food_id !== 'string' && typeof food.food_id !== 'number') {
      setVisibilityError('This food has no valid ID and cannot be updated.');
      return;
    }
    if (isBulkUpdating) {
      return;
    }
    const previousVisibility = isFoodVisible(food);
    setVisibilityError('');
    setUpdatingFoodId(food.food_id);
    onFoodVisibilityChange(food.food_id, visible);
    try {
      await api.patch(
        `/foods/${encodeURIComponent(String(food.food_id))}/visibility`,
        { is_menu_visible: visible },
      );
    } catch (requestError) {
      onFoodVisibilityChange(food.food_id, previousVisibility);
      setVisibilityError(getErrorMessage(requestError));
    } finally {
      setUpdatingFoodId(null);
    }
  };

  const changeAllVisibility = async () => {
    const nextVisibility = !allFoodsVisible;
    const changedFoods = foods.filter(
      food => isFoodVisible(food) !== nextVisibility,
    );
    const validFoods = changedFoods.filter(
      (food): food is ChefFood & { food_id: string | number } =>
        typeof food.food_id === 'string' || typeof food.food_id === 'number',
    );

    if (validFoods.length !== changedFoods.length) {
      setVisibilityError('One or more foods have no valid ID and could not be updated.');
      return;
    }
    if (!validFoods.length || isBulkUpdating) {
      return;
    }

    setVisibilityError('');
    setIsBulkUpdating(true);
    validFoods.forEach(food => onFoodVisibilityChange(food.food_id, nextVisibility));

    const results = await Promise.allSettled(
      validFoods.map(food =>
        api.patch(
          `/foods/${encodeURIComponent(String(food.food_id))}/visibility`,
          { is_menu_visible: nextVisibility },
        ),
      ),
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure) {
      setVisibilityError(getErrorMessage(failure.reason));
      onRefresh();
    }
    setIsBulkUpdating(false);
  };

  const toggleSingle = (food: ChefFood) => {
    void changeVisibility(food, !isFoodVisible(food));
  };

  const renderFoodCard = (food: ChefFood, index: number) => {
    const key = food.food_id ?? `${food.food_name || 'food'}-${index}`;
    const availability = getAvailability(food, currentTime);
    const isUpdating = updatingFoodId === food.food_id || isBulkUpdating;

    return (
      <View
        key={String(key)}
        className={`mb-3 rounded-2xl border border-slate-200 bg-white p-4 ${
          viewMode === 'card' ? 'w-full' : 'flex-row items-center'
        }`}
      >
        <FoodImage
          className={viewMode === 'card' ? 'mb-3 h-40 w-full' : 'mr-3 h-16 w-16'}
          food={food}
          imageFailed={imageErrors.has(key)}
          onImageError={() =>
            setImageErrors(current => new Set(current).add(key))
          }
        />
        <View className={viewMode === 'card' ? '' : 'min-w-0 flex-1'}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">
                {food.food_name || 'Unnamed food'}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                {food.category_name || 'Uncategorized'}
              </Text>
            </View>
            <VisibilitySwitch
              disabled={isUpdating}
              label={`Show ${food.food_name || 'food'} to customers and billing`}
              onValueChange={() => toggleSingle(food)}
              value={isFoodVisible(food)}
            />
          </View>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <Text
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                availability.available
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {availability.label}
            </Text>
            <Text
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                String(food.status || 'Active').toLowerCase() === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {food.status || 'Active'}
            </Text>
            <Text
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isFoodVisible(food)
                  ? 'bg-green-50 text-green-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isFoodVisible(food) ? 'Shown' : 'Hidden'}
            </Text>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
            <Text className="text-xs text-slate-600">
              Preparation: {food.preparation_time ? `${food.preparation_time} min` : '—'}
            </Text>
            <Text className="text-xs font-semibold text-slate-800">
              Price: ₹{Number(food.final_price || 0).toFixed(2)}
            </Text>
          </View>
          {isUpdating ? (
            <Text className="mt-2 text-[11px] text-slate-500">Saving visibility…</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View className="mb-4 border-b border-slate-200 pb-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-slate-500">
              Chef workspace
            </Text>
            <Text className="mt-1 text-2xl font-extrabold text-slate-900">
              All Foods
            </Text>
            <Text className="mt-1 text-sm text-slate-600">
              Browse and manage food visibility.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading || isBulkUpdating}
            onPress={() => setIsVisibilityModalOpen(true)}
            className="rounded-xl bg-emerald-800 px-3 py-2.5"
          >
            <Text className="text-xs font-bold text-white">Visibility</Text>
          </Pressable>
        </View>
        <Text className="mt-3 text-xs text-slate-600">
          {foods.length} {foods.length === 1 ? 'food' : 'foods'}
        </Text>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-2">
        {[
          { label: 'Total dishes', value: foods.length, usesBrandColor: true, color: '' },
          { label: 'Active', value: activeCount, usesBrandColor: false, color: 'bg-emerald-50' },
          { label: 'Menu visible', value: visibleCount, usesBrandColor: false, color: 'bg-blue-50' },
          { label: 'Hidden', value: foods.length - visibleCount, usesBrandColor: false, color: 'bg-pink-50' },
        ].map(stat => (
          <View
            key={stat.label}
            className={`min-w-[46%] flex-1 rounded-xl border border-slate-200 p-3 ${
              stat.usesBrandColor ? '' : stat.color
            }`}
            style={
              stat.usesBrandColor
                ? { backgroundColor: colors.surfaceSecondary }
                : undefined
            }
          >
            <Text className="text-[11px] font-medium text-slate-600">
              {stat.label}
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-slate-900">
              {isLoading ? '…' : stat.value}
            </Text>
          </View>
        ))}
      </View>

      <View className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
        <TextInput
          accessibilityLabel="Search foods or categories"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          onChangeText={value => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search foods or categories"
          value={search}
        />
        {categories.length ? (
          <ScrollView
            className="mt-3"
            contentContainerClassName="gap-2"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {['all', ...categories].map(category => {
              const selected = categoryFilter === category;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={category}
                  onPress={() => {
                    setCategoryFilter(category);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-2 ${
                    selected ? 'bg-emerald-800' : 'bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {category === 'all' ? 'All categories' : category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        <View className="mt-3 flex-row self-start rounded-lg border border-slate-200 p-1">
          {(['list', 'card'] as const).map(mode => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === mode }}
              key={mode}
              onPress={() => setViewMode(mode)}
              className={`rounded-md px-3 py-2 ${
                viewMode === mode ? 'bg-emerald-800' : 'bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  viewMode === mode ? 'text-white' : 'text-slate-600'
                }`}
              >
                {mode === 'list' ? 'List' : 'Cards'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text accessibilityRole="alert" className="text-sm text-red-700">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            className="mt-2 self-start"
          >
            <Text className="font-semibold text-red-800 underline">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View accessibilityLabel="Loading foods" className="gap-0">
          {[0, 1, 2, 3].map(index => (
            <FoodSkeletonCard key={index} viewMode={viewMode} />
          ))}
        </View>
      ) : filteredFoods.length ? (
        visibleFoods.map(renderFoodCard)
      ) : (
        <View className="rounded-xl border border-slate-200 bg-white px-4 py-10">
          <Text className="text-center text-sm text-slate-500">
            {foods.length
              ? 'No foods match this search.'
              : 'No foods have been added yet.'}
          </Text>
        </View>
      )}

      {!isLoading && !error && filteredFoods.length > 0 ? (
        <View className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Text className="flex-1 text-[11px] text-slate-600">
            {pageOffset + 1}–{Math.min(pageOffset + pageSize, filteredFoods.length)} of {filteredFoods.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={currentPage === 1}
            onPress={() => setPage(current => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-300 px-2.5 py-2 disabled:opacity-50"
          >
            <Text className="text-xs font-medium text-slate-700">Previous</Text>
          </Pressable>
          <Text className="mx-2 text-xs font-semibold text-slate-700">
            {currentPage}/{pageCount}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={currentPage === pageCount}
            onPress={() =>
              setPage(current => Math.min(pageCount, current + 1))
            }
            className="rounded-lg border border-slate-300 px-2.5 py-2 disabled:opacity-50"
          >
            <Text className="text-xs font-medium text-slate-700">Next</Text>
          </Pressable>
        </View>
      ) : null}

      <BaseModal
        visible={isVisibilityModalOpen}
        onClose={() => {
          if (!isBulkUpdating) setIsVisibilityModalOpen(false);
        }}
        title="Manage Food Visibility"
        subtitle="Choose which foods appear to customers and billing"
        variant="bottom-sheet"
        footer={
          <Pressable
            accessibilityLabel="Done managing food visibility"
            accessibilityRole="button"
            disabled={isBulkUpdating}
            onPress={() => setIsVisibilityModalOpen(false)}
            className="min-h-12 w-full items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
          >
            <Text className="text-sm font-bold text-white">Done</Text>
          </Pressable>
        }
      >
        <View className="gap-3 pb-2">
          <TextInput
            accessibilityLabel="Search foods in visibility manager"
            className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm text-[#0F172A]"
            onChangeText={setVisibilitySearch}
            placeholder="Search foods or categories"
            placeholderTextColor="#94A3B8"
            value={visibilitySearch}
          />
          <View className="flex-row items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Text className="flex-1 text-sm font-bold text-emerald-950">
              Show all foods
            </Text>
            {isBulkUpdating ? (
              <ActivityIndicator color="#116C0B" />
            ) : (
              <VisibilitySwitch
                disabled={isLoading || isBulkUpdating || !foods.length}
                label="Show all foods to customers and billing"
                onValueChange={() => void changeAllVisibility()}
                value={allFoodsVisible}
              />
            )}
          </View>
          {visibilityError ? (
            <Text accessibilityRole="alert" className="text-xs text-red-700">
              {visibilityError}
            </Text>
          ) : null}

          <ScrollView className="max-h-[340px]" contentContainerClassName="gap-1 pb-2">
            {filteredVisibilityFoods.length ? (
              filteredVisibilityFoods.map((food, index) => {
                const key = food.food_id ?? `${food.food_name || 'food'}-${index}`;
                const updating =
                  isBulkUpdating || updatingFoodId === food.food_id;
                return (
                  <View
                    key={String(key)}
                    className="min-h-12 flex-row items-center gap-2.5 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2"
                  >
                    <VisibilitySwitch
                      disabled={updating}
                      label={`Show ${food.food_name || 'food'} to customers and billing`}
                      onValueChange={() => toggleSingle(food)}
                      value={isFoodVisible(food)}
                    />
                    <Text
                      numberOfLines={1}
                      className="min-w-0 flex-1 text-xs font-semibold text-[#0F172A]"
                    >
                      {food.food_name || 'Unnamed food'}
                    </Text>
                    <View className="rounded-lg bg-white border border-[#E2E8F0] px-2 py-0.5">
                      <Text
                        numberOfLines={1}
                        className="max-w-[120px] text-[10px] font-bold text-[#64748B]"
                      >
                        {food.category_name || 'Uncategorized'}
                      </Text>
                    </View>
                    {updating ? (
                      <Text className="text-[10px] text-[#64748B]">Saving…</Text>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Text className="px-3 py-8 text-center text-sm text-[#64748B]">
                {foods.length ? 'No foods match this search.' : 'No foods available.'}
              </Text>
            )}
          </ScrollView>
        </View>
      </BaseModal>
    </View>
  );
}

export default ChefFoodsScreen;
