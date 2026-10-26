import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import api from '../../api';

type FoodOption = {
  value: string;
  label: string;
};

type FoodForm = {
  foodName: string;
  cuisineId: string;
  categoryId: string;
  subcategoryName: string;
  mealType: string;
  description: string;
  mrp: string;
  discount: string;
  rating: string;
  stockQuantity: string;
  servingSize: string;
  portionSize: string;
  preparationTime: string;
  availableTime: string;
  foodType: string;
  isSpicy: boolean;
  isAvailable: boolean;
  diningAvailable: boolean;
  takeawayAvailable: boolean;
  deliveryAvailable: boolean;
  featured: boolean;
  status: string;
};

type AddFoodProps = {
  actor?: string;
  onCancel: () => void;
  onSaved: () => void;
};

type FoodAddon = {
  id: string;
  name: string;
  price: string;
  status: string;
};

type FoodCustomizationOption = {
  id: string;
  name: string;
  price: string;
};

type FoodCustomization = {
  id: string;
  name: string;
  selectionType: 'Single' | 'Multiple';
  required: boolean;
  options: FoodCustomizationOption[];
};

type ApiRecord = Record<string, unknown>;

type FoodImage = {
  id: string;
  uri: string;
  name: string;
  type: string;
  url?: string;
  isUploading: boolean;
  error?: string;
};

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const initialForm: FoodForm = {
  foodName: '',
  cuisineId: '',
  categoryId: '',
  subcategoryName: '',
  mealType: '',
  description: '',
  mrp: '',
  discount: '0',
  rating: '0',
  stockQuantity: '0',
  servingSize: '',
  portionSize: 'Full',
  preparationTime: '0',
  availableTime: '10:00 AM - 1:00 PM',
  foodType: 'Veg',
  isSpicy: false,
  isAvailable: true,
  diningAvailable: true,
  takeawayAvailable: true,
  deliveryAvailable: true,
  featured: false,
  status: 'Active',
};

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null;
}

function readRows(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value) && Array.isArray(value.data)) {
    return value.data.filter(isRecord);
  }
  return [];
}

function readText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: unknown, fallback: string) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-sm font-semibold text-[#374151]">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className={`rounded-xl border bg-white px-3.5 py-3 text-sm text-[#111827] ${
          error ? 'border-red-500' : 'border-[#D1D5DB]'
        }`}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {error ? <Text className="mt-1 text-xs text-red-700">{error}</Text> : null}
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  options: FoodOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <>
      <View className="mb-3">
        <Text className="mb-1.5 text-sm font-semibold text-[#374151]">{label}</Text>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setIsOpen(true)}
          className={`flex-row items-center justify-between rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          <Text className={selected ? 'text-sm text-[#111827]' : 'text-sm text-[#9CA3AF]'}>
            {selected?.label || placeholder}
          </Text>
          <Text className="text-xs text-[#6B7280]">▼</Text>
        </Pressable>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable
          className="flex-1 justify-center bg-black/40 px-5"
          onPress={() => setIsOpen(false)}
        >
          <View className="max-h-[70%] rounded-2xl bg-white p-4">
            <Text className="mb-3 text-base font-bold text-[#012711]">{label}</Text>
            <ScrollView>
              {options.map(option => (
                <Pressable
                  accessibilityLabel={`Select ${label} ${option.label}`}
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="border-b border-[#F3F4F6] py-3"
                >
                  <Text className="text-sm text-[#111827]">{option.label}</Text>
                </Pressable>
              ))}
              {options.length === 0 ? (
                <Text className="py-3 text-sm text-[#6B7280]">No options available</Text>
              ) : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              className="mt-3 items-center rounded-xl bg-[#F3F4F6] py-3"
            >
              <Text className="font-semibold text-[#374151]">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3">
      <Text className="text-sm text-[#374151]">{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: '#86A980' }}
        thumbColor={value ? '#116C0B' : '#F9FAFB'}
        value={value}
      />
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="mb-4 text-base font-bold text-[#012711]">{title}</Text>
      {children}
    </View>
  );
}

function AddFood({ actor = 'Admin', onCancel, onSaved }: AddFoodProps) {
  const [form, setForm] = useState<FoodForm>(initialForm);
  const [cuisines, setCuisines] = useState<ApiRecord[]>([]);
  const [categories, setCategories] = useState<ApiRecord[]>([]);
  const [foodId, setFoodId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addons, setAddons] = useState<FoodAddon[]>([]);
  const [customizations, setCustomizations] = useState<FoodCustomization[]>([]);
  const [images, setImages] = useState<FoodImage[]>([]);
  const isUploadingImages = images.some(image => image.isUploading);

  useEffect(() => {
    let isActive = true;

    const loadOptions = async () => {
      setIsLoading(true);
      setPageError('');
      const [cuisineResult, categoryResult, idResult] = await Promise.allSettled([
        api.get('/cuisines'),
        api.get('/categories'),
        api.get('/foods/next-id'),
      ]);

      if (!isActive) {
        return;
      }

      const failedLoads = [cuisineResult, categoryResult].some(
        result => result.status === 'rejected',
      );
      if (cuisineResult.status === 'fulfilled') {
        const rows = readRows(cuisineResult.value.data);
        setCuisines(rows.filter(row => row.status !== 'Inactive'));
      }
      if (categoryResult.status === 'fulfilled') {
        const rows = readRows(categoryResult.value.data);
        setCategories(rows.filter(row => row.status !== 'Inactive'));
      }
      if (idResult.status === 'fulfilled') {
        const responseData = idResult.value.data;
        setFoodId(
          isRecord(responseData) && typeof responseData.data === 'string'
            ? responseData.data
            : '',
        );
      } else {
        setPageError(errorMessage(idResult.reason, 'Unable to generate the food ID.'));
      }
      if (failedLoads) {
        setPageError('Could not load cuisines or categories. Check the API and try again.');
      }
      setIsLoading(false);
    };

    loadOptions().catch(loadError => {
      if (isActive) {
        setPageError(errorMessage(loadError, 'Unable to load the food form.'));
        setIsLoading(false);
      }
    });
    return () => {
      isActive = false;
    };
  }, []);

  const selectedCategory = categories.find(
    category => String(category.category_id ?? category.id ?? '') === form.categoryId,
  );
  const subcategories = useMemo(() => {
    const value = selectedCategory?.sub_categories;
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === 'string');
    }
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((entry): entry is string => typeof entry === 'string')
          : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [selectedCategory]);

  const cuisineOptions = cuisines.map(cuisine => ({
    value: String(cuisine.cuisine_id ?? cuisine.id ?? ''),
    label: readText(cuisine.cuisine_name) || readText(cuisine.name),
  }));
  const categoryOptions = categories.map(category => ({
    value: String(category.category_id ?? category.id ?? ''),
    label: readText(category.category_name) || readText(category.name),
  }));
  const finalPrice = Math.max(
    0,
    Number(
      (
        Number(form.mrp || 0) -
        (Number(form.mrp || 0) * Number(form.discount || 0)) / 100
      ).toFixed(2),
    ),
  );

  const updateField = <K extends keyof FoodForm>(key: K, value: FoodForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: '' }));
  };

  const addAddon = () => {
    setAddons(current => [
      ...current,
      { id: `${Date.now()}-${current.length}`, name: '', price: '0', status: 'Active' },
    ]);
  };

  const addCustomization = () => {
    setCustomizations(current => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        name: '',
        selectionType: 'Single',
        required: false,
        options: [{ id: `${Date.now()}-option`, name: '', price: '0' }],
      },
    ]);
  };

  const uploadImage = async (image: FoodImage) => {
    setImages(current =>
      current.map(item =>
        item.id === image.id ? { ...item, isUploading: true, error: undefined } : item,
      ),
    );

    const body = new FormData();
    body.append('folder', 'foods');
    body.append(
      'file',
      {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as unknown as Blob,
    );

    try {
      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      const uploadedUrl =
        isRecord(data) && typeof data.url === 'string'
          ? data.url
          : isRecord(data) &&
              isRecord(data.data) &&
              typeof data.data.url === 'string'
            ? data.data.url
            : '';
      if (!uploadedUrl) {
        throw new Error('Image upload returned no URL.');
      }
      setImages(current =>
        current.map(item =>
          item.id === image.id
            ? { ...item, url: uploadedUrl, isUploading: false, error: undefined }
            : item,
        ),
      );
    } catch (error) {
      const message = errorMessage(error, `Unable to upload ${image.name}.`);
      setImages(current =>
        current.map(item =>
          item.id === image.id
            ? { ...item, isUploading: false, error: message }
            : item,
        ),
      );
      setPageError(message);
    }
  };

  const chooseImages = async () => {
    setPageError('');
    const remainingCount = 5 - images.length;
    if (remainingCount <= 0) {
      setPageError('You can add up to 5 food images.');
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remainingCount,
        quality: 0.8,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        setPageError(result.errorMessage || 'Unable to open the photo library.');
        return;
      }

      const validAssets = (result.assets || []).filter(
        (asset): asset is Asset & { uri: string } => Boolean(asset.uri),
      );
      const hasOversizedImage = validAssets.some(
        asset => typeof asset.fileSize === 'number' && asset.fileSize > 5 * 1024 * 1024,
      );
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const hasUnsupportedImage = validAssets.some(
        asset => asset.type && !supportedTypes.includes(asset.type.toLowerCase()),
      );
      const acceptedAssets = validAssets.filter(
        asset =>
          (!asset.fileSize || asset.fileSize <= 5 * 1024 * 1024) &&
          (!asset.type || supportedTypes.includes(asset.type.toLowerCase())),
      );
      const rejections: string[] = [];
      if (hasOversizedImage) rejections.push('Each food image must be 5 MB or smaller.');
      if (hasUnsupportedImage) rejections.push('Use JPG, PNG, or WEBP food images.');
      if (rejections.length) setPageError(rejections.join(' '));
      const queuedImages = acceptedAssets.map((asset, index): FoodImage => ({
        id: `${Date.now()}-${images.length + index}`,
        uri: asset.uri,
        name: asset.fileName || `food-image-${images.length + index + 1}.jpg`,
        type: asset.type || 'image/jpeg',
        isUploading: false,
      }));
      setImages(current => [...current, ...queuedImages]);
      await Promise.all(queuedImages.map(uploadImage));
    } catch (error) {
      setPageError(errorMessage(error, 'Unable to select food images.'));
    }
  };

  const removeImage = (imageId: string) => {
    setImages(current => current.filter(image => image.id !== imageId));
  };

  const handleSave = async () => {
    if (isUploadingImages || images.some(image => !image.url)) {
      setPageError('Wait for all food images to finish uploading successfully.');
      return;
    }
    const errors: Record<string, string> = {};
    const mrp = Number(form.mrp);
    const discount = Number(form.discount);
    if (!form.foodName.trim()) errors.foodName = 'Food name is required.';
    if (!form.cuisineId) errors.cuisineId = 'Choose a cuisine.';
    if (!form.categoryId) errors.categoryId = 'Choose a category.';
    if (!form.subcategoryName) errors.subcategoryName = 'Choose a subcategory.';
    if (!MEAL_TYPES.includes(form.mealType)) errors.mealType = 'Choose a meal time.';
    if (form.mrp === '' || !Number.isFinite(mrp) || mrp < 0) {
      errors.mrp = 'Enter a valid non-negative MRP.';
    }
    if (!Number.isFinite(Number(form.preparationTime)) || Number(form.preparationTime) < 0) {
      errors.preparationTime = 'Preparation time cannot be negative.';
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      errors.discount = 'Discount must be between 0 and 100.';
    }
    addons.forEach((addon, index) => {
      if (!addon.name.trim()) {
        errors[`addon-${index}`] = 'Enter an add-on name or remove this row.';
      }
      if (!Number.isFinite(Number(addon.price)) || Number(addon.price) < 0) {
        errors[`addon-price-${index}`] = 'Enter a non-negative add-on price.';
      }
    });
    customizations.forEach((group, groupIndex) => {
      if (!group.name.trim()) {
        errors[`customization-${groupIndex}`] = 'Enter a customization name.';
      }
      if (!group.options.length) {
        errors[`customization-options-${groupIndex}`] = 'Add at least one option.';
      }
      group.options.forEach((option, optionIndex) => {
        if (!option.name.trim()) {
          errors[`option-${groupIndex}-${optionIndex}`] = 'Enter an option name.';
        }
        if (!Number.isFinite(Number(option.price)) || Number(option.price) < 0) {
          errors[`option-price-${groupIndex}-${optionIndex}`] =
            'Enter a non-negative option price.';
        }
      });
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setPageError('Review the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    setPageError('');
    const cuisine = cuisines.find(
      item => String(item.cuisine_id ?? item.id ?? '') === form.cuisineId,
    );
    const category = categories.find(
      item => String(item.category_id ?? item.id ?? '') === form.categoryId,
    );
    const payload = {
      food_id: foodId,
      food_name: form.foodName.trim(),
      cuisine_id: form.cuisineId,
      cuisine_name: readText(cuisine?.cuisine_name) || readText(cuisine?.name),
      category_id: form.categoryId,
      category_name: readText(category?.category_name) || readText(category?.name),
      subcategory_name: form.subcategoryName,
      meal_type: form.mealType,
      description: form.description.trim(),
      food_images: images
        .map(image => image.url)
        .filter((url): url is string => Boolean(url)),
      mrp,
      discount,
      rating: Number(form.rating) || 0,
      stock_quantity: Number(form.stockQuantity) || 0,
      serving_size: form.servingSize.trim(),
      portion_size: form.portionSize,
      preparation_time: Number(form.preparationTime) || 0,
      available_time: form.availableTime.trim(),
      food_type: form.foodType,
      is_spicy: form.isSpicy,
      is_available: form.isAvailable,
      dining_available: form.diningAvailable,
      takeaway_available: form.takeawayAvailable,
      delivery_available: form.deliveryAvailable,
      featured: form.featured,
      status: form.status,
      addons: addons.map(addon => ({
        addon_name: addon.name.trim(),
        price: Number(addon.price) || 0,
        status: addon.status,
      })),
      customizations: customizations.map(group => ({
        name: group.name.trim(),
        selection_type: group.selectionType,
        required: group.required,
        options: group.options.map(option => ({
          name: option.name.trim(),
          price: Number(option.price) || 0,
        })),
      })),
      created_by: actor,
    };

    try {
      await api.post('/foods', payload);
      onSaved();
    } catch (error) {
      setPageError(errorMessage(error, 'Unable to save food. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9FAFB]">
        <ActivityIndicator color="#116C0B" />
        <Text className="mt-3 text-sm text-[#6B7280]">Loading food form...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="flex-row items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-[#012711]">Add Food</Text>
          <Text className="mt-1 text-xs text-[#6B7280]">
            Create a menu item with pricing and availability.
          </Text>
        </View>
        <Text className="ml-3 rounded-lg bg-[#F0F7EE] px-2.5 py-2 text-xs font-bold text-[#116C0B]">
          {foodId || 'Food ID unavailable'}
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {pageError ? (
          <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </Text>
        ) : null}
        <Section title="Basic details">
          <InputField
            error={fieldErrors.foodName}
            label="Food name"
            onChangeText={value => updateField('foodName', value)}
            placeholder="e.g. Chicken Biryani"
            value={form.foodName}
          />
          <SelectField
            label="Food type"
            onChange={value => updateField('foodType', value)}
            options={[
              { value: 'Veg', label: 'Veg' },
              { value: 'Non-Veg', label: 'Non-Veg' },
            ]}
            placeholder="Choose food type"
            value={form.foodType}
          />
          <SelectField
            label="Cuisine"
            onChange={value => updateField('cuisineId', value)}
            options={cuisineOptions}
            placeholder="Choose cuisine"
            value={form.cuisineId}
          />
          {fieldErrors.cuisineId ? (
            <Text className="mb-3 text-xs text-red-700">{fieldErrors.cuisineId}</Text>
          ) : null}
          <SelectField
            label="Category"
            onChange={value => {
              updateField('categoryId', value);
              updateField('subcategoryName', '');
            }}
            options={categoryOptions}
            placeholder="Choose category"
            value={form.categoryId}
          />
          {fieldErrors.categoryId ? (
            <Text className="mb-3 text-xs text-red-700">{fieldErrors.categoryId}</Text>
          ) : null}
          <SelectField
            disabled={!form.categoryId}
            label="Subcategory"
            onChange={value => updateField('subcategoryName', value)}
            options={subcategories.map(value => ({ value, label: value }))}
            placeholder={form.categoryId ? 'Choose subcategory' : 'Choose a category first'}
            value={form.subcategoryName}
          />
          {fieldErrors.subcategoryName ? (
            <Text className="mb-3 text-xs text-red-700">
              {fieldErrors.subcategoryName}
            </Text>
          ) : null}
          <InputField
            label="Description"
            multiline
            onChangeText={value => updateField('description', value)}
            placeholder="Ingredients, flavor, or serving details"
            value={form.description}
          />
          <View className="mb-3">
            <View className="mb-2 flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#374151]">Food images</Text>
                <Text className="mt-1 text-xs text-[#6B7280]">
                  Select up to 5 images, maximum 5 MB each.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Choose food images"
                accessibilityRole="button"
                disabled={isUploadingImages || images.length >= 5}
                onPress={chooseImages}
                className={`rounded-xl px-3 py-2.5 ${
                  isUploadingImages || images.length >= 5
                    ? 'bg-[#9CA3AF]'
                    : 'bg-[#116C0B]'
                }`}
              >
                <Text className="text-xs font-bold text-white">
                  {isUploadingImages ? 'Uploading…' : 'Choose images'}
                </Text>
              </Pressable>
            </View>
            {images.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-3 py-1">
                  {images.map((image, index) => (
                    <View
                      key={image.id}
                      className="w-32 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
                    >
                      <Image
                        accessibilityLabel={image.name}
                        resizeMode="cover"
                        source={{ uri: image.uri }}
                        className="h-24 w-full bg-[#F3F4F6]"
                      />
                      <Text numberOfLines={1} className="px-2 pt-1.5 text-[10px] text-[#374151]">
                        {image.name}
                      </Text>
                      <Text
                        className={`px-2 pb-1.5 pt-0.5 text-[10px] ${
                          image.error
                            ? 'text-red-700'
                            : image.url
                              ? 'text-[#116C0B]'
                              : 'text-[#9A6700]'
                        }`}
                      >
                        {image.isUploading
                          ? 'Uploading…'
                          : image.error
                            ? 'Upload failed'
                            : image.url
                              ? 'Uploaded'
                              : 'Waiting to upload'}
                      </Text>
                      {image.error ? (
                        <Pressable
                          accessibilityLabel={`Retry upload image ${index + 1}`}
                          accessibilityRole="button"
                          onPress={() => uploadImage(image)}
                          className="mx-2 mb-1.5 items-center rounded-md bg-[#FFF7ED] py-1"
                        >
                          <Text className="text-[10px] font-semibold text-[#C2410C]">
                            Retry upload
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel={`Remove food image ${index + 1}`}
                        accessibilityRole="button"
                        disabled={image.isUploading}
                        onPress={() => removeImage(image.id)}
                        className={`border-t border-[#F3F4F6] py-1.5 ${
                          image.isUploading ? 'opacity-50' : ''
                        }`}
                      >
                        <Text className="text-center text-[10px] font-semibold text-red-700">
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="items-center rounded-xl border border-dashed border-[#D1D5DB] bg-white py-6">
                <Text className="text-sm text-[#6B7280]">No food images selected.</Text>
              </View>
            )}
          </View>
        </Section>

        <Section title="Pricing">
          <InputField
            error={fieldErrors.mrp}
            keyboardType="decimal-pad"
            label="MRP (₹)"
            onChangeText={value => updateField('mrp', value)}
            placeholder="0.00"
            value={form.mrp}
          />
          <InputField
            error={fieldErrors.discount}
            keyboardType="decimal-pad"
            label="Discount (%)"
            onChangeText={value => updateField('discount', value)}
            placeholder="0"
            value={form.discount}
          />
          <View className="mb-3 rounded-xl bg-[#F0F7EE] p-3.5">
            <Text className="text-xs text-[#4B5563]">Final price (₹)</Text>
            <Text className="mt-1 text-lg font-bold text-[#116C0B]">
              {finalPrice.toFixed(2)}
            </Text>
          </View>
        </Section>

        <Section title="Food details">
          <InputField
            keyboardType="number-pad"
            label="Stock quantity"
            onChangeText={value => updateField('stockQuantity', value)}
            value={form.stockQuantity}
          />
          <InputField
            keyboardType="number-pad"
            label="Preparation time (minutes)"
            onChangeText={value => updateField('preparationTime', value)}
            error={fieldErrors.preparationTime}
            value={form.preparationTime}
          />
          <InputField
            keyboardType="decimal-pad"
            label="Food rating (0–5)"
            onChangeText={value => updateField('rating', value)}
            value={form.rating}
          />
          <InputField
            label="Serving size"
            onChangeText={value => updateField('servingSize', value)}
            placeholder="e.g. Serves 1"
            value={form.servingSize}
          />
          <SelectField
            label="Portion size"
            onChange={value => updateField('portionSize', value)}
            options={['Half', 'Full', 'Your Choice'].map(value => ({ value, label: value }))}
            placeholder="Choose portion size"
            value={form.portionSize}
          />
          <ToggleField
            label="Is spicy?"
            onChange={value => updateField('isSpicy', value)}
            value={form.isSpicy}
          />
        </Section>

        <Section title="Availability">
          <SelectField
            label="Meal time"
            onChange={value => updateField('mealType', value)}
            options={MEAL_TYPES.map(value => ({ value, label: value }))}
            placeholder="Choose meal time"
            value={form.mealType}
          />
          {fieldErrors.mealType ? (
            <Text className="mb-3 text-xs text-red-700">{fieldErrors.mealType}</Text>
          ) : null}
          <InputField
            label="Available time"
            onChangeText={value => updateField('availableTime', value)}
            placeholder="10:00 AM - 1:00 PM"
            value={form.availableTime}
          />
          <ToggleField
            label="Available"
            onChange={value => updateField('isAvailable', value)}
            value={form.isAvailable}
          />
          <ToggleField
            label="Dining available"
            onChange={value => updateField('diningAvailable', value)}
            value={form.diningAvailable}
          />
          <ToggleField
            label="Takeaway available"
            onChange={value => updateField('takeawayAvailable', value)}
            value={form.takeawayAvailable}
          />
          <ToggleField
            label="Delivery available"
            onChange={value => updateField('deliveryAvailable', value)}
            value={form.deliveryAvailable}
          />
          <ToggleField
            label="Featured food"
            onChange={value => updateField('featured', value)}
            value={form.featured}
          />
          <SelectField
            label="Status"
            onChange={value => updateField('status', value)}
            options={['Active', 'Inactive'].map(value => ({ value, label: value }))}
            placeholder="Choose status"
            value={form.status}
          />
        </Section>

        <Section title="Add-ons">
          {addons.map((addon, addonIndex) => (
            <View key={addon.id} className="mb-3 rounded-xl border border-[#E5E7EB] p-3">
              <InputField
                label={`Add-on ${addonIndex + 1} name`}
                onChangeText={value =>
                  setAddons(current =>
                    current.map(entry =>
                      entry.id === addon.id ? { ...entry, name: value } : entry,
                    ),
                  )
                }
                placeholder="e.g. Extra cheese"
                value={addon.name}
              />
              <InputField
                keyboardType="decimal-pad"
                label="Add-on price (₹)"
                onChangeText={value =>
                  setAddons(current =>
                    current.map(entry =>
                      entry.id === addon.id ? { ...entry, price: value } : entry,
                    ),
                  )
                }
                value={addon.price}
              />
              <SelectField
                label="Add-on status"
                onChange={value =>
                  setAddons(current =>
                    current.map(entry =>
                      entry.id === addon.id ? { ...entry, status: value } : entry,
                    ),
                  )
                }
                options={['Active', 'Inactive'].map(value => ({ value, label: value }))}
                placeholder="Choose status"
                value={addon.status}
              />
              <Pressable
                accessibilityLabel={`Remove add-on ${addonIndex + 1}`}
                accessibilityRole="button"
                onPress={() =>
                  setAddons(current => current.filter(entry => entry.id !== addon.id))
                }
                className="items-center rounded-lg bg-red-50 py-2"
              >
                <Text className="text-sm font-semibold text-red-700">Remove add-on</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityLabel="Add add-on"
            accessibilityRole="button"
            onPress={addAddon}
            className="items-center rounded-xl border border-dashed border-[#FF5A00] py-3"
          >
            <Text className="font-semibold text-[#EA580C]">+ Add add-on</Text>
          </Pressable>
        </Section>

        <Section title="Customizations">
          {customizations.map((group, groupIndex) => (
            <View key={group.id} className="mb-3 rounded-xl border border-[#E5E7EB] p-3">
              <InputField
                label={`Customization ${groupIndex + 1} name`}
                onChangeText={value =>
                  setCustomizations(current =>
                    current.map(entry =>
                      entry.id === group.id ? { ...entry, name: value } : entry,
                    ),
                  )
                }
                placeholder="e.g. Spice level"
                value={group.name}
              />
              <SelectField
                label="Selection type"
                onChange={value =>
                  setCustomizations(current =>
                    current.map(entry =>
                      entry.id === group.id
                        ? {
                            ...entry,
                            selectionType: value === 'Multiple' ? 'Multiple' : 'Single',
                          }
                        : entry,
                    ),
                  )
                }
                options={['Single', 'Multiple'].map(value => ({ value, label: value }))}
                placeholder="Choose selection type"
                value={group.selectionType}
              />
              <ToggleField
                label="Required"
                onChange={value =>
                  setCustomizations(current =>
                    current.map(entry =>
                      entry.id === group.id ? { ...entry, required: value } : entry,
                    ),
                  )
                }
                value={group.required}
              />
              {group.options.map((option, optionIndex) => (
                <View key={option.id} className="rounded-lg bg-[#F9FAFB] p-2">
                  <InputField
                    label={`Option ${optionIndex + 1} name`}
                    onChangeText={value =>
                      setCustomizations(current =>
                        current.map(entry =>
                          entry.id === group.id
                            ? {
                                ...entry,
                                options: entry.options.map(item =>
                                  item.id === option.id ? { ...item, name: value } : item,
                                ),
                              }
                            : entry,
                        ),
                      )
                    }
                    placeholder="e.g. Mild"
                    value={option.name}
                  />
                  <InputField
                    keyboardType="decimal-pad"
                    label="Extra price (₹)"
                    onChangeText={value =>
                      setCustomizations(current =>
                        current.map(entry =>
                          entry.id === group.id
                            ? {
                                ...entry,
                                options: entry.options.map(item =>
                                  item.id === option.id ? { ...item, price: value } : item,
                                ),
                              }
                            : entry,
                        ),
                      )
                    }
                    value={option.price}
                  />
                  <Pressable
                    accessibilityLabel={`Remove option ${optionIndex + 1} from customization ${groupIndex + 1}`}
                    accessibilityRole="button"
                    disabled={group.options.length <= 1}
                    onPress={() =>
                      setCustomizations(current =>
                        current.map(entry =>
                          entry.id === group.id
                            ? {
                                ...entry,
                                options: entry.options.filter(item => item.id !== option.id),
                              }
                            : entry,
                        ),
                      )
                    }
                    className="items-center py-2"
                  >
                    <Text className="text-sm font-semibold text-red-700">Remove option</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                accessibilityLabel={`Add option to customization ${groupIndex + 1}`}
                accessibilityRole="button"
                onPress={() =>
                  setCustomizations(current =>
                    current.map(entry =>
                      entry.id === group.id
                        ? {
                            ...entry,
                            options: [
                              ...entry.options,
                              {
                                id: `${Date.now()}-${entry.options.length}`,
                                name: '',
                                price: '0',
                              },
                            ],
                          }
                        : entry,
                    ),
                  )
                }
                className="mb-2 items-center rounded-lg bg-[#FFF7ED] py-2"
              >
                <Text className="font-semibold text-[#EA580C]">+ Add option</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove customization ${groupIndex + 1}`}
                accessibilityRole="button"
                onPress={() =>
                  setCustomizations(current => current.filter(entry => entry.id !== group.id))
                }
                className="items-center rounded-lg bg-red-50 py-2"
              >
                <Text className="text-sm font-semibold text-red-700">
                  Remove customization
                </Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityLabel="Add customization"
            accessibilityRole="button"
            onPress={addCustomization}
            className="items-center rounded-xl border border-dashed border-[#FF5A00] py-3"
          >
            <Text className="font-semibold text-[#EA580C]">+ Add customization group</Text>
          </Pressable>
        </Section>
      </ScrollView>
      <View className="flex-row gap-3 border-t border-[#E5E7EB] bg-white px-4 py-3">
        <Pressable
          accessibilityLabel="Cancel Add Food"
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onCancel}
          className="h-12 flex-1 items-center justify-center rounded-xl border border-[#D1D5DB] bg-white"
        >
          <Text className="font-semibold text-[#374151]">Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Save Food"
          accessibilityRole="button"
          disabled={isSaving || isUploadingImages || images.some(image => !image.url)}
          onPress={handleSave}
          className={`h-12 flex-1 items-center justify-center rounded-xl ${
            isSaving || isUploadingImages || images.some(image => !image.url)
              ? 'bg-[#86A980]'
              : 'bg-[#FF5A00]'
          }`}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-bold text-white">Save Food</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default AddFood;