import { isFoodAvailable } from './foodAvailability';

describe('food availability', () => {
  it.each([
    ['is_available', false],
    ['is_effectively_available', 0],
    ['is_menu_visible', 'false'],
    ['availability', 'out of stock'],
  ])('hides food marked unavailable by %s', (field, value) => {
    expect(isFoodAvailable({ [field]: value })).toBe(false);
  });

  it.each([
    ['dining_available', 'unavailable'],
    ['delivery_available', 'not available'],
    ['takeaway_available', 'out_of_stock'],
  ])('hides food unavailable for its %s order channel', (field, value) => {
    expect(isFoodAvailable({ [field]: value }, field)).toBe(false);
  });

  it.each(['inactive', 'unavailable', 'out of stock', 'hidden', 'deleted'])(
    'hides food with %s status',
    status => {
      expect(isFoodAvailable({ status })).toBe(false);
    },
  );

  it('keeps available or unspecified food visible', () => {
    expect(isFoodAvailable({ is_available: true, status: 'Active' })).toBe(
      true,
    );
    expect(isFoodAvailable({ status: 'Available' })).toBe(true);
    expect(isFoodAvailable({})).toBe(true);
  });
});
