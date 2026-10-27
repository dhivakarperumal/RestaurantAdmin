import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api, { API_BASE_URL } from '../../api';
import { ProductIcon } from '../Navigation/NavigationIcons';
import colors from '../theme/colors';

type CuisineForm = {
  cuisineId: string;
  cuisineName: string;
  description: string;
  image: string;
  status: 'Active' | 'Inactive';
  featured: boolean;
};

type AddCuisineProps = {
  onBack: () => void;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const INITIAL_FORM: CuisineForm = {
  cuisineId: '',
  cuisineName: '',
  description: '',
  image: '',
  status: 'Active',
  featured: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function getErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : null;
    const data = response && isRecord(response.data) ? response.data : null;
    if (data && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function getNextCuisineId(payload: unknown) {
  const data = unwrapData(payload);
  if (typeof data === 'string') {
    return data.trim();
  }
  if (isRecord(data)) {
    const id = data.cuisine_id ?? data.cuisineId;
    return typeof id === 'string' || typeof id === 'number'
      ? String(id).trim()
      : '';
  }
  return '';
}

function resolveImageUrl(value: string) {
  if (/^(https?:|data:image\/|file:|content:)/i.test(value)) {
    return value;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${value.replace(/^\/+/, '')}`;
}

function AddCuisine({ onBack }: AddCuisineProps) {
  const [form, setForm] = useState<CuisineForm>(INITIAL_FORM);
  const [isLoadingId, setIsLoadingId] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    api
      .get('/cuisines/next-id', { signal: controller.signal })
      .then(response => {
        const cuisineId = getNextCuisineId(response.data);
        if (!cuisineId) {
          throw new Error('The server did not return a cuisine ID.');
        }
        if (active) {
          setForm(current => ({ ...current, cuisineId }));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setFormError(
            getErrorMessage(error, 'Unable to generate a cuisine ID.'),
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingId(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

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
      setFormError('Choose a valid cuisine image.');
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
      setFormError('Cuisine images must be 5 MB or smaller.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('folder', 'cuisines');
      body.append('file', {
        uri: asset.uri,
        name:
          asset.fileName ||
          `cuisine-${Date.now()}.${mimeType?.split('/')[1] || 'jpg'}`,
        type: mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapData(response.data);
      const imageUrl =
        isRecord(data) && typeof data.url === 'string' ? data.url.trim() : '';
      if (!imageUrl) {
        throw new Error('Image upload returned no image URL.');
      }
      setForm(current => ({ ...current, image: imageUrl }));
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to upload cuisine image.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveCuisine = async () => {
    const cuisineName = form.cuisineName.trim();
    if (!form.cuisineId) {
      setFormError('A cuisine ID is required.');
      return;
    }
    if (!cuisineName) {
      setFormError('Cuisine name is required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/cuisines', {
        cuisine_id: form.cuisineId,
        cuisine_name: cuisineName,
        description: form.description.trim(),
        image: form.image,
        status: form.status,
        featured: form.featured,
      });
      onBack();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to add cuisine.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAF8]">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 16,
          maxWidth: 720,
          padding: 18,
          paddingBottom: 32,
          width: '100%',
        }}
      >
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <Pressable
            accessibilityLabel="Back to cuisines"
            accessibilityRole="button"
            onPress={onBack}
            className="self-start rounded-lg py-1"
          >
            <Text className="text-sm font-semibold text-[#116C0B]">
              ‹ Back
            </Text>
          </Pressable>
          <Text className="mt-3 text-2xl font-extrabold text-[#012711]">
            Add Cuisine
          </Text>
          <Text className="mt-1 text-sm text-[#6B7280]">
            Add a cuisine type to your restaurant.
          </Text>
        </View>

        <View className="gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
              Cuisine ID
            </Text>
            {isLoadingId ? (
              <View className="min-h-11 flex-row items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3.5">
                <ActivityIndicator color={colors.primary} size="small" />
                <Text className="text-sm text-[#6B7280]">
                  Generating cuisine ID...
                </Text>
              </View>
            ) : (
              <TextInput
                accessibilityLabel="Cuisine ID"
                editable={false}
                className="rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3.5 py-3 text-sm text-[#6B7280]"
                value={form.cuisineId}
              />
            )}
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
              Cuisine name *
            </Text>
            <TextInput
              accessibilityLabel="Cuisine name"
              autoCapitalize="words"
              className="rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
              onChangeText={value =>
                setForm(current => ({ ...current, cuisineName: value }))
              }
              placeholder="Cuisine name"
              placeholderTextColor={colors.textLight}
              value={form.cuisineName}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
              Description
            </Text>
            <TextInput
              accessibilityLabel="Cuisine description"
              className="min-h-[76px] rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-sm text-[#111827]"
              multiline
              onChangeText={value =>
                setForm(current => ({ ...current, description: value }))
              }
              placeholder="Optional description"
              placeholderTextColor={colors.textLight}
              textAlignVertical="top"
              value={form.description}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
              Cuisine image
            </Text>
            <View className="flex-row items-center gap-3">
              {form.image ? (
                <Image
                  accessibilityLabel="Cuisine image preview"
                  resizeMode="cover"
                  source={{ uri: resolveImageUrl(form.image) }}
                  className="h-[66px] w-[66px] rounded-xl bg-[#F3F4F6]"
                />
              ) : (
                <View className="h-[66px] w-[66px] items-center justify-center rounded-xl bg-[#F0F7EE]">
                  <ProductIcon color={colors.primary} size={27} />
                </View>
              )}
              <Pressable
                accessibilityLabel="Choose cuisine image"
                accessibilityRole="button"
                disabled={isUploadingImage}
                onPress={() => void chooseImage()}
                className="rounded-xl border border-[#D1D5DB] px-4 py-3"
              >
                {isUploadingImage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text className="text-xs font-semibold text-[#116C0B]">
                    {form.image ? 'Change image' : 'Choose image'}
                  </Text>
                )}
              </Pressable>
              <Text className="flex-1 text-[10px] leading-4 text-[#6B7280]">
                JPG, PNG, WEBP · max 5 MB
              </Text>
            </View>
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
              Status
            </Text>
            <View className="flex-row gap-2">
              {(['Active', 'Inactive'] as const).map(status => (
                <Pressable
                  accessibilityLabel={`Set cuisine ${status.toLowerCase()}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.status === status }}
                  key={status}
                  onPress={() => setForm(current => ({ ...current, status }))}
                  className={`rounded-full border px-4 py-2 ${
                    form.status === status
                      ? 'border-[#116C0B] bg-[#116C0B]'
                      : 'border-[#E5E7EB] bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      form.status === status
                        ? 'text-white'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            accessibilityLabel="Toggle featured cuisine"
            accessibilityRole="button"
            accessibilityState={{ selected: form.featured }}
            onPress={() =>
              setForm(current => ({ ...current, featured: !current.featured }))
            }
            className={`self-start rounded-full border px-4 py-2 ${
              form.featured
                ? 'border-[#116C0B] bg-[#F0F7EE]'
                : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                form.featured ? 'text-[#116C0B]' : 'text-[#6B7280]'
              }`}
            >
              {form.featured ? 'Featured cuisine' : 'Mark as featured'}
            </Text>
          </Pressable>

          {formError ? (
            <Text accessibilityRole="alert" className="text-sm text-[#DC2626]">
              {formError}
            </Text>
          ) : null}

          <View className="mt-1 flex-row justify-end gap-3">
            <Pressable
              accessibilityLabel="Cancel cuisine"
              accessibilityRole="button"
              disabled={isSaving || isUploadingImage}
              onPress={onBack}
              className="rounded-xl border border-[#D1D5DB] px-4 py-3"
            >
              <Text className="font-semibold text-[#374151]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Save cuisine"
              accessibilityRole="button"
              disabled={
                isSaving || isUploadingImage || isLoadingId || !form.cuisineId
              }
              onPress={() => void saveCuisine()}
              className="min-w-[120px] items-center rounded-xl bg-[#116C0B] px-4 py-3"
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-semibold text-white">Save Cuisine</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default AddCuisine;
