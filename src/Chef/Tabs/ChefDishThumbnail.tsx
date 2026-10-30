import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import {
  getEventDishImageUrl,
  getFoodImageUrl,
} from '../eventOrderImages';

type Dish = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function DishThumbnail({
  item,
  size = 44,
}: {
  item: Dish;
  size?: number;
}) {
  const [imageUri, setImageUri] = useState(() =>
    getEventDishImageUrl(item, API_BASE_URL),
  );
  const imageLookupAttempted = useRef(false);
  const foodId = String(item.food_id ?? item.foodId ?? '').trim();

  const fetchCurrentFoodImage = useCallback(async () => {
    if (imageLookupAttempted.current || !foodId) return;
    imageLookupAttempted.current = true;
    try {
      const response = await api.get(`/foods/${encodeURIComponent(foodId)}`);
      const food =
        isRecord(response.data) && isRecord(response.data.data)
          ? response.data.data
          : null;
      const fallbackImage = food
        ? getFoodImageUrl(food, API_BASE_URL)
        : null;
      if (fallbackImage && fallbackImage !== imageUri) {
        setImageUri(fallbackImage);
      }
    } catch (imageError) {
      console.warn('Could not load the current image for an order dish:', imageError);
    }
  }, [foodId, imageUri]);

  useEffect(() => {
    if (!imageUri) {
      void fetchCurrentFoodImage();
    }
  }, [fetchCurrentFoodImage, imageUri]);

  return (
    <View
      className="shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EAF4E7]"
      style={{ height: size, width: size }}
    >
      {!imageUri ? <Text style={{ fontSize: Math.max(12, size * 0.4) }}>🍽️</Text> : null}
      {imageUri ? (
        <Image
          accessibilityLabel={String(item.product_name ?? item.food_name ?? 'Dish image')}
          source={{ uri: imageUri }}
          resizeMode="cover"
          onError={() => {
            setImageUri(null);
            void fetchCurrentFoodImage();
          }}
          className="absolute h-full w-full"
        />
      ) : null}
    </View>
  );
}

export default DishThumbnail;
