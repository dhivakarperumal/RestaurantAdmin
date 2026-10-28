import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
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

export type OrderTypeFilter = 'All' | 'Dine-in' | 'Takeaway' | 'Delivery';
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

function parseOrderDate(order: ApiOrder): Date | null {
  const raw = order.order_date || order.created_at || order.updated_at;
  if (!raw) return null;
  const d = new Date(raw);
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
        headerBg: '#FFFBEB',
        accentColor: '#F59E0B',
        dotColor: '#D97706',
        label: 'Pending',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Start Preparing',
      };
    case 'Confirmed':
      return {
        badgeBg: '#EFF6FF',
        badgeBorder: '#BFDBFE',
        badgeText: '#1D4ED8',
        headerBg: '#F0F7FF',
        accentColor: '#3B82F6',
        dotColor: '#2563EB',
        label: 'Confirmed',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Start Preparing',
      };
    case 'Preparing':
      return {
        badgeBg: '#F5F3FF',
        badgeBorder: '#DDD6FE',
        badgeText: '#6D28D9',
        headerBg: '#F5F3FF',
        accentColor: '#8B5CF6',
        dotColor: '#7C3AED',
        label: 'Preparing',
        nextStatus: 'Ready' as NormalizedStatus,
        nextActionText: 'Mark as Ready',
      };
    case 'Ready':
      return {
        badgeBg: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#047857',
        headerBg: '#F0FDF4',
        accentColor: '#10B981',
        dotColor: '#16A34A',
        label: 'Ready to Serve',
        nextStatus: 'Delivered' as NormalizedStatus,
        nextActionText: 'Complete Order',
      };
    case 'Delivered':
      return {
        badgeBg: '#F0FDF4',
        badgeBorder: '#BBF7D0',
        badgeText: '#15803D',
        headerBg: '#F0FDF4',
        accentColor: '#16A34A',
        dotColor: '#22C55E',
        label: 'Delivered',
        nextStatus: null,
        nextActionText: 'Completed',
      };
    case 'Cancelled':
      return {
        badgeBg: '#FEF2F2',
        badgeBorder: '#FECACA',
        badgeText: '#B91C1C',
        headerBg: '#FEF2F2',
        accentColor: '#EF4444',
        dotColor: '#DC2626',
        label: 'Cancelled',
        nextStatus: null,
        nextActionText: 'Cancelled',
      };
  }
}

function normalizeOrderType(raw?: string): string {
  const t = String(raw || '').trim().toLowerCase();
  if (t.includes('dine') || t.includes('table')) return 'Dine-in';
  if (t.includes('take') || t.includes('pick')) return 'Takeaway';
  if (t.includes('deliv') || t.includes('online')) return 'Delivery';
  return raw ? String(raw) : 'Dine-in';
}

function getOrderTypeConfig(orderType: string, tableNumber?: string | number) {
  const type = normalizeOrderType(orderType);
  if (type === 'Dine-in') {
    return {
      type: 'dine-in',
      label: tableNumber ? `Table ${tableNumber}` : 'Dine-in',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    };
  }
  if (type === 'Takeaway') {
    return {
      type: 'takeaway',
      label: 'Takeaway',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
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

const STATUS_TABS: ('All' | NormalizedStatus)[] = [
  'All',
  'Pending',
  'Preparing',
  'Ready',
  'Delivered',
  'Cancelled',
];

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

function FilterIcon({ color = '#475569', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function CheckIcon({ color = '#FFFFFF', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6 9 17l-5-5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ color = '#FFFFFF', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function OrdersBoxIcon({ color = '#64748B', size = 28 }: { color?: string; size?: number }) {
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

  // Modals & Expand States
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeliveryAssignmentOpen, setIsDeliveryAssignmentOpen] = useState(false);

  useEffect(() => {
    onDeliveryAssignmentVisibilityChange?.(isDeliveryAssignmentOpen);
  }, [isDeliveryAssignmentOpen, onDeliveryAssignmentVisibilityChange]);

  // Live Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
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
      const response = await api.get('/orders/management', {
        signal,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      const rows = extractOrdersFromResponse(response.data);
      setOrders(rows);
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

  // Update order status with API & Optimistic UI
  const handleUpdateStatus = async (
    order: ApiOrder,
    newStatus: NormalizedStatus,
  ) => {
    const orderId = order.order_id || order.id || order.order_number;
    if (!orderId) return;

    setIsUpdatingStatus(true);

    setOrders(current =>
      current.map(o => {
        const id = o.order_id || o.id || o.order_number;
        if (String(id) === String(orderId)) {
          return {
            ...o,
            order_status: newStatus,
            status: newStatus,
          };
        }
        return o;
      }),
    );

    if (selectedOrder) {
      setSelectedOrder(prev =>
        prev ? { ...prev, order_status: newStatus, status: newStatus } : null,
      );
    }

    try {
      await api
        .put(`/orders/management/${orderId}`, { status: newStatus })
        .catch(async () => {
          return await api
            .patch(`/orders/${orderId}/status`, { status: newStatus })
            .catch(async () => {
              return await api.put(`/orders/${orderId}`, {
                order_status: newStatus,
              });
            });
        });
    } catch {
      // Retain optimistic update
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleExpand = (orderKey: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: orders.length,
      Pending: 0,
      Confirmed: 0,
      Preparing: 0,
      Ready: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    orders.forEach(order => {
      const s = normalizeStatus(order.order_status || order.status);
      counts[s] = (counts[s] || 0) + 1;
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
      result = result.filter(
        o => normalizeOrderType(o.order_type) === orderTypeFilter,
      );
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
      ...(order.notes ? ['', `NOTES: ${order.notes}`] : []),
      '================================',
    ];

    try {
      await Share.share({ title: `Order ${orderId}`, message: receiptLines.join('\n') });
    } catch {
      // ignore
    }
  };

  // Render Modern Order Card
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

    return (
      <View
        className="mb-3.5 overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* TICKET TOP HEADER BAR */}
        <View
          style={{
            backgroundColor: theme.headerBg,
            borderColor: theme.badgeBorder,
          }}
          className="border-b px-4 py-2.5 flex-row items-center justify-between"
        >
          {/* Left: Order # Badge + Order Type Badge */}
          <View className="flex-row items-center gap-2">
            <View className="rounded-md bg-[#0F172A] px-2.5 py-1">
              <Text className="text-xs font-black tracking-wider text-white">
                {orderDisplayId}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: typeConfig.bg,
                borderColor: typeConfig.border,
              }}
              className="flex-row items-center rounded-md border px-2 py-0.5"
            >
              {typeConfig.type === 'dine-in' ? (
                <TableIcon color={typeConfig.text} size={12} />
              ) : typeConfig.type === 'takeaway' ? (
                <BagIcon color={typeConfig.text} size={12} />
              ) : (
                <BikeIcon color={typeConfig.text} size={12} />
              )}
              <Text
                style={{ color: typeConfig.text }}
                className="ml-1 text-xs font-black"
              >
                {typeConfig.label}
              </Text>
            </View>
          </View>

          {/* Right: Time Ago + Status Pill */}
          <View className="flex-row items-center gap-2">
            {relativeTime ? (
              <View className="flex-row items-center">
                <ClockIcon color="#64748B" size={12} />
                <Text className="ml-1 text-[11px] font-bold text-[#64748B]">
                  {relativeTime}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: theme.badgeBorder,
              }}
              className="flex-row items-center rounded-full border px-2.5 py-1"
            >
              {status === 'Pending' ? (
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

        {/* CUSTOMER & PAYMENT ROW */}
        <View className="px-4 py-2.5 border-b border-[#F1F5F9] flex-row items-center justify-between bg-white">
          <View className="flex-1 flex-row items-center pr-2">
            <UserIcon color="#475569" size={13} />
            <Text className="ml-1.5 text-xs font-bold text-[#0F172A]" numberOfLines={1}>
              {item.customer_name || 'Walk-in Guest'}
            </Text>

            {item.customer_phone || item.customer_mobile || item.phone ? (
              <Pressable
                onPress={() => {
                  const p = item.customer_phone || item.customer_mobile || item.phone;
                  if (p) Linking.openURL(`tel:${p}`);
                }}
                className="ml-2 flex-row items-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.5"
              >
                <PhoneIcon color="#116C0B" size={10} />
                <Text className="ml-1 text-[11px] font-bold text-[#116C0B]">
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
                ? 'bg-[#FEF3C7] border-[#FDE68A]'
                : 'bg-[#ECFDF5] border-[#A7F3D0]'
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-wider ${
                item.payment_method?.toLowerCase().includes('cash') ||
                item.payment_method?.toLowerCase().includes('cod')
                  ? 'text-[#92400E]'
                  : 'text-[#065F46]'
              }`}
            >
              {item.payment_method || 'PAID'}
            </Text>
          </View>
        </View>

        {/* FOOD ITEMS LIST SECTION */}
        <View className="px-4 py-3 bg-white">
          {/* Notes Callout if present */}
          {item.notes ? (
            <View className="mb-2.5 flex-row items-center rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
              <NoteIcon color="#D97706" size={13} />
              <Text
                className="ml-2 flex-1 text-xs font-semibold text-[#92400E]"
                numberOfLines={2}
              >
                Note: {item.notes}
              </Text>
            </View>
          ) : null}

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
                      idx > 0 ? 'border-t border-[#F8FAFC]' : ''
                    }`}
                  >
                    {/* Left: Dietary Icon + Food Name */}
                    <View className="flex-1 flex-row items-center pr-3">
                      <DietaryBadge isNonVeg={isNonVeg} />
                      <Text
                        className="ml-2.5 flex-1 text-sm font-bold text-[#1E293B]"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>

                    {/* Right: Quantity Badge + Price */}
                    <View className="flex-row items-center gap-2.5">
                      <View className="rounded-md bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5">
                        <Text className="text-xs font-black text-[#475569]">
                          × {qty}
                        </Text>
                      </View>

                      <Text className="text-sm font-black text-[#0F172A] min-w-[65px] text-right">
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
                  className="pt-2 flex-row items-center justify-center gap-1"
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
            <Text className="text-xs italic text-[#94A3B8] py-1">
              No individual item rows available
            </Text>
          )}
        </View>

        {/* TICKET FOOTER: TOTAL & ACTION BUTTONS */}
        <View className="border-t border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                Order Total • {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
              <Text className="text-base font-black text-[#116C0B] mt-0.5">
                {formatCurrency(amount)}
              </Text>
            </View>

            <Text className="text-[11px] font-semibold text-[#94A3B8]">
              {dateFormatted}
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row items-center gap-2">
            {/* Quick Status Action Button */}
            {theme.nextStatus ? (
              <Pressable
                disabled={isUpdatingStatus}
                onPress={() => handleUpdateStatus(item, theme.nextStatus!)}
                className="flex-1 h-10 flex-row items-center justify-center rounded-xl bg-[#116C0B] px-3 active:bg-[#0D5208] shadow-xs"
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckIcon color="#FFFFFF" size={14} />
                    <Text className="ml-1.5 text-xs font-black text-white">
                      {theme.nextActionText}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Quick Cancel for Pending orders */}
            {status === 'Pending' && (
              <Pressable
                disabled={isUpdatingStatus}
                onPress={() => handleUpdateStatus(item, 'Cancelled')}
                className="h-10 px-3 items-center justify-center rounded-xl bg-[#FEF2F2] border border-[#FECACA] active:bg-[#FEE2E2]"
              >
                <Text className="text-xs font-black text-[#DC2626]">Cancel</Text>
              </Pressable>
            )}

            {/* View Receipt / Details Button */}
            <Pressable
              onPress={() => setSelectedOrder(item)}
              className={`${
                theme.nextStatus ? 'flex-1' : 'w-full'
              } h-10 flex-row items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-3 active:bg-[#F1F5F9] shadow-xs`}
            >
              <Text className="text-xs font-black text-[#0F172A]">
                View Receipt
              </Text>
              <Text className="ml-1 text-xs font-black text-[#64748B]">›</Text>
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
      {/* Modern Executive Page Header */}
      <View className="bg-white px-5 pt-3.5 pb-3 border-b border-[#E2E8F0] shadow-xs">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black text-[#0F172A] tracking-tight">
                Order Management
              </Text>
              <View className="flex-row items-center gap-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5">
                <Animated.View
                  className="h-2 w-2 rounded-full bg-[#16A34A]"
                  style={{ transform: [{ scale: pulseAnim }] }}
                />
                <Text className="text-[11px] font-black text-[#065F46]">
                  LIVE ({orders.length})
                </Text>
              </View>
            </View>
            <Text className="text-xs font-semibold text-[#64748B] mt-0.5">
              Live orders, kitchen queue & delivery tracking
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {onAddOrder ? (
              <Pressable
                onPress={onAddOrder}
                className="h-9 flex-row items-center rounded-xl bg-[#116C0B] px-3 active:bg-[#0D5208] shadow-xs"
              >
                <PlusIcon color="#FFFFFF" size={16} />
                <Text className="ml-1 text-xs font-black text-white">New</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityLabel="Refresh orders"
              onPress={onRefresh}
              className="h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] active:bg-[#E2E8F0]"
            >
              <RefreshIcon color="#334155" size={16} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Interactive Metric Cards Carousel */}
      <View className="bg-white px-5 py-2.5 border-b border-[#E2E8F0]">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
        >
          {/* 1. Pending Action */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Pending'
                ? 'bg-[#FEF3C7] border-[#F59E0B] shadow-xs'
                : 'bg-[#FFFBEB] border-[#FDE68A]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#FDE68A]">
              <Text className="text-sm font-black text-[#B45309]">⚡</Text>
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#92400E]">
                Pending
              </Text>
              <Text className="text-lg font-black text-[#78350F]">
                {metrics.pending}
              </Text>
            </View>
          </Pressable>

          {/* 2. Cooking / Preparing */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Preparing' ? 'All' : 'Preparing')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Preparing'
                ? 'bg-[#EDE9FE] border-[#8B5CF6] shadow-xs'
                : 'bg-[#F5F3FF] border-[#DDD6FE]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#DDD6FE]">
              <Text className="text-sm font-black text-[#6D28D9]">👨‍🍳</Text>
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#6D28D9]">
                Preparing
              </Text>
              <Text className="text-lg font-black text-[#5B21B6]">
                {metrics.preparing}
              </Text>
            </View>
          </Pressable>

          {/* 3. Ready */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Ready' ? 'All' : 'Ready')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Ready'
                ? 'bg-[#DCFCE7] border-[#10B981] shadow-xs'
                : 'bg-[#ECFDF5] border-[#A7F3D0]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#A7F3D0]">
              <Text className="text-sm font-black text-[#065F46]">🔔</Text>
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#065F46]">
                Ready
              </Text>
              <Text className="text-lg font-black text-[#064E3B]">
                {metrics.ready}
              </Text>
            </View>
          </Pressable>

          {/* 4. Delivered */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Delivered' ? 'All' : 'Delivered')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Delivered'
                ? 'bg-[#DCFCE7] border-[#16A34A] shadow-xs'
                : 'bg-[#F0FDF4] border-[#BBF7D0]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#BBF7D0]">
              <Text className="text-sm font-black text-[#15803D]">✓</Text>
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#15803D]">
                Delivered
              </Text>
              <Text className="text-lg font-black text-[#14532D]">
                {metrics.delivered}
              </Text>
            </View>
          </Pressable>

          {/* 5. Revenue */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 min-w-[135px]">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#E2E8F0]">
              <Text className="text-sm font-black text-[#334155]">₹</Text>
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                Revenue
              </Text>
              <Text className="text-lg font-black text-[#0F172A]">
                {formatCompactNumber(metrics.revenue)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Search Bar & Filter Controls Row */}
      <View className="bg-white px-5 pt-3 pb-2.5 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-2">
          {/* Search Input */}
          <View className="flex-1 flex-row items-center rounded-xl bg-[#F8FAFC] px-3.5 py-2 border border-[#CBD5E1]">
            <SearchIcon color="#64748B" size={17} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search order #, customer, table, food..."
              placeholderTextColor="#94A3B8"
              className="ml-2.5 flex-1 text-xs text-[#0F172A] p-0 font-medium"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} className="p-1">
                <Text className="text-xs font-black text-[#94A3B8]">✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filter Trigger Button */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            className={`flex-row items-center rounded-xl border px-3 py-2 shadow-2xs ${
              activeFiltersCount > 0
                ? 'border-[#116C0B] bg-[#F0FDF4]'
                : 'border-[#CBD5E1] bg-white'
            }`}
          >
            <FilterIcon
              color={activeFiltersCount > 0 ? '#116C0B' : '#475569'}
              size={15}
            />
            <Text
              className={`ml-1.5 text-xs font-black ${
                activeFiltersCount > 0 ? 'text-[#116C0B]' : 'text-[#475569]'
              }`}
            >
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Status Horizontal Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 2 }}
        >
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab;
            const count = statusCounts[tab] || 0;
            return (
              <Pressable
                key={tab}
                onPress={() => setStatusFilter(tab)}
                className={`flex-row items-center rounded-full border px-3.5 py-1.5 shadow-2xs ${
                  isActive
                    ? 'border-[#116C0B] bg-[#116C0B]'
                    : 'border-[#CBD5E1] bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-[#475569]'
                  }`}
                >
                  {tab}
                </Text>
                <View
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-white/25' : 'bg-[#F1F5F9]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      isActive ? 'text-white' : 'text-[#64748B]'
                    }`}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Filter Reminder Pill */}
      {activeFiltersCount > 0 && (
        <View className="flex-row items-center justify-between px-5 py-2 bg-[#F0FDF4] border-b border-[#DCFCE7]">
          <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
            <Text className="text-[11px] font-bold text-[#166534]">Active Filters:</Text>
            {orderTypeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-[#166534]">
                  {orderTypeFilter}
                </Text>
              </View>
            )}
            {timeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-[#166534]">
                  {timeFilter}
                </Text>
              </View>
            )}
            {sortOption !== 'newest' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-[#166534]">
                  {sortOption === 'amount_high' ? 'Highest' : 'Oldest'}
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={resetAllFilters}>
            <Text className="text-[11px] font-black text-red-600">Reset All</Text>
          </Pressable>
        </View>
      )}

      {/* Main Order List Section */}
      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-sm font-semibold text-[#64748B]">
            Loading real-time orders...
          </Text>
        </View>
      ) : errorMessage && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
            <Text className="text-2xl font-black text-red-500">!</Text>
          </View>
          <Text className="mt-4 text-center text-base font-bold text-[#0F172A]">
            Unable to Load Orders
          </Text>
          <Text className="mt-1 text-center text-xs text-[#64748B]">
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
            paddingBottom: insets.bottom + 100,
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
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1]">
                <OrdersBoxIcon color="#94A3B8" size={30} />
              </View>
              <Text className="mt-4 text-base font-bold text-[#0F172A]">
                No Orders in this View
              </Text>
              <Text className="mt-1 text-center text-xs text-[#64748B] max-w-[260px]">
                {searchQuery || statusFilter !== 'All' || activeFiltersCount > 0
                  ? 'No orders match your selected filters. Tap below to clear filters.'
                  : 'New orders placed by customers or staff will show up here.'}
              </Text>
              {(searchQuery || statusFilter !== 'All' || activeFiltersCount > 0) && (
                <Pressable
                  onPress={resetAllFilters}
                  className="mt-4 rounded-xl border border-[#116C0B] bg-[#F0FDF4] px-4 py-2 shadow-xs active:bg-[#DCFCE7]"
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
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg active:bg-[#0D5208]"
        style={{
          bottom: insets.bottom + 78,
          elevation: 8,
        }}
      >
        <PlusIcon color="#FFFFFF" size={26} />
      </Pressable>

      {/* FILTER DRAWER / MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          onPress={() => setShowFilterModal(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable
            onPress={e => e.stopPropagation()}
            className="rounded-t-3xl bg-white p-5 max-h-[85%] shadow-xl"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
            <View className="self-center w-12 h-1.5 rounded-full bg-[#CBD5E1] mb-3" />
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
              <Text className="text-lg font-black text-[#0F172A]">
                Filter & Sort Orders
              </Text>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <Text className="text-base font-bold text-[#64748B]">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="py-3">
              {/* Order Type */}
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Order Type
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {(['All', 'Dine-in', 'Takeaway', 'Delivery'] as OrderTypeFilter[]).map(
                  type => {
                    const isSelected = orderTypeFilter === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setOrderTypeFilter(type)}
                        className={`rounded-xl border px-3.5 py-2 ${
                          isSelected
                            ? 'border-[#116C0B] bg-[#F0FDF4]'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-[#116C0B]' : 'text-[#475569]'
                          }`}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              {/* Time Period */}
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Time Period
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {(
                  ['All', 'Today', 'Yesterday', 'This Week', 'This Month'] as TimeFilter[]
                ).map(time => {
                  const isSelected = timeFilter === time;
                  return (
                    <Pressable
                      key={time}
                      onPress={() => setTimeFilter(time)}
                      className={`rounded-xl border px-3.5 py-2 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#F0FDF4]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#116C0B]' : 'text-[#475569]'
                        }`}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Sort Order */}
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Sort Orders By
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
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
                      className={`rounded-xl border px-3.5 py-2 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#F0FDF4]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#116C0B]' : 'text-[#475569]'
                        }`}
                      >
                        {sort.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View className="flex-row gap-3 pt-3 border-t border-[#F1F5F9]">
              <Pressable
                onPress={resetAllFilters}
                className="flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] py-3 bg-[#F8FAFC]"
              >
                <Text className="text-xs font-bold text-[#475569]">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="flex-2 items-center justify-center rounded-xl bg-[#116C0B] py-3 px-6 shadow-sm active:bg-[#0D5208]"
              >
                <Text className="text-xs font-bold text-white">Apply Filters</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FULL RECEIPT / ORDER DETAILS MODAL */}
      <Modal
        visible={selectedOrder !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <Pressable
          onPress={() => setSelectedOrder(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          {selectedOrder && (
            <Pressable
              onPress={e => e.stopPropagation()}
              className="rounded-t-3xl bg-white p-5 max-h-[92%] shadow-2xl"
              style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
            >
              <View className="self-center w-12 h-1.5 rounded-full bg-[#CBD5E1] mb-3" />

              {/* Order Header in Modal */}
              <View className="flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <View>
                  <Text className="text-xl font-black text-[#0F172A]">
                    {String(
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
                        }`}
                  </Text>
                  <Text className="text-xs font-semibold text-[#64748B] mt-0.5">
                    {formatOrderDate(parseOrderDate(selectedOrder))}
                  </Text>
                </View>

                {/* Status Badge in Modal */}
                {(() => {
                  const s = normalizeStatus(
                    selectedOrder.order_status || selectedOrder.status,
                  );
                  const theme = getStatusTheme(s);
                  return (
                    <View
                      className="flex-row items-center rounded-full px-3 py-1 border"
                      style={{
                        backgroundColor: theme.badgeBg,
                        borderColor: theme.badgeBorder,
                      }}
                    >
                      <View
                        className="mr-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: theme.dotColor }}
                      />
                      <Text
                        className="text-xs font-black"
                        style={{ color: theme.badgeText }}
                      >
                        {theme.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
                {/* Guest & Table Info */}
                <View className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-3.5 mb-3.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                        Customer Details
                      </Text>
                      <Text className="text-sm font-bold text-[#0F172A] mt-0.5">
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
                      <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                        Order Type
                      </Text>
                      <Text className="text-sm font-bold text-[#0F172A] mt-0.5">
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
                    <View className="mt-2.5 pt-2 border-t border-[#E2E8F0]">
                      <Text className="text-[10px] font-bold text-[#64748B]">
                        Delivery Address:
                      </Text>
                      <Text className="text-xs text-[#334155] mt-0.5">
                        {selectedOrder.delivery_address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Change Status Stepper Buttons */}
                <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Change Order Status
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginBottom: 16 }}
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
                        className={`rounded-xl border px-3.5 py-2 flex-row items-center gap-1.5 ${
                          isCurrent
                            ? 'border-[#116C0B] bg-[#116C0B]'
                            : 'border-[#CBD5E1] bg-white'
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
                            isCurrent ? 'text-white' : 'text-[#334155]'
                          }`}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Itemized Bill Table */}
                <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Receipt Items ({selectedOrder.items?.length || 0})
                </Text>

                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <View className="rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden mb-3.5">
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
                            idx > 0 ? 'border-t border-[#F1F5F9]' : ''
                          }`}
                        >
                          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                            <DietaryBadge isNonVeg={isNonVeg} />
                            <View className="h-6 w-6 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7]">
                              <Text className="text-xs font-black text-[#116C0B]">
                                {qty}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-[#0F172A]">
                                {itemName}
                              </Text>
                              <Text className="text-xs text-[#64748B]">
                                {qty} × {formatCurrency(unitPrice)}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-sm font-black text-[#0F172A]">
                            {formatCurrency(totalPrice)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {/* Pricing Summary Breakdown */}
                <View className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 mb-4">
                  {selectedOrder.subtotal ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#64748B]">Subtotal</Text>
                      <Text className="text-xs font-semibold text-[#334155]">
                        {formatCurrency(selectedOrder.subtotal)}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.tax ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#64748B]">GST / Taxes</Text>
                      <Text className="text-xs font-semibold text-[#334155]">
                        {formatCurrency(selectedOrder.tax)}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.delivery_fee ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#64748B]">Delivery Fee</Text>
                      <Text className="text-xs font-semibold text-[#334155]">
                        {formatCurrency(selectedOrder.delivery_fee)}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-[#E2E8F0]">
                    <Text className="text-base font-black text-[#0F172A]">
                      Grand Total
                    </Text>
                    <Text className="text-xl font-black text-[#116C0B]">
                      {formatCurrency(
                        selectedOrder.total_amount ||
                          selectedOrder.grand_total ||
                          selectedOrder.amount ||
                          0,
                      )}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Action Buttons: Share & Close */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => void printOrderReceipt(selectedOrder)}
                  className="flex-row items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3.5 shadow-xs active:bg-[#F1F5F9]"
                >
                  <PrinterIcon color="#334155" size={16} />
                  <Text className="ml-1.5 text-xs font-black text-[#334155]">
                    Share
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedOrder(null)}
                  className="flex-1 items-center justify-center rounded-xl bg-[#116C0B] py-3.5 shadow-sm active:bg-[#0D5208]"
                >
                  <Text className="text-sm font-black text-white">Close Receipt</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

export default OrdersScreen;
