import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../../api';
import {
  PlusIcon,
  ProductIcon,
  SearchIcon,
} from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  ConfirmDialog,
  Edit3Icon,
  FormModal,
  ImageIcon,
  Trash2Icon,
} from '../../components/popups';

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

function CategoryImage({
  name,
  uri,
  className = 'h-[66px] w-[66px] rounded-xl',
}: {
  name: string;
  uri?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) {
    return (
      <View className={`${className} items-center justify-center bg-[#F0F7EE]`}>
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
      className={`${className} bg-[#F3F4F6]`}
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
  const [openFilter, setOpenFilter] = useState<'status' | 'sort' | null>(null);
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
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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
    const isActive = item.status?.toLowerCase() !== 'inactive';
    const categoryName = item.category_name || 'Unnamed category';
    const actions = (
      <View className="flex-row gap-1.5">
        <CategoryActionButton
          label={`Edit ${categoryName}`}
          tone="edit"
          onPress={() => void openEditForm(item)}
        />
        <CategoryActionButton
          label={`Delete ${categoryName}`}
          tone="delete"
          onPress={() => {
            setDeleteError('');
            setCategoryToDelete(item);
          }}
        />
      </View>
    );

    if (viewMode === 'table') {
      return (
        <View className="min-h-[76px] flex-row items-center border-t border-[#E8F1EB] bg-white px-3 py-2">
          <View className="w-[220px] flex-row items-center gap-3 pr-2">
            <CategoryImage
              name={categoryName}
              uri={resolveImageUrl(item.category_image)}
              className="h-10 w-10 rounded-lg"
            />
            <View className="min-w-0 flex-1">
              <Text
                className="text-xs font-bold text-[#1E293B]"
                numberOfLines={1}
              >
                {categoryName}
              </Text>
              <Text
                className="mt-1 text-[10px] text-[#64748B]"
                numberOfLines={1}
              >
                {categoryId}
              </Text>
            </View>
          </View>
          <Text className="w-[64px] text-center text-xs font-semibold text-[#334155]">
            {productCount}
          </Text>
          <View className="w-[82px] items-center">
            <CategoryStatusBadge active={isActive} />
          </View>
          <View className="w-[112px] items-end">{actions}</View>
        </View>
      );
    }

    return (
      <View
        className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
        style={{
          flex: 1,
          width: '48%',
        }}
      >
        <View className="relative">
          <CategoryImage
            name={categoryName}
            uri={resolveImageUrl(item.category_image)}
            className={isWide ? 'h-40 w-full' : 'h-28 w-full'}
          />
          <View className="absolute left-3 top-3">
            <CategoryStatusBadge active={isActive} />
          </View>
        </View>
        <View className={isWide ? 'gap-2.5 p-3.5' : 'gap-2 p-2.5'}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text
                className="text-sm font-bold text-[#012711]"
                numberOfLines={1}
              >
                {categoryName}
              </Text>
              <Text
                className="mt-1 text-[10px] text-[#64748B]"
                numberOfLines={1}
              >
                {categoryId}
              </Text>
            </View>
            <Text className="rounded-full bg-[#F0FDF4] px-1.5 py-1 text-[9px] font-bold text-[#15803D]">
              {productCount} {productCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          {item.description ? (
            <Text
              className="text-xs leading-[17px] text-[#6B7280]"
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          {subcategories.length ? (
            <Text className="text-[10px] text-[#64748B]" numberOfLines={1}>
              {subcategories.join(' · ')}
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-2.5">
            <Text className="min-w-0 flex-1 text-[9px] text-[#64748B]">
              Category
            </Text>
            {actions}
          </View>
        </View>
      </View>
    );
  };

  const activeCategoryCount = categories.filter(
    category => category.status?.toLowerCase() !== 'inactive',
  ).length;
  const inactiveCategoryCount = categories.length - activeCategoryCount;

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <FlatList
        key={`${viewMode}-${isWide ? 'wide' : 'narrow'}`}
        removeClippedSubviews={false}
        numColumns={viewMode === 'cards' ? 2 : 1}
        columnWrapperStyle={viewMode === 'cards' ? { gap: 10 } : undefined}
        data={viewMode === 'cards' ? visibleCategories : []}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => setRefreshKey(current => current + 1)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        keyExtractor={(item, index) =>
          getCategoryId(item) || `${item.category_name || 'category'}-${index}`
        }
        contentContainerStyle={{
          alignSelf: 'center',
          gap: viewMode === 'cards' ? 12 : 0,
          maxWidth: 1100,
          padding: 20,
          paddingBottom: 96,
          width: '100%',
        }}
        ListHeaderComponent={
          <View className="mb-5 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                {showBackButton ? (
                  <Pressable
                    accessibilityLabel="Back to More"
                    accessibilityRole="button"
                    onPress={onBack}
                    className="mb-2 self-start py-1"
                  >
                    <Text className="text-sm font-semibold text-[#116C0B]">
                      ‹ More
                    </Text>
                  </Pressable>
                ) : null}
                <Text className="text-2xl font-extrabold text-[#012711]">
                  Categories
                </Text>
                <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
                  Manage menu categories and the products in each group.
                </Text>
              </View>
              {isWide ? (
                <Pressable
                  accessibilityLabel="Add category"
                  accessibilityRole="button"
                  onPress={onAddCategory}
                  className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-4"
                  style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                >
                  <PlusIcon color="#FFFFFF" size={18} />
                  <Text className="ml-1.5 text-sm font-bold text-white">
                    Add category
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <CategoryStat
                label="Total categories"
                value={categories.length}
                icon="total"
                tint="#166534"
                iconBackground="#DCFCE7"
                decorColor="#DCFCE7"
              />
              <CategoryStat
                label="Active"
                value={activeCategoryCount}
                icon="active"
                tint="#1D4ED8"
                iconBackground="#DBEAFE"
                decorColor="#BFDBFE"
              />
              <CategoryStat
                label="Inactive"
                value={inactiveCategoryCount}
                icon="inactive"
                tint="#9A3412"
                iconBackground="#FED7AA"
                decorColor="#FED7AA"
              />
              <CategoryStat
                label="Products"
                value={foods.length}
                icon="products"
                tint="#6D28D9"
                iconBackground="#DDD6FE"
                decorColor="#DDD6FE"
              />
            </View>
            <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
              <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
                <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
                  <SearchIcon color="#9CA3AF" size={17} />
                  <TextInput
                    accessibilityLabel="Search categories"
                    className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                    onChangeText={setSearch}
                    placeholder="Search categories by name or ID..."
                    placeholderTextColor={colors.textSecondary}
                    value={search}
                  />
                </View>
                <View className="flex-row items-end gap-2">
                  <View className="flex-1 flex-row gap-2">
                    <CategoryFilterDropdown<StatusFilter>
                      label="Status"
                      onOpen={() =>
                        setOpenFilter(current =>
                          current === 'status' ? null : 'status',
                        )
                      }
                      onSelect={value => {
                        setStatusFilter(value);
                        setOpenFilter(null);
                      }}
                      open={openFilter === 'status'}
                      options={[
                        { value: 'All', label: 'All statuses' },
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                      ]}
                      selected={statusFilter}
                    />
                    <CategoryFilterDropdown<SortMode>
                      label="Sort by"
                      onOpen={() =>
                        setOpenFilter(current =>
                          current === 'sort' ? null : 'sort',
                        )
                      }
                      onSelect={value => {
                        setSortMode(value);
                        setOpenFilter(null);
                      }}
                      open={openFilter === 'sort'}
                      options={[
                        { value: 'latest', label: 'Latest' },
                        { value: 'name', label: 'Name A–Z' },
                        { value: 'products-high', label: 'Most products' },
                        { value: 'products-low', label: 'Fewest products' },
                      ]}
                      selected={sortMode}
                    />
                  </View>
                  <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                    {(['cards', 'table'] as const).map(mode => {
                      const selected = viewMode === mode;
                      return (
                        <Pressable
                          accessibilityLabel={`Show categories as ${
                            mode === 'cards' ? 'grid' : 'list'
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
                            {mode === 'cards' ? '▦' : '☷'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
            {foodError ? (
              <Text
                accessibilityRole="alert"
                className="text-xs"
                style={{ color: colors.primary }}
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              >
                <View style={{ width: isWide ? '100%' : 620, minWidth: 620 }}>
                  <View className="flex-row items-center bg-[#EAF5EE] px-3 py-3">
                    <Text className="w-[220px] text-[10px] font-bold uppercase text-[#64748B]">
                      Category
                    </Text>
                    <Text className="w-[64px] text-center text-[10px] font-bold uppercase text-[#64748B]">
                      Products
                    </Text>
                    <Text className="w-[82px] text-center text-[10px] font-bold uppercase text-[#64748B]">
                      Status
                    </Text>
                    <Text className="w-[112px] text-right text-[10px] font-bold uppercase text-[#64748B]">
                      Actions
                    </Text>
                  </View>
                  {visibleCategories.map((category, index) => (
                    <View
                      key={
                        getCategoryId(category) ||
                        `${category.category_name || 'category'}-${index}`
                      }
                    >
                      {renderCategory({ item: category })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          viewMode === 'table' && filteredCategories.length ? (
            <View />
          ) : categoryError ? (
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
              {isWide && !categories.length ? (
                <Pressable
                  accessibilityLabel="Create your first category"
                  accessibilityRole="button"
                  onPress={onAddCategory}
                  className="mt-2 rounded-xl bg-[#116C0B] px-4 py-3"
                >
                  <Text className="text-sm font-bold text-white">
                    Create your first category
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        renderItem={renderCategory}
      />
      {!isLoading && !categoryError && filteredCategories.length > PAGE_SIZE ? (
        <View className="flex-row items-center justify-center gap-4 border-t border-[#E5E7EB] bg-white px-4 py-3">
          <Pressable
            accessibilityLabel="Previous category page"
            accessibilityRole="button"
            accessibilityState={{ disabled: page === 0 }}
            disabled={page === 0}
            onPress={() => setPage(current => Math.max(0, current - 1))}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${
              page === 0
                ? 'border-[#E5E7EB] bg-[#F8FAFC]'
                : 'border-[#CBD5E1] bg-white'
            }`}
          >
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <ChevronDownIcon
                size={16}
                color={page === 0 ? '#9CA3AF' : '#116C0B'}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${
                page === 0 ? 'text-[#9CA3AF]' : 'text-[#116C0B]'
              }`}
            >
              Previous
            </Text>
          </Pressable>
          <Text className="text-xs font-semibold text-[#6B7280]">
            Page {page + 1} of {pageCount}
          </Text>
          <Pressable
            accessibilityLabel="Next category page"
            accessibilityRole="button"
            accessibilityState={{ disabled: page + 1 >= pageCount }}
            disabled={page + 1 >= pageCount}
            onPress={() =>
              setPage(current => Math.min(pageCount - 1, current + 1))
            }
            className={`min-h-11 flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${
              page + 1 >= pageCount
                ? 'border-[#E5E7EB] bg-[#F8FAFC]'
                : 'border-[#CBD5E1] bg-white'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                page + 1 >= pageCount ? 'text-[#9CA3AF]' : 'text-[#116C0B]'
              }`}
            >
              Next
            </Text>
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              <ChevronDownIcon
                size={16}
                color={page + 1 >= pageCount ? '#9CA3AF' : '#116C0B'}
              />
            </View>
          </Pressable>
        </View>
      ) : null}

      {!isWide && !isFormOpen ? (
        <Pressable
          accessibilityLabel="Add category"
          accessibilityRole="button"
          onPress={onAddCategory}
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B]"
          style={{
            bottom: filteredCategories.length > PAGE_SIZE ? 76 : 20,
            elevation: 8,
            shadowColor: '#116C0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <PlusIcon color="#FFFFFF" size={26} />
        </Pressable>
      ) : null}

      <FormModal
        visible={isFormOpen}
        onClose={resetForm}
        title={isEditing ? 'Edit Category' : 'Add Category'}
        subtitle={
          isEditing
            ? 'Update category details and product association'
            : 'Create a new category for your restaurant menu'
        }
        cancelLabel=""
        isSaving={isSaving}
        errorMessage={formError}
        maxHeightPercent={94}
        footerExtra={
          <View className="flex-row gap-3">
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={resetForm}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
              style={{ opacity: isSaving ? 0.55 : 1 }}
            >
              <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                isEditing ? 'Save Changes' : 'Create Category'
              }
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  isSaving ||
                  isUploadingImage ||
                  isFormLoading ||
                  !form.categoryId,
              }}
              disabled={
                isSaving ||
                isUploadingImage ||
                isFormLoading ||
                !form.categoryId
              }
              onPress={() => void saveCategory()}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
              style={{
                opacity:
                  isSaving ||
                  isUploadingImage ||
                  isFormLoading ||
                  !form.categoryId
                    ? 0.55
                    : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {isEditing ? 'Save Changes' : 'Create Category'}
                </Text>
              )}
            </Pressable>
          </View>
        }
      >
        {isFormLoading ? (
          <View className="items-center gap-3 p-8">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-[#6B7280]">
              {isEditing ? 'Loading category...' : 'Generating category ID...'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <CategoryFormSection number="1" title="Basic Information">
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
          </View>
        )}
      </FormModal>

      <ConfirmDialog
        visible={categoryToDelete !== null}
        onClose={() => {
          setCategoryToDelete(null);
          setDeleteError('');
        }}
        onConfirm={() => void deleteCategory()}
        title="Delete category?"
        itemName={categoryToDelete?.category_name}
        message="Categories linked to products may be protected by the server."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </View>
  );
}

export default Categories;

function CategoryActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'edit' | 'delete';
}) {
  const isEdit = tone === 'edit';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className="h-8 w-8 items-center justify-center rounded-lg border"
      style={{
        backgroundColor: isEdit ? '#F0FDF4' : '#FEF2F2',
        borderColor: isEdit ? '#DCFCE7' : '#FECACA',
      }}
    >
      {isEdit ? (
        <Edit3Icon size={15} color="#15803D" />
      ) : (
        <Trash2Icon size={15} color="#DC2626" />
      )}
    </Pressable>
  );
}

function CategoryStatusBadge({ active }: { active: boolean }) {
  return (
    <View
      className="rounded-full border px-2 py-1"
      style={{
        backgroundColor: active ? '#ECFDF5' : '#F8FAFC',
        borderColor: active ? '#BBF7D0' : '#E2E8F0',
      }}
    >
      <Text
        className="text-[9px] font-extrabold uppercase"
        style={{ color: active ? '#15803D' : '#64748B' }}
      >
        {active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

function CategoryStat({
  label,
  value,
  icon,
  tint,
  iconBackground,
  decorColor,
}: {
  label: string;
  value: number;
  icon: 'total' | 'active' | 'inactive' | 'products';
  tint: string;
  iconBackground: string;
  decorColor: string;
}) {
  return (
    <View
      style={{
        width: '48%',
        minHeight: 90,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 16,
        elevation: 2,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -30,
          right: -24,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: decorColor,
          opacity: 0.55,
        }}
      />
      <View
        className="h-11 w-11 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: iconBackground }}
      >
        {icon === 'total' ? (
          <ImageIcon size={21} color={tint} strokeWidth={2} />
        ) : icon === 'active' ? (
          <CheckCircle2Icon size={21} color={tint} />
        ) : icon === 'inactive' ? (
          <AlertCircleIcon size={21} color={tint} />
        ) : (
          <ProductIcon color={tint} size={21} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[10px] font-extrabold uppercase"
          style={{ color: tint, letterSpacing: 0.8 }}
        >
          {label}
        </Text>
        <Text
          className="mt-0.5 text-[22px] font-extrabold"
          style={{ color: tint }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function CategoryFilterDropdown<Value extends string>({
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
    options[0]?.label;
  return (
    <View className="min-w-[76px] flex-1">
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
        <View className="mt-1 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
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
    <View className="gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
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
