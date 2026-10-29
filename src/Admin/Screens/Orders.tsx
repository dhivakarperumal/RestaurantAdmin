import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api, { getApiErrorMessage } from '../../../api';
import colors from '../../theme/colors';
import AssinedOrdertoDelivery from './AssinedOrdertoDelivery';
import {
  ArrowLeftIcon,
  BaseModal,
  CheckCircle2Icon,
  ConfirmDialog,
  DetailsModal,
  FilterIcon as LucideFilterIcon,
  PhoneIcon as LucidePhoneIcon,
  PrinterIcon as LucidePrinterIcon,
  Share2Icon,
  XIcon,
} from '../../components/popups';

/* ==========================================================================
   Types & Models
   ========================================================================== */

export type ApiOrderItem = {
  food_id?: string | number;
  food_name?: string;
  product_name?: string;
  name?: string;
  quantity?: number | string;
  total_price?: number | string;
  unit_price?: number | string;
  price?: number | string;
  image?: string;
  notes?: string;
};

export type ApiOrder = {
  id?: string | number;
  order_id?: string | number;
  order_number?: string | number;
  order_date?: string;
  created_at?: string;
  createdAt?: string;
  order_time?: string;
  time?: string;
  updated_at?: string;
  total_amount?: number | string;
  grand_total?: number | string;
  amount?: number | string;
  subtotal?: number | string;
  tax?: number | string;
  discount?: number | string;
  delivery_fee?: number | string;
  order_status?: string;
  status?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_mobile?: string;
  phone?: string;
  order_type?: string;
  orderType?: string;
  service_type?: string;
  kitchen_order_id?: string | number;
  kot_number?: string | number;
  event_id?: string | number;
  event_booking_id?: string | number;
  table_id?: string | number;
  table?: string | number;
  table_number?: string | number;
  payment_method?: string;
  payment_status?: string;
  delivery_address?: string;
  notes?: string;
  items?: ApiOrderItem[];
};

export type NormalizedStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

export type OrderTypeFilter =
  | 'All'
  | 'Kitchen Orders'
  | 'Dine-in Orders'
  | 'Pickup Orders'
  | 'Home Delivery'
  | 'Event Orders';
export type TimeFilter = 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month';
export type SortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

type OrdersScreenProps = {
  onBack?: () => void;
  onAddOrder?: () => void;
  onDeliveryAssignmentVisibilityChange?: (isVisible: boolean) => void;
};

/* ==========================================================================
   Utility Functions
   ========================================================================== */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractOrdersFromResponse(payload: unknown): ApiOrder[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord) as ApiOrder[];
  }
  if (!isRecord(payload)) {
    return [];
  }
  if (Array.isArray(payload.orders)) {
    return payload.orders.filter(isRecord) as ApiOrder[];
  }
  if (Array.isArray(payload.data)) {
    return payload.data.filter(isRecord) as ApiOrder[];
  }
  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.orders)) {
      return payload.data.orders.filter(isRecord) as ApiOrder[];
    }
    if (Array.isArray(payload.data.data)) {
      return payload.data.data.filter(isRecord) as ApiOrder[];
    }
  }
  if (Array.isArray(payload.results)) {
    return payload.results.filter(isRecord) as ApiOrder[];
  }
  if (Array.isArray(payload.rows)) {
    return payload.rows.filter(isRecord) as ApiOrder[];
  }
  return [];
}

function normalizeEventOrders(payload: unknown): ApiOrder[] {
  return extractOrdersFromResponse(payload).map(eventOrder => {
    const items = Array.isArray(eventOrder.items)
      ? eventOrder.items.map(item => ({
          ...item,
          food_name: item.food_name || item.product_name || item.name,
          unit_price: item.unit_price || item.price || item.total_price,
        }))
      : eventOrder.items;
    const eo = eventOrder as Record<string, any>;
    const eventId =
      eventOrder.event_id ||
      eo.event_booking_id ||
      eventOrder.id ||
      eventOrder.order_id;
    return {
      ...eventOrder,
      id: eventOrder.id || eventId,
      order_id: eventOrder.order_id || eo.event_order_number || eventId,
      order_number: eventOrder.order_number || eo.event_order_number,
      order_type: 'event',
      event_id: eventId,
      status: eventOrder.status || 'Confirmed',
      order_status: eventOrder.order_status || eventOrder.status || 'Confirmed',
      created_at: eventOrder.created_at || eo.event_date,
      total_amount:
        eventOrder.total_amount ||
        eventOrder.grand_total ||
        eventOrder.amount ||
        0,
      items,
    };
  });
}

function normalizeKitchenOrders(payload: unknown): ApiOrder[] {
  return extractOrdersFromResponse(payload).map(kitchenOrder => {
    const raw = kitchenOrder as Record<string, unknown>;
    const kitchenId =
      kitchenOrder.kitchen_order_id ||
      kitchenOrder.kot_number ||
      kitchenOrder.order_id ||
      kitchenOrder.id;
    const rawOrderType =
      kitchenOrder.order_type ||
      kitchenOrder.orderType ||
      kitchenOrder.service_type ||
      (typeof raw.type === 'string' ? raw.type : undefined);
    const hasTable = [
      kitchenOrder.table_id,
      kitchenOrder.table_number,
      kitchenOrder.table,
    ].some(value => value !== undefined && value !== null && String(value).trim() !== '');
    return {
      ...kitchenOrder,
      id: kitchenOrder.id || kitchenId,
      order_id: kitchenOrder.order_id || kitchenId,
      order_number: kitchenOrder.order_number || kitchenOrder.kot_number || kitchenId,
      kitchen_order_id: kitchenOrder.kitchen_order_id || kitchenId,
      kot_number: kitchenOrder.kot_number || kitchenId,
      order_type: rawOrderType || (hasTable ? 'dine-in' : 'kitchen'),
      status: kitchenOrder.status || kitchenOrder.order_status || 'Pending',
      order_status: kitchenOrder.order_status || kitchenOrder.status || 'Pending',
      created_at:
        kitchenOrder.created_at ||
        kitchenOrder.order_date ||
        (typeof raw.createdAt === 'string'
          ? raw.createdAt
          : typeof raw.order_time === 'string'
          ? raw.order_time
          : typeof raw.time === 'string'
          ? raw.time
          : undefined),
      total_amount:
        kitchenOrder.total_amount ||
        kitchenOrder.grand_total ||
        kitchenOrder.amount ||
        0,
    };
  });
}

function parseOrderDate(order: ApiOrder): Date | null {
  const raw =
    order.order_date ||
    order.created_at ||
    order.updated_at ||
    order.createdAt ||
    order.order_time ||
    order.time;
  if (!raw) return null;
  const normalized = raw.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/,
    '$1T$2',
  );
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactNumber(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

function formatOrderDate(date: Date | null): string {
  if (!date) return '—';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

function getRelativeTime(date: Date | null): string {
  if (!date) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function checkIsNonVeg(name: string): boolean {
  const n = String(name || '').toLowerCase();
  return (
    n.includes('chicken') ||
    n.includes('mutton') ||
    n.includes('fish') ||
    n.includes('prawn') ||
    n.includes('meat') ||
    n.includes('egg') ||
    n.includes('beef') ||
    n.includes('pork') ||
    n.includes('wings') ||
    n.includes('tikka') ||
    n.includes('omelette') ||
    n.includes('seafood') ||
    n.includes('non-veg') ||
    n.includes('nonveg')
  );
}

function normalizeStatus(statusRaw?: string): NormalizedStatus {
  const s = String(statusRaw || '').trim().toLowerCase();
  if (['pending', 'new', 'placed', 'order_placed', 'draft'].includes(s)) return 'Pending';
  if (['confirmed', 'accepted', 'approved'].includes(s)) return 'Confirmed';
  if (['preparing', 'cooking', 'in_progress', 'kitchen', 'processing'].includes(s)) return 'Preparing';
  if (['ready', 'ready_for_pickup', 'ready to serve', 'ready_to_serve', 'packed', 'served'].includes(s)) return 'Ready';
  if (['delivered', 'completed', 'finished', 'closed', 'settled'].includes(s)) return 'Delivered';
  if (['cancelled', 'canceled', 'rejected', 'failed'].includes(s)) return 'Cancelled';
  return 'Pending';
}

function getStatusTheme(status: NormalizedStatus) {
  switch (status) {
    case 'Pending':
      return {
        badgeBg: '#FFFBEB',
        badgeBorder: '#FDE68A',
        badgeText: '#B45309',
        headerBg: '#FEFCE8',
        accentColor: '#D97706',
        dotColor: '#F59E0B',
        label: 'Pending',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Start Preparing',
        nextActionIcon: '⚡',
      };
    case 'Confirmed':
      return {
        badgeBg: '#EFF6FF',
        badgeBorder: '#BFDBFE',
        badgeText: '#1D4ED8',
        headerBg: '#F0F7FF',
        accentColor: '#2563EB',
        dotColor: '#3B82F6',
        label: 'Confirmed',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Start Preparing',
        nextActionIcon: '👨‍🍳',
      };
    case 'Preparing':
      return {
        badgeBg: '#F5F3FF',
        badgeBorder: '#DDD6FE',
        badgeText: '#6D28D9',
        headerBg: '#FAF5FF',
        accentColor: '#7C3AED',
        dotColor: '#8B5CF6',
        label: 'Preparing',
        nextStatus: 'Ready' as NormalizedStatus,
        nextActionText: 'Mark as Ready',
        nextActionIcon: '🔔',
      };
    case 'Ready':
      return {
        badgeBg: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#047857',
        headerBg: '#F0FDF4',
        accentColor: '#059669',
        dotColor: '#10B981',
        label: 'Ready to Serve',
        nextStatus: 'Delivered' as NormalizedStatus,
        nextActionText: 'Complete Order',
        nextActionIcon: '✓',
      };
    case 'Delivered':
      return {
        badgeBg: '#F0FDF4',
        badgeBorder: '#BBF7D0',
        badgeText: '#15803D',
        headerBg: '#F8FAFC',
        accentColor: '#16A34A',
        dotColor: '#22C55E',
        label: 'Delivered',
        nextStatus: null,
        nextActionText: 'Completed',
        nextActionIcon: '✓',
      };
    case 'Cancelled':
      return {
        badgeBg: '#FEF2F2',
        badgeBorder: '#FECACA',
        badgeText: '#B91C1C',
        headerBg: '#FFF1F2',
        accentColor: '#DC2626',
        dotColor: '#EF4444',
        label: 'Cancelled',
        nextStatus: null,
        nextActionText: 'Cancelled',
        nextActionIcon: '✕',
      };
  }
}

function normalizeOrderType(raw?: string): string {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (t.includes('dine') || t.includes('dining') || t.includes('dinning') || t.includes('table')) {
    return 'Dine-in Orders';
  }
  if (t.includes('take') || t.includes('pick')) return 'Pickup Orders';
  if (t.includes('event') || t.includes('banquet') || t.includes('function')) return 'Event Orders';
  if (t.includes('kitchen') || t.includes('kot')) return 'Kitchen Orders';
  if (t.includes('deliv') || t.includes('online')) return 'Home Delivery';
  return raw ? String(raw) : 'Dine-in Orders';
}

function matchesOrderCategory(order: ApiOrder, category: OrderTypeFilter): boolean {
  if (category === 'All') return true;

  const raw = order as Record<string, unknown>;
  const rawType = String(
    order.order_type || order.orderType || order.service_type || raw.type || '',
  )
    .trim()
    .toLowerCase();
  const normalizedType = normalizeOrderType(rawType);

  if (category === 'Event Orders') {
    return (
      order.event_id !== undefined ||
      order.event_booking_id !== undefined ||
      normalizedType === 'Event Orders'
    );
  }
  if (category === 'Kitchen Orders') {
    return (
      order.kitchen_order_id !== undefined ||
      order.kot_number !== undefined ||
      normalizedType === 'Kitchen Orders'
    );
  }
  if (category === 'Pickup Orders') return normalizedType === 'Pickup Orders';
  if (category === 'Home Delivery') return normalizedType === 'Home Delivery';

  const hasTable =
    order.table_id !== undefined ||
    order.table_number !== undefined ||
    order.table !== undefined;
  return (
    normalizedType === 'Dine-in Orders' ||
    (hasTable &&
      normalizedType !== 'Pickup Orders' &&
      normalizedType !== 'Home Delivery' &&
      normalizedType !== 'Event Orders')
  );
}

function getOrderTypeConfig(orderType: string, tableNumber?: string | number) {
  const type = normalizeOrderType(orderType);
  if (type === 'Dine-in Orders') {
    return {
      type: 'dine-in',
      label: tableNumber ? `Table ${tableNumber}` : 'Dine-in',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    };
  }
  if (type === 'Pickup Orders') {
    return {
      type: 'takeaway',
      label: 'Pickup',
      bg: '#FEF3C7',
      border: '#FDE68A',
      text: '#92400E',
    };
  }
  if (type === 'Kitchen Orders') {
    return {
      type: 'kitchen',
      label: 'Kitchen KOT',
      bg: '#F5F3FF',
      border: '#DDD6FE',
      text: '#6D28D9',
    };
  }
  if (type === 'Event Orders') {
    return {
      type: 'event',
      label: 'Event Order',
      bg: '#FFF7ED',
      border: '#FED7AA',
      text: '#C2410C',
    };
  }
  if (type === 'Home Delivery') {
    return {
      type: 'delivery',
      label: 'Home Delivery',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E40AF',
    };
  }
  return {
    type: 'delivery',
    label: 'Delivery',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1E40AF',
  };
}

/* ==========================================================================
   Crisp SVG Icons & Badges
   ========================================================================== */

function DietaryBadge({ isNonVeg }: { isNonVeg: boolean }) {
  const borderColor = isNonVeg ? '#DC2626' : '#16A34A';
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor,
        borderRadius: 3.5,
        borderWidth: 1.2,
        height: 14,
        justifyContent: 'center',
        width: 14,
      }}
    >
      {isNonVeg ? (
        <Svg width={7} height={7} viewBox="0 0 10 10">
          <Path d="M5 1L9 8H1L5 1Z" fill="#DC2626" />
        </Svg>
      ) : (
        <View
          style={{
            backgroundColor: '#16A34A',
            borderRadius: 9999,
            height: 5.5,
            width: 5.5,
          }}
        />
      )}
    </View>
  );
}

function TableIcon({ color = '#065F46', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6.5" width="16" height="5.5" rx="1.8" stroke={color} strokeWidth="2" />
      <Path d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function BagIcon({ color = '#92400E', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8V6a6 6 0 0 1 12 0v2M4 8h16l1.5 13H2.5L4 8Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BikeIcon({ color = '#1E40AF', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5.5" cy="17.5" r="3.5" stroke={color} strokeWidth="2" />
      <Circle cx="18.5" cy="17.5" r="3.5" stroke={color} strokeWidth="2" />
      <Path
        d="M15 6h4l-3 6.5h-5l-2-4H5m10 4-3 5m-2-5H4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChefHatIcon({ color = '#6D28D9', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6v-7.13zM6 17h12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color = '#64748B', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function ClockIcon({ color = '#64748B', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function UserIcon({ color = '#64748B', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <Path d="M4 20a8 8 0 0 1 16 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function PhoneIcon({ color = '#116C0B', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NoteIcon({ color = '#D97706', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SearchIcon({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function RefreshIcon({ color = '#475569', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 4v6h-6M1 20v-6h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function OrdersBoxIcon({ color = '#64748B', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-2M8 4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M8 12h8M8 16h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PrinterIcon({ color = '#334155', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="6" y="14" width="12" height="8" rx="1" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/* ==========================================================================
   Admin Summary Stat Card (Matches Tables & Customers 2x2 Grid Pattern)
   ========================================================================== */

function OrderSummaryStatCard({
  label,
  value,
  tint,
  iconBackground,
  decorColor,
  icon,
  isActive = false,
  onPress,
}: {
  label: string;
  value: string | number;
  tint: string;
  iconBackground: string;
  decorColor: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '48%',
        minHeight: 88,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
        borderRadius: 20,
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? tint : '#F1F5F9',
        backgroundColor: isActive ? `${decorColor}40` : '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 14,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: isActive ? 3 : 1.5,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -28,
          right: -20,
          width: 74,
          height: 74,
          borderRadius: 37,
          backgroundColor: decorColor,
          opacity: 0.55,
        }}
      />
      <View
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 13,
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: tint,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
            lineHeight: 14,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: tint,
            fontSize: 22,
            fontWeight: '800',
            lineHeight: 28,
          }}
        >
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

/* ==========================================================================
   Main OrdersScreen Component
   ========================================================================== */

export function OrdersScreen({
  onBack,
  onAddOrder,
  onDeliveryAssignmentVisibilityChange,
}: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | NormalizedStatus>('All');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modals & States
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<ApiOrder | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [isDeliveryAssignmentOpen, setIsDeliveryAssignmentOpen] = useState(false);

  useEffect(() => {
    onDeliveryAssignmentVisibilityChange?.(isDeliveryAssignmentOpen);
  }, [isDeliveryAssignmentOpen, onDeliveryAssignmentVisibilityChange]);

  // Live Pulse Animation for Pending Status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Fetch orders from API
  const fetchOrders = useCallback(async (signal?: AbortSignal) => {
    setErrorMessage('');
    try {
      const [ordersResult, eventOrdersResult, kitchenOrdersResult] = await Promise.allSettled([
        api.get('/orders/management', {
          params: { page: 1, limit: 1000, pageSize: 1000 },
          signal,
          headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        }),
        api.get('/event-orders', {
          params: { page: 1, limit: 1000, pageSize: 1000 },
          signal,
          headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        }),
        api.get('/kitchen-orders', {
          params: { page: 1, limit: 1000, pageSize: 1000 },
          signal,
          headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        }),
      ]);

      if (signal?.aborted) return;
      const regularOrders =
        ordersResult.status === 'fulfilled'
          ? extractOrdersFromResponse(ordersResult.value.data)
          : [];
      const eventOrders =
        eventOrdersResult.status === 'fulfilled'
          ? normalizeEventOrders(eventOrdersResult.value.data)
          : [];
      const kitchenOrders =
        kitchenOrdersResult.status === 'fulfilled'
          ? normalizeKitchenOrders(kitchenOrdersResult.value.data)
          : [];
      const mergedOrders: ApiOrder[] = [];
      const seenOrderIds = new Set<string>();
      [...regularOrders, ...kitchenOrders, ...eventOrders].forEach(order => {
        const orderIds = [
          order.id,
          order.order_id,
          order.order_number,
          order.kitchen_order_id,
          order.kot_number,
        ]
          .filter(value => value !== undefined && value !== null && String(value).trim())
          .map(value => String(value).trim());
        if (orderIds.some(id => seenOrderIds.has(id))) return;
        orderIds.forEach(id => seenOrderIds.add(id));
        mergedOrders.push(order);
      });
      setOrders(mergedOrders);

      if (
        ordersResult.status === 'rejected' &&
        eventOrdersResult.status === 'rejected' &&
        kitchenOrdersResult.status === 'rejected'
      ) {
        throw ordersResult.reason;
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;
      const msg = getApiErrorMessage(
        err,
        'Could not load orders. Pull down to refresh.',
      );
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  // Update order status through the order-management API.
  const handleUpdateStatus = async (
    order: ApiOrder,
    newStatus: NormalizedStatus,
  ) => {
    const orderId = order.order_id || order.id || order.order_number;
    if (!orderId) {
      setStatusUpdateError('This order is missing its order number.');
      return;
    }

    const orderKey = String(orderId);
    setUpdatingOrderId(orderKey);
    setIsUpdatingStatus(true);
    setStatusUpdateError('');
    try {
      const response = await api.patch(
        `/orders/management/${encodeURIComponent(String(orderId))}/status`,
        { status: newStatus.toLowerCase() },
      );
      if (!isRecord(response.data) || response.data.success !== true) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The order status could not be updated.',
        );
      }

      setOrders(current =>
        current.map(currentOrder => {
          const id =
            currentOrder.order_id || currentOrder.id || currentOrder.order_number;
          return String(id) === String(orderId)
            ? { ...currentOrder, order_status: newStatus, status: newStatus }
            : currentOrder;
        }),
      );
      setSelectedOrder(current =>
        current &&
        String(current.order_id || current.id || current.order_number) === String(orderId)
          ? { ...current, order_status: newStatus, status: newStatus }
          : current,
      );
    } catch (error) {
      setStatusUpdateError(
        getApiErrorMessage(error, 'Could not update the order status.'),
      );
    } finally {
      setIsUpdatingStatus(false);
      setUpdatingOrderId(null);
    }
  };

  const toggleExpand = (orderKey: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  const orderCategoryCounts = useMemo(() => {
    const counts: Record<OrderTypeFilter, number> = {
      All: orders.length,
      'Kitchen Orders': 0,
      'Dine-in Orders': 0,
      'Pickup Orders': 0,
      'Home Delivery': 0,
      'Event Orders': 0,
    };
    orders.forEach(order => {
      (Object.keys(counts) as OrderTypeFilter[]).forEach(category => {
        if (category !== 'All' && matchesOrderCategory(order, category)) {
          counts[category] += 1;
        }
      });
    });
    return counts;
  }, [orders]);

  // Metric Stats
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let deliveredCount = 0;
    let todayRevenue = 0;

    orders.forEach(order => {
      const s = normalizeStatus(order.order_status || order.status);
      const amt = Number(order.total_amount || order.grand_total || order.amount || 0);
      if (s === 'Pending') pendingCount += 1;
      if (s === 'Preparing' || s === 'Confirmed') preparingCount += 1;
      if (s === 'Ready') readyCount += 1;
      if (s === 'Delivered') deliveredCount += 1;
      if (s !== 'Cancelled') todayRevenue += amt;
    });

    return {
      pending: pendingCount,
      preparing: preparingCount,
      ready: readyCount,
      delivered: deliveredCount,
      revenue: todayRevenue,
    };
  }, [orders]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== 'All') {
      result = result.filter(
        o => normalizeStatus(o.order_status || o.status) === statusFilter,
      );
    }

    if (orderTypeFilter !== 'All') {
      result = result.filter(o => matchesOrderCategory(o, orderTypeFilter));
    }

    if (timeFilter !== 'All') {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      ).getTime();
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      ).getTime();

      result = result.filter(o => {
        const d = parseOrderDate(o);
        if (!d) return false;
        const t = d.getTime();

        if (timeFilter === 'Today') return t >= todayStart && t <= todayEnd;
        if (timeFilter === 'Yesterday') {
          return t >= todayStart - 86400000 && t < todayStart;
        }
        if (timeFilter === 'This Week') {
          return t >= todayStart - 6 * 86400000 && t <= todayEnd;
        }
        if (timeFilter === 'This Month') {
          const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return t >= mStart && t <= todayEnd;
        }
        return true;
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(o => {
        const orderIdStr = String(
          o.order_id || o.id || o.order_number || '',
        ).toLowerCase();
        const customer = String(o.customer_name || '').toLowerCase();
        const phone = String(
          o.customer_phone || o.customer_mobile || o.phone || '',
        ).toLowerCase();
        const table = String(o.table_number || '').toLowerCase();
        const items = (o.items || [])
          .map(i =>
            String(i.food_name || i.product_name || i.name || '').toLowerCase(),
          )
          .join(' ');

        return (
          orderIdStr.includes(q) ||
          customer.includes(q) ||
          phone.includes(q) ||
          table.includes(q) ||
          items.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      const dateA = parseOrderDate(a)?.getTime() || 0;
      const dateB = parseOrderDate(b)?.getTime() || 0;
      const amtA = Number(a.total_amount || a.grand_total || a.amount || 0);
      const amtB = Number(b.total_amount || b.grand_total || b.amount || 0);

      switch (sortOption) {
        case 'oldest':
          return dateA - dateB;
        case 'amount_high':
          return amtB - amtA;
        case 'amount_low':
          return amtA - amtB;
        case 'newest':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [orders, statusFilter, orderTypeFilter, timeFilter, searchQuery, sortOption]);

  const activeFiltersCount =
    (orderTypeFilter !== 'All' ? 1 : 0) +
    (timeFilter !== 'All' ? 1 : 0) +
    (sortOption !== 'newest' ? 1 : 0);

  const resetAllFilters = () => {
    setStatusFilter('All');
    setOrderTypeFilter('All');
    setTimeFilter('All');
    setSortOption('newest');
    setSearchQuery('');
  };

  const printOrderReceipt = async (order: ApiOrder) => {
    const rawId = order.order_number || order.order_id || order.id || 'Order';
    const orderId = String(rawId).startsWith('#') ? String(rawId) : `#${rawId}`;
    const dateFormatted = formatOrderDate(parseOrderDate(order));
    const status = normalizeStatus(order.order_status || order.status);
    const orderType = normalizeOrderType(order.order_type);
    const table = order.table_number ? `Table ${order.table_number}` : orderType;
    const customer = order.customer_name || 'Walk-in Guest';
    const amount = formatCurrency(order.total_amount || order.grand_total || order.amount || 0);
    const items = order.items || [];

    const receiptLines = [
      '================================',
      '         ORDER RECEIPT          ',
      '================================',
      `Order: ${orderId}`,
      `Date: ${dateFormatted}`,
      `Customer: ${customer}`,
      `Type: ${table}`,
      `Status: ${status.toUpperCase()}`,
      '--------------------------------',
      ...items.map(item => {
        const name = item.food_name || item.product_name || item.name || 'Item';
        const qty = item.quantity || 1;
        const p = item.total_price || item.price || 0;
        return `• ${name} x${qty}  ${formatCurrency(p)}`;
      }),
      '--------------------------------',
      `TOTAL: ${amount}`,
      ...(order.notes ? ['', `SPECIAL NOTE: ${order.notes}`] : []),
      '================================',
    ];

    try {
      await Share.share({ title: `Order ${orderId}`, message: receiptLines.join('\n') });
    } catch {
      // ignore
    }
  };

  /* ==========================================================================
     Render Modern Ticket Card
     ========================================================================== */
  const renderOrderItem = ({ item }: { item: ApiOrder }) => {
    const rawId = item.order_number || item.order_id || item.id || 'Order';
    const orderKey = String(rawId);
    const orderDisplayId = orderKey.startsWith('#') ? orderKey : `#${orderKey}`;
    const orderDate = parseOrderDate(item);
    const dateFormatted = formatOrderDate(orderDate);
    const relativeTime = getRelativeTime(orderDate);
    const status = normalizeStatus(item.order_status || item.status);
    const theme = getStatusTheme(status);
    const typeConfig = getOrderTypeConfig(item.order_type || '', item.table_number);
    const amount = Number(item.total_amount || item.grand_total || item.amount || 0);
    const items = item.items || [];
    const isExpanded = Boolean(expandedOrders[orderKey]);
    const visibleItems = isExpanded ? items : items.slice(0, 3);
    const hasMoreItems = items.length > 3;
    const isPending = status === 'Pending';
    const isUpdatingThis = isUpdatingStatus && updatingOrderId === orderKey;

    return (
      <View
        className="mb-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2.5,
        }}
      >
        {/* 1. TICKET TOP HEADER BAR */}
        <View
          style={{
            backgroundColor: theme.headerBg,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
          className="px-4 py-2.5 flex-row items-center justify-between"
        >
          {/* Left: Order # Badge + Order Type Badge */}
          <View className="flex-row items-center gap-2">
            <View className="rounded-lg bg-slate-900 px-2.5 py-1 shadow-2xs">
              <Text className="text-xs font-black tracking-wider text-white">
                {orderDisplayId}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: typeConfig.bg,
                borderColor: typeConfig.border,
              }}
              className="flex-row items-center rounded-lg border px-2.5 py-1"
            >
              {typeConfig.type === 'dine-in' ? (
                <TableIcon color={typeConfig.text} size={12} />
              ) : typeConfig.type === 'takeaway' ? (
                <BagIcon color={typeConfig.text} size={12} />
              ) : typeConfig.type === 'kitchen' ? (
                <ChefHatIcon color={typeConfig.text} size={12} />
              ) : (
                <BikeIcon color={typeConfig.text} size={12} />
              )}
              <Text
                style={{ color: typeConfig.text }}
                className="ml-1 text-xs font-bold"
              >
                {typeConfig.label}
              </Text>
            </View>
          </View>

          {/* Right: Relative Time + Status Pill */}
          <View className="flex-row items-center gap-2">
            {relativeTime ? (
              <View className="flex-row items-center rounded-md bg-white/80 border border-slate-200/60 px-2 py-0.5">
                <ClockIcon color="#64748B" size={11} />
                <Text className="ml-1 text-[11px] font-semibold text-slate-600">
                  {relativeTime}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: theme.badgeBg,
                borderColor: theme.badgeBorder,
              }}
              className="flex-row items-center rounded-full border px-2.5 py-1"
            >
              {isPending ? (
                <Animated.View
                  style={{
                    backgroundColor: theme.dotColor,
                    transform: [{ scale: pulseAnim }],
                  }}
                  className="mr-1.5 h-2 w-2 rounded-full"
                />
              ) : (
                <View
                  style={{ backgroundColor: theme.dotColor }}
                  className="mr-1.5 h-2 w-2 rounded-full"
                />
              )}
              <Text
                style={{ color: theme.badgeText }}
                className="text-[11px] font-black"
              >
                {theme.label}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. CUSTOMER & PAYMENT ROW */}
        <View className="px-4 py-2.5 border-b border-slate-100 flex-row items-center justify-between bg-white">
          <View className="flex-1 flex-row items-center pr-2">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-100 mr-2">
              <UserIcon color="#475569" size={12} />
            </View>
            <Text
              className="text-[13px] font-bold text-slate-900"
              numberOfLines={1}
            >
              {item.customer_name || 'Walk-in Guest'}
            </Text>

            {item.customer_phone || item.customer_mobile || item.phone ? (
              <Pressable
                accessibilityLabel="Call Customer"
                accessibilityRole="button"
                onPress={() => {
                  const p = item.customer_phone || item.customer_mobile || item.phone;
                  if (p) Linking.openURL(`tel:${p}`);
                }}
                className="ml-2.5 flex-row items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 active:bg-emerald-100"
              >
                <PhoneIcon color="#059669" size={10} />
                <Text className="ml-1 text-[11px] font-bold text-emerald-700">
                  Call
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Payment Method Badge */}
          <View
            className={`rounded-md px-2 py-0.5 border ${
              item.payment_method?.toLowerCase().includes('cash') ||
              item.payment_method?.toLowerCase().includes('cod')
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-wider ${
                item.payment_method?.toLowerCase().includes('cash') ||
                item.payment_method?.toLowerCase().includes('cod')
                  ? 'text-amber-800'
                  : 'text-emerald-800'
              }`}
            >
              {item.payment_method || 'PAID'}
            </Text>
          </View>
        </View>

        {/* Delivery Address Pill (if available) */}
        {item.delivery_address ? (
          <View className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex-row items-center">
            <MapPinIcon color="#64748B" size={11} />
            <Text
              className="ml-1.5 text-[11px] font-medium text-slate-600 flex-1"
              numberOfLines={1}
            >
              {item.delivery_address}
            </Text>
          </View>
        ) : null}

        {/* 3. FOOD ITEMS SECTION */}
        <View className="px-4 py-3 bg-white">
          {items.length > 0 ? (
            <View>
              {visibleItems.map((food, idx) => {
                const name = food.food_name || food.product_name || food.name || 'Food item';
                const qty = Number(food.quantity) || 1;
                const unitPrice = Number(food.unit_price || food.price || 0);
                const itemTotal = Number(food.total_price) || unitPrice * qty;
                const isNonVeg = checkIsNonVeg(name);

                return (
                  <View
                    key={idx}
                    className={`flex-row items-center justify-between py-2 ${
                      idx > 0 ? 'border-t border-slate-100' : ''
                    }`}
                  >
                    {/* Left: Dietary Icon + Food Name */}
                    <View className="flex-1 flex-row items-center pr-3">
                      <DietaryBadge isNonVeg={isNonVeg} />
                      <Text
                        className="ml-2.5 flex-1 text-[13.5px] font-semibold text-slate-800"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>

                    {/* Right: Quantity Badge + Price */}
                    <View className="flex-row items-center gap-2.5">
                      <View className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5">
                        <Text className="text-xs font-black text-slate-700">
                          × {qty}
                        </Text>
                      </View>

                      <Text className="text-sm font-bold text-slate-900 min-w-[65px] text-right">
                        {itemTotal > 0 ? formatCurrency(itemTotal) : '—'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Show more/less toggle */}
              {hasMoreItems && (
                <Pressable
                  onPress={() => toggleExpand(orderKey)}
                  className="pt-2 flex-row items-center justify-center gap-1 active:opacity-75"
                >
                  <Text className="text-xs font-bold text-[#116C0B]">
                    {isExpanded
                      ? 'Show less items ▲'
                      : `+ ${items.length - 3} more items ▼`}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text className="text-xs italic text-slate-400 py-1">
              No individual item rows available
            </Text>
          )}

          {/* Notes / Special Request Banner (Single callout) */}
          {item.notes ? (
            <View className="mt-2.5 flex-row items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <NoteIcon color="#D97706" size={13} />
              <Text
                className="ml-2 flex-1 text-xs font-semibold text-amber-900"
                numberOfLines={2}
              >
                Special Request: {item.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 4. ORDER TOTAL CARD (Clear, framed & high-contrast) */}
        <View className="px-4 py-3 bg-slate-50/70 border-t border-dashed border-slate-300">
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderWidth: 1.2,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            {/* Top row of total card: label + items count + date */}
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
              <View className="flex-row items-center gap-1.5">
                <View className="h-5 w-5 items-center justify-center rounded-md bg-emerald-100">
                  <Text className="text-[10px] font-black text-emerald-800">₹</Text>
                </View>
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Order Total
                </Text>
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-slate-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>

              <Text className="text-[11px] font-semibold text-slate-400">
                {dateFormatted}
              </Text>
            </View>

            {/* Bottom row of total card: Amount to Pay & Payment method */}
            <View className="flex-row items-center justify-between pt-2">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Amount to Pay
                </Text>
                <Text className="text-2xl font-black text-[#116C0B] tracking-tight">
                  {formatCurrency(amount)}
                </Text>
              </View>

              <View className="items-end">
                <View
                  className={`flex-row items-center rounded-lg px-2.5 py-1 border ${
                    item.payment_method?.toLowerCase().includes('cash') ||
                    item.payment_method?.toLowerCase().includes('cod')
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      item.payment_method?.toLowerCase().includes('cash') ||
                      item.payment_method?.toLowerCase().includes('cod')
                        ? 'text-amber-800'
                        : 'text-emerald-800'
                    }`}
                  >
                    {item.payment_method || 'PAID'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 5. ACTION BUTTONS ROW */}
          <View className="flex-row items-center gap-2 pt-3">
            {/* Primary Workflow Status Button */}
            {theme.nextStatus ? (
              <Pressable
                accessibilityLabel={`Change order status to ${theme.nextStatus}`}
                accessibilityRole="button"
                disabled={isUpdatingStatus}
                onPress={() => handleUpdateStatus(item, theme.nextStatus!)}
                className="h-10 min-w-0 flex-1 flex-row items-center justify-center rounded-xl px-3 shadow-xs active:opacity-85"
                style={{ backgroundColor: theme.accentColor }}
              >
                {isUpdatingThis ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {theme.nextActionIcon ? (
                      <Text className="mr-1.5 text-xs text-white">
                        {theme.nextActionIcon}
                      </Text>
                    ) : null}
                    <Text className="text-center text-xs font-black text-white">
                      {theme.nextActionText}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Quick Print Receipt Button */}
            <Pressable
              accessibilityLabel="Share or Print Receipt"
              accessibilityRole="button"
              onPress={() => printOrderReceipt(item)}
              className="h-10 px-3 items-center justify-center rounded-xl border border-slate-200 bg-white active:bg-slate-100"
            >
              <PrinterIcon color="#334155" size={15} />
            </Pressable>

            {/* Quick Cancel for Pending orders */}
            {isPending && (
              <Pressable
                disabled={isUpdatingStatus}
                onPress={() => setOrderToCancel(item)}
                className="h-10 px-3 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 active:bg-rose-100"
              >
                <Text className="text-xs font-bold text-rose-700">Cancel</Text>
              </Pressable>
            )}

            {/* View Receipt / Details Button */}
            <Pressable
              onPress={() => setSelectedOrder(item)}
              className={`${
                theme.nextStatus ? 'px-3.5' : 'flex-1'
              } h-10 flex-row items-center justify-center rounded-xl border border-slate-200 bg-white active:bg-slate-100`}
            >
              <Text className="text-xs font-bold text-slate-800">
                Details
              </Text>
              <Text className="ml-1 text-xs font-bold text-slate-400">›</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  if (isDeliveryAssignmentOpen) {
    return (
      <AssinedOrdertoDelivery
        onBack={() => setIsDeliveryAssignmentOpen(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
    
     

      {/* SUMMARY STAT CARDS (Matches 2x2 Grid from Tables & Customers) */}
      <View className="bg-white px-5 pt-3.5 pb-2 border-b border-slate-200">
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {/* 1. Total Orders Card */}
          <OrderSummaryStatCard
            label="Total Orders"
            value={orders.length}
            tint="#166534"
            iconBackground="#DCFCE7"
            decorColor="#DCFCE7"
            icon={<OrdersBoxIcon color="#166534" size={20} />}
            isActive={statusFilter === 'All'}
            onPress={() => setStatusFilter('All')}
          />

          {/* 2. Pending Orders Card */}
          <OrderSummaryStatCard
            label="Pending"
            value={metrics.pending}
            tint="#9A3412"
            iconBackground="#FED7AA"
            decorColor="#FED7AA"
            icon={<ClockIcon color="#9A3412" size={20} />}
            isActive={statusFilter === 'Pending'}
            onPress={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
          />

          {/* 3. In Kitchen / Ready Card */}
          <OrderSummaryStatCard
            label="In Kitchen"
            value={metrics.preparing + metrics.ready}
            tint="#1D4ED8"
            iconBackground="#BFDBFE"
            decorColor="#BFDBFE"
            icon={<ChefHatIcon color="#1D4ED8" size={20} />}
            isActive={statusFilter === 'Preparing' || statusFilter === 'Ready'}
            onPress={() => setStatusFilter(statusFilter === 'Preparing' ? 'All' : 'Preparing')}
          />

          {/* 4. Total Revenue Card */}
          <OrderSummaryStatCard
            label="Total Revenue"
            value={formatCompactNumber(metrics.revenue)}
            tint="#6D28D9"
            iconBackground="#DDD6FE"
            decorColor="#DDD6FE"
            icon={<Text style={{ fontSize: 20, fontWeight: '900', color: '#6D28D9' }}>₹</Text>}
          />
        </View>

        {/* Category Pills (Dine-in, Takeaway, Delivery, etc.) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 4 }}
        >
          {(
            [
              'All',
              'Dine-in Orders',
              'Pickup Orders',
              'Home Delivery',
              'Kitchen Orders',
              'Event Orders',
            ] as OrderTypeFilter[]
          ).map(category => {
            const isActive = orderTypeFilter === category;
            return (
              <Pressable
                key={category}
                onPress={() => setOrderTypeFilter(category)}
                className={`flex-row items-center rounded-full border px-3 py-1.5 shadow-2xs ${
                  isActive
                    ? 'border-[#116C0B] bg-[#116C0B]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {category}
                </Text>
                <View
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-white/25' : 'bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {orderCategoryCounts[category]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* SEARCH BAR & FILTER ROW */}
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-200">
        <View className="flex-row items-center gap-2">
          {/* Search Input */}
          <View className="flex-1 flex-row items-center rounded-xl bg-slate-50 px-3 py-2 border border-slate-200">
            <SearchIcon color="#64748B" size={16} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search order #, customer, table, food..."
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-xs text-slate-900 p-0 font-medium"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} className="p-1">
                <Text className="text-xs font-black text-slate-400">✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filter Trigger Button */}
          <Pressable
            accessibilityLabel="Filter Orders"
            accessibilityRole="button"
            onPress={() => setShowFilterModal(true)}
            className={`flex-row items-center rounded-xl border px-3 py-2 shadow-2xs ${
              activeFiltersCount > 0
                ? 'border-[#116C0B] bg-emerald-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <LucideFilterIcon
              color={activeFiltersCount > 0 ? '#116C0B' : '#475569'}
              size={15}
            />
            <Text
              className={`ml-1.5 text-xs font-black ${
                activeFiltersCount > 0 ? 'text-[#116C0B]' : 'text-slate-700'
              }`}
            >
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Active Filter Reminder Pill */}
      {activeFiltersCount > 0 && (
        <View className="flex-row items-center justify-between px-5 py-2 bg-emerald-50/70 border-b border-emerald-100">
          <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
            <Text className="text-[11px] font-bold text-emerald-900">Active Filters:</Text>
            {orderTypeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-emerald-200 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-emerald-800">
                  {orderTypeFilter}
                </Text>
              </View>
            )}
            {timeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-emerald-200 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-emerald-800">
                  {timeFilter}
                </Text>
              </View>
            )}
            {sortOption !== 'newest' && (
              <View className="rounded-md bg-white border border-emerald-200 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-emerald-800">
                  {sortOption === 'amount_high' ? 'Highest' : 'Oldest'}
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={resetAllFilters}>
            <Text className="text-[11px] font-black text-rose-600">Reset All</Text>
          </Pressable>
        </View>
      )}

      {statusUpdateError ? (
        <Text
          accessibilityRole="alert"
          className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {statusUpdateError}
        </Text>
      ) : null}

      {/* MAIN ORDER LIST SECTION */}
      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            Loading real-time orders...
          </Text>
        </View>
      ) : errorMessage && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
            <Text className="text-2xl font-black text-red-500">!</Text>
          </View>
          <Text className="mt-4 text-center text-base font-bold text-slate-900">
            Unable to Load Orders
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            {errorMessage}
          </Text>
          <Pressable
            onPress={() => fetchOrders()}
            className="mt-4 rounded-xl bg-[#116C0B] px-6 py-2.5 shadow-sm active:bg-[#0D5208]"
          >
            <Text className="text-xs font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item =>
            String(item.order_id || item.id || item.order_number || Math.random())
          }
          renderItem={renderOrderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: insets.bottom + 90,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
                <OrdersBoxIcon color="#94A3B8" size={30} />
              </View>
              <Text className="mt-4 text-base font-bold text-slate-900">
                No Orders Found
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-500 max-w-[260px]">
                {searchQuery || statusFilter !== 'All' || activeFiltersCount > 0
                  ? 'No orders match your selected filters. Tap below to clear filters.'
                  : 'New orders placed by customers or staff will show up here.'}
              </Text>
              {(searchQuery || statusFilter !== 'All' || activeFiltersCount > 0) && (
                <Pressable
                  onPress={resetAllFilters}
                  className="mt-4 rounded-xl border border-[#116C0B] bg-emerald-50 px-4 py-2 shadow-xs active:bg-emerald-100"
                >
                  <Text className="text-xs font-bold text-[#116C0B]">
                    Clear All Filters
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* Floating Action Button for Delivery Assignment */}
      <Pressable
        accessibilityLabel="Assign order to delivery"
        accessibilityRole="button"
        onPress={() => setIsDeliveryAssignmentOpen(true)}
        className="absolute h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg active:bg-[#0D5208]"
        style={{
          bottom: insets.bottom + 0,
          right: 20,
          elevation: 8,
          shadowColor: '#052E10',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          zIndex: 20,
        }}
      >
        <BikeIcon color="#FFFFFF" size={24} />
      </Pressable>

      {/* FILTER DRAWER / MODAL */}
      <BaseModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter & Sort Orders"
        subtitle="Narrow down orders by type, timeframe, or sorting"
        variant="bottom-sheet"
        footer={
          <View className="w-full flex-row gap-3">
            <Pressable
              onPress={resetAllFilters}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-100"
            >
              <Text className="text-sm font-semibold text-slate-700">Reset</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Apply order filters"
              accessibilityRole="button"
              onPress={() => setShowFilterModal(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] px-4 active:bg-[#0D5208]"
            >
              <Text className="text-center text-sm font-bold text-white">
                Apply Filters
              </Text>
            </Pressable>
          </View>
        }
      >
        <ScrollView className="max-h-[380px]" contentContainerClassName="py-2 gap-4">
          {/* Order Type */}
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Order Type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  'All',
                  'Dine-in Orders',
                  'Pickup Orders',
                  'Home Delivery',
                  'Kitchen Orders',
                  'Event Orders',
                ] as OrderTypeFilter[]
              ).map(type => {
                const isSelected = orderTypeFilter === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setOrderTypeFilter(type)}
                    className={`rounded-2xl border px-3.5 py-2.5 ${
                      isSelected
                        ? 'border-[#116C0B] bg-[#116C0B]/10'
                        : 'border-slate-200 bg-white active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#116C0B]' : 'text-slate-700'
                      }`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Time Period */}
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Time Period
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                ['All', 'Today', 'Yesterday', 'This Week', 'This Month'] as TimeFilter[]
              ).map(time => {
                const isSelected = timeFilter === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => setTimeFilter(time)}
                    className={`rounded-2xl border px-3.5 py-2.5 ${
                      isSelected
                        ? 'border-[#116C0B] bg-[#116C0B]/10'
                        : 'border-slate-200 bg-white active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#116C0B]' : 'text-slate-700'
                      }`}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sort Order */}
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Sort Orders By
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { id: 'newest', label: 'Newest First' },
                { id: 'oldest', label: 'Oldest First' },
                { id: 'amount_high', label: 'Amount: High to Low' },
                { id: 'amount_low', label: 'Amount: Low to High' },
              ].map(sort => {
                const isSelected = sortOption === sort.id;
                return (
                  <Pressable
                    key={sort.id}
                    onPress={() => setSortOption(sort.id as SortOption)}
                    className={`rounded-2xl border px-3.5 py-2.5 ${
                      isSelected
                        ? 'border-[#116C0B] bg-[#116C0B]/10'
                        : 'border-slate-200 bg-white active:bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-[#116C0B]' : 'text-slate-700'
                      }`}
                    >
                      {sort.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </BaseModal>

      {/* CANCEL CONFIRMATION DIALOG */}
      <ConfirmDialog
        visible={orderToCancel !== null}
        onClose={() => setOrderToCancel(null)}
        onConfirm={async () => {
          if (orderToCancel) {
            const target = orderToCancel;
            setOrderToCancel(null);
            await handleUpdateStatus(target, 'Cancelled');
          }
        }}
        title="Cancel Order"
        message={`Are you sure you want to cancel order #${orderToCancel?.order_number || orderToCancel?.order_id || orderToCancel?.id}? This action will mark it as Cancelled.`}
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Order"
        isDestructive={true}
        variantType="danger"
        isLoading={isUpdatingStatus}
      />

      {/* FULL RECEIPT / ORDER DETAILS MODAL */}
      {selectedOrder ? (
        <DetailsModal
          visible={selectedOrder !== null}
          onClose={() => setSelectedOrder(null)}
          title={
            String(
              selectedOrder.order_number ||
                selectedOrder.order_id ||
                selectedOrder.id ||
                'Order',
            ).startsWith('#')
              ? String(
                  selectedOrder.order_number ||
                    selectedOrder.order_id ||
                    selectedOrder.id,
                )
              : `#${
                  selectedOrder.order_number ||
                    selectedOrder.order_id ||
                    selectedOrder.id
                }`
          }
          subtitle={formatOrderDate(parseOrderDate(selectedOrder))}
          badge={(() => {
            const s = normalizeStatus(
              selectedOrder.order_status || selectedOrder.status,
            );
            const theme = getStatusTheme(s);
            return {
              label: theme.label,
              bg: theme.badgeBg,
              text: theme.badgeText,
              border: theme.badgeBorder,
            };
          })()}
          footer={
            <View className="w-full flex-row gap-2.5">
              <Pressable
                accessibilityLabel="Share or Print Receipt"
                accessibilityRole="button"
                onPress={() => printOrderReceipt(selectedOrder)}
                className="h-12 flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-100"
              >
                <PrinterIcon color="#0F172A" size={16} />
                <Text className="ml-2 text-sm font-bold text-slate-800">
                  Share / Print
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedOrder(null)}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-slate-900 active:bg-slate-800"
              >
                <Text className="text-sm font-bold text-white">Close</Text>
              </Pressable>
            </View>
          }
        >
          <View className="gap-3">
            {/* Guest & Table Info */}
            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Customer Details
                  </Text>
                  <Text className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedOrder.customer_name || 'Walk-in Customer'}
                  </Text>
                  {selectedOrder.customer_phone ||
                  selectedOrder.customer_mobile ||
                  selectedOrder.phone ? (
                    <Pressable
                      onPress={() => {
                        const p =
                          selectedOrder.customer_phone ||
                          selectedOrder.customer_mobile ||
                          selectedOrder.phone;
                        if (p) Linking.openURL(`tel:${p}`);
                      }}
                      className="mt-1 flex-row items-center gap-1"
                    >
                      <PhoneIcon color="#116C0B" size={12} />
                      <Text className="text-xs font-bold text-[#116C0B]">
                        Call:{' '}
                        {selectedOrder.customer_phone ||
                          selectedOrder.customer_mobile ||
                          selectedOrder.phone}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View className="items-end">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Order Type
                  </Text>
                  <Text className="text-sm font-bold text-slate-900 mt-0.5">
                    {normalizeOrderType(selectedOrder.order_type)}
                  </Text>
                  {selectedOrder.table_number ? (
                    <Text className="text-xs font-bold text-[#116C0B] mt-0.5">
                      Table: {selectedOrder.table_number}
                    </Text>
                  ) : null}
                </View>
              </View>

              {selectedOrder.delivery_address ? (
                <View className="mt-2.5 pt-2 border-t border-slate-200">
                  <Text className="text-[10px] font-bold text-slate-500">
                    Delivery Address:
                  </Text>
                  <Text className="text-xs text-slate-700 mt-0.5">
                    {selectedOrder.delivery_address}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Change Status Stepper Buttons */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Update Order Status
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {(
                  [
                    'Pending',
                    'Confirmed',
                    'Preparing',
                    'Ready',
                    'Delivered',
                    'Cancelled',
                  ] as NormalizedStatus[]
                ).map(s => {
                  const currentStatus = normalizeStatus(
                    selectedOrder.order_status || selectedOrder.status,
                  );
                  const isCurrent = currentStatus === s;
                  const theme = getStatusTheme(s);
                  return (
                    <Pressable
                      key={s}
                      disabled={isUpdatingStatus}
                      onPress={() => handleUpdateStatus(selectedOrder, s)}
                      className={`rounded-2xl border px-3.5 py-2 flex-row items-center gap-1.5 ${
                        isCurrent
                          ? 'border-[#116C0B] bg-[#116C0B]'
                          : 'border-slate-200 bg-white active:bg-slate-50'
                      }`}
                    >
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: isCurrent ? '#FFFFFF' : theme.dotColor,
                        }}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Itemized Bill Table */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Order Items ({selectedOrder.items?.length || 0})
              </Text>

              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <View className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-3.5">
                  {selectedOrder.items.map((food, idx) => {
                    const itemName =
                      food.food_name || food.product_name || food.name || 'Item';
                    const qty = Number(food.quantity) || 1;
                    const unitPrice = Number(food.unit_price || food.price || 0);
                    const totalPrice =
                      Number(food.total_price) || unitPrice * qty;
                    const isNonVeg = checkIsNonVeg(itemName);

                    return (
                      <View
                        key={idx}
                        className={`flex-row items-center justify-between p-3.5 ${
                          idx > 0 ? 'border-t border-slate-100' : ''
                        }`}
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                          <DietaryBadge isNonVeg={isNonVeg} />
                          <View className="h-6 w-6 items-center justify-center rounded-md bg-emerald-50 border border-emerald-200">
                            <Text className="text-xs font-black text-emerald-800">
                              {qty}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-900">
                              {itemName}
                            </Text>
                            <Text className="text-xs text-slate-500">
                              {qty} × {formatCurrency(unitPrice)}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-sm font-black text-slate-900">
                          {formatCurrency(totalPrice)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {/* Pricing Summary Breakdown */}
            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-2">
              {selectedOrder.subtotal ? (
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-xs text-slate-500">Subtotal</Text>
                  <Text className="text-xs font-semibold text-slate-700">
                    {formatCurrency(selectedOrder.subtotal)}
                  </Text>
                </View>
              ) : null}

              {selectedOrder.tax ? (
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-xs text-slate-500">GST / Taxes</Text>
                  <Text className="text-xs font-semibold text-slate-700">
                    {formatCurrency(selectedOrder.tax)}
                  </Text>
                </View>
              ) : null}

              {selectedOrder.delivery_fee ? (
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-xs text-slate-500">Delivery Fee</Text>
                  <Text className="text-xs font-semibold text-slate-700">
                    {formatCurrency(selectedOrder.delivery_fee)}
                  </Text>
                </View>
              ) : null}

              {/* Highlighted Grand Total Box */}
              <View className="flex-row items-center justify-between p-3.5 mt-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Grand Total
                  </Text>
                  <Text className="text-xs text-emerald-700 font-semibold mt-0.5">
                    Final Invoice Amount
                  </Text>
                </View>
                <Text className="text-2xl font-black text-[#116C0B]">
                  {formatCurrency(
                    selectedOrder.total_amount ||
                      selectedOrder.grand_total ||
                      selectedOrder.amount ||
                      0,
                  )}
                </Text>
              </View>
            </View>
          </View>
        </DetailsModal>
      ) : null}
    </View>
  );
}

export default OrdersScreen;
