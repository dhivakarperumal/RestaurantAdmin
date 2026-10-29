import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

type Order = Record<string, unknown>;

/* ==========================================================================
   Utility Helpers
   ========================================================================== */

const firstValue = (order: Order, keys: string[]): unknown => {
  for (const key of keys) {
    if (order[key] !== undefined && order[key] !== null && order[key] !== '') {
      return order[key];
    }
  }
  return undefined;
};

const displayValue = (value: unknown, fallback = ''): string =>
  value === undefined || value === null ? fallback : String(value);

function formatPrice(val: unknown): string {
  if (val === undefined || val === null || val === '') return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatOrderTime(rawTime: unknown): string {
  if (!rawTime) return '';
  try {
    const d = new Date(String(rawTime));
    if (isNaN(d.getTime())) return String(rawTime);

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins >= 0 && diffMins < 60) {
      return diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
    }

    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(rawTime);
  }
}

function cleanOrderId(id: unknown, index: number): string {
  const val = String(id || '').trim();
  if (!val) return `#KOT${String(index + 1).padStart(3, '0')}`;
  return val.startsWith('#') ? val : `#${val}`;
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

function getOrderItems(order: Order): Order[] {
  const rawItems =
    order.items ||
    order.order_items ||
    order.food_items ||
    order.items_json;
  if (Array.isArray(rawItems)) return rawItems as Order[];
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? (parsed as Order[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getOrderTotal(order: Order): number {
  const rawTotal = firstValue(order, ['total_amount', 'total', 'grand_total', 'amount']);
  if (rawTotal !== undefined && rawTotal !== null && rawTotal !== '') {
    const num =
      typeof rawTotal === 'number'
        ? rawTotal
        : parseFloat(String(rawTotal).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }
  const items = getOrderItems(order);
  return items.reduce((sum, item) => {
    const p = firstValue(item, ['total_price', 'price', 'unit_price']) ?? 0;
    const q = Number(firstValue(item, ['quantity']) ?? 1);
    const numP =
      typeof p === 'number' ? p : parseFloat(String(p).replace(/[^0-9.-]+/g, '')) || 0;
    return sum + numP * (isNaN(q) ? 1 : q);
  }, 0);
}

type StatusStyle = {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  headerBg: string;
};

function getStatusConfig(status: string): StatusStyle {
  const s = String(status || '').toLowerCase().trim();
  if (s.includes('ready')) {
    return {
      label: 'Ready to Serve',
      text: '#15803D',
      bg: '#DCFCE7',
      border: '#86EFAC',
      dot: '#16A34A',
      headerBg: '#F0FDF4',
    };
  }
  if (s.includes('cancel')) {
    return {
      label: 'Cancelled',
      text: '#B91C1C',
      bg: '#FEE2E2',
      border: '#FECACA',
      dot: '#DC2626',
      headerBg: '#FEF2F2',
    };
  }
  if (s.includes('served') || s.includes('complete')) {
    return {
      label: 'Served',
      text: '#1D4ED8',
      bg: '#DBEAFE',
      border: '#BFDBFE',
      dot: '#2563EB',
      headerBg: '#F0F7FF',
    };
  }
  if (s.includes('prep')) {
    return {
      label: 'Preparing',
      text: '#C2410C',
      bg: '#FFEDD5',
      border: '#FED7AA',
      dot: '#EA580C',
      headerBg: '#FFF7ED',
    };
  }
  return {
    label: 'Pending',
    text: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
    dot: '#D97706',
    headerBg: '#FFFBEB',
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

function OrdersIcon({ color = '#116C0B', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="17" cy="16" r="1" fill={color} />
    </Svg>
  );
}

function SearchSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CloseSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function TableSvg({ color = '#0F172A', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6.5" width="16" height="5.5" rx="1.8" stroke={color} strokeWidth="2" />
      <Path d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function BellSvg({ color = '#15803D', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckSvg({ color = '#FFFFFF', size = 14 }: { color?: string; size?: number }) {
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

function NoteSvg({ color = '#D97706', size = 14 }: { color?: string; size?: number }) {
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

function PrinterSvg({ color = '#FFFFFF', size = 16 }: { color?: string; size?: number }) {
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

function ClockSvg({ color = '#64748B', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/* ==========================================================================
   Main ServerOrders Component
   ========================================================================== */

export default function ServerOrders({
  user = {},
  serverEmployeeId,
}: {
  user?: HeaderUser;
  serverEmployeeId?: string | number | null;
}) {
  const insets = useSafeAreaInsets();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const serverIds = useMemo(
    () =>
      [
        serverEmployeeId,
        user.employee_id,
        user.employeeId,
        user.id,
        user.user_id,
        (user as Record<string, unknown>).uuid,
        (user as Record<string, unknown>).emp_id,
      ]
        .filter(id => id !== undefined && id !== null && String(id).trim() !== '')
        .map(id => String(id).trim().toLowerCase()),
    [user, serverEmployeeId],
  );

  const serverNames = useMemo(
    () =>
      [user.name, user.username, (user as Record<string, unknown>).full_name]
        .filter(name => typeof name === 'string' && name.trim() !== '')
        .map(name => String(name).trim().toLowerCase()),
    [user],
  );

  const belongsToServer = useCallback(
    (order: Order) => {
      const assignedId = firstValue(order, [
        'server_id',
        'assigned_server_id',
        'employee_id',
        'assigned_employee_id',
        'waiter_id',
        'created_by',
      ]);
      if (assignedId !== undefined && serverIds.includes(String(assignedId).trim().toLowerCase())) {
        return true;
      }

      const assignedName = firstValue(order, [
        'server_name',
        'assigned_server_name',
        'waiter_name',
        'created_by_name',
      ]);
      if (
        assignedName !== undefined &&
        serverNames.includes(String(assignedName).trim().toLowerCase())
      ) {
        return true;
      }

      for (const key of ['server', 'assigned_server', 'waiter']) {
        const assignedServer = order[key];
        if (assignedServer && typeof assignedServer === 'object') {
          const nestedId = firstValue(assignedServer as Order, ['id', 'employee_id', 'user_id']);
          const nestedName = firstValue(assignedServer as Order, ['name', 'full_name', 'username']);
          if (
            (nestedId !== undefined &&
              serverIds.includes(String(nestedId).trim().toLowerCase())) ||
            (nestedName !== undefined &&
              serverNames.includes(String(nestedName).trim().toLowerCase()))
          ) {
            return true;
          }
        }
      }

      return false;
    },
    [serverIds, serverNames],
  );

  const loadOrders = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/kitchen-orders');
      const payload = response.data;
      const receivedOrders = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
        ? payload.orders
        : Array.isArray(payload?.data)
        ? payload.data
        : [];
      setAllOrders(receivedOrders);
    } catch (requestError) {
      setError(
        requestError && typeof requestError === 'object' && 'message' in requestError
          ? String((requestError as { message?: unknown }).message)
          : 'Unable to load kitchen orders.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Orders scoped by "My Station" vs "All Floor Orders"
  const scopedOrders = useMemo(() => {
    if (scopeFilter === 'all') return allOrders;
    const my = allOrders.filter(belongsToServer);
    return my.length > 0 ? my : allOrders;
  }, [allOrders, scopeFilter, belongsToServer]);

  // Statistics
  const counts = useMemo(() => {
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let served = 0;
    let cancelled = 0;

    scopedOrders.forEach(o => {
      const s = String(firstValue(o, ['status', 'order_status']) || '').toLowerCase();
      if (s.includes('ready')) ready++;
      else if (s.includes('prep')) preparing++;
      else if (s.includes('served') || s.includes('complete')) served++;
      else if (s.includes('cancel')) cancelled++;
      else pending++;
    });

    const active = pending + preparing + ready;
    return {
      total: scopedOrders.length,
      active,
      pending,
      preparing,
      ready,
      served,
      cancelled,
    };
  }, [scopedOrders]);

  // Filtered orders by status & search
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedOrders.filter(order => {
      const status = displayValue(firstValue(order, ['status', 'order_status']), 'Pending');
      const normalizedStatus = status.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          !['served', 'completed', 'complete', 'cancelled', 'canceled'].some(v =>
            normalizedStatus.includes(v),
          )) ||
        normalizedStatus.includes(statusFilter);

      if (!matchesStatus) return false;
      if (!query) return true;

      const items = getOrderItems(order);
      const itemText = items
        .map(item => firstValue(item, ['food_name', 'name', 'item_name']))
        .join(' ');

      const searchableText = [
        firstValue(order, ['kitchen_order_id', 'order_id', 'id']),
        firstValue(order, ['table_number', 'table_id', 'table']),
        status,
        itemText,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [scopedOrders, search, statusFilter]);

  const selectedOrderItems = useMemo(() => {
    if (!selectedOrder) return [];
    return getOrderItems(selectedOrder);
  }, [selectedOrder]);

  // Status transition handler
  const updateOrderStatus = async (order: Order, newStatus: string) => {
    const orderId = firstValue(order, ['kitchen_order_id', 'order_id', 'id']);
    if (!orderId || updatingOrderId) return;

    setUpdatingOrderId(String(orderId));
    try {
      await api
        .patch(`/kitchen-orders/${orderId}/status`, { status: newStatus })
        .catch(async () => {
          return await api.put(`/kitchen-orders/${orderId}/status`, { status: newStatus });
        })
        .catch(async () => {
          return await api.put(`/kitchen-orders/${orderId}`, { status: newStatus });
        });

      // Optimistically update
      setAllOrders(current =>
        current.map(o => {
          const oId = firstValue(o, ['kitchen_order_id', 'order_id', 'id']);
          return String(oId) === String(orderId)
            ? { ...o, status: newStatus, order_status: newStatus }
            : o;
        }),
      );

      if (selectedOrder) {
        const selId = firstValue(selectedOrder, ['kitchen_order_id', 'order_id', 'id']);
        if (String(selId) === String(orderId)) {
          setSelectedOrder({ ...selectedOrder, status: newStatus, order_status: newStatus });
        }
      }
    } catch (err) {
      Alert.alert(
        'Status update failed',
        err instanceof Error ? err.message : 'Unable to update order status. Please try again.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const printSelectedOrder = async () => {
    if (!selectedOrder) return;
    const orderId = cleanOrderId(
      firstValue(selectedOrder, ['kitchen_order_id', 'order_id', 'id']),
      1,
    );
    const table = displayValue(
      firstValue(selectedOrder, ['table_number', 'table_id', 'table']),
      '—',
    );
    const status = displayValue(firstValue(selectedOrder, ['status', 'order_status']), 'Pending');
    const time = displayValue(
      firstValue(selectedOrder, ['created_at', 'createdAt', 'order_time', 'time']),
      new Date().toLocaleString('en-IN'),
    );
    const serverName = displayValue(
      firstValue(selectedOrder, ['server_name', 'assigned_server_name']),
      user.name || 'Server',
    );
    const totalAmount = formatPrice(getOrderTotal(selectedOrder));
    const notes = displayValue(firstValue(selectedOrder, ['notes', 'instruction', 'special_notes']));

    const receiptLines = [
      '================================',
      '        KITCHEN TICKET          ',
      '================================',
      `Order: ${orderId}`,
      `Table: ${table}`,
      `Server: ${serverName}`,
      `Status: ${status.toUpperCase()}`,
      `Time: ${time}`,
      '--------------------------------',
      ...selectedOrderItems.map(item => {
        const name = displayValue(firstValue(item, ['food_name', 'name', 'item_name']), 'Item');
        const quantity = displayValue(firstValue(item, ['quantity']), '1');
        const price = firstValue(item, ['total_price', 'price', 'unit_price']);
        const priceText = price !== undefined ? `  ${formatPrice(price)}` : '';
        return `• ${name} x${quantity}${priceText}`;
      }),
      '--------------------------------',
      `TOTAL: ${totalAmount}`,
      ...(notes ? ['', `SPECIAL NOTES:`, notes] : []),
      '================================',
    ];

    try {
      await Share.share({ title: `Kitchen Ticket ${orderId}`, message: receiptLines.join('\n') });
    } catch (shareError) {
      Alert.alert(
        'Unable to share ticket',
        shareError instanceof Error ? shareError.message : 'Please try again.',
      );
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#FF7800" />
        <Text className="mt-3 text-sm font-semibold text-[#64748B]">
          Loading kitchen orders...
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadOrders();
            }}
            colors={['#FF7800', '#116C0B']}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 24) + 64,
        }}
      >
        {/* Floor Scope Selector (My Station vs All Floor) */}
        <View className="flex-row rounded-2xl bg-[#E2E8F0]/70 p-1">
          <Pressable
            onPress={() => setScopeFilter('my')}
            className={`flex-1 items-center rounded-xl py-2 ${
              scopeFilter === 'my' ? 'bg-white shadow-xs' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                scopeFilter === 'my' ? 'text-[#062D16]' : 'text-[#64748B]'
              }`}
            >
              My Station Orders
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setScopeFilter('all')}
            className={`flex-1 items-center rounded-xl py-2 ${
              scopeFilter === 'all' ? 'bg-white shadow-xs' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                scopeFilter === 'all' ? 'text-[#062D16]' : 'text-[#64748B]'
              }`}
            >
              All Floor Orders ({allOrders.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="mt-3 flex-row items-center rounded-2xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 shadow-xs">
          <SearchSvg color="#64748B" size={18} />
          <TextInput
            placeholder="Search order #, table, or food item..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="ml-2.5 flex-1 text-sm font-medium text-[#0F172A]"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} className="p-1">
              <CloseSvg color="#94A3B8" size={16} />
            </Pressable>
          )}
        </View>

        {/* Ready to Serve High-Priority Alert Banner (when ready orders exist) */}
        {counts.ready > 0 && (
          <Pressable
            onPress={() => setStatusFilter('ready')}
            className="mt-3 flex-row items-center justify-between rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-3.5 shadow-xs active:bg-[#DCFCE7]"
          >
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#DCFCE7]">
                <BellSvg color="#15803D" size={18} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-[#15803D]">
                  {counts.ready} {counts.ready === 1 ? 'Order' : 'Orders'} Ready to Serve!
                </Text>
                <Text className="text-xs text-[#166534]">
                  Food is ready at the pass. Tap to filter.
                </Text>
              </View>
            </View>
            <View className="rounded-xl bg-[#15803D] px-3 py-1.5 shadow-xs">
              <Text className="text-xs font-black text-white">Serve Now</Text>
            </View>
          </Pressable>
        )}

        {/* Status Filter Horizontal Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2 py-0.5">
            {[
              { key: 'all', label: 'All', count: counts.total },
              { key: 'active', label: 'Active', count: counts.active },
              {
                key: 'ready',
                label: 'Ready',
                count: counts.ready,
                isPriority: counts.ready > 0,
              },
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'preparing', label: 'Preparing', count: counts.preparing },
              { key: 'served', label: 'Served', count: counts.served },
              { key: 'cancel', label: 'Cancelled', count: counts.cancelled },
            ].map(filter => {
              const selected = statusFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setStatusFilter(filter.key)}
                  className={`flex-row items-center rounded-full border px-3.5 py-1.5 shadow-xs ${
                    selected
                      ? 'border-[#116C0B] bg-[#116C0B]'
                      : filter.isPriority
                      ? 'border-[#86EFAC] bg-[#F0FDF4]'
                      : 'border-[#CBD5E1] bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selected
                        ? 'text-white'
                        : filter.isPriority
                        ? 'text-[#15803D]'
                        : 'text-[#475569]'
                    }`}
                  >
                    {filter.label}
                  </Text>
                  <View
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 ${
                      selected
                        ? 'bg-white/25'
                        : filter.isPriority
                        ? 'bg-[#DCFCE7]'
                        : 'bg-[#F1F5F9]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black ${
                        selected
                          ? 'text-white'
                          : filter.isPriority
                          ? 'text-[#15803D]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {filter.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Error Banner */}
        {error ? (
          <View className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text className="text-sm font-semibold text-[#B91C1C]">{error}</Text>
            <Pressable
              onPress={() => void loadOrders()}
              className="mt-3 self-start rounded-xl bg-[#B91C1C] px-4 py-2"
            >
              <Text className="text-xs font-bold text-white">Try Again</Text>
            </Pressable>
          </View>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <View className="mt-6 items-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white p-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9]">
              <OrdersIcon color="#94A3B8" size={28} />
            </View>
            <Text className="mt-3 text-base font-bold text-[#0F172A]">
              {scopedOrders.length === 0 ? 'No kitchen tickets found' : 'No matching tickets'}
            </Text>
            <Text className="mt-1 text-center text-xs text-[#64748B] px-4">
              {scopedOrders.length === 0
                ? 'When you take orders for assigned tables, tickets will appear here with live kitchen status.'
                : 'Try adjusting your search query or status filter.'}
            </Text>
            {scopedOrders.length > 0 && (search || statusFilter !== 'all') ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="mt-4 rounded-xl bg-[#116C0B] px-4 py-2.5 shadow-xs"
              >
                <Text className="text-xs font-bold text-white">Reset Filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          /* ================================================================
             Redesigned Premium KOT Ticket Cards
             ================================================================ */
          <View className="mt-4 gap-3.5">
            {filteredOrders.map((order, index) => {
              const rawOrderId = firstValue(order, ['kitchen_order_id', 'order_id', 'id']);
              const orderIdLabel = cleanOrderId(rawOrderId, index);
              const table = displayValue(
                firstValue(order, ['table_number', 'table_id', 'table']),
                '—',
              );
              const status = displayValue(
                firstValue(order, ['status', 'order_status']),
                'Pending',
              );
              const statusCfg = getStatusConfig(status);
              const rawTime = firstValue(order, [
                'created_at',
                'createdAt',
                'order_time',
                'time',
              ]);
              const timeDisplay = formatOrderTime(rawTime);
              const items = getOrderItems(order);
              const totalAmount = getOrderTotal(order);
              const notes = displayValue(
                firstValue(order, ['notes', 'instruction', 'special_notes']),
              );
              const serverName = displayValue(
                firstValue(order, ['server_name', 'assigned_server_name']),
              );
              const isUpdating = updatingOrderId === String(rawOrderId);
              const isReady = status.toLowerCase().includes('ready');
              const isServed =
                status.toLowerCase().includes('served') ||
                status.toLowerCase().includes('complete');

              return (
                <Pressable
                  key={`${orderIdLabel}-${index}`}
                  accessibilityLabel={`View order ${orderIdLabel}`}
                  onPress={() => setSelectedOrder(order)}
                  className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm active:bg-[#F8FAFC]"
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
                      backgroundColor: statusCfg.headerBg,
                      borderColor: statusCfg.border,
                    }}
                    className="border-b px-4 py-2.5 flex-row items-center justify-between"
                  >
                    {/* Left: Ticket # Badge + Table Badge */}
                    <View className="flex-row items-center gap-2">
                      <View className="rounded-md bg-[#0F172A] px-2.5 py-1 shadow-2xs">
                        <Text className="text-xs font-black tracking-wider text-white">
                          {orderIdLabel}
                        </Text>
                      </View>

                      <View className="flex-row items-center rounded-md border border-[#CBD5E1] bg-white px-2 py-0.5">
                        <TableSvg color="#0F172A" size={13} />
                        <Text className="ml-1 text-xs font-black text-[#0F172A]">
                          Table {table}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Time Ago + Status Pill */}
                    <View className="flex-row items-center gap-2">
                      {timeDisplay ? (
                        <View className="flex-row items-center">
                          <ClockSvg color="#64748B" size={12} />
                          <Text className="ml-1 text-[11px] font-bold text-[#64748B]">
                            {timeDisplay}
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderColor: statusCfg.border,
                        }}
                        className="flex-row items-center rounded-full border px-2.5 py-1 shadow-2xs"
                      >
                        <View
                          style={{ backgroundColor: statusCfg.dot }}
                          className="mr-1.5 h-2 w-2 rounded-full"
                        />
                        <Text
                          style={{ color: statusCfg.text }}
                          className="text-[11px] font-black"
                        >
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* FOOD ITEMS LIST SECTION */}
                  <View className="px-4 py-3 bg-white">
                    {/* Special Cooking Note Callout */}
                    {notes ? (
                      <View className="mb-2.5 flex-row items-center rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
                        <NoteSvg color="#D97706" size={14} />
                        <Text
                          className="ml-2 flex-1 text-xs font-semibold text-[#92400E]"
                          numberOfLines={2}
                        >
                          Note: {notes}
                        </Text>
                      </View>
                    ) : null}

                    {/* Assigned Server Tag if viewing all floor */}
                    {scopeFilter === 'all' && serverName ? (
                      <View className="mb-2 flex-row items-center">
                        <Text className="text-[11px] font-medium text-[#64748B]">
                          Server: <Text className="font-bold text-[#334155]">{serverName}</Text>
                        </Text>
                      </View>
                    ) : null}

                    {/* Items */}
                    {items.length > 0 ? (
                      items.map((item, itemIndex) => {
                        const name = displayValue(
                          firstValue(item, ['food_name', 'name', 'item_name']),
                          'Item',
                        );
                        const quantity = displayValue(firstValue(item, ['quantity']), '1');
                        const price = firstValue(item, ['total_price', 'price', 'unit_price']);
                        const isNonVegItem = checkIsNonVeg(name);

                        return (
                          <View
                            key={itemIndex}
                            className={`flex-row items-center justify-between py-2 ${
                              itemIndex > 0 ? 'border-t border-[#F8FAFC]' : ''
                            }`}
                          >
                            {/* Left: Dietary Icon + Food Name */}
                            <View className="flex-1 flex-row items-center pr-3">
                              <DietaryBadge isNonVeg={isNonVegItem} />
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
                                  × {quantity}
                                </Text>
                              </View>

                              <Text className="text-sm font-black text-[#0F172A] min-w-[65px] text-right">
                                {price !== undefined ? formatPrice(price) : '—'}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-xs text-[#94A3B8] italic py-1">
                        No food items listed for this ticket.
                      </Text>
                    )}
                  </View>

                  {/* TICKET FOOTER: TOTAL & ACTION */}
                  <View className="flex-row items-center justify-between border-t border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
                    <View>
                      <Text className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                        Order Total • {items.length} {items.length === 1 ? 'item' : 'items'}
                      </Text>
                      <Text className="text-base font-black text-[#116C0B] mt-0.5">
                        {formatPrice(totalAmount)}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {isReady ? (
                      <Pressable
                        disabled={isUpdating}
                        onPress={e => {
                          e.stopPropagation();
                          void updateOrderStatus(order, 'served');
                        }}
                        className="flex-row items-center rounded-xl bg-[#116C0B] px-4 py-2.5 shadow-sm active:bg-[#0D5208]"
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <CheckSvg color="#FFFFFF" size={14} />
                            <Text className="ml-1.5 text-xs font-black text-white">
                              Mark Served
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ) : isServed ? (
                      <Pressable
                        accessibilityLabel={`View order ${orderIdLabel}`}
                        onPress={() => setSelectedOrder(order)}
                        className="flex-row items-center rounded-xl bg-[#0F172A] px-3.5 py-2 active:bg-[#1E293B] shadow-xs"
                      >
                        <Text className="text-xs font-black text-white">View Order</Text>
                        <Text className="ml-1 text-xs font-black text-[#94A3B8]">›</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityLabel={`View order ${orderIdLabel}`}
                        onPress={() => setSelectedOrder(order)}
                        className="flex-row items-center rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 active:bg-[#F1F5F9] shadow-xs"
                      >
                        <Text className="text-xs font-black text-[#0F172A]">View Order</Text>
                        <Text className="ml-1 text-xs font-black text-[#64748B]">›</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Order Details Bottom Sheet Modal */}
      <Modal
        visible={Boolean(selectedOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="max-h-[86%] rounded-t-3xl bg-white px-5 pt-4 shadow-xl"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
            {/* Modal Drag Pill */}
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#CBD5E1]" />

            {/* Modal Header */}
            <View className="flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-black text-[#0F172A]">
                    {cleanOrderId(
                      selectedOrder &&
                        firstValue(selectedOrder, ['kitchen_order_id', 'order_id', 'id']),
                      1,
                    )}
                  </Text>
                  {selectedOrder ? (
                    <View
                      style={{
                        backgroundColor: getStatusConfig(
                          displayValue(
                            firstValue(selectedOrder, ['status', 'order_status']),
                            'Pending',
                          ),
                        ).bg,
                        borderColor: getStatusConfig(
                          displayValue(
                            firstValue(selectedOrder, ['status', 'order_status']),
                            'Pending',
                          ),
                        ).border,
                      }}
                      className="rounded-full border px-2.5 py-0.5"
                    >
                      <Text
                        style={{
                          color: getStatusConfig(
                            displayValue(
                              firstValue(selectedOrder, ['status', 'order_status']),
                              'Pending',
                            ),
                          ).text,
                        }}
                        className="text-[11px] font-extrabold"
                      >
                        {
                          getStatusConfig(
                            displayValue(
                              firstValue(selectedOrder, ['status', 'order_status']),
                              'Pending',
                            ),
                          ).label
                        }
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-1 text-xs font-semibold text-[#64748B]">
                  Table{' '}
                  {displayValue(
                    selectedOrder &&
                      firstValue(selectedOrder, ['table_number', 'table_id', 'table']),
                    '—',
                  )}
                  {selectedOrder && firstValue(selectedOrder, ['server_name'])
                    ? ` • Server: ${firstValue(selectedOrder, ['server_name'])}`
                    : ''}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close order details"
                onPress={() => setSelectedOrder(null)}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] active:bg-[#E2E8F0]"
              >
                <Text className="text-lg font-bold text-[#475569]">×</Text>
              </Pressable>
            </View>

            {/* Special Instructions in Modal */}
            {selectedOrder &&
            firstValue(selectedOrder, ['notes', 'instruction', 'special_notes']) ? (
              <View className="mt-3.5 flex-row items-center rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                <NoteSvg color="#D97706" size={16} />
                <View className="ml-2.5 flex-1">
                  <Text className="text-xs font-extrabold uppercase text-[#B45309]">
                    Special Cooking Notes
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium text-[#92400E]">
                    {String(
                      firstValue(selectedOrder, ['notes', 'instruction', 'special_notes']),
                    )}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Items Scroll List */}
            <ScrollView className="mt-3.5 max-h-[320px]" showsVerticalScrollIndicator={false}>
              <Text className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#64748B]">
                Order Food Items ({selectedOrderItems.length})
              </Text>

              {selectedOrderItems.length > 0 ? (
                selectedOrderItems.map((item, index) => {
                  const name = displayValue(
                    firstValue(item, ['food_name', 'name', 'item_name']),
                    'Item',
                  );
                  const quantity = displayValue(firstValue(item, ['quantity']), '1');
                  const price = firstValue(item, ['total_price', 'price', 'unit_price']);
                  const isNonVegItem = checkIsNonVeg(name);

                  return (
                    <View
                      key={index}
                      className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3"
                    >
                      <View className="flex-1 flex-row items-center pr-3">
                        <DietaryBadge isNonVeg={isNonVegItem} />
                        <View className="ml-2.5 flex-1">
                          <Text className="text-sm font-bold text-[#0F172A]">{name}</Text>
                          <Text className="mt-0.5 text-xs font-semibold text-[#64748B]">
                            Quantity: {quantity}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-extrabold text-[#116C0B]">
                        {formatPrice(price)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="py-8 text-center text-sm text-[#64748B]">
                  No item details were returned for this order.
                </Text>
              )}
            </ScrollView>

            {/* Total Summary Box */}
            <View className="mt-3 rounded-2xl bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-[#0F172A]">Ticket Grand Total</Text>
                <Text className="text-lg font-black text-[#116C0B]">
                  {selectedOrder ? formatPrice(getOrderTotal(selectedOrder)) : '—'}
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View className="mt-4 flex-row gap-3">
              {/* Ready -> Mark Served */}
              {selectedOrder &&
              String(
                firstValue(selectedOrder, ['status', 'order_status']) || '',
              )
                .toLowerCase()
                .includes('ready') ? (
                <Pressable
                  disabled={updatingOrderId === String(firstValue(selectedOrder, ['id']))}
                  onPress={() => void updateOrderStatus(selectedOrder, 'served')}
                  className="flex-1 h-12 flex-row items-center justify-center rounded-xl bg-[#116C0B] shadow-xs active:bg-[#0D5208]"
                >
                  {updatingOrderId ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckSvg color="#FFFFFF" size={16} />
                      <Text className="ml-2 font-black text-white">Mark as Served</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {/* Print Ticket Button */}
              <Pressable
                accessibilityLabel="Print order receipt"
                onPress={() => void printSelectedOrder()}
                className={`h-12 flex-row items-center justify-center rounded-xl border border-[#CBD5E1] bg-white active:bg-[#F8FAFC] ${
                  selectedOrder &&
                  String(
                    firstValue(selectedOrder, ['status', 'order_status']) || '',
                  )
                    .toLowerCase()
                    .includes('ready')
                    ? 'px-4'
                    : 'flex-1 bg-[#0F172A] border-[#0F172A]'
                }`}
              >
                <PrinterSvg
                  color={
                    selectedOrder &&
                    String(
                      firstValue(selectedOrder, ['status', 'order_status']) || '',
                    )
                      .toLowerCase()
                      .includes('ready')
                      ? '#334155'
                      : '#FFFFFF'
                  }
                  size={16}
                />
                <Text
                  className={`ml-2 font-extrabold ${
                    selectedOrder &&
                    String(
                      firstValue(selectedOrder, ['status', 'order_status']) || '',
                    )
                      .toLowerCase()
                      .includes('ready')
                      ? 'text-[#334155]'
                      : 'text-white'
                  }`}
                >
                  Print / Share Ticket
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
