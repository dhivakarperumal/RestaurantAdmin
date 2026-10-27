import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../api';
import { PlusIcon, ProductIcon } from '../Navigation/NavigationIcons';
import AddFood from '../Screens/AddFood';
import FoodDetails from '../Screens/fooddetails';
import colors from '../theme/colors';

type ItemsProps = {
  actor?: string;
  pendingAddRequest?: { id: number; action: 'product' | 'category' } | null;
  onAddRequestHandled?: (id: number) => void;
  onFoodDetailsVisibilityChange?: (isVisible: boolean) => void;
  showAddButton?: boolean;
};

type Item = {
  food_id?: string | number;
  id?: string | number;
  food_name?: string;
  product_name?: string;
  productName?: string;
  name?: string;
  category?: string;
  category_name?: string;
  status?: string;
  is_menu_visible?: boolean | number;
  current_stock?: number | string;
  stock_quantity?: number | string;
  stock?: number | string;
  final_price?: number | string;
  mrp?: number | string;
  price?: number | string;
  selling_price?: number | string;
  unit_price?: number | string;
  food_images?: unknown;
  food_image?: unknown;
  food_image_url?: unknown;
  image_url?: unknown;
  image?: unknown;
};

type AddEntityType = 'category' | 'cuisine';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readItems(payload: unknown): Item[] {
  let current = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as Item[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.foods)) {
      return current.foods.filter(isRecord) as Item[];
    }
    if (Array.isArray(current.items)) {
      return current.items.filter(isRecord) as Item[];
    }
    current = current.data;
  }
  return [];
}

function getItemName(item: Item) {
  return item.food_name?.trim() || item.product_name?.trim() ||
    item.productName?.trim() || item.name?.trim() || 'Unnamed item';
}

function getItemImage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (/^(https?:|data:image\/|file:|content:)/i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('//')) {
      const protocol = API_BASE_URL.match(/^(https?:)/i)?.[1] || 'https:';
      return `${protocol}${trimmed}`;
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return getItemImage(JSON.parse(trimmed) as unknown);
      } catch {
        return undefined;
      }
    }
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${apiRoot}/${trimmed.replace(/^\.?\//, '')}`;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = getItemImage(entry);
      if (image) {
        return image;
      }
    }
    return undefined;
  }
  if (isRecord(value)) {
    return (
      getItemImage(value.url) ||
      getItemImage(value.image_url) ||
      getItemImage(value.imageUrl) ||
      getItemImage(value.image) ||
      getItemImage(value.src) ||
      getItemImage(value.path)
    );
  }
  return undefined;
}

function ItemThumbnail({ name, uri }: { name: string; uri?: string }) {
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [uri]);

  if (!uri || hasLoadError) {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#F0F7EE]">
        <ProductIcon color={colors.primary} size={25} />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${name} image`}
      onError={() => setHasLoadError(true)}
      source={{ uri }}
      className="h-16 w-16 rounded-xl bg-[#F3F4F6]"
      resizeMode="cover"
    />
  );
}

function getItemStock(item: Item) {
  const stock = Number(item.current_stock ?? item.stock_quantity ?? item.stock);
  return Number.isFinite(stock) ? stock : null;
}

function getItemStatus(item: Item) {
  if (item.is_menu_visible === false || item.is_menu_visible === 0) {
    return 'Hidden';
  }
  return item.status?.trim() || 'Available';
}

function getItemPrice(item: Item) {
  const rawPrice =
    item.final_price ??
    item.selling_price ??
    item.price ??
    item.unit_price ??
    item.mrp;
  const price = rawPrice === undefined ? Number.NaN : Number(rawPrice);
  return Number.isFinite(price) && price >= 0
    ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : null;
}

function ItemSeparator() {
  return <View className="h-3" />;
}

function Items({
  actor = 'Admin',
  pendingAddRequest = null,
  onAddRequestHandled,
  onFoodDetailsVisibilityChange,
  showAddButton = true,
}: ItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addEntityType, setAddEntityType] = useState<AddEntityType | null>(null);
  const [entityName, setEntityName] = useState('');
  const [subcategoryNames, setSubcategoryNames] = useState('');
  const [entityError, setEntityError] = useState('');
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadItems = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/foods', { signal: controller.signal });
        if (isActive) {
          setItems(readItems(response.data));
        }
      } catch (loadError) {
        if (isActive && !controller.signal.aborted) {
          setError(
            isRecord(loadError) && typeof loadError.message === 'string'
              ? loadError.message
              : 'Unable to load items. Please try again.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadItems();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [retry]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return items;
    }
    return items.filter(item =>
      `${getItemName(item)} ${item.category_name || item.category || ''}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const closeEntityForm = () => {
    if (isSavingEntity) return;
    setAddEntityType(null);
    setEntityName('');
    setSubcategoryNames('');
    setEntityError('');
  };

  const openEntityForm = (type: AddEntityType) => {
    setIsAddMenuOpen(false);
    setEntityName('');
    setSubcategoryNames('');
    setEntityError('');
    setAddEntityType(type);
  };

  useEffect(() => {
    if (!pendingAddRequest) {
      return;
    }
    setIsAddMenuOpen(false);
    if (pendingAddRequest.action === 'product') {
      setIsAddFoodOpen(true);
    } else {
      setEntityName('');
      setSubcategoryNames('');
      setEntityError('');
      setAddEntityType('category');
    }
    onAddRequestHandled?.(pendingAddRequest.id);
  }, [pendingAddRequest, onAddRequestHandled]);

  const saveEntity = async () => {
    const name = entityName.trim();
    if (!name || !addEntityType) {
      setEntityError(`Enter a ${addEntityType || 'category or cuisine'} name.`);
      return;
    }

    setIsSavingEntity(true);
    setEntityError('');
    try {
      if (addEntityType === 'category') {
        const subCategories = subcategoryNames
          .split(',')
          .map(subcategory => subcategory.trim())
          .filter(Boolean);
        await api.post('/categories', {
          category_name: name,
          sub_categories: subCategories,
        });
      } else {
        await api.post('/cuisines', { cuisine_name: name });
      }
      setAddEntityType(null);
      setEntityName('');
      setSubcategoryNames('');
      setRetry(count => count + 1);
    } catch (saveError) {
      setEntityError(
        isRecord(saveError) && typeof saveError.message === 'string'
          ? saveError.message
          : `Unable to add ${addEntityType}. Please try again.`,
      );
    } finally {
      setIsSavingEntity(false);
    }
  };

  if (isAddFoodOpen) {
    return (
      <AddFood
        actor={actor}
        onCancel={() => setIsAddFoodOpen(false)}
        onSaved={() => {
          setIsAddFoodOpen(false);
          setRetry(count => count + 1);
        }}
      />
    );
  }

  if (editingFoodId) {
    return (
      <AddFood
        actor={actor}
        foodId={editingFoodId}
        onCancel={() => setEditingFoodId(null)}
        onSaved={() => {
          setEditingFoodId(null);
          setSelectedFoodId(null);
          setRetry(count => count + 1);
        }}
      />
    );
  }

  if (selectedFoodId) {
    return (
      <FoodDetails
        foodId={selectedFoodId}
        onEdit={() => {
          onFoodDetailsVisibilityChange?.(false);
          setEditingFoodId(selectedFoodId);
        }}
        onDeleted={() => {
          onFoodDetailsVisibilityChange?.(false);
          setSelectedFoodId(null);
          setRetry(count => count + 1);
        }}
        onBack={() => {
          onFoodDetailsVisibilityChange?.(false);
          setSelectedFoodId(null);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) =>
          String(item.food_id ?? item.id ?? `${getItemName(item)}-${index}`)
        }
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: 900,
          padding: 20,
          paddingBottom: 100,
          width: '100%',
        }}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={
          <View className="mb-5 gap-4">
            <View>
              <Text className="text-xs font-bold tracking-widest text-[#6B7280]">
                MENU MANAGEMENT
              </Text>
              <View className="mt-2 flex-row items-end justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-2xl font-extrabold text-[#012711]">
                    All items
                  </Text>
                  <Text className="mt-1 text-sm text-[#6B7280]">
                    {items.length} {items.length === 1 ? 'item' : 'items'} in your menu
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Refresh items"
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={() => setRetry(count => count + 1)}
                  className="rounded-xl bg-[#116C0B] px-4 py-2.5"
                >
                  <Text className="font-semibold text-white">
                    {isLoading ? 'Loading' : 'Refresh'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              accessibilityLabel="Search items"
              className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
              onChangeText={setSearch}
              placeholder="Search items or categories"
              placeholderTextColor={colors.textSecondary}
              value={search}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center gap-3 py-12">
              <ActivityIndicator color={colors.primary} />
              <Text className="text-sm text-[#6B7280]">Loading menu items...</Text>
            </View>
          ) : error ? (
            <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-6">
              <Text accessibilityRole="alert" className="text-center text-sm text-[#DC2626]">
                {error}
              </Text>
              <Pressable
                accessibilityLabel="Retry loading items"
                accessibilityRole="button"
                onPress={() => setRetry(count => count + 1)}
                className="rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ProductIcon color={colors.textSecondary} size={28} />
              <Text className="text-base font-bold text-[#012711]">
                {search.trim() ? 'No matching items' : 'No items found'}
              </Text>
              <Text className="text-center text-sm text-[#6B7280]">
                {search.trim()
                  ? 'Try another item or category name.'
                  : 'Items added to your menu will appear here.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const name = getItemName(item);
          const image = getItemImage(
            item.food_images ??
              item.food_image ??
              item.food_image_url ??
              item.image_url ??
              item.image,
          );
          const stock = getItemStock(item);
          const price = getItemPrice(item);
          const category = item.category_name || item.category;
          const foodId = String(item.food_id ?? item.id ?? '');
          return (
            <Pressable
              accessibilityLabel={`View details of ${getItemName(item)}`}
              accessibilityRole="button"
              onPress={() => {
                onFoodDetailsVisibilityChange?.(true);
                setSelectedFoodId(foodId);
              }}
              className="flex-row items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4"
            >
              <ItemThumbnail name={name} uri={image} />
              <View className="min-w-0 flex-1 gap-1">
                <Text numberOfLines={1} className="text-base font-bold text-[#012711]">
                  {name}
                </Text>
                <Text numberOfLines={1} className="text-sm text-[#6B7280]">
                  {category || 'Uncategorized'}
                </Text>
                <Text className="text-xs text-[#6B7280]">
                  {stock === null ? 'Stock not set' : `${stock} in stock`}
                </Text>
              </View>
              <View className="items-end gap-2">
                {price ? (
                  <Text className="font-bold text-[#012711]">{price}</Text>
                ) : null}
                <Text
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    getItemStatus(item) === 'Hidden'
                      ? 'bg-[#F3F4F6] text-[#6B7280]'
                      : 'bg-[#F0F7EE] text-[#116C0B]'
                  }`}
                >
                  {getItemStatus(item)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
      {showAddButton ? (
        <Pressable
          accessibilityLabel="Add item"
          accessibilityRole="button"
          onPress={() => setIsAddMenuOpen(true)}
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg"
        >
          <PlusIcon color="#FFFFFF" size={24} />
        </Pressable>
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsAddMenuOpen(false)}
        transparent
        visible={isAddMenuOpen}
      >
        <Pressable
          accessibilityLabel="Close add menu"
          className="flex-1 justify-end bg-black/30"
          onPress={() => setIsAddMenuOpen(false)}
        >
          <View className="gap-3 rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <Text className="mb-1 text-lg font-bold text-[#012711]">Add to menu</Text>
            <Pressable
              accessibilityLabel="Add Food"
              accessibilityRole="button"
              onPress={() => {
                setIsAddMenuOpen(false);
                setIsAddFoodOpen(true);
              }}
              className="rounded-xl bg-[#F0F7EE] px-4 py-3.5"
            >
              <Text className="font-semibold text-[#116C0B]">Add Food</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Add Category"
              accessibilityRole="button"
              onPress={() => openEntityForm('category')}
              className="rounded-xl bg-[#F9FAFB] px-4 py-3.5"
            >
              <Text className="font-semibold text-[#012711]">Add Category</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Add Cuisine"
              accessibilityRole="button"
              onPress={() => openEntityForm('cuisine')}
              className="rounded-xl bg-[#F9FAFB] px-4 py-3.5"
            >
              <Text className="font-semibold text-[#012711]">Add Cuisine</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={closeEntityForm}
        transparent
        visible={addEntityType !== null}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-[#012711]">
              {addEntityType === 'category' ? 'Add Category' : 'Add Cuisine'}
            </Text>
            <TextInput
              accessibilityLabel={addEntityType === 'category' ? 'Category name' : 'Cuisine name'}
              autoCapitalize="words"
              className="mt-4 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
              onChangeText={setEntityName}
              placeholder={addEntityType === 'category' ? 'Category name' : 'Cuisine name'}
              placeholderTextColor="#9CA3AF"
              value={entityName}
            />
            {addEntityType === 'category' ? (
              <TextInput
                accessibilityLabel="Subcategories"
                autoCapitalize="words"
                className="mt-3 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
                onChangeText={setSubcategoryNames}
                placeholder="Subcategories (comma-separated, optional)"
                placeholderTextColor="#9CA3AF"
                value={subcategoryNames}
              />
            ) : null}
            {entityError ? (
              <Text accessibilityRole="alert" className="mt-3 text-sm text-red-700">
                {entityError}
              </Text>
            ) : null}
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityLabel="Cancel add"
                accessibilityRole="button"
                disabled={isSavingEntity}
                onPress={closeEntityForm}
                className="rounded-xl border border-[#D1D5DB] px-4 py-2.5"
              >
                <Text className="font-semibold text-[#374151]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={addEntityType === 'category' ? 'Save Category' : 'Save Cuisine'}
                accessibilityRole="button"
                disabled={isSavingEntity}
                onPress={saveEntity}
                className="min-w-20 items-center rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                {isSavingEntity ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Items;