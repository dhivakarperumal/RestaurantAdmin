import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../api';
import { ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../theme/colors';

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
  onBack: () => void;
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
  return cuisine.cuisine_name?.trim() || cuisine.name?.trim() || 'Unnamed cuisine';
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

function Cuisine({ onBack }: CuisineProps) {
  const [cuisines, setCuisines] = useState<CuisineRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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
    if (!query) {
      return cuisines;
    }
    return cuisines.filter(cuisine =>
      `${getCuisineName(cuisine)} ${cuisine.cuisine_id || ''} ${
        cuisine.description || ''
      }`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [cuisines, search]);

  return (
    <View className="flex-1 bg-[#F8FAF8]">
      <ScrollView
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
          <Text className="mt-3 text-2xl font-extrabold text-[#012711]">
            All Cuisines
          </Text>
          <Text className="mt-1 text-sm text-[#6B7280]">
            {cuisines.length} {cuisines.length === 1 ? 'cuisine' : 'cuisines'}
          </Text>
        </View>

        <TextInput
          accessibilityLabel="Search cuisines"
          className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search cuisines"
          placeholderTextColor={colors.textSecondary}
          value={search}
        />

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
        ) : (
          <View className="gap-3">
            {filteredCuisines.map((cuisine, index) => {
              const name = getCuisineName(cuisine);
              const imageUrl = getImageUrl(cuisine.image);
              const status = cuisine.status?.trim() || 'Active';

              return (
                <View
                  key={String(cuisine.cuisine_id || `${name}-${index}`)}
                  className="flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                >
                  {imageUrl ? (
                    <Image
                      accessibilityLabel={`${name} cuisine image`}
                      resizeMode="cover"
                      source={{ uri: imageUrl }}
                      className="h-16 w-16 rounded-xl bg-[#F3F4F6]"
                    />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#F0F7EE]">
                      <ProductIcon color={colors.primary} size={26} />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text
                        className="text-base font-bold text-[#012711]"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {isFeatured(cuisine.featured) ? (
                        <Text className="rounded-full bg-[#FFF7D6] px-2 py-1 text-[10px] font-semibold text-[#8A6100]">
                          Featured
                        </Text>
                      ) : null}
                    </View>
                    {cuisine.cuisine_id ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {cuisine.cuisine_id}
                      </Text>
                    ) : null}
                    {cuisine.description ? (
                      <Text
                        className="mt-1 text-xs leading-4 text-[#6B7280]"
                        numberOfLines={2}
                      >
                        {cuisine.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      status.toLowerCase() === 'inactive'
                        ? 'bg-[#F3F4F6] text-[#6B7280]'
                        : 'bg-[#F0F7EE] text-[#116C0B]'
                    }`}
                  >
                    {status}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default Cuisine;
