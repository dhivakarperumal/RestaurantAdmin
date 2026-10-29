import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import AdminStatCard from '../../components/AdminStatCard';
import AdminManagementCard from '../../components/AdminManagementCard';
import {
  PlusIcon,
  ProductIcon,
  SearchIcon,
} from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';
import { CheckCircle2Icon, ImageIcon } from '../../components/popups';

type CuisineRecord = {
  cuisine_id?: string | number;
  cuisine_name?: string;
  name?: string;
  description?: string | null;
  image?: string | null;
  status?: string | null;
  featured?: boolean | number | string;
};

type CuisineProps = {
  onAddCuisine: () => void;
  onBack: () => void;
  showBackButton?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCuisines(payload: unknown): CuisineRecord[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as CuisineRecord[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.cuisines)) {
      return current.cuisines.filter(isRecord) as CuisineRecord[];
    }
    if (Array.isArray(current.items)) {
      return current.items.filter(isRecord) as CuisineRecord[];
    }
    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }
  return [];
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unable to load cuisines. Please try again.';
}

function getCuisineName(cuisine: CuisineRecord) {
  return (
    cuisine.cuisine_name?.trim() || cuisine.name?.trim() || 'Unnamed cuisine'
  );
}

function getImageUrl(image?: string | null) {
  const value = image?.trim();
  if (!value) {
    return '';
  }
  if (/^(https?:|data:image\/|file:|content:)/i.test(value)) {
    return value;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${value.replace(/^\/+/, '')}`;
}

function isFeatured(value: CuisineRecord['featured']) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function Cuisine({
  onAddCuisine,
  onBack,
  showBackButton = true,
}: CuisineProps) {
  const [cuisines, setCuisines] = useState<CuisineRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openFilter, setOpenFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const loadCuisines = useCallback(async (signal: AbortSignal) => {
    const config = {
      signal,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
    };

    try {
      return await api.get('/cuisines', config);
    } catch (error) {
      if (isRecord(error) && Number(error.status) === 304 && !signal.aborted) {
        return api.get('/cuisines', {
          ...config,
          params: { _refresh: Date.now() },
        });
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setErrorMessage('');

    loadCuisines(controller.signal)
      .then(response => {
        if (active) {
          setCuisines(readCuisines(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadCuisines, refreshKey]);

  const filteredCuisines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return cuisines.filter(
      cuisine =>
        (!query ||
          `${getCuisineName(cuisine)} ${cuisine.cuisine_id || ''} ${
            cuisine.description || ''
          }`
            .toLocaleLowerCase()
            .includes(query)) &&
        (statusFilter === 'All statuses' ||
          (cuisine.status?.toLowerCase() || 'active') ===
            statusFilter.toLowerCase()),
    );
  }, [cuisines, search, statusFilter]);

  return (
    <View className="flex-1 bg-[#F8FAF8]">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => setRefreshKey(current => current + 1)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 16,
          maxWidth: 1000,
          padding: 18,
          paddingBottom: 28,
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          {showBackButton ? (
            <Pressable
              accessibilityLabel="Back to More"
              accessibilityRole="button"
              onPress={onBack}
              className="self-start rounded-lg py-1"
            >
              <Text className="text-sm font-semibold text-[#116C0B]">
                ‹ Back to More
              </Text>
            </Pressable>
          ) : null}
          <Text className="mt-2 text-2xl font-extrabold text-[#012711]">
            Cuisine Management
          </Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
            Manage the cuisine types available on your restaurant menu.
          </Text>
          {isWide ? (
            <Pressable
              accessibilityLabel="Add cuisine"
              accessibilityRole="button"
              onPress={onAddCuisine}
              className="mt-4 min-h-11 flex-row self-start items-center rounded-xl bg-[#116C0B] px-4"
            >
              <PlusIcon color="#FFFFFF" size={18} />
              <Text className="ml-1.5 text-sm font-bold text-white">
                Add cuisine
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          <CuisineStat label="Total cuisines" value={cuisines.length} />
          <CuisineStat
            label="Active"
            value={
              cuisines.filter(
                cuisine => cuisine.status?.toLowerCase() !== 'inactive',
              ).length
            }
          />
          <CuisineStat
            label="Featured"
            value={
              cuisines.filter(cuisine => isFeatured(cuisine.featured)).length
            }
          />
          <CuisineStat
            label="Inactive"
            value={
              cuisines.filter(
                cuisine => cuisine.status?.toLowerCase() === 'inactive',
              ).length
            }
          />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search cuisines"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search cuisines by name or ID..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
            </View>
            <View className="flex-row items-end gap-2">
              <View
                className="min-w-[130px] flex-1"
                style={{ zIndex: openFilter ? 10 : 1 }}
              >
                <Text className="mb-1 text-[10px] font-bold text-[#475569]">
                  Status
                </Text>
                <Pressable
                  accessibilityLabel={`Status: ${statusFilter}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openFilter }}
                  onPress={() => setOpenFilter(value => !value)}
                  className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-2.5"
                >
                  <Text className="text-xs text-[#334155]">{statusFilter}</Text>
                  <Text className="text-xs text-[#64748B]">
                    {openFilter ? '⌃' : '⌄'}
                  </Text>
                </Pressable>
                {openFilter ? (
                  <View
                    className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
                    style={{ elevation: 8 }}
                  >
                    {['All statuses', 'Active', 'Inactive'].map(status => (
                      <Pressable
                        key={status}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: status === statusFilter,
                        }}
                        onPress={() => {
                          setStatusFilter(status);
                          setOpenFilter(false);
                        }}
                        className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                          status === statusFilter ? 'bg-[#F0FDF4]' : ''
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            status === statusFilter
                              ? 'font-bold text-[#116C0B]'
                              : 'text-[#334155]'
                          }`}
                        >
                          {status}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                {(['grid', 'list'] as const).map(mode => (
                  <Pressable
                    key={mode}
                    accessibilityLabel={`Show cuisines as ${mode}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: viewMode === mode }}
                    onPress={() => setViewMode(mode)}
                    className={`h-9 w-9 items-center justify-center rounded-md ${
                      viewMode === mode ? 'bg-[#116C0B]' : 'bg-[#F3F4F6]'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        viewMode === mode ? 'text-white' : 'text-[#64748B]'
                      }`}
                    >
                      {mode === 'grid' ? '▦' : '☷'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-[#6B7280]">Loading cuisines...</Text>
          </View>
        ) : errorMessage ? (
          <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-6">
            <Text
              accessibilityRole="alert"
              className="text-center text-sm text-[#DC2626]"
            >
              {errorMessage}
            </Text>
            <Pressable
              accessibilityLabel="Retry loading cuisines"
              accessibilityRole="button"
              onPress={() => setRefreshKey(current => current + 1)}
              className="rounded-xl bg-[#116C0B] px-4 py-2.5"
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : filteredCuisines.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <ProductIcon color={colors.textSecondary} size={30} />
            <Text className="text-base font-bold text-[#012711]">
              {search.trim() ? 'No matching cuisines' : 'No cuisines yet'}
            </Text>
            <Text className="text-center text-sm text-[#6B7280]">
              {search.trim()
                ? 'Try another search.'
                : 'Cuisines returned by the API will appear here.'}
            </Text>
          </View>
        ) : viewMode === 'list' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={!isWide}>
            <View
              className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              style={{ width: isWide ? 900 : 660 }}
            >
              <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                <Text className="w-16 text-[10px] font-bold uppercase text-[#64748B]">
                  Image
                </Text>
                <Text className="flex-1 text-[10px] font-bold uppercase text-[#64748B]">
                  Cuisine
                </Text>
                <Text className="w-28 text-[10px] font-bold uppercase text-[#64748B]">
                  Featured
                </Text>
                <Text className="w-24 text-[10px] font-bold uppercase text-[#64748B]">
                  Status
                </Text>
              </View>
              {filteredCuisines.map((cuisine, index) => {
                const name = getCuisineName(cuisine);
                const imageUrl = getImageUrl(cuisine.image);
                const status = cuisine.status?.trim() || 'Active';
                return (
                  <View
                    key={String(cuisine.cuisine_id || `${name}-${index}`)}
                    className="min-h-[64px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2"
                  >
                    {imageUrl ? (
                      <Image
                        accessibilityLabel={`${name} cuisine image`}
                        resizeMode="cover"
                        source={{ uri: imageUrl }}
                        className="h-10 w-12 rounded-lg bg-[#F3F4F6]"
                      />
                    ) : (
                      <View className="h-10 w-12 items-center justify-center rounded-lg bg-[#F0F7EE]">
                        <ProductIcon color={colors.primary} size={18} />
                      </View>
                    )}
                    <View className="min-w-0 flex-1 px-3">
                      <Text
                        className="text-xs font-bold text-[#1E293B]"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text className="mt-1 text-[10px] text-[#64748B]">
                        {cuisine.cuisine_id}
                      </Text>
                    </View>
                    <View className="w-28">
                      {isFeatured(cuisine.featured) ? (
                        <CuisineBadge label="Featured" active />
                      ) : (
                        <Text className="text-xs text-[#64748B]">—</Text>
                      )}
                    </View>
                    <View className="w-24">
                      <CuisineBadge
                        label={status}
                        active={status.toLowerCase() !== 'inactive'}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {filteredCuisines.map((cuisine, index) => {
              const name = getCuisineName(cuisine);
              const imageUrl = getImageUrl(cuisine.image);
              const status = cuisine.status?.trim() || 'Active';

              return (
                <AdminManagementCard
                  key={String(cuisine.cuisine_id || `${name}-${index}`)}
                  isWide={isWide}
                >
                  {imageUrl ? (
                    <Image
                      accessibilityLabel={`${name} cuisine image`}
                      resizeMode="cover"
                      source={{ uri: imageUrl }}
                      className={
                        isWide
                          ? 'h-80 w-full bg-[#F3F4F6]'
                          : 'h-40 w-full bg-[#F3F4F6]'
                      }
                    />
                  ) : (
                    <View
                      className={
                        isWide
                          ? 'h-80 w-full items-center justify-center bg-[#F0F7EE]'
                          : 'h-40 w-full items-center justify-center bg-[#F0F7EE]'
                      }
                    >
                      <ProductIcon color={colors.primary} size={26} />
                    </View>
                  )}
                  <View className="gap-2 p-2.5">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text
                        className={
                          isWide
                            ? 'min-w-0 flex-1 text-sm font-bold text-[#012711]'
                            : 'min-w-0 flex-1 text-[11px] font-bold text-[#012711]'
                        }
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {isFeatured(cuisine.featured) ? (
                        <Text
                          className="rounded-full px-2 py-1 text-[10px] font-semibold"
                          style={{
                            backgroundColor: colors.surfaceSecondary,
                            color: colors.primary,
                          }}
                        >
                          Featured
                        </Text>
                      ) : null}
                    </View>
                    {cuisine.cuisine_id ? (
                      <Text className="mt-1 text-[9px] text-[#6B7280]">
                        {cuisine.cuisine_id}
                      </Text>
                    ) : null}
                    {cuisine.description ? (
                      <Text
                        className={
                          isWide
                            ? 'mt-1 text-xs leading-[17px] text-[#6B7280]'
                            : 'mt-1 text-[9px] leading-3 text-[#6B7280]'
                        }
                        numberOfLines={2}
                      >
                        {cuisine.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className="mx-2.5 mb-2.5 flex-row justify-between border-t border-[#F1F5F9] pt-2">
                    <CuisineBadge
                      label={status}
                      active={status.toLowerCase() !== 'inactive'}
                    />
                    {isFeatured(cuisine.featured) ? (
                      <CuisineBadge label="Featured" active />
                    ) : null}
                  </View>
                </AdminManagementCard>
              );
            })}
          </View>
        )}
      </ScrollView>
      {!isWide ? (
        <Pressable
          accessibilityLabel="Add cuisine"
          accessibilityRole="button"
          onPress={onAddCuisine}
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B]"
          style={{
            elevation: 8,
            shadowColor: '#116C0B',
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <PlusIcon color="#FFFFFF" size={26} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default Cuisine;

function CuisineStat({ label, value }: { label: string; value: number }) {
  const theme =
    label === 'Active'
      ? { tint: '#9A3412', iconBackground: '#FED7AA' }
      : label === 'Featured'
      ? { tint: '#1D4ED8', iconBackground: '#BFDBFE' }
      : label === 'Inactive'
      ? { tint: '#6D28D9', iconBackground: '#DDD6FE' }
      : { tint: '#166534', iconBackground: '#DCFCE7' };

  return (
    <AdminStatCard
      label={label}
      value={value}
      tint={theme.tint}
      iconBackground={theme.iconBackground}
      decorColor={theme.iconBackground}
      icon={
        label === 'Active' ? (
          <CheckCircle2Icon size={22} color={theme.tint} />
        ) : (
          <ImageIcon size={22} color={theme.tint} strokeWidth={2} />
        )
      }
    />
  );
}

function CuisineBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      className={`self-start rounded-full border px-2 py-1 ${
        active
          ? 'border-[#BBF7D0] bg-[#ECFDF5]'
          : 'border-[#E2E8F0] bg-[#F8FAFC]'
      }`}
    >
      <Text
        className={`text-[9px] font-extrabold uppercase ${
          active ? 'text-[#15803D]' : 'text-[#64748B]'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
