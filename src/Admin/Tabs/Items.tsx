import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import api, { API_BASE_URL } from '../../../api';
import { PlusIcon, ProductIcon } from '../Navigation/NavigationIcons';
import AddFood from '../Screens/AddFood';
import FoodDetails from '../Screens/fooddetails';
import colors from '../../theme/colors';

type ItemsProps = {
  actor?: string;
  pendingAddRequest?: { id: number; action: 'product' | 'category' } | null;
  onAddRequestHandled?: (id: number) => void;
  onAddCuisine?: () => void;
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

type AddEntityType = 'category';

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
  return (
    item.food_name?.trim() ||
    item.product_name?.trim() ||
    item.productName?.trim() ||
    item.name?.trim() ||
    'Unnamed item'
  );
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
      <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#F0F7EE] border border-[#DCE8D8]">
        <ProductIcon color={colors.primary} size={25} />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${name} image`}
      onError={() => setHasLoadError(true)}
      source={{ uri }}
      className="h-16 w-16 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB]"
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

function ItemSkeleton({ animOpacity }: { animOpacity: Animated.Value }) {
  return (
    <Animated.View
      style={{ opacity: animOpacity }}
      className="flex-row items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
    >
      <View className="h-16 w-16 rounded-xl bg-[#E5E7EB]" />
      <View className="min-w-0 flex-1 gap-2">
        <View className="h-4 w-3/4 rounded-md bg-[#E5E7EB]" />
        <View className="h-3 w-1/2 rounded-md bg-[#F3F4F6]" />
        <View className="h-3 w-1/3 rounded-md bg-[#F3F4F6]" />
      </View>
      <View className="items-end gap-2">
        <View className="h-4 w-14 rounded-md bg-[#E5E7EB]" />
        <View className="h-5 w-16 rounded-full bg-[#F3F4F6]" />
      </View>
    </Animated.View>
  );
}

function Items({
  actor = 'Admin',
  pendingAddRequest = null,
  onAddRequestHandled,
  onAddCuisine,
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

  // Pulse animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseRing, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRing, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim, pulseRing]);

  useEffect(() => {
    if (!isLoading) return;
    const skeletonLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    skeletonLoop.start();
    return () => skeletonLoop.stop();
  }, [isLoading, skeletonPulse]);

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

  const availableCount = useMemo(
    () => items.filter(i => getItemStatus(i) !== 'Hidden').length,
    [items],
  );

  const hiddenCount = useMemo(
    () => items.filter(i => getItemStatus(i) === 'Hidden').length,
    [items],
  );

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
      setEntityError('Enter a category name.');
      return;
    }

    setIsSavingEntity(true);
    setEntityError('');
    try {
      const subCategories = subcategoryNames
        .split(',')
        .map(subcategory => subcategory.trim())
        .filter(Boolean);
      await api.post('/categories', {
        category_name: name,
        sub_categories: subCategories,
      });
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
    <View className="relative flex-1 bg-[#F8FAFC]">
      {/* Ambient background decorative light glow */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
      >
        <Defs>
          <LinearGradient id="pageGlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#116C0B" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#81C238" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="pageGlow2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FC5805" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#FC5805" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Circle cx="94%" cy="8%" r="180" fill="url(#pageGlow1)" />
        <Circle cx="6%" cy="28%" r="150" fill="url(#pageGlow2)" />
      </Svg>

      <FlatList
        data={filteredItems}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => setRetry(current => current + 1)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        keyExtractor={(item, index) =>
          String(item.food_id ?? item.id ?? `${getItemName(item)}-${index}`)
        }
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: 900,
          padding: 16,
          paddingBottom: 110,
          width: '100%',
        }}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={
          <View className="mb-5 gap-4">
            {/* Hero Banner Card with Gradient Background & Live Pulse */}
            <View className="relative overflow-hidden rounded-3xl border border-[#0A4418] bg-[#052E10] p-5 shadow-lg">
              <Svg
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient
                    id="itemsHeroGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#052E10" stopOpacity="1" />
                    <Stop offset="45%" stopColor="#0B4D1A" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#147524" stopOpacity="1" />
                  </LinearGradient>
                  <LinearGradient
                    id="heroGlow"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#81C238" stopOpacity="0.25" />
                    <Stop offset="100%" stopColor="#81C238" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#itemsHeroGrad)"
                />
                <Circle cx="90%" cy="20%" r="130" fill="url(#heroGlow)" />
                <Path
                  d="M-30 55 Q 80 15, 200 48 T 460 32 T 720 52"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth="1.5"
                />
              </Svg>

              {/* Header top badges: Category tag + Live Pulse Beacon */}
              <View className="flex-row items-center justify-between">
                <View className="rounded-md border border-emerald-300/30 bg-emerald-400/20 px-2 py-0.5">
                  <Text className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                    Menu Management
                  </Text>
                </View>

                {/* Live Pulse Indicator */}
                <View className="flex-row items-center gap-2 rounded-full border border-white/15 bg-black/25 px-2.5 py-1">
                  <View className="relative h-2.5 w-2.5 items-center justify-center">
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#22C55E',
                        opacity: pulseRing.interpolate({
                          inputRange: [0, 0.7, 1],
                          outputRange: [0.7, 0.2, 0],
                        }),
                        transform: [
                          {
                            scale: pulseRing.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 2.2],
                            }),
                          },
                        ],
                      }}
                    />
                    <View className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  </View>
                  <Text className="text-[10px] font-extrabold tracking-wider text-emerald-100">
                    ACTIVE MENU
                  </Text>
                </View>
              </View>

              {/* Title & Refresh Button */}
              <View className="mt-3.5 flex-row items-end justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-2xl font-black tracking-tight text-white">
                    All items
                  </Text>
                  <Text className="mt-0.5 text-xs text-emerald-100/80">
                    {items.length} {items.length === 1 ? 'item' : 'items'} in your menu
                  </Text>
                </View>

                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Pressable
                    accessibilityLabel="Refresh items"
                    accessibilityRole="button"
                    disabled={isLoading}
                    onPress={() => setRetry(count => count + 1)}
                    className="flex-row items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-3.5 py-2 shadow-sm"
                    style={({ pressed }) => ({
                      backgroundColor: pressed
                        ? 'rgba(255, 255, 255, 0.28)'
                        : 'rgba(255, 255, 255, 0.16)',
                    })}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-xs font-bold text-white">
                        Refresh
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              </View>

              {/* Stats Chips Row */}
              <View className="mt-4 flex-row gap-2.5">
                <View className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                    Total
                  </Text>
                  <Text className="mt-0.5 text-lg font-black text-white">
                    {items.length}
                  </Text>
                </View>

                <View className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                    Available
                  </Text>
                  <Text className="mt-0.5 text-lg font-black text-emerald-300">
                    {availableCount}
                  </Text>
                </View>

                <View className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                    Hidden
                  </Text>
                  <Text className="mt-0.5 text-lg font-black text-white/80">
                    {hiddenCount}
                  </Text>
                </View>
              </View>
            </View>

            {/* Search Input Bar with Icon */}
            <View className="flex-row items-center rounded-2xl border border-[#E2E8F0] bg-white px-4 py-1.5 shadow-sm">
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <TextInput
                accessibilityLabel="Search items"
                className="ml-2 flex-1 py-2 text-base text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search items or categories..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
              {search.trim().length > 0 ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  onPress={() => setSearch('')}
                  className="h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F6]"
                >
                  <Text className="text-xs font-bold text-[#6B7280]">×</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="gap-3 py-2">
              <ItemSkeleton animOpacity={skeletonPulse} />
              <ItemSkeleton animOpacity={skeletonPulse} />
              <ItemSkeleton animOpacity={skeletonPulse} />
              <ItemSkeleton animOpacity={skeletonPulse} />
            </View>
          ) : error ? (
            <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-6 shadow-sm">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-[#DC2626]"
              >
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
            <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
              <ProductIcon color={colors.textSecondary} size={30} />
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
          const isHidden = getItemStatus(item) === 'Hidden';

          return (
            <Pressable
              accessibilityLabel={`View details of ${getItemName(item)}`}
              accessibilityRole="button"
              onPress={() => {
                onFoodDetailsVisibilityChange?.(true);
                setSelectedFoodId(foodId);
              }}
              className="flex-row items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                transform: [{ scale: pressed ? 0.99 : 1 }],
              })}
            >
              <ItemThumbnail name={name} uri={image} />
              <View className="min-w-0 flex-1 gap-1">
                <Text
                  numberOfLines={1}
                  className="text-base font-bold text-[#012711]"
                >
                  {name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-[#6B7280]">
                  {category || 'Uncategorized'}
                </Text>
                <Text className="text-[11px] text-[#9CA3AF]">
                  {stock === null ? 'Stock not set' : `${stock} in stock`}
                </Text>
              </View>
              <View className="items-end gap-2">
                {price ? (
                  <Text className="text-base font-extrabold text-[#116C0B]">
                    {price}
                  </Text>
                ) : null}
                <View
                  className={`flex-row items-center rounded-full px-2.5 py-1 ${
                    isHidden
                      ? 'bg-[#F3F4F6]'
                      : 'border border-[#DCE8D8] bg-[#F0F7EE]'
                  }`}
                >
                  {!isHidden ? (
                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#116C0B]" />
                  ) : null}
                  <Text
                    className={`text-xs font-bold ${
                      isHidden ? 'text-[#6B7280]' : 'text-[#116C0B]'
                    }`}
                  >
                    {getItemStatus(item)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {showAddButton ? (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            transform: [{ scale: pulseAnim }],
            elevation: 8,
            shadowColor: '#116C0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
          }}
        >
          <Pressable
            accessibilityLabel="Add item"
            accessibilityRole="button"
            onPress={() => setIsAddMenuOpen(true)}
            className="h-14 w-14 items-center justify-center rounded-full bg-[#116C0B]"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#0B4D1A' : '#116C0B',
            })}
          >
            <PlusIcon color="#FFFFFF" size={24} />
          </Pressable>
        </Animated.View>
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
            <Text className="mb-1 text-lg font-bold text-[#012711]">
              Add to menu
            </Text>
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
              onPress={() => {
                setIsAddMenuOpen(false);
                onAddCuisine?.();
              }}
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
              Add Category
            </Text>
            <TextInput
              accessibilityLabel="Category name"
              autoCapitalize="words"
              className="mt-4 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
              onChangeText={setEntityName}
              placeholder="Category name"
              placeholderTextColor="#9CA3AF"
              value={entityName}
            />
            <TextInput
              accessibilityLabel="Subcategories"
              autoCapitalize="words"
              className="mt-3 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
              onChangeText={setSubcategoryNames}
              placeholder="Subcategories (comma-separated, optional)"
              placeholderTextColor="#9CA3AF"
              value={subcategoryNames}
            />
            {entityError ? (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-sm text-red-700"
              >
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
                accessibilityLabel="Save Category"
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
