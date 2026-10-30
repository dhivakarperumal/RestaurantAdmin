import {
  getFoodAvailability,
  isWithinAvailableTime,
} from './foodAvailability';

describe('chef food availability schedule', () => {
  it('uses the saved time range even when it differs from the meal type', () => {
    const food = {
      meal_type: 'Dinner',
      available_time: '10:00 AM - 1:00 PM',
      is_available: true,
      is_menu_visible: true,
      stock_quantity: 5,
      status: 'Active',
    };

    expect(getFoodAvailability(food, new Date(2026, 0, 1, 11, 0)).available).toBe(true);
    expect(getFoodAvailability(food, new Date(2026, 0, 1, 14, 0)).available).toBe(false);
  });

  it('supports all-day and overnight ranges', () => {
    expect(isWithinAvailableTime('All Day', 23 * 60)).toBe(true);
    expect(isWithinAvailableTime('10:00 PM - 2:00 AM', 60)).toBe(true);
    expect(isWithinAvailableTime('10:00 PM - 2:00 AM', 12 * 60)).toBe(false);
  });

  it('falls back to the meal type for an invalid saved range', () => {
    const food = {
      meal_type: 'Dinner',
      available_time: 'not a time range',
      is_available: true,
      is_menu_visible: true,
      stock_quantity: 5,
      status: 'Active',
    };

    expect(getFoodAvailability(food, new Date(2026, 0, 1, 19, 0)).scheduledAvailable).toBe(true);
    expect(getFoodAvailability(food, new Date(2026, 0, 1, 11, 0)).scheduledAvailable).toBe(false);
  });
});
