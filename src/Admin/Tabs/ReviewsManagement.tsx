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
  BaseModal,
  ConfirmDialog,
  DetailsModal,
  Edit3Icon,
  FormModal,
  ImageIcon,
  Trash2Icon,
} from '../../components/popups';
import { PlusIcon, SearchIcon } from '../Navigation/NavigationIcons';

type ReviewStatus = 'Published' | 'Pending';
type Review = {
  id: number | string;
  uuid: string;
  review_id: string;
  product_id: number | string | null;
  product_code: string;
  product_name: string;
  product_image: string;
  product_type: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title: string;
  comment: string;
  review_photo: string;
  status: string;
  created_by: string;
  updated_by: string;
  created_at?: string;
  updated_at?: string;
};

type CatalogFood = {
  id?: string | number;
  food_id?: string | number;
  food_name?: string;
  name?: string;
  product_name?: string;
  food_images?: unknown;
  image?: unknown;
};

type ReviewStats = {
  total_reviews: number;
  avg_rating: number;
  five_star_count: number;
  photo_reviews_count: number;
  published_count: number;
};

type ReviewDraft = {
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title: string;
  comment: string;
  review_photo: string;
  status: ReviewStatus;
};

const emptyStats: ReviewStats = {
  total_reviews: 0,
  avg_rating: 0,
  five_star_count: 0,
  photo_reviews_count: 0,
  published_count: 0,
};

const emptyDraft: ReviewDraft = {
  reviewer_name: '',
  reviewer_email: '',
  rating: 5,
  title: '',
  comment: '',
  review_photo: '',
  status: 'Published',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown) {
  if (
    isRecord(error) &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function readArray(value: unknown): Record<string, unknown>[] {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord);
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.foods)) {
      return current.foods.filter(isRecord);
    }
    if (Array.isArray(current.items)) {
      return current.items.filter(isRecord);
    }
    current = current.data;
  }
  return [];
}

function getFoodId(food: CatalogFood) {
  return food.id ?? food.food_id ?? '';
}

function getFoodName(food: CatalogFood) {
  return (
    food.food_name?.trim() ||
    food.product_name?.trim() ||
    food.name?.trim() ||
    'Unnamed food'
  );
}

function getImageUrl(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return getImageUrl(JSON.parse(trimmed) as unknown);
      } catch {
        return '';
      }
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map(getImageUrl).find(Boolean) || '';
  }
  if (isRecord(value)) {
    return (
      getImageUrl(value.url) ||
      getImageUrl(value.image_url) ||
      getImageUrl(value.image) ||
      getImageUrl(value.src)
    );
  }
  return '';
}

function resolveAssetUrl(url: string) {
  if (!url || /^(https?:|data:|file:|content:)/i.test(url)) {
    return url;
  }
  const backendUrl = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${backendUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function toReview(value: Record<string, unknown>): Review {
  return {
    id:
      typeof value.id === 'number' || typeof value.id === 'string'
        ? value.id
        : '',
    uuid: typeof value.uuid === 'string' ? value.uuid : '',
    review_id: typeof value.review_id === 'string' ? value.review_id : '',
    product_id:
      typeof value.product_id === 'number' ||
      typeof value.product_id === 'string'
        ? value.product_id
        : null,
    product_code:
      typeof value.product_code === 'string' ? value.product_code : '',
    product_name:
      typeof value.product_name === 'string' ? value.product_name : '',
    product_image:
      typeof value.product_image === 'string' ? value.product_image : '',
    product_type:
      typeof value.product_type === 'string' ? value.product_type : 'food',
    reviewer_name:
      typeof value.reviewer_name === 'string' ? value.reviewer_name : '',
    reviewer_email:
      typeof value.reviewer_email === 'string' ? value.reviewer_email : '',
    rating: Math.min(5, Math.max(1, Number(value.rating) || 5)),
    title: typeof value.title === 'string' ? value.title : '',
    comment: typeof value.comment === 'string' ? value.comment : '',
    review_photo:
      typeof value.review_photo === 'string' ? value.review_photo : '',
    status: typeof value.status === 'string' ? value.status : 'Published',
    created_by: typeof value.created_by === 'string' ? value.created_by : '',
    updated_by: typeof value.updated_by === 'string' ? value.updated_by : '',
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === 'string' ? value.updated_at : undefined,
  };
}

function makeUuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ReviewsManagementPage({
  currentUser,
  onBack,
  showBackButton = true,
}: {
  currentUser: string;
  onBack: () => void;
  showBackButton?: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [foods, setFoods] = useState<CatalogFood[]>([]);
  const [stats, setStats] = useState<ReviewStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [foodFilter, setFoodFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openFilter, setOpenFilter] = useState<
    'food' | 'rating' | 'status' | null
  >(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [newReviewId, setNewReviewId] = useState('');
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false);
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [reviewsResponse, statsResponse] = await Promise.all([
        api.get('/reviews'),
        api.get('/reviews/stats'),
      ]);
      const rows = reviewsResponse.data?.data;
      if (!Array.isArray(rows)) {
        throw new Error('The reviews response did not contain a review list.');
      }
      setReviews(rows.map((row: Record<string, unknown>) => toReview(row)));

      const statsData = statsResponse.data?.data;
      if (isRecord(statsData)) {
        setStats({
          total_reviews: Number(statsData.total_reviews) || 0,
          avg_rating: Number(statsData.avg_rating) || 0,
          five_star_count: Number(statsData.five_star_count) || 0,
          photo_reviews_count: Number(statsData.photo_reviews_count) || 0,
          published_count: Number(statsData.published_count) || 0,
        });
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFoods = useCallback(async () => {
    try {
      const response = await api.get('/foods');
      setFoods(readArray(response.data) as CatalogFood[]);
    } catch (foodError) {
      setError(`Unable to load menu foods. ${getErrorMessage(foodError)}`);
    }
  }, []);

  useEffect(() => {
    loadReviews();
    loadFoods();
  }, [loadFoods, loadReviews]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return reviews.filter(review => {
      const matchesSearch =
        !query ||
        [
          review.review_id,
          review.reviewer_name,
          review.reviewer_email,
          review.product_name,
          review.product_code,
          review.comment,
          review.created_by,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query);
      const matchesRating =
        ratingFilter === 'all' || String(review.rating) === ratingFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        review.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesFood =
        foodFilter === 'all' || String(review.product_id) === foodFilter;
      return matchesSearch && matchesRating && matchesStatus && matchesFood;
    });
  }, [foodFilter, ratingFilter, reviews, search, statusFilter]);

  const updateDraft = <Key extends keyof ReviewDraft>(
    key: Key,
    value: ReviewDraft[Key],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const openCreateForm = async () => {
    if (!foods.length) {
      setError('Load menu foods before creating a review.');
      return;
    }
    setError('');
    setNotice('');
    setEditingReview(null);
    setNewReviewId('');
    setDraft({ ...emptyDraft });
    setSelectedFoodId(String(getFoodId(foods[0])));
    setIsFormOpen(true);
    try {
      const response = await api.get('/reviews/next-id');
      const nextId = response.data?.data;
      if (typeof nextId === 'string' && nextId.trim()) {
        setNewReviewId(nextId);
      }
    } catch (idError) {
      setError(`Unable to generate a review ID. ${getErrorMessage(idError)}`);
    }
  };

  const openEditForm = async (review: Review) => {
    setError('');
    setNotice('');
    setEditingReview(review);
    setNewReviewId('');
    setDraft({
      reviewer_name: review.reviewer_name,
      reviewer_email: review.reviewer_email,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      review_photo: review.review_photo,
      status: review.status === 'Pending' ? 'Pending' : 'Published',
    });
    setSelectedFoodId(String(review.product_id ?? ''));
    setIsFormOpen(true);
    try {
      const response = await api.get(`/reviews/${review.id}`);
      if (isRecord(response.data?.data)) {
        const latest = toReview(response.data.data);
        setEditingReview(latest);
        setDraft({
          reviewer_name: latest.reviewer_name,
          reviewer_email: latest.reviewer_email,
          rating: latest.rating,
          title: latest.title,
          comment: latest.comment,
          review_photo: latest.review_photo,
          status: latest.status === 'Pending' ? 'Pending' : 'Published',
        });
        setSelectedFoodId(String(latest.product_id ?? ''));
      }
    } catch (detailError) {
      setError(
        `Unable to load review details. ${getErrorMessage(detailError)}`,
      );
    }
  };

  const openReviewDetails = async (review: Review) => {
    setViewingReview(review);
    setError('');
    try {
      const response = await api.get(`/reviews/${review.id}`);
      if (isRecord(response.data?.data)) {
        setViewingReview(toReview(response.data.data));
      }
    } catch (detailError) {
      setError(
        `Unable to load review details. ${getErrorMessage(detailError)}`,
      );
    }
  };

  const uploadReviewPhoto = async () => {
    setError('');
    setIsUploading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(
          result.errorMessage || 'Unable to select a review photo.',
        );
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        throw new Error('The selected review photo could not be opened.');
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('Review photos must be 5 MB or smaller.');
      }
      if (
        asset.type &&
        !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type)
      ) {
        throw new Error('Choose a JPG, PNG, or WEBP review photo.');
      }

      const formData = new FormData();
      formData.append('folder', 'review');
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || `review-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const photoUrl = response.data?.url || response.data?.urls?.[0];
      if (typeof photoUrl !== 'string' || !photoUrl.trim()) {
        throw new Error('The photo upload did not return an image URL.');
      }
      updateDraft('review_photo', photoUrl);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const saveReview = async () => {
    const selectedFood = foods.find(
      food => String(getFoodId(food)) === selectedFoodId,
    );
    if (!selectedFood) {
      setError('Select a menu food for this review.');
      return;
    }
    if (!draft.reviewer_name.trim()) {
      setError('Reviewer name is required.');
      return;
    }
    if (!draft.comment.trim()) {
      setError('Review comment is required.');
      return;
    }
    if (
      !Number.isInteger(draft.rating) ||
      draft.rating < 1 ||
      draft.rating > 5
    ) {
      setError('Rating must be between 1 and 5 stars.');
      return;
    }

    setIsSaving(true);
    setError('');
    const productId = getFoodId(selectedFood);
    const productCode = String(selectedFood.food_id ?? selectedFood.id ?? '');
    const productImage = getImageUrl(
      selectedFood.food_images ?? selectedFood.image,
    );
    const reviewId = editingReview?.review_id || newReviewId;
    const now = new Date().toISOString();
    const payload = {
      uuid: editingReview?.uuid || makeUuid(),
      ...(reviewId ? { review_id: reviewId } : {}),
      product_id: productId || null,
      product_code: productCode,
      product_name: getFoodName(selectedFood),
      product_image: productImage,
      product_type: 'food',
      reviewer_name: draft.reviewer_name.trim(),
      reviewer_email: draft.reviewer_email.trim() || null,
      rating: draft.rating,
      title: draft.title.trim() || null,
      comment: draft.comment.trim(),
      review_photo: draft.review_photo || null,
      status: draft.status,
      created_by: editingReview?.created_by || currentUser || 'Admin',
      updated_by: currentUser || 'Admin',
      created_at: editingReview?.created_at || now,
      updated_at: now,
    };
    try {
      if (editingReview) {
        await api.put(`/reviews/${editingReview.id}`, payload);
      } else {
        await api.post('/reviews', payload);
      }
      await loadReviews();
      setIsFormOpen(false);
      setNotice(
        editingReview
          ? 'Review updated successfully.'
          : 'Review added successfully.',
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReview = (review: Review) => {
    setReviewToDelete(review);
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/reviews/${reviewToDelete.id}`);
      setReviews(current =>
        current.filter(item => String(item.id) !== String(reviewToDelete.id)),
      );
      await loadReviews();
      setNotice('Review deleted successfully.');
      setReviewToDelete(null);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRatingFilter('all');
    setStatusFilter('all');
    setFoodFilter('all');
  };

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void Promise.all([loadReviews(), loadFoods()]);
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
              CUSTOMER FEEDBACK
            </Text>
            <Text className="mt-1 text-2xl font-bold text-[#012711]">
              Review Management
            </Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
              Manage customer ratings, comments, and review photos.
            </Text>
          </View>
          {isWide ? (
            <Pressable
              accessibilityLabel="Add review"
              accessibilityRole="button"
              onPress={openCreateForm}
              className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-4"
            >
              <PlusIcon color="#FFFFFF" size={18} />
              <Text className="ml-1.5 text-sm font-bold text-white">
                Add review
              </Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View className="gap-2 rounded-xl bg-red-50 px-4 py-3">
            <Text accessibilityRole="alert" className="text-sm text-red-700">
              {error}
            </Text>
            {!foods.length ? (
              <Pressable
                accessibilityLabel="Retry loading foods"
                accessibilityRole="button"
                onPress={loadFoods}
                className="self-start"
              >
                <Text className="text-sm font-bold text-red-800">
                  Retry loading foods
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {notice ? (
          <Text className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap justify-between gap-y-3">
          <ReviewStat label="Total reviews" value={stats.total_reviews} />
          <ReviewStat
            label="Average rating"
            value={`${stats.avg_rating.toFixed(1)} / 5`}
          />
          <ReviewStat label="Five-star reviews" value={stats.five_star_count} />
          <ReviewStat label="Photo reviews" value={stats.photo_reviews_count} />
          <ReviewStat label="Published" value={stats.published_count} />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search reviews"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search reviewer, food, ID, or comment..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-1 flex-row gap-2">
                <ReviewDropdown
                  label="Food"
                  selected={foodFilter}
                  open={openFilter === 'food'}
                  onOpen={() =>
                    setOpenFilter(current =>
                      current === 'food' ? null : 'food',
                    )
                  }
                  onSelect={value => {
                    setFoodFilter(value);
                    setOpenFilter(null);
                  }}
                  options={[
                    { value: 'all', label: 'All foods' },
                    ...foods.map(food => ({
                      value: String(getFoodId(food)),
                      label: getFoodName(food),
                    })),
                  ]}
                />
                <ReviewDropdown
                  label="Rating"
                  selected={ratingFilter}
                  open={openFilter === 'rating'}
                  onOpen={() =>
                    setOpenFilter(current =>
                      current === 'rating' ? null : 'rating',
                    )
                  }
                  onSelect={value => {
                    setRatingFilter(value);
                    setOpenFilter(null);
                  }}
                  options={[
                    { value: 'all', label: 'All ratings' },
                    ...[5, 4, 3, 2, 1].map(rating => ({
                      value: String(rating),
                      label: `${rating} ★`,
                    })),
                  ]}
                />
                <ReviewDropdown
                  label="Status"
                  selected={statusFilter}
                  open={openFilter === 'status'}
                  onOpen={() =>
                    setOpenFilter(current =>
                      current === 'status' ? null : 'status',
                    )
                  }
                  onSelect={value => {
                    setStatusFilter(value);
                    setOpenFilter(null);
                  }}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'Published', label: 'Published' },
                    { value: 'Pending', label: 'Pending' },
                  ]}
                />
              </View>
              <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                {(['grid', 'list'] as const).map(mode => (
                  <Pressable
                    key={mode}
                    accessibilityLabel={`Show reviews as ${mode}`}
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
              Loading customer reviews...
            </Text>
          </View>
        ) : filteredReviews.length ? (
          viewMode === 'list' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={!isWide}>
              <View
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
                style={{ width: isWide ? 1000 : 760 }}
              >
                <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                  <Text className="w-16 text-[10px] font-bold uppercase text-[#64748B]">
                    Rating
                  </Text>
                  <Text className="flex-1 text-[10px] font-bold uppercase text-[#64748B]">
                    Reviewer / Food
                  </Text>
                  <Text className="w-28 text-[10px] font-bold uppercase text-[#64748B]">
                    Status
                  </Text>
                  <Text className="w-32 text-right text-[10px] font-bold uppercase text-[#64748B]">
                    Actions
                  </Text>
                </View>
                {filteredReviews.map(review => (
                  <View
                    key={String(review.id)}
                    className="min-h-[64px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2"
                  >
                    <View className="w-16">
                      <StarRating rating={review.rating} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-xs font-bold text-[#1E293B]"
                        numberOfLines={1}
                      >
                        {review.reviewer_name} · {review.product_name || 'Food'}
                      </Text>
                      <Text
                        className="mt-1 text-[10px] text-[#64748B]"
                        numberOfLines={1}
                      >
                        {review.review_id}
                      </Text>
                    </View>
                    <View className="w-28">
                      <StatusBadge status={review.status} />
                    </View>
                    <View className="w-32 flex-row justify-end gap-1.5">
                      <ReviewActionButton
                        label={`View review ${review.review_id}`}
                        tone="view"
                        onPress={() => openReviewDetails(review)}
                      />
                      <ReviewActionButton
                        label={`Edit review ${review.review_id}`}
                        tone="edit"
                        onPress={() => openEditForm(review)}
                      />
                      <ReviewActionButton
                        label={`Delete review ${review.review_id}`}
                        tone="delete"
                        onPress={() => deleteReview(review)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {filteredReviews.map(review => (
                <View
                  key={String(review.id)}
                  className="gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white p-3"
                  style={{
                    width: isWide ? '48%' : '47%',
                    flexGrow: 0,
                    flexShrink: 0,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-mono text-[10px] font-bold text-[#116C0B]">
                        {review.review_id}
                      </Text>
                      <Text
                        className="mt-1 text-sm font-bold text-[#012711]"
                        numberOfLines={1}
                      >
                        {review.product_name || 'Food'}
                      </Text>
                    </View>
                    <StatusBadge status={review.status} />
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#116C0B]">
                      <Text className="text-sm font-bold text-white">
                        {(review.reviewer_name[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-[#012711]">
                        {review.reviewer_name}
                      </Text>
                      {review.reviewer_email ? (
                        <Text className="text-xs text-[#6B7280]">
                          {review.reviewer_email}
                        </Text>
                      ) : null}
                    </View>
                    <StarRating rating={review.rating} />
                  </View>
                  {review.title ? (
                    <Text className="text-sm font-bold text-[#374151]">
                      {review.title}
                    </Text>
                  ) : null}
                  <Text
                    numberOfLines={3}
                    className="text-xs leading-4 text-[#4B5563]"
                  >
                    {review.comment}
                  </Text>
                  {review.review_photo ? (
                    <Image
                      accessibilityLabel={`Photo attached to review ${review.review_id}`}
                      className="h-28 w-full rounded-xl bg-[#F3F4F6]"
                      resizeMode="cover"
                      source={{ uri: resolveAssetUrl(review.review_photo) }}
                    />
                  ) : null}
                  <Text className="text-xs text-[#6B7280]">
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString()
                      : 'Date unavailable'}
                  </Text>
                  <View className="flex-row justify-end gap-1.5 border-t border-[#F0EBE6] pt-2.5">
                    <Pressable
                      accessibilityLabel={`Edit review ${review.review_id}`}
                      accessibilityRole="button"
                      onPress={() => openEditForm(review)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-[#DCFCE7] bg-[#F0FDF4]"
                    >
                      <Edit3Icon size={15} color="#15803D" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`View review ${review.review_id}`}
                      accessibilityRole="button"
                      onPress={() => openReviewDetails(review)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white"
                    >
                      <Text className="text-sm font-bold text-[#475569]">
                        •••
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete review ${review.review_id}`}
                      accessibilityRole="button"
                      onPress={() => deleteReview(review)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2]"
                    >
                      <Trash2Icon size={15} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white px-5 py-10">
            <Text className="text-base font-semibold text-[#012711]">
              {reviews.length
                ? 'No reviews match these filters'
                : 'No reviews yet'}
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#6B7280]">
              {reviews.length
                ? 'Adjust or clear the filters to see more reviews.'
                : 'Add a customer review to start managing ratings and feedback.'}
            </Text>
            {reviews.length ? (
              <Pressable
                onPress={clearFilters}
                className="mt-4 rounded-xl bg-[#116C0B] px-4 py-3"
              >
                <Text className="text-sm font-bold text-white">
                  Clear filters
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {!isLoading && error ? (
          <Pressable
            accessibilityLabel="Retry loading reviews"
            accessibilityRole="button"
            onPress={loadReviews}
            className="items-center py-2"
          >
            <Text className="text-sm font-semibold text-[#116C0B]">
              Try again
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {!isWide && !isFormOpen ? (
        <Pressable
          accessibilityLabel="Add review"
          accessibilityRole="button"
          onPress={() => void openCreateForm()}
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
        title={
          editingReview
            ? `Edit Review (${editingReview.review_id})`
            : 'Add Customer Review'
        }
        subtitle="Manage customer rating, feedback text, and verified food item"
        cancelLabel=""
        isSaving={isSaving}
        isSaveDisabled={isSaving || isUploading}
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
                editingReview ? 'Save Changes' : 'Create Review'
              }
              accessibilityRole="button"
              disabled={isSaving || isUploading}
              onPress={() => void saveReview()}
              className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {editingReview ? 'Save Changes' : 'Create Review'}
                </Text>
              )}
            </Pressable>
          </View>
        }
      >
        <View className="gap-4">
          <ReviewFormSection number="1" title="Customer and Food">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">
                Review ID
              </Text>
              <View className="min-h-11 justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4">
                <Text className="font-mono text-sm font-bold text-[#374151]">
                  {editingReview?.review_id || newReviewId || 'Generating...'}
                </Text>
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">Food</Text>
              <Pressable
                accessibilityLabel="Select food for review"
                accessibilityRole="button"
                onPress={() => setIsFoodPickerOpen(true)}
                className="min-h-12 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4"
              >
                <Text className="flex-1 text-sm text-[#012711]">
                  {foods.find(
                    food => String(getFoodId(food)) === selectedFoodId,
                  )
                    ? getFoodName(
                        foods.find(
                          food => String(getFoodId(food)) === selectedFoodId,
                        )!,
                      )
                    : 'Select menu food'}
                </Text>
                <Text className="text-[#6B7280]">⌄</Text>
              </Pressable>
            </View>
            <ReviewField
              label="Reviewer name"
              value={draft.reviewer_name}
              onChangeText={value => updateDraft('reviewer_name', value)}
              placeholder="Customer name"
            />
            <ReviewField
              label="Reviewer email"
              value={draft.reviewer_email}
              onChangeText={value => updateDraft('reviewer_email', value)}
              placeholder="customer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View className="gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <Text className="text-sm font-semibold text-[#012711]">
                Rating ({draft.rating} / 5 stars)
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <Pressable
                    key={rating}
                    accessibilityLabel={`Rate ${rating} star${
                      rating === 1 ? '' : 's'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.rating === rating }}
                    onPress={() => updateDraft('rating', rating)}
                    className="p-1"
                  >
                    <Text
                      className="text-3xl"
                      style={{
                        color:
                          rating <= draft.rating
                            ? colors.success
                            : colors.disabled,
                      }}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ReviewFormSection>
          <ReviewFormSection number="2" title="Review Content">
            <ReviewField
              label="Review title"
              value={draft.title}
              onChangeText={value => updateDraft('title', value)}
              placeholder="Short review title (optional)"
            />
            <ReviewField
              label="Review comment"
              value={draft.comment}
              onChangeText={value => updateDraft('comment', value)}
              placeholder="Write the customer's review..."
              multiline
            />
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">
                Review photo
              </Text>
              {draft.review_photo ? (
                <View className="gap-2">
                  <Image
                    accessibilityLabel="Review photo preview"
                    className="h-40 w-full rounded-xl bg-[#F3F4F6]"
                    resizeMode="cover"
                    source={{ uri: resolveAssetUrl(draft.review_photo) }}
                  />
                  <Pressable
                    accessibilityLabel="Remove review photo"
                    accessibilityRole="button"
                    onPress={() => updateDraft('review_photo', '')}
                    className="self-start py-1"
                  >
                    <Text className="text-sm font-semibold text-red-700">
                      Remove photo
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                accessibilityLabel="Upload review photo"
                accessibilityRole="button"
                disabled={isUploading}
                onPress={uploadReviewPhoto}
                className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4"
              >
                {isUploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
                <Text className="text-sm font-semibold text-[#116C0B]">
                  {isUploading ? 'Uploading photo...' : 'Choose review photo'}
                </Text>
              </Pressable>
            </View>
          </ReviewFormSection>
          <ReviewFormSection number="3" title="Publishing">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-[#012711]">
                Review status
              </Text>
              <View className="flex-row gap-2">
                {(['Published', 'Pending'] as const).map(status => (
                  <ReviewChoice
                    key={status}
                    label={status}
                    selected={draft.status === status}
                    onPress={() => updateDraft('status', status)}
                  />
                ))}
              </View>
            </View>
          </ReviewFormSection>
        </View>
      </FormModal>

      <BaseModal
        visible={isFoodPickerOpen}
        onClose={() => setIsFoodPickerOpen(false)}
        title="Select Menu Item"
        subtitle="Choose the food item this review is associated with"
        variant="bottom-sheet"
        maxHeightPercent={70}
      >
        <ScrollView
          className="max-h-[380px]"
          contentContainerClassName="gap-2 pb-6"
        >
          {foods.map(food => {
            const foodId = String(getFoodId(food));
            const foodName = getFoodName(food);
            const foodImage = getImageUrl(food.food_images ?? food.image);
            const isSelected = foodId === selectedFoodId;
            return (
              <Pressable
                accessibilityLabel={`Select food ${foodName}`}
                accessibilityRole="button"
                key={foodId}
                onPress={() => {
                  setSelectedFoodId(foodId);
                  setIsFoodPickerOpen(false);
                }}
                className={`min-h-14 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${
                  isSelected
                    ? 'border-[#116C0B] bg-[#116C0B]/5'
                    : 'border-[#E2E8F0] bg-white active:bg-gray-50'
                }`}
              >
                {foodImage ? (
                  <Image
                    accessibilityLabel={`${foodName} image`}
                    className="h-10 w-10 rounded-xl bg-[#F1F5F9]"
                    resizeMode="cover"
                    source={{ uri: resolveAssetUrl(foodImage) }}
                  />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#116C0B]/10">
                    <Text className="font-bold text-[#116C0B]">
                      {foodName[0]}
                    </Text>
                  </View>
                )}
                <Text className="flex-1 text-sm font-semibold text-[#0F172A]">
                  {foodName}
                </Text>
                {isSelected ? (
                  <Text className="font-bold text-[#116C0B]">✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BaseModal>

      {viewingReview ? (
        <DetailsModal
          visible={viewingReview !== null}
          onClose={() => setViewingReview(null)}
          title="Review Details"
          subtitle={viewingReview.review_id}
          badge={{
            label: viewingReview.status,
            bg: viewingReview.status === 'Published' ? '#F0FDF4' : '#FEF3C7',
            text: viewingReview.status === 'Published' ? '#15803D' : '#D97706',
            border:
              viewingReview.status === 'Published' ? '#DCFCE7' : '#FDE68A',
          }}
          footer={
            <View className="w-full flex-row gap-3">
              <Pressable
                accessibilityLabel="Close review details"
                accessibilityRole="button"
                onPress={() => setViewingReview(null)}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
              >
                <Text className="text-sm font-semibold text-[#334155]">
                  Close
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Edit review ${viewingReview.review_id}`}
                accessibilityRole="button"
                onPress={() => {
                  const review = viewingReview;
                  setViewingReview(null);
                  openEditForm(review);
                }}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
              >
                <Text className="text-sm font-bold text-white">
                  Edit Review
                </Text>
              </Pressable>
            </View>
          }
        >
          <View className="gap-4">
            <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Product
              </Text>
              <Text className="mt-1 text-base font-bold text-[#0F172A]">
                {viewingReview.product_name}
              </Text>
            </View>

            <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Reviewer
              </Text>
              <Text className="mt-1 text-sm font-bold text-[#0F172A]">
                {viewingReview.reviewer_name}
              </Text>
              {viewingReview.reviewer_email ? (
                <Text className="mt-0.5 text-xs text-[#64748B]">
                  {viewingReview.reviewer_email}
                </Text>
              ) : null}
            </View>

            <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Rating & Feedback
              </Text>
              <View className="mt-2">
                <StarRating rating={viewingReview.rating} />
              </View>
              {viewingReview.title ? (
                <Text className="mt-3 text-base font-bold text-[#0F172A]">
                  {viewingReview.title}
                </Text>
              ) : null}
              <Text className="mt-2 text-sm leading-6 text-[#334155]">
                {viewingReview.comment}
              </Text>
            </View>

            {viewingReview.review_photo ? (
              <Image
                accessibilityLabel="Review photo"
                className="h-48 w-full rounded-2xl bg-[#F1F5F9]"
                resizeMode="cover"
                source={{ uri: resolveAssetUrl(viewingReview.review_photo) }}
              />
            ) : null}

            <Text className="text-center text-xs text-[#94A3B8]">
              {viewingReview.created_at
                ? `Submitted ${new Date(
                    viewingReview.created_at,
                  ).toLocaleString()}`
                : 'Submission date unavailable'}
            </Text>
          </View>
        </DetailsModal>
      ) : null}

      <ConfirmDialog
        visible={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        title="Delete Review"
        message="Are you sure you want to delete this customer review? This action cannot be undone."
        itemName={
          reviewToDelete
            ? `${reviewToDelete.reviewer_name}'s review on ${reviewToDelete.product_name}`
            : undefined
        }
        confirmLabel="Delete Review"
        variantType="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteReview}
      />
    </>
  );
}

function ReviewStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View className="min-h-[90px] w-[48%] flex-row items-center gap-3 overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white px-3 py-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7]">
        <ImageIcon size={20} color="#166534" />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[10px] font-extrabold uppercase tracking-wide text-[#166534]"
        >
          {label}
        </Text>
        <Text className="mt-1 text-xl font-extrabold text-[#166534]">
          {value}
        </Text>
      </View>
    </View>
  );
}

function ReviewActionButton({
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

function ReviewDropdown({
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
    <View className="min-w-[76px] flex-1" style={{ zIndex: open ? 10 : 1 }}>
      <Text className="mb-1 text-[10px] font-bold text-[#475569]">{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onOpen}
        className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-2"
      >
        <Text numberOfLines={1} className="flex-1 text-[11px] text-[#334155]">
          {selectedLabel}
        </Text>
        <Text className="ml-1 text-xs text-[#64748B]">{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? (
        <View
          className="absolute left-0 right-0 top-[62px] max-h-60 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
          style={{ elevation: 8 }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
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
                  numberOfLines={1}
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
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function ReviewChoice({
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
        selected ? 'border-[#116C0B] bg-[#116C0B]' : 'border-[#E5E7EB] bg-white'
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

function StatusBadge({ status }: { status: string }) {
  const isPublished = status.toLowerCase() === 'published';
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{
        backgroundColor: isPublished
          ? colors.surfaceSecondary
          : colors.background,
      }}
    >
      <Text
        className="text-[10px] font-bold"
        style={{
          color: isPublished ? colors.primary : colors.textSecondary,
        }}
      >
        {status}
      </Text>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View accessibilityLabel={`${rating} out of 5 stars`} className="flex-row">
      {[1, 2, 3, 4, 5].map(star => (
        <Text
          key={star}
          className="text-sm"
          style={{ color: star <= rating ? colors.success : colors.disabled }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

function ReviewField({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
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

function ReviewFormSection({
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

export default ReviewsManagementPage;
