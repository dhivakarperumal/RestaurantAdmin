import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../../api';
import { ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';

type CategoryForm = {
  categoryId: string;
  categoryName: string;
  description: string;
  subcategories: string[];
  image: string;
  status: 'Active' | 'Inactive';
};

type AddCategoriesProps = {
  onBack: () => void;
  showBackButton?: boolean;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const INITIAL_FORM: CategoryForm = {
  categoryId: '',
  categoryName: '',
  description: '',
  subcategories: [],
  image: '',
  status: 'Active',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapData(payload: unknown): unknown {
  let current = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!isRecord(current) || !('data' in current)) {
      return current;
    }
    current = current.data;
  }
  return current;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : null;
    const data = response && isRecord(response.data) ? response.data : null;
    if (data && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function getNextId(payload: unknown) {
  const data = unwrapData(payload);
  if (typeof data === 'string') {
    return data.trim();
  }
  if (isRecord(data)) {
    const id = data.category_id ?? data.categoryId ?? data.cate_id;
    return typeof id === 'string' ? id.trim() : '';
  }
  return '';
}

function resolveImageUrl(value: string) {
  if (/^(https?:|data:image\/|file:|content:)/i.test(value)) {
    return value;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${value.replace(/^\/+/, '')}`;
}

function AddCategories({ onBack, showBackButton = true }: AddCategoriesProps) {
  const [form, setForm] = useState<CategoryForm>(INITIAL_FORM);
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [isLoadingId, setIsLoadingId] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    api
      .get('/categories/next-id', { signal: controller.signal })
      .then(response => {
        const categoryId = getNextId(response.data);
        if (!categoryId) {
          throw new Error('The server did not return a category ID.');
        }
        if (active) {
          setForm(current => ({ ...current, categoryId }));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setFormError(
            getErrorMessage(error, 'Unable to generate a category ID.'),
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingId(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const addSubcategory = () => {
    const name = subcategoryInput.trim();
    if (
      name &&
      !form.subcategories.some(
        existing => existing.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setForm(current => ({
        ...current,
        subcategories: [...current.subcategories, name],
      }));
      setSubcategoryInput('');
    }
  };

  const chooseImage = async () => {
    setFormError('');
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    }).catch(error => {
      setFormError(getErrorMessage(error, 'Unable to open the image library.'));
      return null;
    });
    if (!result || result.didCancel) {
      return;
    }
    if (result.errorCode) {
      setFormError(result.errorMessage || 'Unable to open the image library.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setFormError('Choose a valid category image.');
      return;
    }
    const mimeType = asset.type?.toLowerCase();
    if (
      mimeType &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
    ) {
      setFormError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (asset.fileSize !== undefined && asset.fileSize > MAX_IMAGE_SIZE) {
      setFormError('Category images must be 5 MB or smaller.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('folder', 'categories');
      body.append('file', {
        uri: asset.uri,
        name:
          asset.fileName ||
          `category-${Date.now()}.${mimeType?.split('/')[1] || 'jpg'}`,
        type: mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapData(response.data);
      const imageUrl =
        isRecord(data) && typeof data.url === 'string' ? data.url.trim() : '';
      if (!imageUrl) {
        throw new Error('Image upload returned no image URL.');
      }
      setForm(current => ({ ...current, image: imageUrl }));
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to upload category image.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveCategory = async () => {
    const categoryName = form.categoryName.trim();
    if (!form.categoryId) {
      setFormError('A category ID is required.');
      return;
    }
    if (!categoryName) {
      setFormError('Category name is required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/categories', {
        categoryId: form.categoryId,
        categoryName,
        description: form.description.trim(),
        subcategories: form.subcategories,
        image: form.image,
        status: form.status,
      });
      onBack();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to add category.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAF8]">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 16,
          maxWidth: 820,
          padding: 20,
          paddingBottom: 40,
          width: '100%',
        }}
      >
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          {showBackButton ? (
            <Pressable
              accessibilityLabel="Back to categories"
              accessibilityRole="button"
              onPress={onBack}
              className="self-start rounded-lg py-1"
            >
              <Text className="text-sm font-semibold text-[#116C0B]">
                ‹ Back to categories
              </Text>
            </Pressable>
          ) : null}
          <Text className="mt-2 text-2xl font-extrabold text-[#012711]">
            Add Category
          </Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
            Add the details, image, and settings for your menu category.
          </Text>
        </View>

        <View className="gap-3">
          <CategoryFormSection number="1" title="Basic Information">
            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Category ID
              </Text>
              {isLoadingId ? (
                <View className="min-h-11 flex-row items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3.5">
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text className="text-sm text-[#6B7280]">
                    Generating category ID...
                  </Text>
                </View>
              ) : (
                <TextInput
                  accessibilityLabel="Category ID"
                  editable={false}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3.5 py-3 text-sm text-[#6B7280]"
                  value={form.categoryId}
                />
              )}
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Category name *
              </Text>
              <TextInput
                accessibilityLabel="Category name"
                autoCapitalize="words"
                className="rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
                onChangeText={value =>
                  setForm(current => ({ ...current, categoryName: value }))
                }
                placeholder="Category name"
                placeholderTextColor={colors.textLight}
                value={form.categoryName}
              />
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Description
              </Text>
              <TextInput
                accessibilityLabel="Category description"
                className="min-h-[76px] rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
                multiline
                onChangeText={value =>
                  setForm(current => ({ ...current, description: value }))
                }
                placeholder="Optional description"
                placeholderTextColor={colors.textLight}
                textAlignVertical="top"
                value={form.description}
              />
            </View>
          </CategoryFormSection>

          <CategoryFormSection number="2" title="Subcategories">
            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Subcategories
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  accessibilityLabel="Subcategory name"
                  autoCapitalize="words"
                  className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
                  onChangeText={setSubcategoryInput}
                  onSubmitEditing={addSubcategory}
                  placeholder="Add a subcategory"
                  placeholderTextColor={colors.textLight}
                  returnKeyType="done"
                  value={subcategoryInput}
                />
                <Pressable
                  accessibilityLabel="Add subcategory"
                  accessibilityRole="button"
                  onPress={addSubcategory}
                  className="justify-center rounded-xl bg-[#F0F7EE] px-3"
                >
                  <Text className="text-xs font-semibold text-[#116C0B]">
                    Add
                  </Text>
                </Pressable>
              </View>
              {form.subcategories.length ? (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {form.subcategories.map((name, index) => (
                    <Pressable
                      accessibilityLabel={`Remove subcategory ${name}`}
                      accessibilityRole="button"
                      key={`${name}-${index}`}
                      onPress={() =>
                        setForm(current => ({
                          ...current,
                          subcategories: current.subcategories.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                      className="flex-row items-center gap-1 rounded-full bg-[#F0F7EE] px-3 py-1.5"
                    >
                      <Text className="text-xs font-medium text-[#116C0B]">
                        {name}
                      </Text>
                      <Text className="text-xs text-[#116C0B]">×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </CategoryFormSection>

          <CategoryFormSection number="3" title="Category Image">
            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Category image
              </Text>
              <View className="flex-row items-center gap-3">
                {form.image ? (
                  <Image
                    accessibilityLabel="Category image preview"
                    resizeMode="cover"
                    source={{ uri: resolveImageUrl(form.image) }}
                    className="h-[66px] w-[66px] rounded-xl bg-[#F3F4F6]"
                  />
                ) : (
                  <View className="h-[66px] w-[66px] items-center justify-center rounded-xl bg-[#F0F7EE]">
                    <ProductIcon color={colors.primary} size={27} />
                  </View>
                )}
                <Pressable
                  accessibilityLabel="Choose category image"
                  accessibilityRole="button"
                  disabled={isUploadingImage}
                  onPress={() => void chooseImage()}
                  className="rounded-xl border border-[#D1D5DB] px-4 py-3"
                >
                  {isUploadingImage ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text className="text-xs font-semibold text-[#116C0B]">
                      {form.image ? 'Change image' : 'Choose image'}
                    </Text>
                  )}
                </Pressable>
                <Text className="flex-1 text-[10px] leading-4 text-[#6B7280]">
                  JPG, PNG, WEBP · max 5 MB
                </Text>
              </View>
            </View>
          </CategoryFormSection>

          <CategoryFormSection number="4" title="Category Settings">
            <Pressable
              accessibilityLabel={
                form.status === 'Active'
                  ? 'Set category inactive'
                  : 'Set category active'
              }
              accessibilityRole="switch"
              accessibilityState={{ checked: form.status === 'Active' }}
              onPress={() =>
                setForm(current => ({
                  ...current,
                  status: current.status === 'Active' ? 'Inactive' : 'Active',
                }))
              }
              className="min-h-[58px] flex-row items-center gap-3 rounded-xl border px-3"
              style={{
                borderColor: form.status === 'Active' ? '#BBF7D0' : '#E2E8F0',
                backgroundColor:
                  form.status === 'Active' ? '#F0FDF4' : '#F8FAFC',
              }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Text className="text-base">
                  {form.status === 'Active' ? '✓' : '○'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#1E293B]">
                  {form.status === 'Active'
                    ? 'Category is active'
                    : 'Category is inactive'}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#64748B]">
                  {form.status === 'Active'
                    ? 'Shown as active in category management'
                    : 'Shown as inactive in category management'}
                </Text>
              </View>
              <View
                className="h-6 w-11 justify-center rounded-full px-0.5"
                style={{
                  backgroundColor:
                    form.status === 'Active' ? colors.primary : '#CBD5E1',
                }}
              >
                <View
                  className={`h-5 w-5 rounded-full bg-white ${
                    form.status === 'Active' ? 'self-end' : 'self-start'
                  }`}
                />
              </View>
            </Pressable>
          </CategoryFormSection>

          {formError ? (
            <Text
              accessibilityRole="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]"
            >
              {formError}
            </Text>
          ) : null}

          <View className="flex-row gap-3">
            <Pressable
              accessibilityLabel="Cancel category"
              accessibilityRole="button"
              disabled={isSaving || isUploadingImage}
              onPress={onBack}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
            >
              <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Save category"
              accessibilityRole="button"
              disabled={
                isSaving || isUploadingImage || isLoadingId || !form.categoryId
              }
              onPress={() => void saveCategory()}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
              style={{
                opacity:
                  isSaving ||
                  isUploadingImage ||
                  isLoadingId ||
                  !form.categoryId
                    ? 0.55
                    : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  Create Category
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default AddCategories;

function CategoryFormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-[#15803D]">
          <Text className="text-[11px] font-extrabold text-white">
            {number}
          </Text>
        </View>
        <Text className="text-sm font-extrabold text-[#0F172A]">{title}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}
