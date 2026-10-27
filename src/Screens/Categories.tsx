import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../api';
import { ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../theme/colors';

type Category = {
  id?: number;
  category_id?: string;
  cate_id?: string;
  category_name?: string;
  description?: string | null;
  sub_categories?: string[] | string | null;
  category_image?: string | null;
  status?: string;
  created_at?: string;
  sort_order?: number;
};

type Food = {
  category_id?: string | number | null;
  category_name?: string | null;
};

type CategoryForm = {
  categoryId: string;
  categoryName: string;
  description: string;
  subcategories: string[];
  image: string;
  status: 'Active' | 'Inactive';
};

type CategoriesProps = {
  onAddCategory: () => void;
  onBack: () => void;
  showBackButton?: boolean;
};

type ViewMode = 'cards' | 'table';
type StatusFilter = 'All' | 'Active' | 'Inactive';
type SortMode = 'latest' | 'name' | 'products-high' | 'products-low';

const PAGE_SIZE = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const EMPTY_FORM: CategoryForm = {
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

function readRows<T>(payload: unknown): T[] {
  let current = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as T[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.data)) {
      current = current.data;
      continue;
    }
    if (Array.isArray(current.categories)) {
      return current.categories.filter(isRecord) as T[];
    }
    if (Array.isArray(current.foods)) {
      return current.foods.filter(isRecord) as T[];
    }
    if (Array.isArray(current.items)) {
      return current.items.filter(isRecord) as T[];
    }
    return [];
  }
  return [];
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
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

function getCategoryId(category: Category) {
  return String(category.category_id ?? category.cate_id ?? '');
}

function getSubcategories(value: Category['sub_categories']): string[] {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((name): name is string => typeof name === 'string')
        : [];
    } catch {
      return value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);
    }
  }
  return Array.isArray(value)
    ? value.filter((name): name is string => typeof name === 'string')
    : [];
}

function resolveImageUrl(value?: string | null) {
  const image = value?.trim();
  if (!image) {
    return undefined;
  }
  if (/^(https?:|data:image\/|file:|content:)/i.test(image)) {
    return image;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${image.replace(/^\/+/, '')}`;
}

function getCategoryCount(category: Category, foods: Food[]) {
  const categoryId = getCategoryId(category).trim();
  const categoryName = category.category_name?.trim().toLocaleLowerCase() || '';
  return foods.reduce((count, food) => {
    const foodCategoryId = String(food.category_id ?? '').trim();
    if (foodCategoryId) {
      return (
        count + Number(Boolean(categoryId) && foodCategoryId === categoryId)
      );
    }
    return (
      count +
      Number(
        Boolean(categoryName) &&
          food.category_name?.trim().toLocaleLowerCase() === categoryName,
      )
    );
  }, 0);
}

function CategoryImage({ name, uri }: { name: string; uri?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) {
    return (
      <View className="h-[66px] w-[66px] items-center justify-center rounded-xl bg-[#F0F7EE]">
        <ProductIcon color={colors.primary} size={27} />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${name} category image`}
      onError={() => setFailed(true)}
      resizeMode="cover"
      source={{ uri }}
      className="h-[66px] w-[66px] rounded-xl bg-[#F3F4F6]"
    />
  );
}

function Categories({
  onAddCategory,
  onBack,
  showBackButton = true,
}: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [foodError, setFoodError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setCategoryError('');
    setFoodError('');

    const loadCategories = api
      .get('/categories', { signal: controller.signal })
      .then(response => {
        if (active) {
          setCategories(readRows<Category>(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setCategoryError(
            getErrorMessage(error, 'Unable to load categories.'),
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    const loadFoods = api
      .get('/foods', { signal: controller.signal })
      .then(response => {
        if (active) {
          setFoods(readRows<Food>(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setFoodError(
            getErrorMessage(error, 'Unable to load product counts.'),
          );
        }
      });

    void Promise.all([loadCategories, loadFoods]);
    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshKey]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = categories.filter(category => {
      const matchesStatus =
        statusFilter === 'All' ||
        (category.status || 'Active').toLocaleLowerCase() ===
          statusFilter.toLocaleLowerCase();
      const matchesSearch =
        !query ||
        `${category.category_name || ''} ${getCategoryId(category)} ${
          category.description || ''
        } ${getSubcategories(category.sub_categories).join(' ')}`
          .toLocaleLowerCase()
          .includes(query);
      return matchesStatus && matchesSearch;
    });

    return matching.sort((first, second) => {
      if (sortMode === 'name') {
        return (first.category_name || '').localeCompare(
          second.category_name || '',
        );
      }
      if (sortMode === 'products-high' || sortMode === 'products-low') {
        const difference =
          getCategoryCount(first, foods) - getCategoryCount(second, foods);
        return sortMode === 'products-high' ? -difference : difference;
      }
      const timestampDifference =
        new Date(second.created_at || 0).getTime() -
        new Date(first.created_at || 0).getTime();
      return (
        timestampDifference ||
        Number(first.sort_order || 0) - Number(second.sort_order || 0)
      );
    });
  }, [categories, foods, search, sortMode, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE),
  );
  const visibleCategories = filteredCategories.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  useEffect(() => setPage(0), [search, statusFilter]);
  useEffect(() => setSuccessMessage(''), [search, statusFilter]);
  useEffect(() => {
    if (page >= pageCount) {
      setPage(pageCount - 1);
    }
  }, [page, pageCount]);

  const resetForm = () => {
    requestId.current += 1;
    setIsFormOpen(false);
    setIsFormLoading(false);
    setIsSaving(false);
    setIsUploadingImage(false);
    setIsEditing(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setSubcategoryInput('');
  };

  const openEditForm = async (category: Category) => {
    const categoryId = getCategoryId(category);
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsEditing(true);
    setFormError('');
    setSubcategoryInput('');
    setIsFormOpen(true);
    setIsFormLoading(true);

    try {
      const response = await api.get(
        `/categories/${encodeURIComponent(categoryId)}`,
      );
      const data = unwrapData(response.data);
      if (!isRecord(data) || requestId.current !== currentRequest) {
        return;
      }
      const record = data as Category;
      setForm({
        categoryId: getCategoryId(record) || categoryId,
        categoryName: record.category_name || '',
        description: record.description || '',
        subcategories: getSubcategories(record.sub_categories),
        image: record.category_image || '',
        status:
          record.status?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
      });
    } catch (error) {
      if (requestId.current === currentRequest) {
        setFormError(getErrorMessage(error, 'Unable to load this category.'));
      }
    } finally {
      if (requestId.current === currentRequest) {
        setIsFormLoading(false);
      }
    }
  };

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
    if (!result) {
      return;
    }
    if (result.didCancel) {
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
      const fileName =
        asset.fileName ||
        `category-${Date.now()}.${mimeType?.split('/')[1] || 'jpg'}`;
      const body = new FormData();
      body.append('folder', 'categories');
      body.append('file', {
        uri: asset.uri,
        name: fileName,
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
    if (!form.categoryId.trim()) {
      setFormError('A category ID is required.');
      return;
    }
    if (!categoryName) {
      setFormError('Category name is required.');
      return;
    }
    const duplicate = categories.some(
      category =>
        getCategoryId(category) !== form.categoryId &&
        category.category_name?.trim().toLocaleLowerCase() ===
          categoryName.toLocaleLowerCase(),
    );
    if (duplicate) {
      setFormError('A category with this name already exists.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    const payload = {
      categoryId: form.categoryId.trim(),
      categoryName,
      description: form.description.trim(),
      subcategories: form.subcategories,
      image: form.image,
      status: form.status,
    };
    try {
      if (isEditing) {
        await api.put(
          `/categories/${encodeURIComponent(form.categoryId)}`,
          payload,
        );
      } else {
        await api.post('/categories', payload);
      }
      resetForm();
      setSuccessMessage(
        `Category ${isEditing ? 'updated' : 'created'} successfully.`,
      );
      setRefreshKey(current => current + 1);
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          `Unable to ${isEditing ? 'update' : 'add'} category.`,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) {
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(
        `/categories/${encodeURIComponent(getCategoryId(categoryToDelete))}`,
      );
      setCategoryToDelete(null);
      setSuccessMessage('Category deleted successfully.');
      setRefreshKey(current => current + 1);
    } catch (error) {
      setDeleteError(
        getErrorMessage(
          error,
          'Unable to delete this category. Products may still be using it.',
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const categoryId = getCategoryId(item);
    const subcategories = getSubcategories(item.sub_categories);
    const productCount = getCategoryCount(item, foods);

    if (viewMode === 'table') {
      return (
        <View className="min-h-[64px] flex-row items-center border-b border-[#E5E7EB] bg-white px-3 py-2">
          <View className="min-w-0 flex-[2]">
            <Text
              className="text-sm font-semibold text-[#012711]"
              numberOfLines={1}
            >
              {item.category_name || 'Unnamed category'}
            </Text>
            <Text className="mt-1 text-xs text-[#6B7280]" numberOfLines={1}>
              {categoryId}
            </Text>
          </View>
          <Text className="flex-1 text-center text-sm text-[#374151]">
            {productCount}
          </Text>
          <Text
            className={`flex-1 text-center text-xs font-semibold ${
              item.status?.toLowerCase() === 'inactive'
                ? 'text-[#6B7280]'
                : 'text-[#116C0B]'
            }`}
          >
            {item.status || 'Active'}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel={`Edit ${item.category_name}`}
              accessibilityRole="button"
              onPress={() => void openEditForm(item)}
              className="rounded-lg bg-[#F0F7EE] px-2.5 py-2"
            >
              <Text className="text-xs font-semibold text-[#116C0B]">Edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.category_name}`}
              accessibilityRole="button"
              onPress={() => {
                setDeleteError('');
                setCategoryToDelete(item);
              }}
              className="rounded-lg bg-[#FEF2F2] px-2.5 py-2"
            >
              <Text className="text-xs font-semibold text-[#DC2626]">
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-row gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
        <CategoryImage
          name={item.category_name || 'Category'}
          uri={resolveImageUrl(item.category_image)}
        />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text
                className="text-base font-bold text-[#012711]"
                numberOfLines={1}
              >
                {item.category_name || 'Unnamed category'}
              </Text>
              <Text className="mt-1 text-xs text-[#6B7280]">{categoryId}</Text>
            </View>
            <Text
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                item.status?.toLowerCase() === 'inactive'
                  ? 'bg-[#F3F4F6] text-[#6B7280]'
                  : 'bg-[#F0F7EE] text-[#116C0B]'
              }`}
            >
              {item.status || 'Active'}
            </Text>
          </View>
          <Text className="mt-2 text-xs text-[#6B7280]">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </Text>
          {item.description ? (
            <Text
              className="mt-1 text-xs leading-4 text-[#6B7280]"
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          {subcategories.length ? (
            <Text className="mt-1 text-xs text-[#6B7280]" numberOfLines={1}>
              {subcategories.join(' · ')}
            </Text>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <Pressable
              accessibilityLabel={`Edit ${item.category_name}`}
              accessibilityRole="button"
              onPress={() => void openEditForm(item)}
              className="rounded-lg bg-[#F0F7EE] px-3 py-2"
            >
              <Text className="text-xs font-semibold text-[#116C0B]">Edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.category_name}`}
              accessibilityRole="button"
              onPress={() => {
                setDeleteError('');
                setCategoryToDelete(item);
              }}
              className="rounded-lg bg-[#FEF2F2] px-3 py-2"
            >
              <Text className="text-xs font-semibold text-[#DC2626]">
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <FlatList
        data={visibleCategories}
        key={viewMode}
        keyExtractor={(item, index) =>
          getCategoryId(item) || `${item.category_name || 'category'}-${index}`
        }
        contentContainerStyle={{
          alignSelf: 'center',
          gap: viewMode === 'cards' ? 12 : 0,
          maxWidth: 1000,
          padding: 18,
          paddingBottom: 28,
          width: '100%',
        }}
        ListHeaderComponent={
          <View className="mb-4 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                {showBackButton ? (
                  <Pressable
                    accessibilityLabel="Back to More"
                    accessibilityRole="button"
                    onPress={onBack}
                    className="self-start rounded-lg px-1 py-1"
                  >
                    <Text className="text-xs font-semibold text-[#116C0B]">
                      ‹ Back to More
                    </Text>
                  </Pressable>
                ) : null}
                <Text className="mt-2 text-2xl font-extrabold text-[#012711]">
                  Categories
                </Text>
                <Text className="mt-1 text-sm text-[#6B7280]">
                  {categories.length}{' '}
                  {categories.length === 1 ? 'category' : 'categories'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Add category"
                accessibilityRole="button"
                onPress={onAddCategory}
                className="rounded-xl bg-[#116C0B] px-4 py-3"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="font-semibold text-white">+ Add Category</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Search categories"
              className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
              onChangeText={setSearch}
              placeholder="Search categories"
              placeholderTextColor={colors.textSecondary}
              value={search}
            />
            <ScrollView
              horizontal
              contentContainerStyle={{ alignItems: 'center', gap: 8 }}
              showsHorizontalScrollIndicator={false}
            >
              {(['All', 'Active', 'Inactive'] as StatusFilter[]).map(status => (
                <Pressable
                  accessibilityLabel={`Filter ${status} categories`}
                  accessibilityRole="button"
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  className={`rounded-full border px-3.5 py-2 ${
                    statusFilter === status
                      ? 'border-[#116C0B] bg-[#116C0B]'
                      : 'border-[#E5E7EB] bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      statusFilter === status ? 'text-white' : 'text-[#6B7280]'
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityLabel="Sort categories"
                accessibilityRole="button"
                onPress={() =>
                  setSortMode(mode => {
                    switch (mode) {
                      case 'latest':
                        return 'name';
                      case 'name':
                        return 'products-high';
                      case 'products-high':
                        return 'products-low';
                      default:
                        return 'latest';
                    }
                  })
                }
                className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2"
              >
                <Text className="text-xs font-semibold text-[#374151]">
                  Sort:{' '}
                  {
                    {
                      latest: 'Latest',
                      name: 'Name A–Z',
                      'products-high': 'Most products',
                      'products-low': 'Fewest products',
                    }[sortMode]
                  }
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Switch to ${
                  viewMode === 'cards' ? 'table' : 'card'
                } view`}
                accessibilityRole="button"
                onPress={() =>
                  setViewMode(mode => (mode === 'cards' ? 'table' : 'cards'))
                }
                className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2"
              >
                <Text className="text-xs font-semibold text-[#374151]">
                  {viewMode === 'cards' ? 'Table view' : 'Card view'}
                </Text>
              </Pressable>
            </ScrollView>
            {foodError ? (
              <Text
                accessibilityRole="alert"
                className="text-xs text-[#B45309]"
              >
                Product counts could not be loaded: {foodError}
              </Text>
            ) : null}
            {successMessage ? (
              <Text
                accessibilityRole="alert"
                className="rounded-xl bg-[#F0F7EE] px-3 py-2 text-sm text-[#116C0B]"
              >
                {successMessage}
              </Text>
            ) : null}
            {categoryError ? (
              <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-5">
                <Text
                  accessibilityRole="alert"
                  className="text-center text-sm text-[#DC2626]"
                >
                  {categoryError}
                </Text>
                <Pressable
                  accessibilityLabel="Retry loading categories"
                  accessibilityRole="button"
                  onPress={() => setRefreshKey(count => count + 1)}
                  className="rounded-xl bg-[#116C0B] px-4 py-2.5"
                >
                  <Text className="font-semibold text-white">Try again</Text>
                </Pressable>
              </View>
            ) : null}
            {viewMode === 'table' && filteredCategories.length ? (
              <View className="flex-row items-center rounded-t-xl bg-[#F0F7EE] px-3 py-3">
                <Text className="flex-[2] text-xs font-bold text-[#012711]">
                  CATEGORY
                </Text>
                <Text className="flex-1 text-center text-xs font-bold text-[#012711]">
                  PRODUCTS
                </Text>
                <Text className="flex-1 text-center text-xs font-bold text-[#012711]">
                  STATUS
                </Text>
                <Text className="text-xs font-bold text-[#012711]">
                  ACTIONS
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          categoryError ? (
            <View />
          ) : isLoading ? (
            <View className="items-center gap-3 py-12">
              <ActivityIndicator color={colors.primary} />
              <Text className="text-sm text-[#6B7280]">
                Loading categories...
              </Text>
            </View>
          ) : (
            <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ProductIcon color={colors.textSecondary} size={30} />
              <Text className="text-base font-bold text-[#012711]">
                {search.trim() || statusFilter !== 'All'
                  ? 'No matching categories'
                  : 'No categories yet'}
              </Text>
              <Text className="text-center text-sm text-[#6B7280]">
                Add a category to organize your products.
              </Text>
            </View>
          )
        }
        renderItem={renderCategory}
      />
      {!isLoading && !categoryError && filteredCategories.length > PAGE_SIZE ? (
        <View className="flex-row items-center justify-center gap-5 border-t border-[#E5E7EB] bg-white px-4 py-3">
          <Pressable
            accessibilityLabel="Previous category page"
            accessibilityRole="button"
            disabled={page === 0}
            onPress={() => setPage(current => Math.max(0, current - 1))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2"
          >
            <Text className={page === 0 ? 'text-[#9CA3AF]' : 'text-[#116C0B]'}>
              Previous
            </Text>
          </Pressable>
          <Text className="text-xs text-[#6B7280]">
            Page {page + 1} of {pageCount}
          </Text>
          <Pressable
            accessibilityLabel="Next category page"
            accessibilityRole="button"
            disabled={page + 1 >= pageCount}
            onPress={() =>
              setPage(current => Math.min(pageCount - 1, current + 1))
            }
            className="rounded-lg border border-[#E5E7EB] px-3 py-2"
          >
            <Text
              className={
                page + 1 >= pageCount ? 'text-[#9CA3AF]' : 'text-[#116C0B]'
              }
            >
              Next
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={resetForm}
        transparent
        visible={isFormOpen}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-4 py-6">
          <View className="max-h-full w-full max-w-lg overflow-hidden rounded-2xl bg-white">
            <View className="border-b border-[#E5E7EB] px-5 py-4">
              <Text className="text-lg font-bold text-[#012711]">
                {isEditing ? 'Edit Category' : 'Add Category'}
              </Text>
            </View>
            {isFormLoading ? (
              <View className="items-center gap-3 p-8">
                <ActivityIndicator color={colors.primary} />
                <Text className="text-sm text-[#6B7280]">
                  {isEditing
                    ? 'Loading category...'
                    : 'Generating category ID...'}
                </Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 12, padding: 20 }}
              >
                <View>
                  <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                    Category ID
                  </Text>
                  <TextInput
                    accessibilityLabel="Category ID"
                    editable={false}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3.5 py-3 text-sm text-[#6B7280]"
                    value={form.categoryId}
                  />
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
                <View>
                  <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                    Category image
                  </Text>
                  <View className="flex-row items-center gap-3">
                    {form.image ? (
                      <CategoryImage
                        name={form.categoryName || 'Category'}
                        uri={resolveImageUrl(form.image)}
                      />
                    ) : null}
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
                <View>
                  <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                    Status
                  </Text>
                  <View className="flex-row gap-2">
                    {(['Active', 'Inactive'] as const).map(status => (
                      <Pressable
                        accessibilityLabel={`Set category ${status.toLowerCase()}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: form.status === status,
                        }}
                        key={status}
                        onPress={() =>
                          setForm(current => ({ ...current, status }))
                        }
                        className={`rounded-full border px-4 py-2 ${
                          form.status === status
                            ? 'border-[#116C0B] bg-[#116C0B]'
                            : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            form.status === status
                              ? 'text-white'
                              : 'text-[#6B7280]'
                          }`}
                        >
                          {status}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {formError ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-sm text-[#DC2626]"
                  >
                    {formError}
                  </Text>
                ) : null}
                <View className="mt-1 flex-row justify-end gap-3">
                  <Pressable
                    accessibilityLabel="Cancel category"
                    accessibilityRole="button"
                    disabled={isSaving || isUploadingImage}
                    onPress={resetForm}
                    className="rounded-xl border border-[#D1D5DB] px-4 py-3"
                  >
                    <Text className="font-semibold text-[#374151]">Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={
                      isEditing ? 'Save category changes' : 'Save category'
                    }
                    accessibilityRole="button"
                    disabled={isSaving || isUploadingImage || !form.categoryId}
                    onPress={() => void saveCategory()}
                    className="min-w-[100px] items-center rounded-xl bg-[#116C0B] px-4 py-3"
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-semibold text-white">Save</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setCategoryToDelete(null);
          setDeleteError('');
        }}
        transparent
        visible={categoryToDelete !== null}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-[#012711]">
              Delete category?
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#6B7280]">
              Delete “{categoryToDelete?.category_name}”? Categories linked to
              products may be protected by the server.
            </Text>
            {deleteError ? (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-sm text-[#DC2626]"
              >
                {deleteError}
              </Text>
            ) : null}
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityLabel="Cancel category deletion"
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => {
                  setCategoryToDelete(null);
                  setDeleteError('');
                }}
                className="rounded-xl border border-[#D1D5DB] px-4 py-2.5"
              >
                <Text className="font-semibold text-[#374151]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Confirm category deletion"
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => void deleteCategory()}
                className="min-w-[90px] items-center rounded-xl bg-[#DC2626] px-4 py-2.5"
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

export default Categories;
