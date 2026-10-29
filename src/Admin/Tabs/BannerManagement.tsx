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
import { ConfirmDialog, FormModal } from '../../components/popups';

type BannerType = 'hero' | 'offer';
type BannerFilter = 'all' | BannerType;
type StatusFilter = 'all' | 'active' | 'draft';

type Banner = {
  id: string | number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  mobile_image: string;
  link: string;
  type: BannerType;
  active: boolean;
};

type BannerDraft = Omit<Banner, 'id'>;

const emptyDraft: BannerDraft = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  mobile_image: '',
  link: '',
  type: 'hero',
  active: true,
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Something went wrong. Please try again.';
}

function toBanner(value: Record<string, unknown>): Banner {
  return {
    id: String(value.id ?? ''),
    title: typeof value.title === 'string' ? value.title : '',
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
    description: typeof value.description === 'string' ? value.description : '',
    image: typeof value.image === 'string' ? value.image : '',
    mobile_image: typeof value.mobile_image === 'string' ? value.mobile_image : '',
    link: typeof value.link === 'string' ? value.link : '',
    type: value.type === 'offer' ? 'offer' : 'hero',
    active: value.active === true || value.active === 1 || value.active === '1',
  };
}

function BannerManagementPage({
  onBack,
  showBackButton = true,
}: {
  onBack: () => void;
  showBackButton?: boolean;
}) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'image' | 'mobile_image' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<BannerFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [draft, setDraft] = useState<BannerDraft>(emptyDraft);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBanners = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/banners');
      const rows = response.data?.data;
      const records = Array.isArray(rows)
        ? rows
        : Array.isArray(response.data)
          ? response.data
          : [];
      setBanners(records.map((row: Record<string, unknown>) => toBanner(row)));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const filteredBanners = useMemo(
    () =>
      banners.filter(banner => {
        const matchesSearch = banner.title
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());
        const matchesType = typeFilter === 'all' || banner.type === typeFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' ? banner.active : !banner.active);
        return matchesSearch && matchesType && matchesStatus;
      }),
    [banners, searchTerm, statusFilter, typeFilter],
  );

  const openCreateForm = () => {
    setEditingBanner(null);
    setDraft({ ...emptyDraft });
    setError('');
    setNotice('');
    setIsFormOpen(true);
  };

  const openEditForm = (banner: Banner) => {
    setEditingBanner(banner);
    setDraft({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      image: banner.image,
      mobile_image: banner.mobile_image,
      link: banner.link,
      type: banner.type,
      active: banner.active,
    });
    setError('');
    setNotice('');
    setIsFormOpen(true);
  };

  const updateDraft = <Key extends keyof BannerDraft>(
    key: Key,
    value: BannerDraft[Key],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const saveBanner = async () => {
    if (!draft.image.trim()) {
      setError('A desktop banner image URL is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        description: draft.description.trim(),
        image: draft.image.trim(),
        mobile_image: draft.mobile_image.trim(),
        link: draft.link.trim(),
      };
      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, payload);
      } else {
        await api.post('/banners', payload);
      }
      await loadBanners();
      setIsFormOpen(false);
      setNotice(editingBanner ? 'Banner updated successfully.' : 'Banner added successfully.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const pickAndUploadImage = async (field: 'image' | 'mobile_image') => {
    setError('');
    setUploadingField(field);
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
        throw new Error('The selected image could not be opened.');
      }

      const formData = new FormData();
      formData.append('folder', 'banners');
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `banner-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = response.data?.url || response.data?.urls?.[0];
      if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
        throw new Error('The upload completed but no image URL was returned.');
      }
      updateDraft(field, imageUrl);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploadingField(null);
    }
  };

  const deleteBanner = (banner: Banner) => {
    setBannerToDelete(banner);
  };

  const confirmDeleteBanner = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/banners/${bannerToDelete.id}`);
      setBanners(current =>
        current.filter(item => String(item.id) !== String(bannerToDelete.id)),
      );
      setNotice('Banner deleted successfully.');
      setBannerToDelete(null);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  const totalOffers = banners.filter(banner => banner.type === 'offer').length;
  const totalHero = banners.filter(banner => banner.type === 'hero').length;
  const totalActive = banners.filter(banner => banner.active).length;

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { void loadBanners(); }}
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
              Banner Management
            </Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
              Create, edit, and publish your website banners.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add banner"
            accessibilityRole="button"
            onPress={openCreateForm}
            className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
          >
            <Text className="text-sm font-bold text-white">＋ Add</Text>
          </Pressable>
        </View>

        {error ? (
          <Text accessibilityRole="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          <BannerStat label="Total banners" value={banners.length} />
          <BannerStat label="Offer banners" value={totalOffers} />
          <BannerStat label="Hero banners" value={totalHero} />
          <BannerStat label="Published" value={totalActive} />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <TextInput
            accessibilityLabel="Search banners"
            className="min-h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm text-[#012711]"
            onChangeText={setSearchTerm}
            placeholder="Search banners by title..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
          />
          <View className="gap-3">
            <FilterGroup<BannerFilter>
              label="Type"
              options={[
                { value: 'all', label: 'All types' },
                { value: 'hero', label: 'Hero' },
                { value: 'offer', label: 'Offers' },
              ]}
              selected={typeFilter}
              onSelect={setTypeFilter}
            />
            <FilterGroup<StatusFilter>
              label="Status"
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Published' },
                { value: 'draft', label: 'Drafts' },
              ]}
              selected={statusFilter}
              onSelect={setStatusFilter}
            />
          </View>
        </View>

        {isLoading ? (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#6B7280]">Loading banners...</Text>
          </View>
        ) : filteredBanners.length ? (
          <View className="gap-3">
            {filteredBanners.map((banner, index) => (
              <View
                key={String(banner.id)}
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              >
                {banner.image ? (
                  <Image
                    accessibilityLabel={`${banner.title || 'Banner'} image`}
                    className="h-40 w-full bg-[#F3F4F6]"
                    resizeMode="cover"
                    source={{ uri: resolveBannerImageUrl(banner.image) }}
                  />
                ) : (
                  <View className="h-32 items-center justify-center bg-[#F3F4F6]">
                    <Text className="text-sm text-[#6B7280]">No banner image</Text>
                  </View>
                )}
                <View className="gap-3 p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-[#012711]">
                        {banner.title || 'Untitled banner'}
                      </Text>
                      {banner.subtitle ? (
                        <Text className="mt-1 text-sm text-[#6B7280]">{banner.subtitle}</Text>
                      ) : null}
                    </View>
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: banner.active
                          ? colors.surfaceSecondary
                          : colors.background,
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold uppercase"
                        style={{
                          color: banner.active
                            ? colors.primary
                            : colors.textSecondary,
                        }}
                      >
                        {banner.active ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        color: colors.primary,
                      }}
                    >
                      {banner.type} section
                    </Text>
                    <Text className="text-xs text-[#6B7280]">No. {index + 1}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityLabel={`Edit banner ${banner.title || index + 1}`}
                      accessibilityRole="button"
                      onPress={() => openEditForm(banner)}
                      className="min-h-11 flex-1 items-center justify-center rounded-xl bg-[#116C0B]"
                    >
                      <Text className="text-sm font-bold text-white">Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete banner ${banner.title || index + 1}`}
                      accessibilityRole="button"
                      onPress={() => deleteBanner(banner)}
                      className="min-h-11 flex-1 items-center justify-center rounded-xl border border-red-200 bg-white"
                    >
                      <Text className="text-sm font-bold text-red-700">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white px-5 py-10">
            <Text className="text-base font-semibold text-[#012711]">
              {banners.length ? 'No matching banners' : 'No banners yet'}
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#6B7280]">
              {banners.length
                ? 'Try changing your search or filters.'
                : 'Add a banner to publish promotional content on your website.'}
            </Text>
            {!banners.length ? (
              <Pressable onPress={openCreateForm} className="mt-4 rounded-xl bg-[#116C0B] px-4 py-3">
                <Text className="text-sm font-bold text-white">Create your first banner</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {!isLoading && error ? (
          <Pressable
            accessibilityLabel="Retry loading banners"
            accessibilityRole="button"
            onPress={loadBanners}
            className="items-center py-2"
          >
            <Text className="text-sm font-semibold text-[#116C0B]">Try again</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <FormModal
        visible={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'New Banner'}
        subtitle="Configure banner display, promotional links, and visual assets"
        onSave={saveBanner}
        saveLabel={editingBanner ? 'Save Changes' : 'Create Banner'}
        cancelLabel="Cancel"
        isSaving={isSaving}
        isSaveDisabled={isSaving || uploadingField !== null}
        errorMessage={error}
      >
        <View className="gap-4">
              <BannerField
                label="Title"
                value={draft.title}
                onChangeText={value => updateDraft('title', value)}
                placeholder="Banner title"
              />
              <BannerField
                label="Subtitle"
                value={draft.subtitle}
                onChangeText={value => updateDraft('subtitle', value)}
                placeholder="Short supporting text"
              />
              <BannerField
                label="Description"
                value={draft.description}
                onChangeText={value => updateDraft('description', value)}
                placeholder="Banner details"
                multiline
              />
              <BannerField
                label="Desktop image URL"
                value={draft.image}
                onChangeText={value => updateDraft('image', value)}
                placeholder="https://example.com/banner.jpg"
                keyboardType="url"
                autoCapitalize="none"
              />
              <Pressable
                accessibilityLabel="Upload desktop banner image"
                accessibilityRole="button"
                disabled={uploadingField !== null}
                onPress={() => pickAndUploadImage('image')}
                className="min-h-11 flex-row items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4"
              >
                {uploadingField === 'image' ? <ActivityIndicator color={colors.primary} /> : null}
                <Text className="text-sm font-semibold text-[#116C0B]">
                  {uploadingField === 'image' ? 'Uploading image...' : 'Choose desktop image'}
                </Text>
              </Pressable>
              {draft.image ? (
                <Image
                  accessibilityLabel="Desktop banner preview"
                  className="h-36 w-full rounded-xl bg-[#F3F4F6]"
                  resizeMode="cover"
                  source={{ uri: resolveBannerImageUrl(draft.image) }}
                />
              ) : null}
              <BannerField
                label="Mobile image URL (optional)"
                value={draft.mobile_image}
                onChangeText={value => updateDraft('mobile_image', value)}
                placeholder="https://example.com/mobile-banner.jpg"
                keyboardType="url"
                autoCapitalize="none"
              />
              <Pressable
                accessibilityLabel="Upload mobile banner image"
                accessibilityRole="button"
                disabled={uploadingField !== null}
                onPress={() => pickAndUploadImage('mobile_image')}
                className="min-h-11 flex-row items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4"
              >
                {uploadingField === 'mobile_image' ? <ActivityIndicator color={colors.primary} /> : null}
                <Text className="text-sm font-semibold text-[#116C0B]">
                  {uploadingField === 'mobile_image' ? 'Uploading image...' : 'Choose mobile image'}
                </Text>
              </Pressable>
              <BannerField
                label="Link"
                value={draft.link}
                onChangeText={value => updateDraft('link', value)}
                placeholder="https://example.com/promotion"
                keyboardType="url"
                autoCapitalize="none"
              />

              <View>
                <Text className="mb-2 text-sm font-semibold text-[#012711]">Banner type</Text>
                <FilterGroup<BannerType>
                  options={[
                    { value: 'hero', label: 'Hero' },
                    { value: 'offer', label: 'Offer' },
                  ]}
                  selected={draft.type}
                  onSelect={value => updateDraft('type', value)}
                />
              </View>
              <Pressable
                accessibilityLabel={draft.active ? 'Set banner as draft' : 'Publish banner'}
                accessibilityRole="switch"
                accessibilityState={{ checked: draft.active }}
                onPress={() => updateDraft('active', !draft.active)}
                className="min-h-12 flex-row items-center justify-center rounded-xl border"
                style={{
                  borderColor: draft.active ? colors.borderLight : colors.border,
                  backgroundColor: draft.active
                    ? colors.surfaceSecondary
                    : colors.background,
                }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{
                    color: draft.active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {draft.active ? 'Published on website' : 'Saved as draft'}
                </Text>
              </Pressable>
        </View>
      </FormModal>

      <ConfirmDialog
        visible={bannerToDelete !== null}
        onClose={() => setBannerToDelete(null)}
        onConfirm={confirmDeleteBanner}
        title="Delete banner?"
        itemName={bannerToDelete?.title || 'Untitled banner'}
        message="This banner will be permanently removed from your website promotions."
        confirmLabel="Delete Banner"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}

function resolveBannerImageUrl(url: string) {
  if (!url || /^(https?:|data:|file:|content:)/i.test(url)) {
    return url;
  }
  const backendUrl = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${backendUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function BannerStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
        {label}
      </Text>
      <Text className="mt-2 text-2xl font-bold text-[#012711]">{value}</Text>
    </View>
  );
}

function FilterGroup<Value extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label?: string;
  options: { value: Value; label: string }[];
  selected: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-xs font-semibold text-[#6B7280]">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              accessibilityLabel={label ? `Filter ${label.toLowerCase()} by ${option.label}` : option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              className={`rounded-full border px-3 py-2 ${
                isSelected
                  ? 'border-[#116C0B] bg-[#116C0B]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#4B5563]'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BannerField({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url';
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

export default BannerManagementPage;
