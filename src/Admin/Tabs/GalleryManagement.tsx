import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
import {
  ConfirmDialog,
  DetailsModal,
  Edit3Icon,
  FormModal,
  ImageIcon,
  Trash2Icon,
} from '../../components/popups';
import AdminStatCard from '../../components/AdminStatCard';
import AdminManagementCard from '../../components/AdminManagementCard';
import { PlusIcon, SearchIcon } from '../Navigation/NavigationIcons';

type AlbumStatus = 'Active' | 'Inactive';
type Album = {
  album_id: string;
  title: string;
  category: string;
  status: AlbumStatus;
  sort_order: number;
  cover_image: string;
  photos: string[];
  short_description: string;
  description: string;
  meta_title: string;
  meta_description: string;
  photo_count: number;
  created_at?: string;
};
type AlbumDraft = Omit<Album, 'album_id' | 'photo_count' | 'created_at'>;

const emptyDraft: AlbumDraft = {
  title: '',
  category: '',
  status: 'Active',
  sort_order: 1,
  cover_image: '',
  photos: [],
  short_description: '',
  description: '',
  meta_title: '',
  meta_description: '',
};

const galleryCategories = [
  'Photo Frames',
  'Collage Frames',
  'Photo Prints',
  'Canvas Prints',
];

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Something went wrong. Please try again.';
}

function toAlbum(value: Record<string, unknown>): Album {
  const parsedPhotos = Array.isArray(value.photos)
    ? value.photos.filter((photo): photo is string => typeof photo === 'string')
    : [];
  return {
    album_id: String(value.album_id ?? ''),
    title: typeof value.title === 'string' ? value.title : '',
    category: typeof value.category === 'string' ? value.category : '',
    status: value.status === 'Inactive' ? 'Inactive' : 'Active',
    sort_order: Number(value.sort_order) || 1,
    cover_image: typeof value.cover_image === 'string' ? value.cover_image : '',
    photos: parsedPhotos,
    short_description:
      typeof value.short_description === 'string'
        ? value.short_description
        : '',
    description: typeof value.description === 'string' ? value.description : '',
    meta_title: typeof value.meta_title === 'string' ? value.meta_title : '',
    meta_description:
      typeof value.meta_description === 'string' ? value.meta_description : '',
    photo_count: Number(value.photo_count) || parsedPhotos.length,
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
  };
}

function resolveImageUrl(url: string) {
  if (!url || /^(https?:|data:|file:|content:)/i.test(url)) {
    return url;
  }
  const backendUrl = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${backendUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function GalleryManagementPage({
  onBack,
  showBackButton = true,
}: {
  onBack: () => void;
  showBackButton?: boolean;
}) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'All Status' | AlbumStatus>(
    'All Status',
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openFilter, setOpenFilter] = useState<'category' | 'status' | null>(
    null,
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [draft, setDraft] = useState<AlbumDraft>(emptyDraft);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const loadAlbums = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/gallery');
      const rows = response.data?.data;
      if (!Array.isArray(rows)) {
        throw new Error('The gallery response did not contain an album list.');
      }
      setAlbums(rows.map((row: Record<string, unknown>) => toAlbum(row)));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const categories = useMemo(
    () => [
      ...new Set([
        ...galleryCategories,
        ...albums.map(album => album.category).filter(Boolean),
      ]),
    ],
    [albums],
  );

  const filteredAlbums = useMemo(
    () =>
      albums.filter(album => {
        const matchesSearch = album.title
          .toLowerCase()
          .includes(search.trim().toLowerCase());
        const matchesCategory =
          categoryFilter === 'All Categories' ||
          album.category === categoryFilter;
        const matchesStatus =
          statusFilter === 'All Status' || album.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      }),
    [albums, categoryFilter, search, statusFilter],
  );

  const updateDraft = <Key extends keyof AlbumDraft>(
    key: Key,
    value: AlbumDraft[Key],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const openCreateForm = () => {
    setError('');
    setNotice('');
    setEditingAlbumId(null);
    setDraft({ ...emptyDraft });
    setIsFormOpen(true);
  };

  const openEditForm = (album: Album) => {
    setError('');
    setNotice('');
    setEditingAlbumId(album.album_id);
    setDraft({
      title: album.title,
      category: album.category,
      status: album.status,
      sort_order: album.sort_order,
      cover_image: album.cover_image,
      photos: [...album.photos],
      short_description: album.short_description,
      description: album.description,
      meta_title: album.meta_title,
      meta_description: album.meta_description,
    });
    setIsFormOpen(true);
  };

  const uploadImage = async (uri: string, fileName?: string, type?: string) => {
    const formData = new FormData();
    formData.append('folder', 'gallery');
    formData.append('file', {
      uri,
      name: fileName || `gallery-${Date.now()}.jpg`,
      type: type || 'image/jpeg',
    });
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const imageUrl = response.data?.url || response.data?.urls?.[0];
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      throw new Error('The image upload did not return an image URL.');
    }
    return imageUrl;
  };

  const pickCoverImage = async () => {
    setError('');
    setUploading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Unable to select an image.');
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        throw new Error('The selected cover image could not be opened.');
      }
      updateDraft(
        'cover_image',
        await uploadImage(asset.uri, asset.fileName, asset.type),
      );
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const pickAlbumPhotos = async () => {
    setError('');
    setUploading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 10,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Unable to select photos.');
      }
      const assets = result.assets || [];
      if (assets.some(asset => !asset.uri)) {
        throw new Error('One or more selected photos could not be opened.');
      }
      const uploadedPhotos: string[] = [];
      for (const asset of assets) {
        if (!asset.uri) {
          continue;
        }
        uploadedPhotos.push(
          await uploadImage(asset.uri, asset.fileName, asset.type),
        );
      }
      if (uploadedPhotos.length) {
        setDraft(current => ({
          ...current,
          photos: [...current.photos, ...uploadedPhotos],
        }));
      }
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const saveAlbum = async () => {
    if (!draft.title.trim()) {
      setError('Album title is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        category: draft.category.trim(),
        cover_image: draft.cover_image.trim(),
        short_description: draft.short_description.trim(),
        description: draft.description.trim(),
        meta_title: draft.meta_title.trim(),
        meta_description: draft.meta_description.trim(),
        photos: draft.photos.filter(Boolean),
      };
      if (editingAlbumId) {
        await api.put(`/gallery/${editingAlbumId}`, payload);
      } else {
        const idResponse = await api.get('/gallery/next-id');
        const albumId = idResponse.data?.data;
        if (typeof albumId !== 'string' || !albumId.trim()) {
          throw new Error('Could not generate an album ID.');
        }
        await api.post('/gallery', { ...payload, album_id: albumId });
      }
      await loadAlbums();
      setIsFormOpen(false);
      setNotice(
        editingAlbumId ? 'Gallery album updated.' : 'Gallery album created.',
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAlbum = (album: Album) => {
    setAlbumToDelete(album);
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setIsDeleting(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/gallery/${albumToDelete.album_id}`);
      setAlbums(current =>
        current.filter(item => item.album_id !== albumToDelete.album_id),
      );
      setNotice('Gallery album deleted.');
      setAlbumToDelete(null);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  const removePhoto = (photoToRemove: string) => {
    setDraft(current => ({
      ...current,
      photos: current.photos.filter(photo => photo !== photoToRemove),
    }));
  };

  const totalPhotos = albums.reduce(
    (total, album) => total + (album.photo_count || album.photos.length),
    0,
  );
  const activeAlbums = albums.filter(album => album.status === 'Active').length;
  const inactiveAlbums = albums.length - activeAlbums;

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void loadAlbums();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerClassName="mx-auto w-full max-w-[1100px] gap-5 px-5 pb-24 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            {showBackButton ? (
              <Pressable
                accessibilityLabel="Back to More"
                accessibilityRole="button"
                onPress={onBack}
                className="mb-3 self-start py-1"
              >
                <Text className="text-sm font-semibold text-[#116C0B]">
                  ‹ More
                </Text>
              </Pressable>
            ) : null}
            <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
              WEBSITE CONTENT
            </Text>
            <Text className="mt-1 text-2xl font-bold text-[#012711]">
              Gallery Management
            </Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
              Organize gallery albums and photos.
            </Text>
          </View>
          {isWide ? (
            <Pressable
              accessibilityLabel="Add gallery album"
              accessibilityRole="button"
              onPress={openCreateForm}
              className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <PlusIcon color="#FFFFFF" size={18} />
              <Text className="ml-1.5 text-sm font-bold text-white">
                Add album
              </Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap justify-between gap-y-3">
          <GalleryStat label="Total albums" value={albums.length} />
          <GalleryStat label="Total photos" value={totalPhotos} />
          <GalleryStat label="Active albums" value={activeAlbums} />
          <GalleryStat label="Inactive albums" value={inactiveAlbums} />
        </View>

        <View
          className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
          style={{
            zIndex: openFilter ? 10 : 1,
            elevation: openFilter ? 10 : 0,
          }}
        >
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search gallery albums"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search albums by title..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
            </View>
            <View
              className="flex-row items-end gap-2"
              style={{
                zIndex: openFilter ? 20 : 1,
                elevation: openFilter ? 20 : 0,
              }}
            >
              <View className="flex-1 flex-row gap-2">
                <ManagementDropdown
                  label="Category"
                  selected={categoryFilter}
                  open={openFilter === 'category'}
                  onOpen={() =>
                    setOpenFilter(current =>
                      current === 'category' ? null : 'category',
                    )
                  }
                  onSelect={value => {
                    setCategoryFilter(value);
                    setOpenFilter(null);
                  }}
                  options={[
                    { value: 'All Categories', label: 'All categories' },
                    ...categories.map(value => ({ value, label: value })),
                  ]}
                />
                <ManagementDropdown
                  label="Status"
                  selected={statusFilter}
                  open={openFilter === 'status'}
                  onOpen={() =>
                    setOpenFilter(current =>
                      current === 'status' ? null : 'status',
                    )
                  }
                  onSelect={value => {
                    setStatusFilter(value as 'All Status' | AlbumStatus);
                    setOpenFilter(null);
                  }}
                  options={(['All Status', 'Active', 'Inactive'] as const).map(
                    value => ({
                      value,
                      label: value === 'All Status' ? 'All statuses' : value,
                    }),
                  )}
                />
              </View>
              <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                {(['grid', 'list'] as const).map(mode => (
                  <Pressable
                    key={mode}
                    accessibilityLabel={`Show albums as ${mode}`}
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
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#6B7280]">
              Loading albums...
            </Text>
          </View>
        ) : filteredAlbums.length ? (
          viewMode === 'list' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={!isWide}>
              <View
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
                style={{ width: isWide ? 1000 : 680 }}
              >
                <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                  <Text className="w-16 text-[10px] font-bold uppercase text-[#64748B]">
                    Cover
                  </Text>
                  <Text className="flex-1 text-[10px] font-bold uppercase text-[#64748B]">
                    Album
                  </Text>
                  <Text className="w-36 text-[10px] font-bold uppercase text-[#64748B]">
                    Category
                  </Text>
                  <Text className="w-24 text-[10px] font-bold uppercase text-[#64748B]">
                    Photos
                  </Text>
                  <Text className="w-24 text-[10px] font-bold uppercase text-[#64748B]">
                    Status
                  </Text>
                  <Text className="w-28 text-right text-[10px] font-bold uppercase text-[#64748B]">
                    Actions
                  </Text>
                </View>
                {filteredAlbums.map(album => (
                  <View
                    key={album.album_id}
                    className="min-h-[64px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2"
                  >
                    {album.cover_image ? (
                      <Image
                        accessibilityLabel={`${album.title} cover image`}
                        className="h-10 w-12 rounded-lg bg-[#F3F4F6]"
                        resizeMode="cover"
                        source={{ uri: resolveImageUrl(album.cover_image) }}
                      />
                    ) : (
                      <View className="h-10 w-12 items-center justify-center rounded-lg bg-[#F3F4F6]">
                        <ImageIcon size={16} color="#64748B" />
                      </View>
                    )}
                    <View className="min-w-0 flex-1 px-3">
                      <Text
                        className="text-xs font-bold text-[#1E293B]"
                        numberOfLines={1}
                      >
                        {album.title}
                      </Text>
                      <Text className="mt-1 text-[10px] text-[#64748B]">
                        {album.album_id}
                      </Text>
                    </View>
                    <Text
                      className="w-36 text-xs text-[#475569]"
                      numberOfLines={1}
                    >
                      {album.category || 'Uncategorized'}
                    </Text>
                    <Text className="w-24 text-xs text-[#475569]">
                      {album.photo_count || album.photos.length}
                    </Text>
                    <View className="w-24">
                      <AlbumStatusBadge status={album.status} />
                    </View>
                    <View className="w-28 flex-row justify-end gap-1.5">
                      <AlbumActionButton
                        label={`View ${album.title}`}
                        onPress={() => setSelectedAlbum(album)}
                        tone="view"
                      />
                      <AlbumActionButton
                        label={`Edit ${album.title}`}
                        onPress={() => openEditForm(album)}
                        tone="edit"
                      />
                      <AlbumActionButton
                        label={`Delete ${album.title}`}
                        onPress={() => deleteAlbum(album)}
                        tone="delete"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {filteredAlbums.map((album, index) => (
                <AdminManagementCard
                  key={album.album_id}
                  isWide={isWide}
                >
                  {album.cover_image ? (
                    <Image
                      accessibilityLabel={`${album.title} cover image`}
                      className={
                        isWide
                          ? 'h-80 w-full bg-[#F3F4F6]'
                          : 'h-40 w-full bg-[#F3F4F6]'
                      }
                      resizeMode="cover"
                      source={{ uri: resolveImageUrl(album.cover_image) }}
                    />
                  ) : (
                    <View
                      className={
                        isWide
                          ? 'h-80 items-center justify-center bg-[#F3F4F6]'
                          : 'h-40 items-center justify-center bg-[#F3F4F6]'
                      }
                    >
                      <Text className="text-sm text-[#6B7280]">
                        No cover image
                      </Text>
                    </View>
                  )}
                  <View className="gap-2 p-2.5">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text
                          className={
                            isWide
                              ? 'text-sm font-bold text-[#012711]'
                              : 'text-[11px] font-bold text-[#012711]'
                          }
                          numberOfLines={1}
                        >
                          {album.title}
                        </Text>
                        <Text className="mt-1 text-xs text-[#7a7a7a]">
                          {album.album_id}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          album.status === 'Active'
                            ? 'bg-green-50'
                            : 'bg-red-50'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            album.status === 'Active'
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {album.status}
                        </Text>
                      </View>
                    </View>
                    <Text
                      numberOfLines={2}
                      className={
                        isWide
                          ? 'text-xs leading-[17px] text-[#6B7280]'
                          : 'text-[9px] leading-3 text-[#6B7280]'
                      }
                    >
                      {album.short_description || 'No description available.'}
                    </Text>
                    <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-2">
                      <Text className="text-[9px] text-[#6B7280]">
                        {album.category || 'Uncategorized'}
                      </Text>
                      <Text className="text-[9px] text-[#6B7280]">
                        {album.photo_count || album.photos.length} photos
                      </Text>
                    </View>
                    <View className="flex-row justify-end gap-1.5">
                      <Pressable
                        accessibilityLabel={`View gallery album ${album.title}`}
                        accessibilityRole="button"
                        onPress={() => setSelectedAlbum(album)}
                        className="h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white"
                      >
                        <Text className="text-xs font-bold text-[#374151]">
                          •••
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Edit gallery album ${album.title}`}
                        accessibilityRole="button"
                        onPress={() => openEditForm(album)}
                        className="h-9 w-9 items-center justify-center rounded-lg border border-[#DCFCE7] bg-[#F0FDF4]"
                      >
                        <Edit3Icon size={15} color="#15803D" />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Delete gallery album ${album.title}`}
                        accessibilityRole="button"
                        onPress={() => deleteAlbum(album)}
                        className="h-9 w-9 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2]"
                      >
                        <Trash2Icon size={15} color="#DC2626" />
                      </Pressable>
                    </View>
                    <Text className="text-right text-[10px] text-[#9CA3AF]">
                      Album {index + 1}
                    </Text>
                  </View>
                </AdminManagementCard>
              ))}
            </View>
          )
        ) : (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white px-5 py-10">
            <Text className="text-base font-semibold text-[#012711]">
              {albums.length ? 'No albums found' : 'No albums yet'}
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#6B7280]">
              {albums.length
                ? 'Try changing your search or filters.'
                : 'Create an album to start organizing your gallery photos.'}
            </Text>
            {!albums.length ? (
              <Pressable
                onPress={openCreateForm}
                className="mt-4 rounded-xl bg-[#162420] px-4 py-3"
              >
                <Text className="text-sm font-bold text-white">
                  Create your first album
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      {!isWide && !isFormOpen ? (
        <Pressable
          accessibilityLabel="Add gallery album"
          accessibilityRole="button"
          onPress={openCreateForm}
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

      <FormModal
        visible={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAlbumId ? 'Edit Gallery Album' : 'Add Gallery Album'}
        subtitle="Manage album details, cover photo, and photo gallery"
        cancelLabel=""
        isSaving={isSaving}
        isSaveDisabled={isSaving || uploading}
        errorMessage={error}
        footerExtra={
          <View className="flex-row gap-3">
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => setIsFormOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
            >
              <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                editingAlbumId ? 'Save Changes' : 'Create Album'
              }
              accessibilityRole="button"
              disabled={isSaving || uploading}
              onPress={() => void saveAlbum()}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {editingAlbumId ? 'Save Changes' : 'Create Album'}
                </Text>
              )}
            </Pressable>
          </View>
        }
      >
        <View className="gap-4">
          <ManagementFormSection number="1" title="Album Information">
            <AlbumField
              label="Album title"
              value={draft.title}
              onChangeText={value => updateDraft('title', value)}
              placeholder="Album title"
            />
            <AlbumField
              label="Category"
              value={draft.category}
              onChangeText={value => updateDraft('category', value)}
              placeholder="e.g. Photo Frames"
            />
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">
                Suggested categories
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {galleryCategories.map(category => (
                  <FilterButton
                    key={category}
                    label={category}
                    selected={draft.category === category}
                    onPress={() => updateDraft('category', category)}
                  />
                ))}
              </View>
            </View>
            <AlbumField
              label="Short description"
              value={draft.short_description}
              onChangeText={value => updateDraft('short_description', value)}
              placeholder="A short summary for the album"
              multiline
            />
            <AlbumField
              label="Description"
              value={draft.description}
              onChangeText={value => updateDraft('description', value)}
              placeholder="Full album description"
              multiline
            />
            <AlbumField
              label="Sort order"
              value={String(draft.sort_order)}
              onChangeText={value =>
                updateDraft('sort_order', Math.max(1, Number(value) || 1))
              }
              placeholder="1"
              keyboardType="number-pad"
            />
          </ManagementFormSection>
          <ManagementFormSection number="2" title="Album Images">
            <AlbumField
              label="Cover image URL"
              value={draft.cover_image}
              onChangeText={value => updateDraft('cover_image', value)}
              placeholder="https://example.com/cover.jpg"
              keyboardType="url"
              autoCapitalize="none"
            />
            <Pressable
              accessibilityLabel="Upload album cover image"
              accessibilityRole="button"
              disabled={uploading}
              onPress={pickCoverImage}
              className="min-h-11 flex-row items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4"
            >
              {uploading ? <ActivityIndicator color={colors.primary} /> : null}
              <Text className="text-sm font-semibold text-[#116C0B]">
                {uploading ? 'Uploading...' : 'Choose cover image'}
              </Text>
            </Pressable>
            {draft.cover_image ? (
              <Image
                accessibilityLabel="Album cover preview"
                className="h-36 w-full rounded-xl bg-[#F3F4F6]"
                resizeMode="cover"
                source={{ uri: resolveImageUrl(draft.cover_image) }}
              />
            ) : null}
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#012711]">
                  Gallery photos ({draft.photos.length})
                </Text>
                <Pressable
                  accessibilityLabel="Add gallery photos"
                  accessibilityRole="button"
                  disabled={uploading}
                  onPress={pickAlbumPhotos}
                  className="rounded-lg bg-[#162420] px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-white">
                    {uploading ? 'Uploading...' : '＋ Add photos'}
                  </Text>
                </Pressable>
              </View>
              {draft.photos.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {draft.photos.map((photo, index) => (
                    <View key={`${photo}-${index}`} className="relative">
                      <Image
                        accessibilityLabel={`Gallery photo ${index + 1}`}
                        className="h-20 w-20 rounded-lg bg-[#F3F4F6]"
                        resizeMode="cover"
                        source={{ uri: resolveImageUrl(photo) }}
                      />
                      <Pressable
                        accessibilityLabel={`Remove gallery photo ${index + 1}`}
                        accessibilityRole="button"
                        onPress={() => removePhoto(photo)}
                        className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70"
                      >
                        <Text className="text-sm font-bold text-white">×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-xs text-[#6B7280]">
                  No photos added yet.
                </Text>
              )}
            </View>
          </ManagementFormSection>
          <ManagementFormSection number="3" title="Status and SEO">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">
                Album status
              </Text>
              <View className="flex-row gap-2">
                {(['Active', 'Inactive'] as const).map(status => (
                  <FilterButton
                    key={status}
                    label={status}
                    selected={draft.status === status}
                    onPress={() => updateDraft('status', status)}
                  />
                ))}
              </View>
            </View>
            <AlbumField
              label="Meta title"
              value={draft.meta_title}
              onChangeText={value => updateDraft('meta_title', value)}
              placeholder="Search result title"
            />
            <AlbumField
              label="Meta description"
              value={draft.meta_description}
              onChangeText={value => updateDraft('meta_description', value)}
              placeholder="Search result description"
              multiline
            />
          </ManagementFormSection>
          {error ? (
            <Text
              accessibilityRole="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </Text>
          ) : null}
        </View>
      </FormModal>

      <DetailsModal
        visible={selectedAlbum !== null}
        onClose={() => setSelectedAlbum(null)}
        title={selectedAlbum?.title || 'Album Details'}
        subtitle={
          selectedAlbum
            ? `${selectedAlbum.album_id} · ${
                selectedAlbum.category || 'Uncategorized'
              }`
            : undefined
        }
        badge={
          selectedAlbum
            ? {
                label: selectedAlbum.status,
                bg: selectedAlbum.status === 'Active' ? '#F0FDF4' : '#F3F4F6',
                text: selectedAlbum.status === 'Active' ? '#15803D' : '#6B7280',
                border:
                  selectedAlbum.status === 'Active' ? '#DCFCE7' : '#E5E7EB',
              }
            : undefined
        }
        footer={
          selectedAlbum ? (
            <Pressable
              accessibilityLabel={`Edit gallery album ${selectedAlbum.title}`}
              accessibilityRole="button"
              onPress={() => {
                const album = selectedAlbum;
                setSelectedAlbum(null);
                openEditForm(album);
              }}
              className="h-12 items-center justify-center rounded-xl bg-[#162420]"
            >
              <Text className="text-sm font-bold text-white">Edit album</Text>
            </Pressable>
          ) : null
        }
      >
        {selectedAlbum ? (
          <View className="gap-4">
            {selectedAlbum.cover_image ? (
              <Image
                accessibilityLabel="Album cover"
                className="h-48 w-full rounded-2xl bg-[#F3F4F6]"
                resizeMode="cover"
                source={{ uri: resolveImageUrl(selectedAlbum.cover_image) }}
              />
            ) : null}
            <Text className="text-sm leading-5 text-[#4B5563]">
              {selectedAlbum.description ||
                selectedAlbum.short_description ||
                'No album description.'}
            </Text>
            <View className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <Text className="text-xs text-[#6B7280]">
                {selectedAlbum.photo_count} photos
                {selectedAlbum.created_at
                  ? ` · Created on ${new Date(
                      selectedAlbum.created_at,
                    ).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
            {selectedAlbum.photos.length ? (
              <View className="flex-row flex-wrap gap-2">
                {selectedAlbum.photos.map((photo, index) => (
                  <Image
                    key={`${photo}-${index}`}
                    accessibilityLabel={`Album photo ${index + 1}`}
                    className="h-24 w-[31%] rounded-xl bg-[#F3F4F6]"
                    resizeMode="cover"
                    source={{ uri: resolveImageUrl(photo) }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </DetailsModal>

      <ConfirmDialog
        visible={albumToDelete !== null}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={confirmDeleteAlbum}
        title="Delete gallery album?"
        itemName={albumToDelete?.title || albumToDelete?.album_id}
        message="This album and its associated photo records will be permanently removed."
        confirmLabel="Delete Album"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}

function GalleryStat({ label, value }: { label: string; value: number }) {
  const theme =
    label === 'Total photos'
      ? { tint: '#9A3412', iconBackground: '#FED7AA' }
      : label === 'Active albums'
      ? { tint: '#1D4ED8', iconBackground: '#BFDBFE' }
      : label === 'Inactive albums'
      ? { tint: '#6D28D9', iconBackground: '#DDD6FE' }
      : { tint: '#166534', iconBackground: '#DCFCE7' };

  return (
    <AdminStatCard
      label={label}
      value={value}
      tint={theme.tint}
      iconBackground={theme.iconBackground}
      icon={<ImageIcon size={22} color={theme.tint} strokeWidth={2} />}
    />
  );
}

function AlbumStatusBadge({ status }: { status: AlbumStatus }) {
  const active = status === 'Active';
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
        {status}
      </Text>
    </View>
  );
}

function AlbumActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'view' | 'edit' | 'delete';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className={`h-9 w-9 items-center justify-center rounded-lg border ${
        tone === 'edit'
          ? 'border-[#DCFCE7] bg-[#F0FDF4]'
          : tone === 'delete'
          ? 'border-[#FECACA] bg-[#FEF2F2]'
          : 'border-[#E2E8F0] bg-white'
      }`}
    >
      {tone === 'edit' ? (
        <Edit3Icon size={15} color="#15803D" />
      ) : tone === 'delete' ? (
        <Trash2Icon size={15} color="#DC2626" />
      ) : (
        <Text className="text-sm font-bold text-[#475569]">•••</Text>
      )}
    </Pressable>
  );
}

function ManagementDropdown({
  label,
  selected,
  options,
  open,
  onOpen,
  onSelect,
}: {
  label: string;
  selected: string;
  options: { value: string; label: string }[];
  open: boolean;
  onOpen: () => void;
  onSelect: (value: string) => void;
}) {
  const selectedLabel =
    options.find(option => option.value === selected)?.label ??
    options[0]?.label;
  return (
    <View
      className="min-w-[90px] flex-1"
      style={{
        zIndex: open ? 30 : 1,
        elevation: open ? 30 : 0,
      }}
    >
      <Text className="mb-1 text-[10px] font-bold text-[#475569]">{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onOpen}
        className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-2.5"
      >
        <Text numberOfLines={1} className="flex-1 text-xs text-[#334155]">
          {selectedLabel}
        </Text>
        <Text className="ml-1 text-xs text-[#64748B]">{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? (
        <View
          className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
          style={{ zIndex: 40, elevation: 40 }}
        >
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === selected }}
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

function FilterButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        selected ? 'border-[#162420] bg-[#162420]' : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          selected ? 'text-white' : 'text-[#4B5563]'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AlbumField({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-[#012711]">{label}</Text>
      <TextInput
        {...props}
        className={`rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#012711] ${
          props.multiline ? 'min-h-24' : 'min-h-12'
        }`}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

function ManagementFormSection({
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

export default GalleryManagementPage;
