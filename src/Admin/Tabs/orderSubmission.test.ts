import {
  createOrderRequestKey,
  getKitchenOrderTypeFields,
  getOrderSubmissionError,
  hasValidTableId,
  isValidAdminOrderType,
  isValidOrderRequestKey,
  readKitchenOrderReferences,
  resolveApiOrderType,
  toApiOrderType,
} from './orderSubmission';

describe('admin KOT order submission values', () => {
  it('creates a non-empty unique request key for KOT submissions', () => {
    const firstKey = createOrderRequestKey();
    const secondKey = createOrderRequestKey();

    expect(firstKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(secondKey).not.toBe(firstKey);
    expect(isValidOrderRequestKey(firstKey)).toBe(true);
    expect(isValidOrderRequestKey(secondKey)).toBe(true);
  });

  it('rejects missing or malformed order request keys', () => {
    expect(isValidOrderRequestKey(null)).toBe(false);
    expect(isValidOrderRequestKey('')).toBe(false);
    expect(isValidOrderRequestKey('not-a-uuid')).toBe(false);
    expect(isValidOrderRequestKey('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx')).toBe(
      false,
    );
  });

  it('reads the KOT and bill references returned by kitchen-orders', () => {
    expect(
      readKitchenOrderReferences({
        success: true,
        order: {
          kot_number: 'KOT032',
          order_id: 'KOT032',
          bill_id: '8753852a-eb8c-428b-aa45-a2275b405ddd',
          bill_number: 'BILL-20261030-009',
          bill: {
            bill_id: '8753852a-eb8c-428b-aa45-a2275b405ddd',
            bill_number: 'BILL-20261030-009',
          },
        },
      }),
    ).toEqual({
      kotNumber: 'KOT032',
      billNumber: 'BILL-20261030-009',
      billId: '8753852a-eb8c-428b-aa45-a2275b405ddd',
    });
  });

  it.each([
    ['DINE_IN', 'dine_in'],
    ['HOME_DELIVERY', 'home_delivery'],
    ['PICK_UP', 'pickup'],
    ['Dine-In', 'dine_in'],
    ['Dine-In / Table', 'dine_in'],
    ['Home Delivery', 'home_delivery'],
  ])('maps %s to the API order type %s', (input, expected) => {
    expect(toApiOrderType(input)).toBe(expected);
  });

  it('uses the table-order API contract and sends explicit non-table types', () => {
    expect(getKitchenOrderTypeFields('dine_in')).toEqual({});
    expect(getKitchenOrderTypeFields('home_delivery')).toEqual({
      order_type: 'home_delivery',
    });
    expect(getKitchenOrderTypeFields('pickup')).toEqual({
      order_type: 'pickup',
    });
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

  it('infers dine-in from a selected table when the incoming type is unrecognized', () => {
    expect(resolveApiOrderType('Dine-In / Table', { id: 'table-a4' })).toBe(
      'dine_in',
    );
    expect(resolveApiOrderType('unknown', { id: 'table-a4' })).toBe('dine_in');
    expect(resolveApiOrderType('unknown', null)).toBeNull();
    expect(resolveApiOrderType('PICK_UP', { id: 'table-a4' })).toBe('pickup');
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
