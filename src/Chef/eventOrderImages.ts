type ImageSource = Record<string, unknown>;

const imageKeys = [
  'url',
  'uri',
  'path',
  'src',
  'image',
  'image_url',
  'imageUrl',
];

function readImageValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = readImageValue(item);
      if (image) return image;
    }
    return null;
  }

  if (typeof value === 'string') {
    const image = value.trim();
    if (!image) return null;
    if (image.startsWith('[') || image.startsWith('{')) {
      try {
        return readImageValue(JSON.parse(image) as unknown);
      } catch {
        return image;
      }
    }
    return image;
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as ImageSource;
    for (const key of imageKeys) {
      const image = readImageValue(record[key]);
      if (image) return image;
    }
  }

  return null;
}

function resolveImageUrl(image: string, apiBaseUrl: string) {
  const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  const normalizedPath = image.replace(/\\/g, '/').replace(/ /g, '%20');

  if (/^(data:image\/|file:|content:|blob:)/i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith('//')) {
    return `https:${normalizedPath}`;
  }

  const localHostUrl = normalizedPath.match(
    /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)(?::\d+)?(\/.*)?$/i,
  );
  if (localHostUrl) {
    return `${backendBaseUrl}${localHostUrl[1] || ''}`;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath.replace(/^http:\/\//i, 'https://');
  }

  return `${backendBaseUrl}/${normalizedPath.replace(/^\/+/, '')}`;
}

export function getEventDishImageUrl(
  item: ImageSource,
  apiBaseUrl: string,
): string | null {
  const image =
    readImageValue(item.product_image) ??
    readImageValue(item.productImage) ??
    readImageValue(item.food_image) ??
    readImageValue(item.food_images) ??
    readImageValue(item.image_url) ??
    readImageValue(item.image);

  return image ? resolveImageUrl(image, apiBaseUrl) : null;
}

export function getFoodImageUrl(
  food: ImageSource,
  apiBaseUrl: string,
): string | null {
  const image =
    readImageValue(food.food_images) ??
    readImageValue(food.food_image) ??
    readImageValue(food.image_url) ??
    readImageValue(food.image);

  return image ? resolveImageUrl(image, apiBaseUrl) : null;
}
