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
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import { MenuIcon, PlusIcon, SearchIcon } from '../Navigation/NavigationIcons';
import {
  ConfirmDialog,
  Edit3Icon,
  FormModal,
  Trash2Icon,
} from '../../components/popups';
import AdminStatCard from '../../components/AdminStatCard';

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

function getTableId(table: ServerTable) {
  return table.table_id ?? table.id ?? table.table_number;
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
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ServerTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [seatCount, setSeatCount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<ServerTable | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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
    return tables.filter(table => {
      const status = table.status?.trim() || 'Available';
      return (
        (!query ||
          `${getTableNumber(table)} ${status} ${table.no_of_seats ?? ''}`
            .toLocaleLowerCase()
            .includes(query)) &&
        (statusFilter === 'All statuses' ||
          status.toLowerCase() === statusFilter.toLowerCase())
      );
    });
  }, [tables, search, statusFilter]);

  const availableCount = tables.filter(
    table =>
      (table.status?.trim() || 'Available').toLowerCase() === 'available',
  ).length;
  const occupiedCount = tables.filter(
    table => (table.status?.trim() || 'Available').toLowerCase() === 'occupied',
  ).length;
  const otherCount = tables.length - availableCount - occupiedCount;

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

  const openCreateForm = () => {
    setEditingTable(null);
    setTableNumber('');
    setSeatCount('');
    setImageUrl('');
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTable(null);
  };

  const openEditForm = (table: ServerTable) => {
    setEditingTable(table);
    setTableNumber(
      table.table_number == null ? '' : String(table.table_number),
    );
    setSeatCount(table.no_of_seats == null ? '' : String(table.no_of_seats));
    setImageUrl(table.image_url ?? '');
    setFormError('');
    setIsFormOpen(true);
  };

  const saveTable = async () => {
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
      const payload = {
        table_number: normalizedNumber,
        no_of_seats: seats,
        image_url: imageUrl || null,
        ...(userId ? { user_id: userId } : {}),
      };
      if (editingTable) {
        const tableId = getTableId(editingTable);
        if (
          tableId === undefined ||
          tableId === null ||
          String(tableId).trim() === ''
        ) {
          throw new Error(
            'This table does not have a valid ID and cannot be edited.',
          );
        }
        await api
          .put(`/server-tables/${encodeURIComponent(String(tableId))}`, payload)
          .catch(() =>
            api.patch(
              `/server-tables/${encodeURIComponent(String(tableId))}`,
              payload,
            ),
          );
      } else {
        await api.post('/server-tables', {
          ...payload,
          status: 'Available',
        });
      }
      setIsFormOpen(false);
      setEditingTable(null);
      setRefreshKey(current => current + 1);
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          editingTable ? 'Unable to update table.' : 'Unable to add table.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    const tableId = getTableId(tableToDelete);
    if (
      tableId === undefined ||
      tableId === null ||
      String(tableId).trim() === ''
    ) {
      setDeleteError(
        'This table does not have a valid ID and cannot be deleted.',
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/server-tables/${encodeURIComponent(String(tableId))}`);
      setTables(current =>
        current.filter(table => String(getTableId(table)) !== String(tableId)),
      );
      setTableToDelete(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'Unable to delete table.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTableActions = (table: ServerTable) => (
    <View className="flex-row gap-2">
      <TableActionButton
        label={`Edit table ${getTableNumber(table)}`}
        tone="edit"
        onPress={() => openEditForm(table)}
      />
      <TableActionButton
        label={`Delete table ${getTableNumber(table)}`}
        tone="delete"
        onPress={() => {
          setDeleteError('');
          setTableToDelete(table);
        }}
      />
    </View>
  );

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
          <View className="mt-3 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-[#012711]">
                Table Management
              </Text>
              <Text className="mt-1 text-sm text-[#6B7280]">
                Manage table capacity, availability, and seating photos.
              </Text>
            </View>
            {isWide ? (
              <Pressable
                accessibilityLabel="Add table"
                accessibilityRole="button"
                onPress={openCreateForm}
                className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-4"
              >
                <PlusIcon color="#FFFFFF" size={18} />
                <Text className="ml-1.5 text-sm font-bold text-white">
                  Add table
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between">
            <AdminStatCard
              label="Total"
              value={tables.length}
              tint="#166534"
              iconBackground="#DCFCE7"
              icon={<MenuIcon color="#166534" size={22} />}
            />
            <AdminStatCard
              label="Available"
              value={availableCount}
              tint="#9A3412"
              iconBackground="#FED7AA"
              icon={<MenuIcon color="#9A3412" size={22} />}
            />
          </View>
          <View className="flex-row justify-between">
            <AdminStatCard
              label="Occupied"
              value={occupiedCount}
              tint="#1D4ED8"
              iconBackground="#BFDBFE"
              icon={<MenuIcon color="#1D4ED8" size={22} />}
            />
            <AdminStatCard
              label="Other status"
              value={otherCount}
              tint="#6D28D9"
              iconBackground="#DDD6FE"
              icon={<MenuIcon color="#6D28D9" size={22} />}
            />
          </View>
        </View>

        <FormModal
          visible={isFormOpen}
          onClose={closeForm}
          title={editingTable ? 'Edit Table' : 'Add New Table'}
          subtitle={
            editingTable
              ? 'Update table number, capacity, and seating picture'
              : 'Set table number, capacity, and seating picture'
          }
          cancelLabel=""
          isSaving={isSaving}
          isSaveDisabled={isSaving || isUploadingImage}
          errorMessage={formError}
          maxWidth={520}
          maxHeightPercent={94}
          contentContainerStyle={{ gap: 12, padding: 14 }}
          footerExtra={
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={closeForm}
                disabled={isSaving}
                className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4"
              >
                <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void saveTable()}
                disabled={isSaving || isUploadingImage}
                className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {editingTable ? 'Save changes' : 'Create table'}
                  </Text>
                )}
              </Pressable>
            </View>
          }
        >
          <View className="gap-3">
            <View className="gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-[#15803D]">
                  <Text className="text-[11px] font-extrabold text-white">
                    1
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-[#0F172A]">
                  Table information
                </Text>
              </View>
              <View>
                <Text className="mb-1 text-xs font-bold text-[#374151]">
                  Table number *
                </Text>
                <TextInput
                  accessibilityLabel="Table number"
                  className="min-h-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A]"
                  onChangeText={setTableNumber}
                  placeholder="e.g. T-12 or 5"
                  placeholderTextColor={colors.textSecondary}
                  value={tableNumber}
                />
              </View>
              <View>
                <Text className="mb-1 text-xs font-bold text-[#374151]">
                  Number of seats *
                </Text>
                <TextInput
                  accessibilityLabel="Number of seats"
                  className="min-h-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A]"
                  keyboardType="number-pad"
                  onChangeText={setSeatCount}
                  placeholder="e.g. 4"
                  placeholderTextColor={colors.textSecondary}
                  value={seatCount}
                />
              </View>
            </View>
            <View className="gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-[#15803D]">
                  <Text className="text-[11px] font-extrabold text-white">
                    2
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-[#0F172A]">
                  Table image
                </Text>
              </View>
              <View className="gap-2">
                <Text className="mb-1 text-xs font-bold text-[#374151]">
                  Table photo (optional)
                </Text>
                <Pressable
                  accessibilityLabel="Upload table image"
                  accessibilityRole="button"
                  disabled={isUploadingImage}
                  onPress={chooseImage}
                  className="self-start rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3"
                >
                  <Text className="font-semibold text-[#116C0B]">
                    {isUploadingImage
                      ? 'Uploading image...'
                      : imageUrl
                      ? 'Change image'
                      : 'Choose table image'}
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
            </View>
          </View>
        </FormModal>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search tables"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search table number, capacity, or status..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
            </View>
            <View className="flex-row items-end gap-2">
              <View className="relative min-w-[140px] flex-1">
                <Text className="mb-1 text-[10px] font-bold text-[#475569]">
                  Status
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isStatusMenuOpen }}
                  onPress={() => setIsStatusMenuOpen(value => !value)}
                  className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-3"
                >
                  <Text className="text-xs text-[#334155]">{statusFilter}</Text>
                  <Text className="text-xs text-[#64748B]">
                    {isStatusMenuOpen ? '⌃' : '⌄'}
                  </Text>
                </Pressable>
                {isStatusMenuOpen ? (
                  <View
                    className="absolute left-0 right-0 top-[62px] z-10 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
                    style={{ elevation: 8 }}
                  >
                    {[
                      'All statuses',
                      ...Array.from(
                        new Set(
                          tables.map(
                            table => table.status?.trim() || 'Available',
                          ),
                        ),
                      ),
                    ].map(status => (
                      <Pressable
                        key={status}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: statusFilter === status,
                        }}
                        onPress={() => {
                          setStatusFilter(status);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                          statusFilter === status ? 'bg-[#F0FDF4]' : ''
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            statusFilter === status
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
                {(['grid', 'list'] as const).map(mode => {
                  const selected = viewMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Show tables as ${mode}`}
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
                        {mode === 'grid' ? '▦' : '☷'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
          <Text className="text-xs text-[#64748B]">
            {filteredTables.length} tables
          </Text>
        </View>

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
        ) : viewMode === 'list' ? (
          <ScrollView
            horizontal={!isWide}
            showsHorizontalScrollIndicator={!isWide}
          >
            <View
              className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              style={{ width: isWide ? '100%' : 680 }}
            >
              <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                <Text className="w-16 text-xs font-bold text-[#64748B]">
                  Image
                </Text>
                <Text className="flex-1 text-xs font-bold text-[#64748B]">
                  Table
                </Text>
                <Text className="w-24 text-xs font-bold text-[#64748B]">
                  Seats
                </Text>
                <Text className="w-32 text-xs font-bold text-[#64748B]">
                  Status
                </Text>
                <Text className="w-24 text-xs font-bold text-[#64748B]">
                  Actions
                </Text>
              </View>
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
                    className={`min-h-[58px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'
                    }`}
                  >
                    <View className="w-16 pr-2">
                      {image ? (
                        <Image
                          accessibilityLabel={`Table ${getTableNumber(
                            table,
                          )} image`}
                          resizeMode="cover"
                          source={{ uri: image }}
                          className="h-9 w-12 rounded-md bg-[#F3F4F6]"
                        />
                      ) : (
                        <View className="h-9 w-12 items-center justify-center rounded-md bg-[#F0F7EE]">
                          <MenuIcon color={colors.primary} size={18} />
                        </View>
                      )}
                    </View>
                    <Text className="flex-1 text-xs font-semibold text-[#334155]">
                      Table {getTableNumber(table)}
                    </Text>
                    <Text className="w-24 text-xs text-[#334155]">
                      {table.no_of_seats ?? '—'}
                    </Text>
                    <Text
                      className={`w-32 text-xs font-semibold ${
                        status.toLowerCase() === 'available'
                          ? 'text-[#166534]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {status}
                    </Text>
                    <View className="w-24">{renderTableActions(table)}</View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-3">
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
                  className="w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                  style={{ width: isWide ? '48%' : '100%' }}
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
                  {renderTableActions(table)}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      {!isWide && !isFormOpen ? (
        <Pressable
          accessibilityLabel="Add table"
          accessibilityRole="button"
          accessibilityHint="Opens the add new table form"
          onPress={() => {
            openCreateForm();
          }}
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg"
        >
          <PlusIcon color={colors.surface} size={26} />
        </Pressable>
      ) : null}
      <ConfirmDialog
        visible={tableToDelete !== null}
        onClose={() => {
          setTableToDelete(null);
          setDeleteError('');
        }}
        onConfirm={() => void confirmDeleteTable()}
        title="Delete table?"
        itemName={
          tableToDelete ? `Table ${getTableNumber(tableToDelete)}` : undefined
        }
        message="This table will be permanently removed."
        confirmLabel="Delete table"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </View>
  );
}

export default Tables;

function TableActionButton({
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
