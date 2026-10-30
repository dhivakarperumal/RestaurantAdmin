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
import api, { API_BASE_URL } from '../../../api';
import {
  CustomersIcon,
  MenuIcon,
  OrdersIcon,
  SearchIcon,
} from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';
import { BaseModal } from '../../components/popups';
import {
  getActiveMenu,
  getFoodAvailability,
} from '../foodAvailability';
import ChefStatCards from './ChefStatCards';

export type ChefFood = {
  food_id?: string | number;
  food_name?: string;
  category_name?: string;
  meal_type?: string;
  available_time?: string;
  preparation_time?: number | string;
  final_price?: number | string;
  status?: string;
  stock_quantity?: number | string;
  food_images?: unknown;
  image?: unknown;
  image_url?: unknown;
  is_available?: boolean | number | string;
  is_effectively_available?: boolean;
  is_menu_visible?: boolean | number;
};

type ChefFoodsScreenProps = {
  foods: ChefFood[];
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onFoodVisibilityChange: (foodId: string | number, visible: boolean) => void;
  onFoodAvailabilityChange: (
    foodId: string | number,
    updates: Partial<ChefFood>,
  ) => void;
};

type ViewMode = 'grid' | 'table';
type FoodStatusFilter = 'all' | 'active' | 'inactive';

const pageSize = 10;
const backendBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
const AVAILABLE_TIME_PRESETS = [
  { value: '6:00 AM - 11:00 AM', label: '6:00 AM - 11:00 AM · Breakfast', mealType: 'Breakfast' },
  { value: '11:00 AM - 3:00 PM', label: '11:00 AM - 3:00 PM · Lunch', mealType: 'Lunch' },
  { value: '3:00 PM - 6:00 PM', label: '3:00 PM - 6:00 PM · Evening Snacks', mealType: 'Evening Snacks' },
  { value: '6:00 PM - 11:00 PM', label: '6:00 PM - 11:00 PM · Dinner', mealType: 'Dinner' },
  { value: 'All Day', label: 'All Day', mealType: 'All Day' },
];

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
        viewMode === 'grid' ? 'w-full' : 'w-full flex-row items-center'
      }`}
    >
      <View
        className={`rounded-xl bg-slate-100 ${
          viewMode === 'grid' ? 'mb-3 h-32 w-full' : 'mr-3 h-16 w-16'
        }`}
      />
      <View className={viewMode === 'grid' ? '' : 'min-w-0 flex-1'}>
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
  onFoodAvailabilityChange,
}: ChefFoodsScreenProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<FoodStatusFilter>('all');
  const [openFilter, setOpenFilter] = useState<'category' | 'status' | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [updatingFoodId, setUpdatingFoodId] = useState<string | number | null>(null);
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<string | number | null>(null);
  const [availabilityFood, setAvailabilityFood] = useState<ChefFood | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
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
      const isActive = String(food.status || 'Active').toLowerCase() === 'active';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? isActive : !isActive);
      const matchesSearch = [
        food.food_name,
        food.category_name,
        food.meal_type,
        food.available_time,
      ].some(value =>
        String(value || '').toLowerCase().includes(query),
      );
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [categoryFilter, foods, search, statusFilter]);

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

  const saveAvailability = async (
    food: ChefFood,
    updates: Partial<ChefFood>,
  ) => {
    if (typeof food.food_id !== 'string' && typeof food.food_id !== 'number') {
      setAvailabilityError('This food has no valid ID and cannot be updated.');
      return;
    }
    if (updatingAvailabilityId !== null) {
      return;
    }

    const previousValues = {
      is_available: food.is_available,
      available_time: food.available_time,
      meal_type: food.meal_type,
      stock_quantity: food.stock_quantity,
    };
    const optimisticUpdates = {
      ...updates,
      ...(updates.is_available === true && Number(food.stock_quantity || 0) <= 0
        ? { stock_quantity: 50 }
        : {}),
    };
    setAvailabilityError('');
    setUpdatingAvailabilityId(food.food_id);
    onFoodAvailabilityChange(food.food_id, optimisticUpdates);

    try {
      const response = await api.patch(
        `/foods/${encodeURIComponent(String(food.food_id))}/availability`,
        updates,
      );
      if (isRecord(response.data?.data)) {
        onFoodAvailabilityChange(
          food.food_id,
          response.data.data as Partial<ChefFood>,
        );
      }
    } catch (requestError) {
      onFoodAvailabilityChange(food.food_id, previousValues);
      setAvailabilityError(getErrorMessage(requestError));
      onRefresh();
    } finally {
      setUpdatingAvailabilityId(null);
    }
  };

  const toggleFoodAvailability = (food: ChefFood) => {
    const availability = getFoodAvailability(food, currentTime);
    const shouldBeAvailable = !availability.available;
    if (!shouldBeAvailable) {
      saveAvailability(food, { is_available: false });
      return;
    }

    const activeMenu = getActiveMenu(currentTime);
    if (!availability.scheduledAvailable) {
      saveAvailability(food, {
        is_available: true,
        available_time: activeMenu.timeRange,
        meal_type: activeMenu.mealType,
      });
      return;
    }
    saveAvailability(food, { is_available: true });
  };

  const changeFoodAvailableTime = (food: ChefFood, availableTime: string) => {
    const selectedPreset = AVAILABLE_TIME_PRESETS.find(
      preset => preset.value === availableTime,
    );
    if (!selectedPreset) {
      setAvailabilityError('Choose a valid available-time option.');
      return;
    }
    setAvailabilityFood(null);
    saveAvailability(food, {
      available_time: selectedPreset.value,
      meal_type: selectedPreset.mealType,
      is_available: true,
    });
  };

  const renderFoodCard = (food: ChefFood, index: number) => {
    const key = food.food_id ?? `${food.food_name || 'food'}-${index}`;
    const availability = getFoodAvailability(food, currentTime);
    const isUpdating = updatingFoodId === food.food_id || isBulkUpdating;
    const isAvailabilityUpdating = updatingAvailabilityId === food.food_id;

    return (
      <View
        key={String(key)}
        className="mb-3 w-full rounded-2xl border border-slate-200 bg-white p-4"
      >
        <FoodImage
          className="mb-3 h-32 w-full"
          food={food}
          imageFailed={imageErrors.has(key)}
          onImageError={() =>
            setImageErrors(current => new Set(current).add(key))
          }
        />
        <View>
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
            <Text className="w-full text-xs font-semibold text-slate-700">
              Available time: {food.available_time || food.meal_type || 'Not set'}
            </Text>
            <Text className="text-xs text-slate-600">
              Preparation: {food.preparation_time ? `${food.preparation_time} min` : '—'}
            </Text>
            <Text className="text-xs font-semibold text-slate-800">
              Price: ₹{Number(food.final_price || 0).toFixed(2)}
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-semibold text-slate-600">
                Available now
              </Text>
              <Switch
                accessibilityLabel={`Mark ${food.food_name || 'food'} ${
                  availability.available ? 'unavailable' : 'available'
                }`}
                disabled={isAvailabilityUpdating || isBulkUpdating}
                onValueChange={() => toggleFoodAvailability(food)}
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: '#15803D' }}
                value={availability.available}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isAvailabilityUpdating || isBulkUpdating}
              onPress={() => setAvailabilityFood(food)}
              className="max-w-[65%] rounded-lg border border-slate-300 bg-white px-2.5 py-2 disabled:opacity-50"
            >
              <Text numberOfLines={1} className="text-[10px] font-semibold text-slate-700">
                Change time
              </Text>
            </Pressable>
          </View>
          {isUpdating ? (
            <Text className="mt-2 text-[11px] text-slate-500">Saving visibility…</Text>
          ) : null}
          {isAvailabilityUpdating ? (
            <Text className="mt-2 text-[11px] text-slate-500">Saving availability…</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderFoodTableRow = (food: ChefFood, index: number) => {
    const key = food.food_id ?? `${food.food_name || 'food'}-${index}`;
    const availability = getFoodAvailability(food, currentTime);
    const isUpdating = updatingFoodId === food.food_id || isBulkUpdating;
    const isAvailabilityUpdating = updatingAvailabilityId === food.food_id;
    const isActive = String(food.status || 'Active').toLowerCase() === 'active';

    return (
      <View
        key={String(key)}
        className="min-h-[76px] w-[805px] flex-row items-center border-b border-slate-100 bg-white px-3 py-2"
      >
        <View className="w-[45px] items-center px-1">
          <Text className="text-[11px] font-semibold text-slate-600">
            {pageOffset + index + 1}
          </Text>
        </View>
        <View className="w-[200px] flex-row items-center pr-3">
          <FoodImage
            className="mr-3 h-12 w-12 shrink-0"
            food={food}
            imageFailed={imageErrors.has(key)}
            onImageError={() =>
              setImageErrors(current => new Set(current).add(key))
            }
          />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={2} className="text-xs font-bold text-slate-900">
              {food.food_name || 'Unnamed food'}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-[10px] text-slate-500">
              {food.category_name || 'Uncategorized'}
            </Text>
          </View>
        </View>

        <View className="w-[145px] px-2">
          <Text className="text-[9px] font-semibold uppercase text-slate-400">
            Available time
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[11px] font-semibold text-slate-700">
            {food.available_time || food.meal_type || 'Not set'}
          </Text>
        </View>

        <View className="w-[80px] px-2">
          <Text className="text-[9px] font-semibold uppercase text-slate-400">
            Price
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[11px] font-bold text-slate-800">
            ₹{Number(food.final_price || 0).toFixed(2)}
          </Text>
        </View>

        <View className="w-[100px] px-2">
          <Text className="text-[9px] font-semibold uppercase text-slate-400">
            Status
          </Text>
          <Text
            numberOfLines={1}
            className={`mt-1 self-start rounded-full px-2 py-1 text-[10px] font-semibold ${
              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {food.status || 'Active'}
          </Text>
        </View>

        <View className="w-[95px] flex-row items-center justify-center gap-1 px-2">
          <Text className="text-[10px] font-semibold text-slate-600">Shown</Text>
          <VisibilitySwitch
            disabled={isUpdating}
            label={`Show ${food.food_name || 'food'} to customers and billing`}
            onValueChange={() => toggleSingle(food)}
            value={isFoodVisible(food)}
          />
        </View>

        <View className="w-[140px] items-center px-2">
          <View className="flex-row items-center gap-2">
            <Text
              numberOfLines={1}
              className={`text-[10px] font-semibold ${
                availability.available ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {availability.available ? 'Available' : 'Unavailable'}
            </Text>
            <Switch
              accessibilityLabel={`Mark ${food.food_name || 'food'} ${
                availability.available ? 'unavailable' : 'available'
              }`}
              disabled={isAvailabilityUpdating || isBulkUpdating}
              onValueChange={() => toggleFoodAvailability(food)}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#CBD5E1', true: '#15803D' }}
              value={availability.available}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isAvailabilityUpdating || isBulkUpdating}
            onPress={() => setAvailabilityFood(food)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            <Text className="text-[9px] font-semibold text-slate-700">
              Change time
            </Text>
          </Pressable>
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
              See when each food is scheduled and manage its availability.
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

      <ChefStatCards
        isLoading={isLoading}
        stats={[
          {
            label: 'Total dishes',
            value: foods.length,
            hint: 'Menu items',
            icon: <MenuIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Available now',
            value: foods.filter(
              food => getFoodAvailability(food, currentTime).available,
            ).length,
            hint: 'Inside the current service window',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Outside time',
            value: foods.filter(
              food => !getFoodAvailability(food, currentTime).scheduledAvailable,
            ).length,
            hint: 'Outside available time',
            icon: <OrdersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Kitchen ready',
            value: foods.filter(
              food => food.is_available !== false && food.is_available !== 0,
            ).length,
            hint: 'Marked available by kitchen',
            icon: <MenuIcon color="#F6D36A" size={22} />,
          },
        ]}
      />
      {availabilityError ? (
        <Text accessibilityRole="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {availabilityError}
        </Text>
      ) : null}

      <View
        className="mb-3 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
        style={{
          position: 'relative',
          zIndex: openFilter ? 20 : 0,
          elevation: openFilter ? 20 : 0,
        }}
      >
        <View className="min-h-11 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
          <SearchIcon color="#9CA3AF" size={17} />
          <TextInput
            accessibilityLabel="Search foods or categories"
            className="ml-2 flex-1 py-2 text-sm text-[#012711]"
            onChangeText={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search foods by name or category..."
            placeholderTextColor={colors.textSecondary}
            value={search}
          />
        </View>
        <View className="flex-row items-end gap-2">
          <View
            className="flex-1 flex-row gap-2"
            style={{
              position: 'relative',
              zIndex: openFilter ? 30 : 0,
              elevation: openFilter ? 30 : 0,
            }}
          >
            <FoodFilterDropdown
              label="Status"
              onOpen={() =>
                setOpenFilter(current =>
                  current === 'status' ? null : 'status',
                )
              }
              onSelect={value => {
                setStatusFilter(value);
                setPage(1);
                setOpenFilter(null);
              }}
              open={openFilter === 'status'}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              selected={statusFilter}
            />
            <FoodFilterDropdown
              label="Category"
              onOpen={() =>
                setOpenFilter(current =>
                  current === 'category' ? null : 'category',
                )
              }
              onSelect={value => {
                setCategoryFilter(value);
                setPage(1);
                setOpenFilter(null);
              }}
              open={openFilter === 'category'}
              options={[
                { value: 'all', label: 'All categories' },
                ...categories.map(category => ({
                  value: category,
                  label: category,
                })),
              ]}
              selected={categoryFilter}
            />
          </View>
          <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
            {(['grid', 'table'] as const).map(mode => {
              const selected = viewMode === mode;
              return (
                <Pressable
                  accessibilityLabel={`Show foods as ${
                    mode === 'grid' ? 'grid' : 'table'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  className={`h-9 w-9 items-center justify-center rounded-md ${
                    selected ? 'bg-[#116C0B]' : 'bg-[#F3F4F6]'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      selected ? 'text-white' : 'text-[#64748B]'
                    }`}
                  >
                    {mode === 'grid' ? '▦' : '☷'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
        <View
          accessibilityLabel="Loading foods"
          className={viewMode === 'grid' ? 'flex-row flex-wrap justify-between' : ''}
        >
          {[0, 1, 2, 3].map(index => (
            <FoodSkeletonCard key={index} viewMode={viewMode} />
          ))}
        </View>
      ) : filteredFoods.length ? (
        viewMode === 'grid' ? (
          <View className="flex-row flex-wrap justify-between">
            {visibleFoods.map(renderFoodCard)}
          </View>
        ) : (
          <ScrollView
            horizontal
            className="mb-3 rounded-xl border border-slate-200 bg-white"
            showsHorizontalScrollIndicator
          >
            <View>
              <View className="h-10 w-[805px] flex-row items-center border-b border-slate-200 bg-slate-50 px-3">
                {[
                  { label: 'S. No.', width: 'w-[45px]' },
                  { label: 'Food', width: 'w-[200px]' },
                  { label: 'Available time', width: 'w-[145px]' },
                  { label: 'Price', width: 'w-[80px]' },
                  { label: 'Status', width: 'w-[100px]' },
                  { label: 'Menu', width: 'w-[95px]' },
                  { label: 'Availability', width: 'w-[140px]' },
                ].map(column => (
                  <Text
                    key={column.label}
                    className={`${column.width} px-2 text-[9px] font-bold uppercase tracking-wide text-slate-500`}
                  >
                    {column.label}
                  </Text>
                ))}
              </View>
              {visibleFoods.map(renderFoodTableRow)}
            </View>
          </ScrollView>
        )
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
        visible={availabilityFood !== null}
        onClose={() => {
          if (updatingAvailabilityId === null) setAvailabilityFood(null);
        }}
        title="Set Food Available Time"
        subtitle={availabilityFood?.food_name || 'Choose when this food can be ordered'}
        variant="bottom-sheet"
      >
        <View className="gap-2 pb-2">
          {availabilityFood?.available_time &&
          !AVAILABLE_TIME_PRESETS.some(
            preset => preset.value === availabilityFood.available_time,
          ) ? (
            <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Text className="text-xs font-semibold text-amber-900">
                Current custom time: {availabilityFood.available_time}
              </Text>
            </View>
          ) : null}
          {AVAILABLE_TIME_PRESETS.map(preset => (
            <Pressable
              accessibilityRole="button"
              key={preset.value}
              disabled={updatingAvailabilityId !== null}
              onPress={() => {
                if (availabilityFood) {
                  changeFoodAvailableTime(availabilityFood, preset.value);
                }
              }}
              className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-slate-800">
                {preset.label}
              </Text>
              {availabilityFood?.available_time === preset.value ? (
                <Text className="text-xs font-bold text-emerald-700">Selected</Text>
              ) : null}
            </Pressable>
          ))}
          {availabilityError ? (
            <Text accessibilityRole="alert" className="text-xs text-red-700">
              {availabilityError}
            </Text>
          ) : null}
        </View>
      </BaseModal>

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

function FoodFilterDropdown<Value extends string>({
  label,
  options,
  selected,
  open,
  onOpen,
  onSelect,
}: {
  label: string;
  options: { value: Value; label: string }[];
  selected: Value;
  open: boolean;
  onOpen: () => void;
  onSelect: (value: Value) => void;
}) {
  const selectedLabel =
    options.find(option => option.value === selected)?.label ??
    options[0]?.label ??
    '';

  return (
    <View
      className="min-w-0 flex-1"
      style={{
        position: 'relative',
        zIndex: open ? 40 : 0,
        elevation: open ? 40 : 0,
      }}
    >
      <Text className="mb-1 text-[10px] font-bold text-[#475569]">{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onOpen}
        className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-2.5"
      >
        <Text className="flex-1 text-xs text-[#334155]" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Text className="ml-1 text-xs text-[#64748B]">{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? (
        <View
          className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-lg"
          style={{ zIndex: 50, elevation: 50 }}
        >
          {options.map(option => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === selected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                option.value === selected ? 'bg-[#F0FDF4]' : ''
              }`}
            >
              <Text
                numberOfLines={1}
                className={`text-xs ${
                  option.value === selected
                    ? 'font-bold text-[#116C0B]'
                    : 'text-[#334155]'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default ChefFoodsScreen;
