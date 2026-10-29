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
  Edit3Icon,
  FormModal,
  GiftIcon,
  ImageIcon,
  MegaphoneIcon,
  MonitorIcon,
  Trash2Icon,
} from '../../components/popups';
import AdminManagementCard from '../../components/AdminManagementCard';
import { PlusIcon, ProductIcon, SearchIcon } from '../Navigation/NavigationIcons';

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
  const [openFilter, setOpenFilter] = useState<'type' | 'status' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [draft, setDraft] = useState<BannerDraft>(emptyDraft);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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
    if (!draft.title.trim()) {
      setError('Banner title is required.');
      return;
    }
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
  const totalPublished = banners.filter(banner => banner.active).length;
  return (
    <View className="relative flex-1">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { void loadBanners(); }}
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
                <Text className="text-sm font-semibold text-[#116C0B]">‹ More</Text>
              </Pressable>
            ) : null}
            <Text className="mt-1 text-2xl font-bold text-[#012711]">
              Banner Management
            </Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
              Create, edit, and publish your website banners.
            </Text>
          </View>
          {isWide ? (
            <Pressable
              accessibilityLabel="Add banner"
              accessibilityRole="button"
              onPress={openCreateForm}
              className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <PlusIcon color="#FFFFFF" size={18} />
              <Text className="ml-1.5 text-sm font-bold text-white">Add banner</Text>
            </Pressable>
          ) : null}
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

        <View className="flex-row flex-wrap justify-between gap-y-3">
          <BannerStat
            cardBackground="#F0FDF4"
            iconBackground="#DCFCE7"
            label="TOTAL"
            tint="#166534"
            value={banners.length}
            decorColor="#DCFCE7"
            iconName="image"
          />
          <BannerStat
            cardBackground="#FFF7ED"
            iconBackground="#FED7AA"
            label="OFFER"
            tint="#9A3412"
            value={totalOffers}
            decorColor="#FED7AA"
            iconName="gift"
          />
          <BannerStat
            cardBackground="#EFF6FF"
            iconBackground="#BFDBFE"
            label="HERO"
            tint="#1D4ED8"
            value={totalHero}
            decorColor="#BFDBFE"
            iconName="monitor"
          />
          <BannerStat
            cardBackground="#F5F3FF"
            iconBackground="#DDD6FE"
            label="PUBLISHED"
            tint="#6D28D9"
            value={totalPublished}
            decorColor="#DDD6FE"
            iconName="megaphone"
          />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search banners"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearchTerm}
                placeholder="Search banners by title..."
                placeholderTextColor={colors.textSecondary}
                value={searchTerm}
              />
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-1 flex-row gap-2">
                <BannerFilterDropdown<BannerFilter>
                  label="Type"
                  onOpen={() =>
                    setOpenFilter(current => current === 'type' ? null : 'type')
                  }
                  onSelect={value => {
                    setTypeFilter(value);
                    setOpenFilter(null);
                  }}
                  open={openFilter === 'type'}
                  options={[
                    { value: 'all', label: 'All types' },
                    { value: 'hero', label: 'Hero' },
                    { value: 'offer', label: 'Offer' },
                  ]}
                  selected={typeFilter}
                />
                <BannerFilterDropdown<StatusFilter>
                  label="Status"
                  onOpen={() =>
                    setOpenFilter(current => current === 'status' ? null : 'status')
                  }
                  onSelect={value => {
                    setStatusFilter(value);
                    setOpenFilter(null);
                  }}
                  open={openFilter === 'status'}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                  selected={statusFilter}
                />
              </View>
              <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                {(['grid', 'list'] as const).map(mode => {
                  const selected = viewMode === mode;
                  return (
                    <Pressable
                      accessibilityLabel={`Show banners as ${mode}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={mode}
                      onPress={() => setViewMode(mode)}
                      className={`h-9 w-9 items-center justify-center rounded-md ${selected ? 'bg-[#116C0B]' : 'bg-[#F3F4F6]'
                        }`}
                    >
                      <Text className={`text-base font-bold ${selected ? 'text-white' : 'text-[#64748B]'}`}>
                        {mode === 'grid' ? '▦' : '☷'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#6B7280]">Loading banners...</Text>
          </View>
        ) : filteredBanners.length ? (
          viewMode === 'list' ? (
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
                style={{ width: isWide ? '100%' : 680 }}
              >
                <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                  <Text className="w-12 text-xs font-bold text-[#64748B]">#</Text>
                  <Text className="w-20 text-xs font-bold text-[#64748B]">Image</Text>
                  <Text className="flex-1 text-xs font-bold text-[#64748B]">Title</Text>
                  <Text className="w-24 text-xs font-bold text-[#64748B]">Type</Text>
                  <Text className="w-28 text-xs font-bold text-[#64748B]">Status</Text>
                  <Text className="w-20 text-xs font-bold text-[#64748B]">Actions</Text>
                </View>
                {filteredBanners.map((banner, index) => (
                  <View
                    key={String(banner.id)}
                    className={`min-h-[58px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2 ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'
                      }`}
                  >
                    <Text className="w-12 text-xs text-[#64748B]">{index + 1}</Text>
                    <View className="w-20 pr-3">
                      <BannerImage banner={banner} className="h-9 w-16 rounded-md" />
                    </View>
                    <Text className="flex-1 pr-3 text-xs font-semibold text-[#334155]" numberOfLines={1}>
                      {banner.title || 'Untitled banner'}
                    </Text>
                    <View className="w-24">
                      <BannerTypeBadge type={banner.type} />
                    </View>
                    <View className="w-28">
                      <BannerStatusBadge active={banner.active} />
                    </View>
                    <View className="w-20 flex-row gap-2">
                      <BannerActionButton
                        label={`Edit banner ${banner.title || index + 1}`}
                        onPress={() => openEditForm(banner)}
                        tone="edit"
                      />
                      <BannerActionButton
                        label={`Delete banner ${banner.title || index + 1}`}
                        onPress={() => deleteBanner(banner)}
                        tone="delete"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {filteredBanners.map((banner, index) => (
                <AdminManagementCard
                  key={String(banner.id)}
                  isWide={isWide}
                >
                  <View className="relative">
                    <BannerImage
                      banner={banner}
                      className={isWide ? 'h-80 w-full' : 'h-40 w-full'}
                    />
                    <View className="absolute left-3 top-3">
                      <BannerStatusBadge active={banner.active} />
                    </View>
                    <View className="absolute bottom-3 left-3">
                      <BannerTypeBadge type={banner.type} />
                    </View>
                  </View>
                  <View className="gap-2 p-2.5">
                    <Text
                      className={isWide ? 'text-sm font-bold text-[#012711]' : 'text-[11px] font-bold text-[#012711]'}
                      numberOfLines={1}
                    >
                      {banner.title || 'Untitled banner'}
                    </Text>
                    {(banner.subtitle || banner.description) ? (
                      <Text
                        className={isWide ? 'text-xs leading-[17px] text-[#6B7280]' : 'text-[9px] leading-3 text-[#6B7280]'}
                        numberOfLines={2}
                      >
                        {banner.subtitle || banner.description}
                      </Text>
                    ) : null}
                    <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-2">
                      <Text className="text-[9px] text-[#6B7280]">
                        Banner {index + 1}
                      </Text>
                      <View className="flex-row gap-2">
                        <BannerActionButton
                          label={`Edit banner ${banner.title || index + 1}`}
                          onPress={() => openEditForm(banner)}
                          tone="edit"
                        />
                        <BannerActionButton
                          label={`Delete banner ${banner.title || index + 1}`}
                          onPress={() => deleteBanner(banner)}
                          tone="delete"
                        />
                      </View>
                    </View>
                  </View>
                </AdminManagementCard>
              ))}
            </View>
          )
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
            {!banners.length && isWide ? (
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

      {!isWide && !isFormOpen ? (
        <Pressable
          accessibilityLabel="Add banner"
          accessibilityRole="button"
          onPress={openCreateForm}
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B]"
          style={{
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
        onClose={() => setIsFormOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'Add New Banner'}
        subtitle="Create a new banner for your website"
        cancelLabel=""
        isSaving={isSaving}
        errorMessage={error}
        footerExtra={
          <View className="flex-row gap-3">
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => setIsFormOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
              style={{ opacity: isSaving ? 0.55 : 1 }}
            >
              <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={editingBanner ? 'Save Changes' : 'Create Banner'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving || uploadingField !== null }}
              disabled={isSaving || uploadingField !== null}
              onPress={saveBanner}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
              style={{ opacity: isSaving || uploadingField !== null ? 0.55 : 1 }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </Text>
              )}
            </Pressable>
          </View>
        }
        maxWidth={520}
        maxHeightPercent={94}
        contentContainerStyle={{ gap: 12, padding: 14 }}
      >
        <View className="gap-3">
          <BannerFormSection number="1" title="Basic Information">
            <BannerField
              label="Title *"
              value={draft.title}
              onChangeText={value => updateDraft('title', value)}
              placeholder="Enter banner title"
            />
            <BannerField
              label="Subtitle"
              value={draft.subtitle}
              onChangeText={value => updateDraft('subtitle', value)}
              placeholder="Enter short subtitle (optional)"
            />
            <BannerField
              label="Description"
              value={draft.description}
              onChangeText={value => updateDraft('description', value)}
              placeholder="Enter banner description (optional)"
              multiline
            />
            <BannerField
              label="Link URL"
              value={draft.link}
              onChangeText={value => updateDraft('link', value)}
              placeholder="https://example.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </BannerFormSection>

          <BannerFormSection number="2" title="Banner Images">
            <BannerImageField
              label="Desktop image"
              required
              value={draft.image}
              isUploading={uploadingField === 'image'}
              disabled={uploadingField !== null}
              onChange={value => updateDraft('image', value)}
              onChoose={() => void pickAndUploadImage('image')}
              onRemove={() => updateDraft('image', '')}
            />
            <BannerImageField
              label="Mobile image"
              value={draft.mobile_image}
              isUploading={uploadingField === 'mobile_image'}
              disabled={uploadingField !== null}
              onChange={value => updateDraft('mobile_image', value)}
              onChoose={() => void pickAndUploadImage('mobile_image')}
              onRemove={() => updateDraft('mobile_image', '')}
            />
          </BannerFormSection>

          <BannerFormSection number="3" title="Banner Settings">
            <View className="gap-2">
              <Text className="text-xs font-bold text-[#334155]">Banner type</Text>
              <View className="flex-row gap-2">
                {([
                  { value: 'hero', title: 'Hero banner', subtitle: 'Main home page', icon: '▣' },
                  { value: 'offer', title: 'Offer banner', subtitle: 'Promotions', icon: '✳' },
                ] as const).map(option => {
                  const selected = draft.type === option.value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => updateDraft('type', option.value)}
                      className="min-h-[58px] flex-1 flex-row items-center gap-2 rounded-xl border px-2.5"
                      style={{
                        borderColor: selected ? colors.primary : '#E2E8F0',
                        backgroundColor: selected ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <Text
                        className="text-base font-bold"
                        style={{
                          color: option.value === 'offer' ? '#EA580C' : colors.primary,
                        }}
                      >
                        {option.icon}
                      </Text>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[11px] font-bold text-[#1E293B]" numberOfLines={1}>
                          {option.title}
                        </Text>
                        <Text className="text-[9px] text-[#64748B]" numberOfLines={1}>
                          {option.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              accessibilityLabel={draft.active ? 'Set banner as draft' : 'Publish banner'}
              accessibilityRole="switch"
              accessibilityState={{ checked: draft.active }}
              onPress={() => updateDraft('active', !draft.active)}
              className="min-h-[58px] flex-row items-center gap-3 rounded-xl border px-3"
              style={{
                borderColor: draft.active ? '#BBF7D0' : '#E2E8F0',
                backgroundColor: draft.active ? '#F0FDF4' : '#F8FAFC',
              }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Text className="text-base">{draft.active ? '✓' : '○'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#1E293B]">
                  {draft.active ? 'Published on website' : 'Saved as draft'}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#64748B]">
                  {draft.active ? 'Visible to your customers' : 'Not visible to customers'}
                </Text>
              </View>
              <View
                className="h-6 w-11 justify-center rounded-full px-0.5"
                style={{ backgroundColor: draft.active ? colors.primary : '#CBD5E1' }}
              >
                <View
                  className={`h-5 w-5 rounded-full bg-white ${draft.active ? 'self-end' : 'self-start'
                    }`}
                />
              </View>
            </Pressable>
          </BannerFormSection>
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
    </View>
  );
}

function resolveBannerImageUrl(url: string) {
  if (!url || /^(https?:|data:|file:|content:)/i.test(url)) {
    return url;
  }
  const backendUrl = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${backendUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function BannerImage({
  banner,
  className,
}: {
  banner: Banner;
  className: string;
}) {
  return banner.image ? (
    <Image
      accessibilityLabel={`${banner.title || 'Banner'} image`}
      className={`${className} bg-[#F3F4F6]`}
      resizeMode="cover"
      source={{ uri: resolveBannerImageUrl(banner.image) }}
    />
  ) : (
    <View className={`${className} items-center justify-center bg-[#F3F4F6]`}>
      <Text className="text-xs text-[#6B7280]">No banner image</Text>
    </View>
  );
}

function BannerFormSection({
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
          <Text className="text-[11px] font-extrabold text-white">{number}</Text>
        </View>
        <Text className="text-sm font-extrabold text-[#0F172A]">{title}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function BannerImageField({
  label,
  required = false,
  value,
  isUploading,
  disabled,
  onChange,
  onChoose,
  onRemove,
}: {
  label: string;
  required?: boolean;
  value: string;
  isUploading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-bold text-[#334155]">
        {label}{required ? ' *' : ' (optional)'}
      </Text>
      <View className="min-h-14 flex-row items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#DCFCE7]">
          <ProductIcon color="#15803D" size={19} />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-semibold text-[#334155]">
            {isUploading ? 'Uploading image...' : 'Tap to choose image'}
          </Text>
          <Text className="mt-0.5 text-[9px] text-[#64748B]">
            JPG, PNG, WEBP · max 5 MB
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Choose ${label.toLowerCase()}`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onChoose}
          className="min-h-9 min-w-[64px] items-center justify-center rounded-lg bg-[#DCFCE7] px-3"
        >
          {isUploading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text className="text-[11px] font-bold text-[#15803D]">Choose</Text>
          )}
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel={`${label} URL`}
        autoCapitalize="none"
        className="min-h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A]"
        keyboardType="url"
        onChangeText={onChange}
        placeholder="Or paste an image URL"
        placeholderTextColor="#94A3B8"
        value={value}
      />
      {value ? (
        <View className="relative">
          <Image
            accessibilityLabel={`${label} preview`}
            className="h-24 w-full rounded-xl bg-[#F3F4F6]"
            resizeMode="cover"
            source={{ uri: resolveBannerImageUrl(value) }}
          />
          <Pressable
            accessibilityLabel={`Remove ${label.toLowerCase()} image`}
            accessibilityRole="button"
            onPress={onRemove}
            className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white"
            style={{ elevation: 3 }}
          >
            <Text className="text-sm font-bold text-[#475569]">×</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function BannerStatusBadge({ active }: { active: boolean }) {
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
        {active ? 'Published' : 'Draft'}
      </Text>
    </View>
  );
}

function BannerTypeBadge({ type }: { type: BannerType }) {
  const isOffer = type === 'offer';
  return (
    <Text
      className="self-start rounded-full px-2 py-1 text-[9px] font-extrabold uppercase"
      style={{
        backgroundColor: isOffer ? '#FFF7ED' : '#ECFDF5',
        color: isOffer ? '#EA580C' : '#15803D',
      }}
    >
      {type}
    </Text>
  );
}

function BannerActionButton({
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
      className="h-9 w-9 items-center justify-center rounded-lg border"
      style={{
        backgroundColor: isEdit ? '#F0FDF4' : '#FEF2F2',
        borderColor: isEdit ? '#DCFCE7' : '#FECACA',
      }}
    >
      {isEdit ? (
        <Edit3Icon size={16} color="#15803D" />
      ) : (
        <Trash2Icon size={16} color="#DC2626" />
      )}
    </Pressable>
  );
}

function BannerFilterDropdown<Value extends string>({
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
    options.find(option => option.value === selected)?.label ?? options[0]?.label;
  return (
    <View className="min-w-[76px] flex-1" style={{ zIndex: open ? 10 : 1 }}>
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
        <View
          className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
          style={{ elevation: 8 }}
        >
          {options.map(option => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === selected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${option.value === selected ? 'bg-[#F0FDF4]' : ''
                }`}
            >
              <Text
                className={`text-xs ${option.value === selected
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

function BannerStat({
  cardBackground,
  iconBackground,
  label,
  tint,
  value,
  decorColor,
  iconName,
}: {
  cardBackground: string;
  iconBackground: string;
  label: string;
  tint: string;
  value: number;
  decorColor: string;
  iconName: string;
}) {
  const iconSize = 22;
  return (
    <View
      style={{
        width: "48%",
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 18,
        gap: 14,
        overflow: "hidden",
        minHeight: 90,

        // Slight, soft shadow
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,

        // Subtle border
        borderWidth: 1,
        borderColor: "#F1F5F9",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
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
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: iconBackground,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {iconName === "image" ? (
          <ImageIcon size={iconSize} color={tint} strokeWidth={2} />
        ) : iconName === "gift" ? (
          <GiftIcon size={iconSize} color={tint} strokeWidth={2} />
        ) : iconName === "monitor" ? (
          <MonitorIcon size={iconSize} color={tint} strokeWidth={2} />
        ) : (
          <MegaphoneIcon size={iconSize} color={tint} strokeWidth={2} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
            color: tint,
            textTransform: "uppercase",
            lineHeight: 14,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: tint,
            lineHeight: 38,
            marginTop: 2,
          }}
        >
          {value}
        </Text>
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
      <Text className="mb-1 text-[10px] font-bold text-[#334155]">{label}</Text>
      <TextInput
        {...props}
        className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] ${props.multiline ? 'min-h-20' : 'min-h-10'
          }`}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

export default BannerManagementPage;
