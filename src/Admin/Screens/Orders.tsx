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
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getApiErrorMessage } from '../../../api';
import { OrdersIcon, PlusIcon } from '../Navigation/NavigationIcons';
import AssinedOrdertoDelivery from './AssinedOrdertoDelivery';
import colors from '../../theme/colors';

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
        accentColor: '#F59E0B',
        dotColor: '#F59E0B',
        label: 'Pending',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Accept & Cook 👨‍🍳',
      };
    case 'Confirmed':
      return {
        badgeBg: '#EFF6FF',
        badgeBorder: '#BFDBFE',
        badgeText: '#1D4ED8',
        accentColor: '#3B82F6',
        dotColor: '#3B82F6',
        label: 'Confirmed',
        nextStatus: 'Preparing' as NormalizedStatus,
        nextActionText: 'Start Cooking 👨‍🍳',
      };
    case 'Preparing':
      return {
        badgeBg: '#F5F3FF',
        badgeBorder: '#DDD6FE',
        badgeText: '#6D28D9',
        accentColor: '#8B5CF6',
        dotColor: '#8B5CF6',
        label: 'Preparing',
        nextStatus: 'Ready' as NormalizedStatus,
        nextActionText: 'Mark Ready 🔔',
      };
    case 'Ready':
      return {
        badgeBg: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#047857',
        accentColor: '#10B981',
        dotColor: '#10B981',
        label: 'Ready to Serve',
        nextStatus: 'Delivered' as NormalizedStatus,
        nextActionText: 'Complete / Deliver ✅',
      };
    case 'Delivered':
      return {
        badgeBg: '#F0FDF4',
        badgeBorder: '#BBF7D0',
        badgeText: '#15803D',
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
        accentColor: '#EF4444',
        dotColor: '#EF4444',
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
      label: tableNumber ? `Table ${tableNumber}` : 'Dine-in',
      icon: '🍽️',
      bg: '#F0FDF4',
      border: '#DCFCE7',
      text: '#166534',
    };
  }
  if (type === 'Takeaway') {
    return {
      label: 'Takeaway',
      icon: '🛍️',
      bg: '#FFFBEB',
      border: '#FEF3C7',
      text: '#92400E',
    };
  }
  return {
    label: 'Delivery',
    icon: '🛵',
    bg: '#F0F9FF',
    border: '#E0F2FE',
    text: '#0369A1',
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

  // Radar Pulse Animation
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
        className="mb-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm"
        style={{
          borderLeftWidth: 5,
          borderLeftColor: theme.accentColor,
        }}
      >
        {/* Card Header Strip */}
        <View className="flex-row items-center justify-between border-b border-[#F3F4F6] px-4 py-3 bg-[#FAFAFA]">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-black text-[#012711] tracking-tight">
              {orderDisplayId}
            </Text>
            {/* Order Type Badge */}
            <View
              className="flex-row items-center rounded-lg px-2.5 py-1"
              style={{
                backgroundColor: typeConfig.bg,
                borderColor: typeConfig.border,
                borderWidth: 1,
              }}
            >
              <Text className="mr-1 text-[11px]">{typeConfig.icon}</Text>
              <Text
                className="text-[11px] font-bold"
                style={{ color: typeConfig.text }}
              >
                {typeConfig.label}
              </Text>
            </View>
          </View>

          {/* Status Pill with Pulsing or Solid Dot */}
          <View
            className="flex-row items-center rounded-full px-3 py-1"
            style={{
              backgroundColor: theme.badgeBg,
              borderColor: theme.badgeBorder,
              borderWidth: 1,
            }}
          >
            {status === 'Pending' ? (
              <Animated.View
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{
                  backgroundColor: theme.dotColor,
                  transform: [{ scale: pulseAnim }],
                }}
              />
            ) : (
              <View
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
            )}
            <Text
              className="text-[11px] font-extrabold uppercase tracking-wide"
              style={{ color: theme.badgeText }}
            >
              {theme.label}
            </Text>
          </View>
        </View>

        {/* Customer & Time Information */}
        <View className="px-4 pt-3 pb-2.5 flex-row items-center justify-between border-b border-[#F3F4F6]">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs">👤</Text>
              <Text className="text-sm font-bold text-[#111827]" numberOfLines={1}>
                {item.customer_name || 'Walk-in Guest'}
              </Text>
            </View>
            {item.customer_phone || item.customer_mobile || item.phone ? (
              <Pressable
                onPress={() => {
                  const p = item.customer_phone || item.customer_mobile || item.phone;
                  if (p) Linking.openURL(`tel:${p}`);
                }}
                className="mt-1 inline-flex flex-row items-center gap-1 rounded-md bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-0.5 self-start"
              >
                <Text className="text-[11px] font-bold text-[#116C0B]">
                  📞 {item.customer_phone || item.customer_mobile || item.phone}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View className="items-end">
            <View className="flex-row items-center gap-1">
              <Text className="text-[11px] text-[#6B7280]">⏱️</Text>
              <Text className="text-xs font-semibold text-[#374151]">
                {relativeTime || 'Just now'}
              </Text>
            </View>
            <Text className="text-[10px] text-[#9CA3AF] mt-0.5">
              {dateFormatted}
            </Text>
          </View>
        </View>

        {/* Itemized Food List Section */}
        <View className="px-4 py-3 bg-white">
          {items.length > 0 ? (
            <View className="gap-2">
              {visibleItems.map((food, idx) => {
                const name = food.food_name || food.product_name || food.name || 'Food item';
                const qty = Number(food.quantity) || 1;
                const unitPrice = Number(food.unit_price || food.price || 0);
                const itemTotal = Number(food.total_price) || unitPrice * qty;

                return (
                  <View
                    key={idx}
                    className="flex-row items-center justify-between py-1.5 border-b border-[#F9FAFB]"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <View className="h-6 w-6 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7]">
                        <Text className="text-[11px] font-black text-[#116C0B]">
                          {qty}
                        </Text>
                      </View>
                      <Text
                        className="text-xs font-bold text-[#1F2937] flex-1"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-[#374151]">
                      {itemTotal > 0 ? formatCurrency(itemTotal) : '—'}
                    </Text>
                  </View>
                );
              })}

              {/* Show more/less toggle */}
              {hasMoreItems && (
                <Pressable
                  onPress={() => toggleExpand(orderKey)}
                  className="pt-1.5 flex-row items-center justify-center gap-1"
                >
                  <Text className="text-[11px] font-bold text-[#116C0B]">
                    {isExpanded
                      ? 'Show less items ▲'
                      : `+ ${items.length - 3} more items ▼`}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text className="text-xs italic text-[#9CA3AF]">
              No individual item rows available
            </Text>
          )}

          {/* Notes / Special Request Banner */}
          {item.notes ? (
            <View className="mt-2.5 rounded-lg bg-amber-50 border border-amber-200 p-2 flex-row items-start gap-1.5">
              <Text className="text-xs">📝</Text>
              <Text className="text-[11px] text-amber-900 flex-1 font-medium">
                "{item.notes}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card Pricing & Action Buttons Footer */}
        <View className="px-4 py-3 bg-[#F9FAFB] border-t border-[#F3F4F6]">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                className={`rounded-md px-2 py-0.5 border ${
                  item.payment_method?.toLowerCase().includes('cash') ||
                  item.payment_method?.toLowerCase().includes('cod')
                    ? 'bg-[#FEF3C7] border-[#FDE68A]'
                    : 'bg-[#DCFCE7] border-[#BBF7D0]'
                }`}
              >
                <Text
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    item.payment_method?.toLowerCase().includes('cash') ||
                    item.payment_method?.toLowerCase().includes('cod')
                      ? 'text-[#92400E]'
                      : 'text-[#166534]'
                  }`}
                >
                  {item.payment_method || 'PAID'}
                </Text>
              </View>
              <Text className="text-xs text-[#6B7280]">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-xs text-[#6B7280]">Total:</Text>
              <Text className="text-xl font-black text-[#012711]">
                {formatCurrency(amount)}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row items-center gap-2">
            {/* Quick Action Button for Status Transition */}
            {theme.nextStatus ? (
              <Pressable
                disabled={isUpdatingStatus}
                onPress={() => handleUpdateStatus(item, theme.nextStatus!)}
                className="flex-1 items-center justify-center rounded-xl py-2.5 shadow-sm"
                style={({ pressed }) => ({
                  backgroundColor: theme.accentColor,
                  opacity: pressed || isUpdatingStatus ? 0.85 : 1,
                })}
              >
                <Text className="text-xs font-black text-white">
                  {theme.nextActionText}
                </Text>
              </Pressable>
            ) : null}

            {/* Quick Reject / Cancel button for Pending orders */}
            {status === 'Pending' && (
              <Pressable
                disabled={isUpdatingStatus}
                onPress={() => handleUpdateStatus(item, 'Cancelled')}
                className="px-3 items-center justify-center rounded-xl bg-red-50 border border-red-200 py-2.5"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-xs font-bold text-red-600">Cancel</Text>
              </Pressable>
            )}

            {/* View Receipt / Details Button */}
            <Pressable
              onPress={() => setSelectedOrder(item)}
              className={`${
                theme.nextStatus ? 'flex-1' : 'w-full'
              } items-center justify-center rounded-xl bg-white border border-[#D1D5DB] py-2.5 shadow-sm`}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
              })}
            >
              <Text className="text-xs font-bold text-[#374151]">
                View Receipt 📄
              </Text>
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
    <View className="flex-1 bg-[#F9FAFB]">
      {/* Clean Native Page Header */}
      <View className="bg-white px-5 pt-3.5 pb-2.5 border-b border-[#F3F4F6]">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black text-[#012711] tracking-tight">
                Orders
              </Text>
              <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                <Animated.View
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  style={{ transform: [{ scale: pulseAnim }] }}
                />
                <Text className="text-[11px] font-extrabold text-emerald-800">
                  LIVE ({orders.length})
                </Text>
              </View>
            </View>
            <Text className="text-xs text-[#6B7280] mt-0.5">
              Live kitchen tickets & order fulfillment
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={onRefresh}
              className="h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] border border-[#E5E7EB]"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-base">🔄</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Interactive Metric Cards Strip */}
      <View className="bg-white px-5 py-2.5 border-b border-[#F3F4F6]">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2.5 py-0.5"
        >
          {/* 1. Pending Action */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Pending'
                ? 'bg-amber-100 border-amber-400 shadow-sm'
                : 'bg-[#FFFBEB] border-[#FDE68A]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-200">
              <Text className="text-base">⚡</Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Pending
              </Text>
              <Text className="text-lg font-black text-amber-950">
                {metrics.pending}
              </Text>
            </View>
          </Pressable>

          {/* 2. Cooking / Preparing */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Preparing' ? 'All' : 'Preparing')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Preparing'
                ? 'bg-purple-100 border-purple-400 shadow-sm'
                : 'bg-[#F5F3FF] border-[#DDD6FE]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-purple-200">
              <Text className="text-base">👨‍🍳</Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">
                Preparing
              </Text>
              <Text className="text-lg font-black text-purple-950">
                {metrics.preparing}
              </Text>
            </View>
          </Pressable>

          {/* 3. Ready */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Ready' ? 'All' : 'Ready')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Ready'
                ? 'bg-emerald-100 border-emerald-400 shadow-sm'
                : 'bg-[#ECFDF5] border-[#A7F3D0]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-emerald-200">
              <Text className="text-base">🔔</Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Ready
              </Text>
              <Text className="text-lg font-black text-emerald-950">
                {metrics.ready}
              </Text>
            </View>
          </Pressable>

          {/* 4. Delivered */}
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'Delivered' ? 'All' : 'Delivered')}
            className={`flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 min-w-[125px] ${
              statusFilter === 'Delivered'
                ? 'bg-green-100 border-green-400 shadow-sm'
                : 'bg-[#F0FDF4] border-[#BBF7D0]'
            }`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-green-200">
              <Text className="text-base">✅</Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-green-800">
                Delivered
              </Text>
              <Text className="text-lg font-black text-green-950">
                {metrics.delivered}
              </Text>
            </View>
          </Pressable>

          {/* 5. Revenue */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-[#F9FAFB] px-3.5 py-2.5 min-w-[135px]">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-gray-200">
              <Text className="text-base">💰</Text>
            </View>
            <View>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600">
                Revenue
              </Text>
              <Text className="text-lg font-black text-[#012711]">
                {formatCompactNumber(metrics.revenue)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Search Input & Filter Row */}
      <View className="px-5 pt-3 pb-2 bg-white border-b border-[#E5E7EB]">
        <View className="flex-row items-center gap-2">
          {/* Search Field */}
          <View className="flex-1 flex-row items-center rounded-xl bg-[#F3F4F6] px-3.5 py-2 border border-[#E5E7EB]">
            <Text className="text-xs mr-2 text-[#9CA3AF]">🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search order #, customer, phone, food..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-xs text-[#012711] p-0 font-medium"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} className="p-1">
                <Text className="text-xs font-bold text-[#9CA3AF]">✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filter Drawer Trigger */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${
              activeFiltersCount > 0
                ? 'border-[#116C0B] bg-[#F0FDF4]'
                : 'border-[#E5E7EB] bg-[#F9FAFB]'
            }`}
          >
            <Text className="text-xs">⚙️</Text>
            <Text
              className={`text-xs font-bold ${
                activeFiltersCount > 0 ? 'text-[#116C0B]' : 'text-[#4B5563]'
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
          contentContainerClassName="gap-2 pt-2.5 pb-1"
        >
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab;
            const count = statusCounts[tab] || 0;
            return (
              <Pressable
                key={tab}
                onPress={() => setStatusFilter(tab)}
                className={`flex-row items-center rounded-full border px-3.5 py-1.5 ${
                  isActive
                    ? 'border-[#116C0B] bg-[#116C0B] shadow-sm'
                    : 'border-[#E5E7EB] bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-[#4B5563]'
                  }`}
                >
                  {tab}
                </Text>
                <View
                  className={`ml-1.5 rounded-full px-1.5 py-0.2 ${
                    isActive ? 'bg-white/25' : 'bg-[#F3F4F6]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      isActive ? 'text-white' : 'text-[#6B7280]'
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

      {/* Active Filter Reminder Chip */}
      {activeFiltersCount > 0 && (
        <View className="flex-row items-center justify-between px-5 py-2 bg-[#F0FDF4] border-b border-[#DCFCE7]">
          <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
            <Text className="text-[11px] font-bold text-[#166534]">Active Filters:</Text>
            {orderTypeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-[#166534]">
                  {orderTypeFilter}
                </Text>
              </View>
            )}
            {timeFilter !== 'All' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-[#166534]">
                  {timeFilter}
                </Text>
              </View>
            )}
            {sortOption !== 'newest' && (
              <View className="rounded-md bg-white border border-[#DCFCE7] px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-[#166534]">
                  {sortOption === 'amount_high' ? 'Highest' : 'Oldest'}
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={resetAllFilters}>
            <Text className="text-[11px] font-bold text-red-600">Reset All</Text>
          </Pressable>
        </View>
      )}

      {/* Main Order List Section */}
      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-sm font-semibold text-[#6B7280]">
            Loading real-time orders...
          </Text>
        </View>
      ) : errorMessage && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
            <Text className="text-2xl">⚠️</Text>
          </View>
          <Text className="mt-4 text-center text-base font-bold text-[#1F2937]">
            Unable to Load Orders
          </Text>
          <Text className="mt-1 text-center text-xs text-[#6B7280]">
            {errorMessage}
          </Text>
          <Pressable
            onPress={() => fetchOrders()}
            className="mt-4 rounded-xl bg-[#116C0B] px-6 py-2.5 shadow-sm"
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
            paddingHorizontal: 20,
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
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB]">
                <OrdersIcon color="#9CA3AF" size={30} />
              </View>
              <Text className="mt-4 text-base font-bold text-[#374151]">
                No Orders in this View
              </Text>
              <Text className="mt-1 text-center text-xs text-[#6B7280] max-w-[260px]">
                {searchQuery || statusFilter !== 'All' || activeFiltersCount > 0
                  ? 'No orders match your selected filters. Tap below to clear filters.'
                  : 'New orders placed by customers or staff will show up here.'}
              </Text>
              {(searchQuery || statusFilter !== 'All' || activeFiltersCount > 0) && (
                <Pressable
                  onPress={resetAllFilters}
                  className="mt-4 rounded-xl border border-[#116C0B] bg-[#F0FDF4] px-4 py-2"
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

      <Pressable
        accessibilityLabel="Assign order to delivery"
        accessibilityRole="button"
        onPress={() => setIsDeliveryAssignmentOpen(true)}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#116C0B] shadow-lg"
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
            className="rounded-t-3xl bg-white p-5 max-h-[85%]"
          >
            <View className="self-center w-12 h-1 rounded-full bg-[#E5E7EB] mb-3" />
            <View className="flex-row items-center justify-between border-b border-[#F3F4F6] pb-3">
              <Text className="text-lg font-black text-[#012711]">
                Filter & Sort Orders
              </Text>
              <Pressable onPress={() => setShowFilterModal(false)} className="p-1">
                <Text className="text-base font-bold text-[#6B7280]">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="py-3">
              {/* Order Type */}
              <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
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
                            : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-[#116C0B]' : 'text-[#4B5563]'
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
              <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
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
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#116C0B]' : 'text-[#4B5563]'
                        }`}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Sort Order */}
              <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
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
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#116C0B]' : 'text-[#4B5563]'
                        }`}
                      >
                        {sort.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View className="flex-row gap-3 pt-3 border-t border-[#F3F4F6]">
              <Pressable
                onPress={resetAllFilters}
                className="flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] py-3 bg-[#F9FAFB]"
              >
                <Text className="text-xs font-bold text-[#4B5563]">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="flex-2 items-center justify-center rounded-xl bg-[#116C0B] py-3 px-6 shadow-sm"
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
          className="flex-1 bg-black/60 justify-end"
        >
          {selectedOrder && (
            <Pressable
              onPress={e => e.stopPropagation()}
              className="rounded-t-3xl bg-white p-5 max-h-[92%]"
            >
              <View className="self-center w-12 h-1 rounded-full bg-[#E5E7EB] mb-3" />

              {/* Order Header in Modal */}
              <View className="flex-row items-center justify-between pb-3 border-b border-[#F3F4F6]">
                <View>
                  <Text className="text-xl font-black text-[#012711]">
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
                  <Text className="text-xs text-[#6B7280] mt-0.5">
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
                      className="flex-row items-center rounded-full px-3 py-1"
                      style={{
                        backgroundColor: theme.badgeBg,
                        borderColor: theme.badgeBorder,
                        borderWidth: 1,
                      }}
                    >
                      <View
                        className="mr-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: theme.dotColor }}
                      />
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.badgeText }}
                      >
                        {theme.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <ScrollView className="py-3">
                {/* Guest & Table Info */}
                <View className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 mb-3.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                        Customer Details
                      </Text>
                      <Text className="text-sm font-bold text-[#111827] mt-0.5">
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
                          <Text className="text-xs font-bold text-[#116C0B]">
                            📞 Call: {selectedOrder.customer_phone ||
                              selectedOrder.customer_mobile ||
                              selectedOrder.phone}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                        Order Type
                      </Text>
                      <Text className="text-sm font-bold text-[#012711] mt-0.5">
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
                    <View className="mt-2.5 pt-2 border-t border-[#E5E7EB]">
                      <Text className="text-[10px] font-bold text-[#6B7280]">
                        Delivery Address:
                      </Text>
                      <Text className="text-xs text-[#374151] mt-0.5">
                        {selectedOrder.delivery_address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Change Status Stepper Buttons */}
                <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                  Change Order Status
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 mb-4"
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
                            : 'border-[#E5E7EB] bg-white'
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
                            isCurrent ? 'text-white' : 'text-[#374151]'
                          }`}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Itemized Bill Table */}
                <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                  Receipt Items ({selectedOrder.items?.length || 0})
                </Text>

                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <View className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden mb-3.5">
                    {selectedOrder.items.map((food, idx) => {
                      const itemName =
                        food.food_name || food.product_name || food.name || 'Item';
                      const qty = Number(food.quantity) || 1;
                      const unitPrice = Number(food.unit_price || food.price || 0);
                      const totalPrice =
                        Number(food.total_price) || unitPrice * qty;

                      return (
                        <View
                          key={idx}
                          className={`flex-row items-center justify-between p-3.5 ${
                            idx > 0 ? 'border-t border-[#F3F4F6]' : ''
                          }`}
                        >
                          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                            <View className="h-6 w-6 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7]">
                              <Text className="text-xs font-black text-[#116C0B]">
                                {qty}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-[#111827]">
                                {itemName}
                              </Text>
                              <Text className="text-xs text-[#6B7280]">
                                {qty} × {formatCurrency(unitPrice)}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-sm font-bold text-[#012711]">
                            {formatCurrency(totalPrice)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {/* Pricing Summary Breakdown */}
                <View className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 mb-4">
                  {selectedOrder.subtotal ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#6B7280]">Subtotal</Text>
                      <Text className="text-xs font-semibold text-[#374151]">
                        {formatCurrency(selectedOrder.subtotal)}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.tax ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#6B7280]">GST / Taxes</Text>
                      <Text className="text-xs font-semibold text-[#374151]">
                        {formatCurrency(selectedOrder.tax)}
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.delivery_fee ? (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-xs text-[#6B7280]">Delivery Fee</Text>
                      <Text className="text-xs font-semibold text-[#374151]">
                        {formatCurrency(selectedOrder.delivery_fee)}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-[#E5E7EB]">
                    <Text className="text-base font-bold text-[#012711]">
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

              {/* Modal Close Button */}
              <Pressable
                onPress={() => setSelectedOrder(null)}
                className="w-full items-center justify-center rounded-xl bg-[#116C0B] py-3.5 shadow-sm"
              >
                <Text className="text-sm font-bold text-white">Close Receipt</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

export default OrdersScreen;
