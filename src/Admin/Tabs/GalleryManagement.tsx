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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import {
  ConfirmDialog,
  DetailsModal,
  FormModal,
} from '../../components/popups';

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
      typeof value.short_description === 'string' ? value.short_description : '',
    description: typeof value.description === 'string' ? value.description : '',
    meta_title: typeof value.meta_title === 'string' ? value.meta_title : '',
    meta_description:
      typeof value.meta_description === 'string' ? value.meta_description : '',
    photo_count: Number(value.photo_count) || parsedPhotos.length,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [draft, setDraft] = useState<AlbumDraft>(emptyDraft);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    () => [...new Set([...galleryCategories, ...albums.map(album => album.category).filter(Boolean)])],
    [albums],
  );

  const filteredAlbums = useMemo(
    () =>
      albums.filter(album => {
        const matchesSearch = album.title
          .toLowerCase()
          .includes(search.trim().toLowerCase());
        const matchesCategory =
          categoryFilter === 'All Categories' || album.category === categoryFilter;
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
      setNotice(editingAlbumId ? 'Gallery album updated.' : 'Gallery album created.');
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
            onRefresh={() => { void loadAlbums(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerClassName="mx-auto w-full max-w-[1100px] gap-5 px-5 pb-8 pt-6"
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
                <Text className="text-sm font-semibold text-[#116C0B]">‹ More</Text>
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
          <Pressable
            accessibilityLabel="Add gallery album"
            accessibilityRole="button"
            onPress={openCreateForm}
            className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#162420] px-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
          >
            <Text className="text-sm font-bold text-white">＋ Add Album</Text>
          </Pressable>
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

        <View className="flex-row flex-wrap gap-3">
          <GalleryStat label="Total albums" value={albums.length} />
          <GalleryStat label="Total photos" value={totalPhotos} />
          <GalleryStat label="Active albums" value={activeAlbums} />
          <GalleryStat label="Inactive albums" value={inactiveAlbums} />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <TextInput
            accessibilityLabel="Search gallery albums"
            className="min-h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm text-[#012711]"
            onChangeText={setSearch}
            placeholder="Search albums..."
            placeholderTextColor={colors.textSecondary}
            value={search}
          />
          <View className="gap-3">
            <View className="gap-2">
              <Text className="text-xs font-semibold text-[#6B7280]">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                <FilterButton
                  label="All Categories"
                  selected={categoryFilter === 'All Categories'}
                  onPress={() => setCategoryFilter('All Categories')}
                />
                {categories.map(category => (
                  <FilterButton
                    key={category}
                    label={category}
                    selected={categoryFilter === category}
                    onPress={() => setCategoryFilter(category)}
                  />
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-semibold text-[#6B7280]">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['All Status', 'Active', 'Inactive'] as const).map(status => (
                  <FilterButton
                    key={status}
                    label={status}
                    selected={statusFilter === status}
                    onPress={() => setStatusFilter(status)}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#6B7280]">Loading albums...</Text>
          </View>
        ) : filteredAlbums.length ? (
          <View className="gap-3">
            {filteredAlbums.map((album, index) => (
              <View
                key={album.album_id}
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              >
                {album.cover_image ? (
                  <Image
                    accessibilityLabel={`${album.title} cover image`}
                    className="h-44 w-full bg-[#F3F4F6]"
                    resizeMode="cover"
                    source={{ uri: resolveImageUrl(album.cover_image) }}
                  />
                ) : (
                  <View className="h-36 items-center justify-center bg-[#F3F4F6]">
                    <Text className="text-sm text-[#6B7280]">No cover image</Text>
                  </View>
                )}
                <View className="gap-3 p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-[#1f1d1b]">
                        {album.title}
                      </Text>
                      <Text className="mt-1 text-xs text-[#7a7a7a]">
                        {album.album_id}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        album.status === 'Active' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          album.status === 'Active' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {album.status}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} className="text-sm leading-5 text-[#5f5f5f]">
                    {album.short_description || 'No description available.'}
                  </Text>
                  <View className="flex-row items-center justify-between border-t border-[#f0ebe6] pt-3">
                    <Text className="text-xs text-[#6a6a6a]">
                      {album.category || 'Uncategorized'}
                    </Text>
                    <Text className="text-xs text-[#6a6a6a]">
                      {album.photo_count || album.photos.length} photos
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityLabel={`View gallery album ${album.title}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedAlbum(album)}
                      className="min-h-10 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white"
                    >
                      <Text className="text-sm font-semibold text-[#374151]">View</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Edit gallery album ${album.title}`}
                      accessibilityRole="button"
                      onPress={() => openEditForm(album)}
                      className="min-h-10 flex-1 items-center justify-center rounded-xl bg-[#162420]"
                    >
                      <Text className="text-sm font-semibold text-white">Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete gallery album ${album.title}`}
                      accessibilityRole="button"
                      onPress={() => deleteAlbum(album)}
                      className="min-h-10 flex-1 items-center justify-center rounded-xl border border-red-200 bg-white"
                    >
                      <Text className="text-sm font-semibold text-red-700">Delete</Text>
                    </Pressable>
                  </View>
                  <Text className="text-right text-[10px] text-[#9CA3AF]">
                    Album {index + 1}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
                <Text className="text-sm font-bold text-white">Create your first album</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      <FormModal
        visible={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAlbumId ? 'Edit Gallery Album' : 'Add Gallery Album'}
        subtitle="Manage album details, cover photo, and photo gallery"
        onSave={saveAlbum}
        saveLabel={editingAlbumId ? 'Save Changes' : 'Create Album'}
        cancelLabel="Cancel"
        isSaving={isSaving}
        isSaveDisabled={isSaving || uploading}
        errorMessage={error}
      >
        <View className="gap-4">
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
                <Text className="text-sm font-semibold text-[#012711]">Suggested categories</Text>
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
                  <Text className="text-xs text-[#6B7280]">No photos added yet.</Text>
                )}
              </View>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-[#012711]">Album status</Text>
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
            ? `${selectedAlbum.album_id} · ${selectedAlbum.category || 'Uncategorized'}`
            : undefined
        }
        badge={
          selectedAlbum
            ? {
                label: selectedAlbum.status,
                bg: selectedAlbum.status === 'Active' ? '#F0FDF4' : '#F3F4F6',
                text: selectedAlbum.status === 'Active' ? '#15803D' : '#6B7280',
                border: selectedAlbum.status === 'Active' ? '#DCFCE7' : '#E5E7EB',
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
                  ? ` · Created on ${new Date(selectedAlbum.created_at).toLocaleDateString()}`
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
  return (
    <View className="min-w-[46%] flex-1 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
        {label}
      </Text>
      <Text className="mt-2 text-2xl font-bold text-[#012711]">{value}</Text>
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
      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-[#4B5563]'}`}>
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

export default GalleryManagementPage;
