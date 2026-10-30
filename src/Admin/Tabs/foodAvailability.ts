type FoodAvailabilityRecord = Record<string, unknown>;

function isExplicitlyUnavailable(value: unknown) {
  if (value === false || value === 0) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  return /^(false|0|no|inactive|unavailable|not[\s_-]*available|out[\s_-]*of[\s_-]*stock|sold[\s_-]*out|hidden|disabled|deleted)$/i.test(
    value.trim(),
  );
}

export function isFoodAvailable(
  food: FoodAvailabilityRecord,
  channelField?: string | number,
) {
  const availabilityFields = [
    'is_effectively_available',
    'is_available',
    'is_menu_visible',
    'availability',
    ...(typeof channelField === 'string' && channelField ? [channelField] : []),
  ];
  if (availabilityFields.some(key => isExplicitlyUnavailable(food[key]))) {
    return false;
  }

  const status = [
    food.status,
    food.food_status,
    food.availability_status,
  ].find(value => typeof value === 'string');
  if (typeof status === 'string') {
    const normalizedStatus = status.trim().toLowerCase();
    if (
      /^(inactive|unavailable|not[\s_-]*available|out[\s_-]*of[\s_-]*stock|sold[\s_-]*out|hidden|disabled|deleted)$/.test(
        normalizedStatus,
      )
    ) {
      return false;
    }
  }

  return true;
}
