import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type { NewOrderType } from '../Navigation/DashboardTypes';

export type ApiOrderType = 'dine_in' | 'home_delivery' | 'pickup';

export type KitchenOrderReferences = {
  kotNumber?: string;
  billNumber?: string;
  billId?: string;
};

function referenceText(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim() || undefined
    : undefined;
}

export function readKitchenOrderReferences(
  payload: unknown,
): KitchenOrderReferences | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const response = payload as Record<string, unknown>;
  const order =
    typeof response.order === 'object' &&
    response.order !== null &&
    !Array.isArray(response.order)
      ? (response.order as Record<string, unknown>)
      : null;
  if (!order) {
    return null;
  }
  const bill =
    typeof order.bill === 'object' &&
    order.bill !== null &&
    !Array.isArray(order.bill)
      ? (order.bill as Record<string, unknown>)
      : null;
  const references = {
    kotNumber: referenceText(order.kot_number ?? order.order_id),
    billNumber: referenceText(order.bill_number ?? bill?.bill_number),
    billId: referenceText(order.bill_id ?? bill?.bill_id),
  };
  return Object.values(references).some(Boolean) ? references : null;
}

export function createOrderRequestKey() {
  const key = uuidv4();
  if (!isValidOrderRequestKey(key)) {
    throw new Error('Unable to generate a valid order request key.');
  }
  return key;
}

export function isValidOrderRequestKey(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function getKitchenOrderTypeFields(orderType: ApiOrderType) {
  return orderType === 'dine_in' ? {} : { order_type: orderType };
}

export function toApiOrderType(value: unknown): ApiOrderType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (
    ['dinein', 'dineintable', 'dining', 'diningtable', 'table'].includes(
      normalized,
    )
  ) {
    return 'dine_in';
  }
  if (normalized === 'homedelivery' || normalized === 'delivery') {
    return 'home_delivery';
  }
  if (normalized === 'pickup' || normalized === 'takeaway') {
    return 'pickup';
  }
  return null;
}

export function resolveApiOrderType(
  value: unknown,
  table: { table_id?: unknown; id?: unknown } | null,
): ApiOrderType | null {
  return toApiOrderType(value) ?? (hasValidTableId(table) ? 'dine_in' : null);
}

export function hasValidTableId(table: {
  table_id?: unknown;
  id?: unknown;
} | null) {
  const tableId = table?.table_id ?? table?.id;
  return (
    (typeof tableId === 'string' || typeof tableId === 'number') &&
    String(tableId).trim().length > 0
  );
}

export function isValidAdminOrderType(value: unknown): value is NewOrderType {
  return (
    value === 'DINE_IN' ||
    value === 'HOME_DELIVERY' ||
    value === 'PICK_UP'
  );
}

export function getOrderSubmissionError({
  orderType,
  itemCount,
  table,
  hasDeliveryDetails,
}: {
  orderType: unknown;
  itemCount: number;
  table: { table_id?: unknown; id?: unknown } | null;
  hasDeliveryDetails: boolean;
}) {
  if (itemCount <= 0) {
    return 'Add food items before sending KOT.';
  }
  const apiOrderType = resolveApiOrderType(orderType, table);
  if (!apiOrderType) {
    return 'Choose dine-in, home delivery, or pickup.';
  }
  if (apiOrderType === 'dine_in' && !hasValidTableId(table)) {
    return 'Select a valid table before sending a dine-in order.';
  }
  if (apiOrderType === 'home_delivery' && !hasDeliveryDetails) {
    return 'Enter the customer name, a valid phone number, and delivery address.';
  }
  return null;
}
