import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

type Order = Record<string, unknown>;

const firstValue = (order: Order, keys: string[]) => {
  for (const key of keys) {
    if (order[key] !== undefined && order[key] !== null && order[key] !== '') {
      return order[key];
    }
  }
  return undefined;
};

const displayValue = (value: unknown, fallback = '') =>
  value === undefined || value === null ? fallback : String(value);

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

function getStatusColors(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('ready')) return ['#166534', '#DCFCE7', '#BBF7D0'];
  if (normalized.includes('cancel')) return ['#B91C1C', '#FEE2E2', '#FECACA'];
  if (normalized.includes('served') || normalized.includes('complete')) {
    return ['#1D4ED8', '#DBEAFE', '#BFDBFE'];
  }
  return ['#C2410C', '#FFEDD5', '#FED7AA'];
}

export default function ServerOrders({
  user = {},
  serverEmployeeId,
}: {
  user?: HeaderUser;
  serverEmployeeId?: string | number | null;
}) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
    [user, serverEmployeeId],
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
      if (assignedName !== undefined && serverNames.includes(String(assignedName).trim().toLowerCase())) {
        return true;
      }

      for (const key of ['server', 'assigned_server', 'waiter']) {
        const assignedServer = order[key];
        if (assignedServer && typeof assignedServer === 'object') {
          const nestedId = firstValue(assignedServer as Order, ['id', 'employee_id', 'user_id']);
          const nestedName = firstValue(assignedServer as Order, ['name', 'full_name', 'username']);
          if (
            (nestedId !== undefined && serverIds.includes(String(nestedId).trim().toLowerCase())) ||
            (nestedName !== undefined && serverNames.includes(String(nestedName).trim().toLowerCase()))
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
      setOrders(receivedOrders.filter(belongsToServer));
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
  }, [belongsToServer]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter(order => {
      const status = displayValue(firstValue(order, ['status', 'order_status']), 'Pending');
      const normalizedStatus = status.toLowerCase();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          !['served', 'completed', 'complete', 'cancelled', 'canceled'].some(value =>
            normalizedStatus.includes(value),
          )) ||
        normalizedStatus.includes(statusFilter);
      if (!matchesStatus) return false;
      if (!query) return true;

      const items = Array.isArray(order.items) ? order.items : [];
      const itemText = items
        .map(item => {
          const row = item as Order;
          return firstValue(row, ['food_name', 'name', 'item_name']);
        })
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
  }, [orders, search, statusFilter]);

  const selectedOrderItems = useMemo(() => {
    if (!selectedOrder) return [];
    const rawItems =
      selectedOrder.items ||
      selectedOrder.order_items ||
      selectedOrder.food_items ||
      selectedOrder.items_json;
    if (Array.isArray(rawItems)) return rawItems as Order[];
    if (typeof rawItems === 'string') {
      try {
        const parsed = JSON.parse(rawItems);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [selectedOrder]);

  const printSelectedOrder = async () => {
    if (!selectedOrder) return;
    const orderId = displayValue(
      firstValue(selectedOrder, ['kitchen_order_id', 'order_id', 'id']),
      'Order',
    );
    const table = displayValue(
      firstValue(selectedOrder, ['table_number', 'table_id', 'table']),
      '—',
    );
    const status = displayValue(firstValue(selectedOrder, ['status', 'order_status']), 'Pending');
    const receiptText = [
      'BUY FOOD',
      `Kitchen Order: #${orderId}`,
      `Table: ${table}`,
      `Status: ${status}`,
      `Date: ${new Date().toLocaleString('en-IN')}`,
      '',
      ...selectedOrderItems.map(item => {
        const name = displayValue(firstValue(item, ['food_name', 'name', 'item_name']), 'Item');
        const quantity = displayValue(firstValue(item, ['quantity']), '1');
        const price = firstValue(item, ['total_price', 'price', 'unit_price']);
        return `${name} x${quantity}${price !== undefined ? `  ${price}` : ''}`;
      }),
    ].join('\n');

    try {
      await Share.share({ title: `Order #${orderId}`, message: receiptText });
    } catch (shareError) {
      Alert.alert(
        'Unable to open print options',
        shareError instanceof Error ? shareError.message : 'Please try again.',
      );
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF7800" />
        <Text className="mt-3 text-sm font-semibold text-[#64748B]">Loading kitchen orders...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
      className="flex-1"
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
      contentContainerClassName="px-4 pb-16 pt-4"
    >
      <View className="rounded-3xl bg-[#062D16] p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#114D26]">
            <OrdersIcon color="#86EFAC" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-black text-white">My Kitchen Orders</Text>
            <Text className="mt-1 text-xs text-[#CBD5E1]">Orders assigned to your server account</Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-xs font-extrabold text-[#86EFAC]">{filteredOrders.length}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-[#CBD5E1] bg-white px-3.5 py-2.5">
        <TextInput
          placeholder="Search order, table, or food..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          className="text-sm font-medium text-[#0F172A]"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <View className="flex-row gap-2">
          {[
            { key: 'all', label: `All (${orders.length})` },
            { key: 'active', label: 'Active' },
            { key: 'pending', label: 'Pending' },
            { key: 'preparing', label: 'Preparing' },
            { key: 'ready', label: 'Ready' },
            { key: 'served', label: 'Served' },
            { key: 'cancel', label: 'Cancelled' },
          ].map(filter => {
            const selected = statusFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setStatusFilter(filter.key)}
                className={`rounded-full border px-3.5 py-2 ${
                  selected ? 'border-[#116C0B] bg-[#116C0B]' : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#475569]'}`}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        </ScrollView>

      {error ? (
        <View className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <Text className="text-sm font-semibold text-[#B91C1C]">{error}</Text>
          <Pressable onPress={() => void loadOrders()} className="mt-3 self-start rounded-xl bg-[#B91C1C] px-4 py-2">
            <Text className="text-xs font-bold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View className="mt-4 items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8">
          <OrdersIcon color="#94A3B8" size={30} />
          <Text className="mt-3 text-base font-bold text-[#0F172A]">
            {orders.length === 0 ? 'No kitchen orders' : 'No matching orders'}
          </Text>
          <Text className="mt-1 text-center text-xs text-[#64748B]">
            {orders.length === 0
              ? 'Orders assigned to you will appear here.'
              : 'Try another search or status filter.'}
          </Text>
          {orders.length > 0 && (search || statusFilter !== 'all') ? (
            <Pressable
              onPress={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="mt-4 rounded-xl bg-[#116C0B] px-4 py-2"
            >
              <Text className="text-xs font-bold text-white">Reset Filters</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View className="mt-4 gap-3">
          {filteredOrders.map((order, index) => {
            const orderId = displayValue(firstValue(order, ['kitchen_order_id', 'order_id', 'id']), `Order ${index + 1}`);
            const table = displayValue(firstValue(order, ['table_number', 'table_id', 'table']), '—');
            const status = displayValue(firstValue(order, ['status', 'order_status']), 'Pending');
            const [statusText, statusBackground, statusBorder] = getStatusColors(status);
            const items = Array.isArray(order.items) ? order.items : [];
            return (
              <Pressable
                key={`${orderId}-${index}`}
                accessibilityLabel={`View order ${orderId}`}
                onPress={() => setSelectedOrder(order)}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm active:bg-[#F8FAFC]"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-black text-[#0F172A]">#{orderId}</Text>
                    <Text className="mt-1 text-xs font-semibold text-[#64748B]">Table {table}</Text>
                  </View>
                  <View style={{ backgroundColor: statusBackground, borderColor: statusBorder, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: statusText, fontSize: 11, fontWeight: '800' }}>{status}</Text>
                  </View>
                </View>
                {items.length > 0 ? (
                  <View className="mt-3 border-t border-[#F1F5F9] pt-3">
                    {items.slice(0, 5).map((item, itemIndex) => {
                      const row = item as Order;
                      return (
                        <View key={itemIndex} className="mb-1 flex-row justify-between">
                          <Text className="flex-1 text-sm text-[#334155]">
                            {displayValue(firstValue(row, ['food_name', 'name', 'item_name']), 'Item')} × {displayValue(firstValue(row, ['quantity']), '1')}
                          </Text>
                          <Text className="text-sm font-bold text-[#116C0B]">{displayValue(firstValue(row, ['total_price', 'price']))}</Text>
                        </View>
                      );
                    })}
                    {items.length > 5 ? <Text className="mt-1 text-xs text-[#64748B]">+{items.length - 5} more items</Text> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
      <Modal
        visible={Boolean(selectedOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="max-h-[82%] rounded-t-3xl bg-white px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#CBD5E1]" />
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-black text-[#0F172A]">
                  Order #
                  {displayValue(
                    selectedOrder && firstValue(selectedOrder, ['kitchen_order_id', 'order_id', 'id']),
                    'Order',
                  )}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-[#64748B]">
                  Table{' '}
                  {displayValue(
                    selectedOrder && firstValue(selectedOrder, ['table_number', 'table_id', 'table']),
                    '—',
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close order details"
                onPress={() => setSelectedOrder(null)}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <Text className="text-lg font-bold text-[#475569]">×</Text>
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {selectedOrderItems.length > 0 ? (
                selectedOrderItems.map((item, index) => (
                  <View key={index} className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-[#0F172A]">
                        {displayValue(firstValue(item, ['food_name', 'name', 'item_name']), 'Item')}
                      </Text>
                      <Text className="mt-1 text-xs text-[#64748B]">
                        Quantity: {displayValue(firstValue(item, ['quantity']), '1')}
                      </Text>
                    </View>
                    <Text className="text-sm font-extrabold text-[#116C0B]">
                      {displayValue(firstValue(item, ['total_price', 'price', 'unit_price']), '—')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="py-8 text-center text-sm text-[#64748B]">
                  No item details were returned for this order.
                </Text>
              )}
            </ScrollView>

            <Pressable
              accessibilityLabel="Print order receipt"
              onPress={() => void printSelectedOrder()}
              className="mt-4 h-12 items-center justify-center rounded-xl bg-[#116C0B]"
            >
              <Text className="font-extrabold text-white">Print Receipt</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}