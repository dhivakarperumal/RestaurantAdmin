import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';
import { ProductIcon } from '../Navigation/NavigationIcons';

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
    <View className="min-h-9 flex-row items-center justify-between gap-3 border-b border-[#EEF2F0] py-2">
      <Text className="flex-1 text-xs text-[#667085]">{label}</Text>
      <Text className="flex-1 text-right text-xs font-medium text-[#1F2937]">
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
    <View className="mb-4 overflow-hidden rounded-2xl border border-[#E4EEE7] bg-white">
      <View className="bg-[#EAF6ED] px-4 py-3">
        <Text className="text-sm font-bold text-[#123B27]">{title}</Text>
      </View>
      <View className="px-4 pb-2 pt-1">{children}</View>
    </View>
  );
}

function FoodDetails({ foodId, onBack, onEdit, onDeleted }: FoodDetailsProps) {
  const [food, setFood] = useState<FoodRecord | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
      setSelectedImageIndex(0);
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
  const selectedImage = images[selectedImageIndex] ?? images[0];
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
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2"
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
                className="rounded-lg bg-red-500 px-3 py-2"
              >
                <Text className="font-semibold text-white">Delete</Text>
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
          {selectedImage ? (
            <View className="mb-4">
              <View className="relative overflow-hidden rounded-2xl bg-[#E5E7EB]">
                <Image
                  accessibilityLabel={`${displayText(food.food_name, foodId)} image ${selectedImageIndex + 1}`}
                  resizeMode="cover"
                  source={{ uri: selectedImage }}
                  className="h-56 w-full"
                />
                {images.length > 1 ? (
                  <>
                    <View className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1">
                      <Text className="text-xs font-semibold text-white">
                        {selectedImageIndex + 1} / {images.length}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Show previous food image"
                      accessibilityRole="button"
                      onPress={() =>
                        setSelectedImageIndex(
                          (selectedImageIndex - 1 + images.length) % images.length,
                        )
                      }
                      className="absolute left-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/95"
                    >
                      <Text className="text-2xl leading-7 text-[#123B27]">‹</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Show next food image"
                      accessibilityRole="button"
                      onPress={() =>
                        setSelectedImageIndex((selectedImageIndex + 1) % images.length)
                      }
                      className="absolute right-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/95"
                    >
                      <Text className="text-2xl leading-7 text-[#123B27]">›</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
              {images.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-3"
                >
                  <View className="flex-row gap-3">
                    {images.map((uri, index) => (
                      <Pressable
                        accessibilityLabel={`View ${displayText(food.food_name, foodId)} image ${index + 1}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: index === selectedImageIndex }}
                        key={`${uri}-${index}`}
                        onPress={() => setSelectedImageIndex(index)}
                        className={`overflow-hidden rounded-xl border-2 ${
                          index === selectedImageIndex
                            ? 'border-[#116C0B]'
                            : 'border-transparent'
                        }`}
                      >
                        <Image
                          accessibilityLabel={`${displayText(food.food_name, foodId)} thumbnail ${index + 1}`}
                          resizeMode="cover"
                          source={{ uri }}
                          className="h-16 w-20 bg-[#E5E7EB]"
                        />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>
          ) : (
            <View className="mb-4 h-44 items-center justify-center rounded-2xl bg-[#F0F7EE]">
              <ProductIcon color="#116C0B" size={42} />
            </View>
          )}

          <View className="mb-4 rounded-2xl border border-[#E4EEE7] bg-white p-4">
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
              <View className="rounded-full bg-[#E6F8EC] px-3 py-1.5">
                <Text className="text-xs font-bold text-[#13733A]">
                  {displayText(
                    food.status,
                    food.is_available === false ||
                      String(food.is_available).toLowerCase() === 'false'
                      ? 'Unavailable'
                      : 'Available',
                  )}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Text className="text-2xl font-extrabold text-[#116C0B]">
                {formatCurrency(food.final_price ?? food.mrp)}
              </Text>
              {Number(food.discount) > 0 ? (
                <>
                  <Text className="text-sm text-[#98A2B3] line-through">
                    {formatCurrency(food.mrp)}
                  </Text>
                  <Text className="rounded-lg bg-[#FFF0F1] px-2 py-1 text-xs font-semibold text-[#D83A4E]">
                    {displayText(food.discount)}% OFF
                  </Text>
                </>
              ) : null}
            </View>
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
                  className="border-b border-[#EEF2F0] py-3"
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
      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setIsDeleteConfirmationOpen(false);
        }}
        transparent
        visible={isDeleteConfirmationOpen}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-[#012711]">Delete food?</Text>
            <Text className="mt-2 text-sm leading-5 text-[#6B7280]">
              This will permanently remove {displayText(food?.food_name, 'this item')} from your menu.
            </Text>
            {deleteError ? (
              <Text accessibilityRole="alert" className="mt-3 text-sm text-red-700">
                {deleteError}
              </Text>
            ) : null}
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityLabel="Cancel delete food"
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => setIsDeleteConfirmationOpen(false)}
                className="rounded-xl border border-[#D1D5DB] px-4 py-2.5"
              >
                <Text className="font-semibold text-[#374151]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Confirm delete food"
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={deleteFood}
                className="min-w-20 items-center rounded-xl bg-red-600 px-4 py-2.5"
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default FoodDetails;