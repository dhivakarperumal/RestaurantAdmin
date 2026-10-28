import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../api';
import colors from '../theme/colors';
import { MenuIcon, PlusIcon } from '../Navigation/NavigationIcons';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type ServerTable = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: number | string;
  image_url?: string | null;
  status?: string;
};

type TablesProps = {
  onBack: () => void;
  userId: string;
  showBackButton?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readTables(payload: unknown): ServerTable[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as ServerTable[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.server_tables)) {
      return current.server_tables.filter(isRecord) as ServerTable[];
    }
    if (Array.isArray(current.tables)) {
      return current.tables.filter(isRecord) as ServerTable[];
    }
    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }
  return [];
}

function getErrorMessage(error: unknown, fallback: string) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

function getTableNumber(table: ServerTable) {
  return String(table.table_number ?? 'Unnamed table');
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

function Tables({ onBack, userId, showBackButton = true }: TablesProps) {
  const [tables, setTables] = useState<ServerTable[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [seatCount, setSeatCount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const loadTables = useCallback(async (signal: AbortSignal) => {
    const config = {
      signal,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
    };

    try {
      return await api.get('/server-tables', config);
    } catch (error) {
      if (isRecord(error) && Number(error.status) === 304 && !signal.aborted) {
        return api.get('/server-tables', {
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

    loadTables(controller.signal)
      .then(response => {
        if (active) {
          setTables(readTables(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setErrorMessage(getErrorMessage(error, 'Unable to load tables.'));
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
  }, [loadTables, refreshKey]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return tables;
    }
    return tables.filter(table =>
      `${getTableNumber(table)} ${table.status ?? ''} ${
        table.no_of_seats ?? ''
      }`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [tables, search]);

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
      setFormError('Choose a valid table image.');
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
      setFormError('Table images must be 5 MB or smaller.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('folder', 'tables');
      body.append('file', {
        uri: asset.uri,
        name:
          asset.fileName ||
          `table-${Date.now()}.${mimeType?.split('/')[1] || 'jpg'}`,
        type: mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapData(response.data);
      const uploadedImageUrl =
        isRecord(data) && typeof data.url === 'string' ? data.url.trim() : '';
      if (!uploadedImageUrl) {
        throw new Error('Image upload returned no image URL.');
      }
      setImageUrl(uploadedImageUrl);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to upload table image.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addTable = async () => {
    const normalizedNumber = tableNumber.trim();
    const seats = Number(seatCount);
    if (!normalizedNumber) {
      setFormError('Enter a table number.');
      return;
    }
    if (!Number.isInteger(seats) || seats < 1) {
      setFormError('Enter a valid number of seats.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/server-tables', {
        table_number: normalizedNumber,
        no_of_seats: seats,
        image_url: imageUrl || null,
        status: 'Available',
        ...(userId ? { user_id: userId } : {}),
      });
      setTableNumber('');
      setSeatCount('');
      setImageUrl('');
      setIsFormOpen(false);
      setRefreshKey(current => current + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to add table.'));
    } finally {
      setIsSaving(false);
    }
  };

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
        contentContainerClassName="mx-auto w-full max-w-[1000px] gap-4 px-[18px] pb-7 pt-[18px]"
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
          <Text className="mt-3 text-2xl font-extrabold text-[#012711]">
            Tables
          </Text>
          <Text className="mt-1 text-sm text-[#6B7280]">
            {tables.length} {tables.length === 1 ? 'table' : 'tables'}
          </Text>
        </View>

        <Modal
          animationType="slide"
          onRequestClose={() => setIsFormOpen(false)}
          transparent
          visible={isFormOpen}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <Pressable
              accessibilityLabel="Close add table sheet"
              accessibilityRole="button"
              onPress={() => setIsFormOpen(false)}
              className="absolute inset-0"
            />
            <View className="max-h-[90%] rounded-t-3xl bg-white">
              <ScrollView
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="gap-3 px-5 pb-8 pt-5"
              >
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-base font-bold text-[#012711]">
                    Add new table
                  </Text>
                  <Pressable
                    accessibilityLabel="Close add table sheet"
                    accessibilityRole="button"
                    onPress={() => setIsFormOpen(false)}
                    className="rounded-lg px-3 py-2"
                  >
                    <Text className="font-semibold text-[#6B7280]">Close</Text>
                  </Pressable>
                </View>
                <TextInput
                  accessibilityLabel="Table number"
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
                  onChangeText={setTableNumber}
                  placeholder="Table number"
                  placeholderTextColor={colors.textSecondary}
                  value={tableNumber}
                />
                <TextInput
                  accessibilityLabel="Number of seats"
                  className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
                  keyboardType="number-pad"
                  onChangeText={setSeatCount}
                  placeholder="Number of seats"
                  placeholderTextColor={colors.textSecondary}
                  value={seatCount}
                />
                <View className="gap-2">
                  <Pressable
                    accessibilityLabel="Upload table image"
                    accessibilityRole="button"
                    disabled={isUploadingImage}
                    onPress={chooseImage}
                    className="self-start rounded-xl border border-[#D1D5DB] px-4 py-3"
                  >
                    <Text className="font-semibold text-[#116C0B]">
                      {isUploadingImage
                        ? 'Uploading image...'
                        : imageUrl
                        ? 'Change image'
                        : 'Upload image'}
                    </Text>
                  </Pressable>
                  {imageUrl ? (
                    <Image
                      accessibilityLabel="Table image preview"
                      resizeMode="cover"
                      source={{ uri: resolveImageUrl(imageUrl) }}
                      className="h-24 w-24 rounded-xl bg-[#F3F4F6]"
                    />
                  ) : null}
                </View>
                {formError ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-sm text-[#DC2626]"
                  >
                    {formError}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityLabel="Save table"
                  accessibilityRole="button"
                  disabled={isSaving || isUploadingImage}
                  onPress={addTable}
                  className={`items-center rounded-xl bg-[#116C0B] px-4 py-3 ${
                    isSaving ? 'opacity-[0.65]' : 'opacity-100'
                  }`}
                >
                  <Text className="font-semibold text-white">
                    {isSaving
                      ? 'Saving...'
                      : isUploadingImage
                      ? 'Uploading image...'
                      : 'Save Table'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <TextInput
          accessibilityLabel="Search tables"
          className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search tables"
          placeholderTextColor={colors.textSecondary}
          value={search}
        />

        {isLoading ? (
          <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-[#6B7280]">Loading tables...</Text>
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
              accessibilityLabel="Retry loading tables"
              accessibilityRole="button"
              onPress={() => setRefreshKey(current => current + 1)}
              className="rounded-xl bg-[#116C0B] px-4 py-2.5"
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : filteredTables.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <MenuIcon color={colors.textSecondary} size={30} />
            <Text className="text-base font-bold text-[#012711]">
              {search.trim() ? 'No matching tables' : 'No tables yet'}
            </Text>
            <Text className="text-center text-sm text-[#6B7280]">
              {search.trim()
                ? 'Try another search.'
                : 'Tables returned by the API will appear here.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredTables.map((table, index) => {
              const status = table.status?.trim() || 'Available';
              const image = resolveImageUrl(table.image_url);
              return (
                <View
                  key={String(
                    table.table_id ??
                      table.id ??
                      `${getTableNumber(table)}-${index}`,
                  )}
                  className="flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                >
                  {image ? (
                    <Image
                      accessibilityLabel={`Table ${getTableNumber(
                        table,
                      )} image`}
                      resizeMode="cover"
                      source={{ uri: image }}
                      className="h-14 w-14 rounded-xl bg-[#F3F4F6]"
                    />
                  ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-xl bg-[#F0F7EE]">
                      <MenuIcon color={colors.primary} size={24} />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-[#012711]">
                      Table {getTableNumber(table)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      {table.no_of_seats ?? '—'} seats
                    </Text>
                  </View>
                  <Text
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      status.toLowerCase() === 'available'
                        ? 'bg-[#F0F7EE] text-[#116C0B]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
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
      <Pressable
        accessibilityLabel="Add table"
        accessibilityRole="button"
        accessibilityHint="Opens the add new table form"
        onPress={() => {
          setFormError('');
          setIsFormOpen(true);
        }}
        className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg"
      >
        <PlusIcon color={colors.surface} size={26} />
      </Pressable>
    </View>
  );
}

export default Tables;
