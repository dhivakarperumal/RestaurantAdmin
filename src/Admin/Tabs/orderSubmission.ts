import type { NewOrderType } from '../Navigation/DashboardTypes';

export type ApiOrderType = 'dine_in' | 'home_delivery' | 'pickup';

export function toApiOrderType(value: unknown): ApiOrderType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'dine_in':
    case 'dining':
    case 'table':
      return 'dine_in';
    case 'home_delivery':
    case 'delivery':
      return 'home_delivery';
    case 'pick_up':
    case 'pickup':
    case 'take_away':
    case 'takeaway':
      return 'pickup';
    default:
      return null;
  }
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
  if (!isValidAdminOrderType(orderType) || !toApiOrderType(orderType)) {
    return 'Choose dine-in, home delivery, or pickup.';
  }
  if (orderType === 'DINE_IN' && !hasValidTableId(table)) {
    return 'Select a valid table before sending a dine-in order.';
  }
  if (orderType === 'HOME_DELIVERY' && !hasDeliveryDetails) {
    return 'Enter the customer name, a valid phone number, and delivery address.';
  }
  return null;
}
