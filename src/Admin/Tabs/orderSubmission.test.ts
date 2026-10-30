import {
  getOrderSubmissionError,
  hasValidTableId,
  isValidAdminOrderType,
  toApiOrderType,
} from './orderSubmission';

describe('admin KOT order submission values', () => {
  it.each([
    ['DINE_IN', 'dine_in'],
    ['HOME_DELIVERY', 'home_delivery'],
    ['PICK_UP', 'pickup'],
    ['Dine-In', 'dine_in'],
    ['Home Delivery', 'home_delivery'],
  ])('maps %s to the API order type %s', (input, expected) => {
    expect(toApiOrderType(input)).toBe(expected);
  });

  it('rejects missing or unsupported order types', () => {
    expect(toApiOrderType(null)).toBeNull();
    expect(toApiOrderType('')).toBeNull();
    expect(toApiOrderType('counter service')).toBeNull();
    expect(isValidAdminOrderType('DINE_IN')).toBe(true);
    expect(isValidAdminOrderType('PICK_UP')).toBe(true);
    expect(isValidAdminOrderType('dine_in')).toBe(false);
  });

  it('requires a non-empty table ID for dine-in orders', () => {
    expect(hasValidTableId({ table_id: 4 })).toBe(true);
    expect(hasValidTableId({ id: 'A4-id' })).toBe(true);
    expect(hasValidTableId({ table_id: '' })).toBe(false);
    expect(hasValidTableId(null)).toBe(false);
  });

  it('accepts dine-in with a selected table and both delivery order types', () => {
    expect(
      getOrderSubmissionError({
        orderType: 'DINE_IN',
        itemCount: 1,
        table: { table_id: 'table-a4' },
        hasDeliveryDetails: false,
      }),
    ).toBeNull();
    expect(
      getOrderSubmissionError({
        orderType: 'PICK_UP',
        itemCount: 1,
        table: null,
        hasDeliveryDetails: false,
      }),
    ).toBeNull();
    expect(
      getOrderSubmissionError({
        orderType: 'HOME_DELIVERY',
        itemCount: 1,
        table: null,
        hasDeliveryDetails: true,
      }),
    ).toBeNull();
  });

  it('reports the missing data for dine-in, delivery, or empty carts', () => {
    expect(
      getOrderSubmissionError({
        orderType: 'DINE_IN',
        itemCount: 1,
        table: null,
        hasDeliveryDetails: false,
      }),
    ).toContain('valid table');
    expect(
      getOrderSubmissionError({
        orderType: 'HOME_DELIVERY',
        itemCount: 1,
        table: null,
        hasDeliveryDetails: false,
      }),
    ).toContain('delivery address');
    expect(
      getOrderSubmissionError({
        orderType: 'PICK_UP',
        itemCount: 0,
        table: null,
        hasDeliveryDetails: false,
      }),
    ).toContain('food items');
  });
});
