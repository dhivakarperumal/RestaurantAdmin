import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';
import { ProductIcon } from '../Navigation/NavigationIcons';
import { ConfirmDialog } from '../../components/popups';

type FoodRecord = Record<string, unknown>;

type FoodDetailsProps = {
  foodId: string;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
};

function isRecord(value: unknown): value is FoodRecord {
  return typeof value === 'object' && value !== null;
}

function displayText(value: unknown, fallback = 'Not provided') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
}

function formatCurrency(value: unknown) {
  const amount = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 'Not provided';
}

function readImageUrl(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const image = value.trim();
    if (!image) return undefined;
    if (image.startsWith('[') || image.startsWith('{')) {
      try {
        return readImageUrl(JSON.parse(image) as unknown);
      } catch {
        return undefined;
      }
    }
    if (/^(https?:|data:image\/|file:|content:)/i.test(image)) return image;
    if (image.startsWith('//')) {
      return `${API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:'}${image}`;
    }
    const root = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${root}/${image.replace(/^\.?\//, '')}`;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = readImageUrl(entry);
      if (image) return image;
    }
    return undefined;
  }
  if (isRecord(value)) {
    for (const key of ['url', 'image_url', 'imageUrl', 'image', 'src', 'path']) {
      const image = readImageUrl(value[key]);
      if (image) return image;
    }
  }
  return undefined;
}

function readImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(readImageUrl)
      .filter((image): image is string => Boolean(image));
  }
  const singleImage = readImageUrl(value);
  return singleImage ? [singleImage] : [];
}

function readRows(value: unknown): FoodRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3 border-b border-[#F3F4F6] py-3">
      <Text className="flex-1 text-sm text-[#6B7280]">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-[#111827]">
        {value}
      </Text>
    </View>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="mb-2 text-base font-bold text-[#012711]">{title}</Text>
      {children}
    </View>
  );
}

function FoodDetails({ foodId, onBack, onEdit, onDeleted }: FoodDetailsProps) {
  const [food, setFood] = useState<FoodRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadFood = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/foods/${encodeURIComponent(foodId)}`, {
          signal: controller.signal,
        });
        const payload = response.data;
        const record =
          isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
        if (!isRecord(record)) {
          throw new Error('Food details were not found.');
        }
        if (isActive) setFood(record);
      } catch (loadError) {
        if (isActive && !controller.signal.aborted) {
          setError(
            isRecord(loadError) && typeof loadError.message === 'string'
              ? loadError.message
              : 'Unable to load food details.',
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadFood();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [foodId, retry]);

  const deleteFood = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/foods/${encodeURIComponent(foodId)}`);
      setIsDeleteConfirmationOpen(false);
      onDeleted();
    } catch (deleteRequestError) {
      setDeleteError(
        isRecord(deleteRequestError) && typeof deleteRequestError.message === 'string'
          ? deleteRequestError.message
          : 'Unable to delete this food. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const images = readImageUrls(food?.food_images ?? food?.image);
  const addons = readRows(food?.addons);
  const customizations = readRows(food?.customizations);

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <MoreInnerHeader
        title="Food details"
        destination="Items"
        onBack={onBack}
        subtitle={foodId}
        rightContent={
          !isLoading && !error && food ? (
            <View className="flex-row gap-2">
              <Pressable
                accessibilityLabel={`Edit ${displayText(food.food_name, 'food')}`}
                accessibilityRole="button"
                onPress={onEdit}
                className="rounded-xl bg-white/15 px-3 py-2"
              >
                <Text className="font-semibold text-white">Edit</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${displayText(food.food_name, 'food')}`}
                accessibilityRole="button"
                onPress={() => {
                  setDeleteError('');
                  setIsDeleteConfirmationOpen(true);
                }}
                className="rounded-xl bg-red-50 px-3 py-2"
              >
                <Text className="font-semibold text-red-700">Delete</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-sm text-[#6B7280]">Loading food details...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text accessibilityRole="alert" className="text-center text-sm text-red-700">
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry loading food details"
            accessibilityRole="button"
            onPress={() => setRetry(count => count + 1)}
            className="mt-4 rounded-xl bg-[#116C0B] px-5 py-3"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : food ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => setRetry(count => count + 1)}
              colors={['#116C0B']}
              tintColor="#116C0B"
            />
          }
          contentContainerStyle={{ alignSelf: 'center', maxWidth: 900, padding: 16, width: '100%' }}
        >
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-3">
                {images.map((uri, index) => (
                  <Image
                    accessibilityLabel={`${displayText(food.food_name, foodId)} image ${index + 1}`}
                    key={`${uri}-${index}`}
                    resizeMode="cover"
                    source={{ uri }}
                    className="h-56 w-72 rounded-2xl bg-[#E5E7EB]"
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="mb-4 h-44 items-center justify-center rounded-2xl bg-[#F0F7EE]">
              <ProductIcon color="#116C0B" size={42} />
            </View>
          )}

          <View className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-[#012711]">
                  {displayText(food.food_name, 'Unnamed food')}
                </Text>
                <Text className="mt-1 text-sm text-[#6B7280]">
                  {displayText(food.category_name, displayText(food.category_id))}
                  {food.subcategory_name ? ` · ${displayText(food.subcategory_name)}` : ''}
                </Text>
              </View>
              <Text className="rounded-full bg-[#F0F7EE] px-3 py-1.5 text-xs font-bold text-[#116C0B]">
                {displayText(food.status, 'Available')}
              </Text>
            </View>
            <Text className="mt-4 text-2xl font-extrabold text-[#116C0B]">
              {formatCurrency(food.final_price)}
            </Text>
            {food.description ? (
              <Text className="mt-3 text-sm leading-5 text-[#4B5563]">
                {displayText(food.description)}
              </Text>
            ) : null}
          </View>

          <DetailSection title="Basic information">
            <DetailRow label="Food ID" value={displayText(food.food_id, foodId)} />
            <DetailRow label="Cuisine" value={displayText(food.cuisine_name, displayText(food.cuisine_id))} />
            <DetailRow label="Category" value={displayText(food.category_name, displayText(food.category_id))} />
            <DetailRow label="Subcategory" value={displayText(food.subcategory_name)} />
            <DetailRow label="Meal time" value={displayText(food.meal_type)} />
            <DetailRow label="Food type" value={displayText(food.food_type)} />
            <DetailRow label="Spicy" value={displayText(food.is_spicy)} />
            <DetailRow label="Rating" value={displayText(food.rating)} />
          </DetailSection>

          <DetailSection title="Pricing and stock">
            <DetailRow label="MRP" value={formatCurrency(food.mrp)} />
            <DetailRow label="Discount" value={`${displayText(food.discount, '0')}%`} />
            <DetailRow label="Final price" value={formatCurrency(food.final_price)} />
            <DetailRow label="Stock quantity" value={displayText(food.stock_quantity)} />
            <DetailRow label="Serving size" value={displayText(food.serving_size)} />
            <DetailRow label="Portion size" value={displayText(food.portion_size)} />
            <DetailRow label="Preparation time" value={`${displayText(food.preparation_time)} min`} />
          </DetailSection>

          <DetailSection title="Availability">
            <DetailRow label="Available" value={displayText(food.is_available)} />
            <DetailRow label="Menu visible" value={displayText(food.is_menu_visible)} />
            <DetailRow label="Dining" value={displayText(food.dining_available)} />
            <DetailRow label="Takeaway" value={displayText(food.takeaway_available)} />
            <DetailRow label="Delivery" value={displayText(food.delivery_available)} />
            <DetailRow label="Available time" value={displayText(food.available_time)} />
            <DetailRow label="Schedule" value={displayText(food.availability_label)} />
            <DetailRow label="Featured" value={displayText(food.featured)} />
          </DetailSection>

          {addons.length ? (
            <DetailSection title="Add-ons">
              {addons.map((addon, index) => (
                <DetailRow
                  key={String(addon.addon_id ?? addon.id ?? index)}
                  label={displayText(addon.addon_name ?? addon.name, `Add-on ${index + 1}`)}
                  value={`${formatCurrency(addon.price)} · ${displayText(addon.status)}`}
                />
              ))}
            </DetailSection>
          ) : null}

          {customizations.length ? (
            <DetailSection title="Customizations">
              {customizations.map((customization, index) => (
                <View
                  key={String(customization.id ?? customization.name ?? index)}
                  className="border-b border-[#F3F4F6] py-3"
                >
                  <Text className="text-sm font-semibold text-[#111827]">
                    {displayText(customization.name, `Customization ${index + 1}`)}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7280]">
                    {displayText(customization.selection_type)} ·{' '}
                    {customization.required ? 'Required' : 'Optional'}
                  </Text>
                  {readRows(customization.options).map((option, optionIndex) => (
                    <Text
                      key={String(option.id ?? option.name ?? optionIndex)}
                      className="mt-1 text-xs text-[#4B5563]"
                    >
                      {displayText(option.name)} · {formatCurrency(option.price)}
                    </Text>
                  ))}
                </View>
              ))}
            </DetailSection>
          ) : null}

          <DetailSection title="Record information">
            <DetailRow label="Created by" value={displayText(food.created_by)} />
            <DetailRow label="Updated by" value={displayText(food.updated_by)} />
            <DetailRow label="Created at" value={displayText(food.created_at)} />
            <DetailRow label="Updated at" value={displayText(food.updated_at)} />
          </DetailSection>
        </ScrollView>
      ) : null}
      <ConfirmDialog
        visible={isDeleteConfirmationOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteConfirmationOpen(false);
        }}
        onConfirm={deleteFood}
        title="Delete food?"
        itemName={displayText(food?.food_name, 'this item')}
        message="This will permanently remove this item from your menu."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </View>
  );
}

export default FoodDetails;