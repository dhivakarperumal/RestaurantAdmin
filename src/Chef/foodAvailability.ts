export type FoodAvailabilitySource = {
  available_time?: string;
  meal_type?: string;
  is_available?: boolean | number | string;
  is_menu_visible?: boolean | number | string;
  status?: string;
  stock_quantity?: number | string;
};

export function getActiveMenu(now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 6 * 60 && minutes < 11 * 60) {
    return { mealType: 'Breakfast', timeRange: '6:00 AM - 11:00 AM' };
  }
  if (minutes >= 11 * 60 && minutes < 15 * 60) {
    return { mealType: 'Lunch', timeRange: '11:00 AM - 3:00 PM' };
  }
  if (minutes >= 15 * 60 && minutes < 18 * 60) {
    return { mealType: 'Evening Snacks', timeRange: '3:00 PM - 6:00 PM' };
  }
  if (minutes >= 18 * 60 && minutes < 23 * 60) {
    return { mealType: 'Dinner', timeRange: '6:00 PM - 11:00 PM' };
  }
  return { mealType: 'Evening Snacks', timeRange: '3:00 PM - 6:00 PM' };
}

export function isWithinAvailableTime(availableTime: string, minutes: number) {
  if (/^all\s*day$/i.test(availableTime.trim())) {
    return true;
  }
  const parts = availableTime
    .split(/\s*(?:-|–|—|\bto\b)\s*/i)
    .map(value => value.trim());
  if (parts.length !== 2) {
    return null;
  }

  const parseTime = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      return null;
    }
    let hours = Number(match[1]);
    const timeMinutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (timeMinutes > 59) {
      return null;
    }
    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return null;
      }
      if (meridiem === 'AM' && hours === 12) hours = 0;
      if (meridiem === 'PM' && hours !== 12) hours += 12;
    } else if (hours > 23) {
      return null;
    }
    return hours * 60 + timeMinutes;
  };

  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (start === null || end === null) {
    return null;
  }
  return start <= end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

export function getFoodAvailability(food: FoodAvailabilitySource, now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const activeMenu = getActiveMenu(now);
  const timeMatch = food.available_time
    ? isWithinAvailableTime(food.available_time, minutes)
    : null;
  const mealType = String(food.meal_type || '').trim().toLowerCase();
  const scheduledAvailable = timeMatch ?? (
    mealType === 'all day' ||
    mealType === activeMenu.mealType.toLowerCase()
  );
  const isEnabled =
    food.is_available !== false &&
    food.is_available !== 0 &&
    String(food.is_available).toLowerCase() !== 'false' &&
    String(food.is_available).toLowerCase() !== '0' &&
    food.is_menu_visible !== false &&
    food.is_menu_visible !== 0 &&
    String(food.is_menu_visible).toLowerCase() !== 'false' &&
    String(food.is_menu_visible).toLowerCase() !== '0' &&
    String(food.status || 'Active').toLowerCase() === 'active' &&
    Number(food.stock_quantity || 0) > 0;

  const available = scheduledAvailable && isEnabled;
  return {
    available,
    scheduledAvailable,
    label: available ? 'Available Now' : 'Unavailable',
  };
}
