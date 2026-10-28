import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../api';

export type ChefOrderPage =
  | 'kitchen'
  | 'home-delivery'
  | 'pickup'
  | 'dining'
  | 'new'
  | 'all'
  | 'delivery'
  | 'cancelled';

type OrderRecord = Record<string, unknown> & {
  id?: string | number;
  order_id?: string | number;
  order_number?: string;
  status?: string;
  order_status?: string;
  items?: Record<string, unknown>[];
};

type DeliveryPartner = Record<string, unknown> & {
  employee_id?: string | number;
};

const pageDetails: Record<ChefOrderPage, { title: string; subtitle: string }> = {
  kitchen: {
    title: 'Kitchen Orders',
    subtitle: 'Live dining tickets sent by the service team.',
  },
  'home-delivery': {
    title: 'Home Delivery Orders',
    subtitle: 'Track and update customer delivery orders.',
  },
  pickup: {
    title: 'Pickup Orders',
    subtitle: 'Track customer orders prepared for pickup.',
  },
  dining: {
    title: 'Dining Orders',
    subtitle: 'Review dining table tickets and kitchen progress.',
  },
  new: {
    title: 'New Orders',
    subtitle: 'Customer orders waiting to be prepared.',
  },
  all: {
    title: 'All Orders',
    subtitle: 'Review and update customer orders.',
  },
  delivery: {
    title: 'Delivery Orders',
    subtitle: 'Review home deliveries and assign available partners.',
  },
  cancelled: {
    title: 'Cancelled Orders',
    subtitle: 'Review cancelled customer orders.',
  },
};

const kitchenStatuses = ['All', 'Pending', 'Preparing', 'Ready to Serve', 'Served'];
const customerStatuses = [
  'All',
  'placed',
  'preparing',
  'ready',
  'assigned',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = '—') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
}

function readArray(payload: unknown, key?: string): Record<string, unknown>[] {
  if (!isRecord(payload)) {
    throw new Error('The orders service returned an invalid response.');
  }
  const rows = key ? payload[key] : payload.data;
  if (!Array.isArray(rows)) {
    throw new Error('The orders service returned an invalid order list.');
  }
  return rows.filter(isRecord);
}

function errorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return 'Unable to load orders. Please try again.';
}

function formatTime(value: unknown) {
  if (!value) {
    return 'Time unavailable';
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

function formatKotNumber(order: OrderRecord) {
  const source = String(order.kot_number || order.order_id || '').trim().toUpperCase();
  const match = source.match(/^(?:KOT-?)+(\d+)$/);
  if (match) {
    return `KOT${match[1].padStart(3, '0')}`;
  }
  if (order.id !== undefined && Number.isFinite(Number(order.id))) {
    return `KOT${String(order.id).padStart(3, '0')}`;
  }
  return source.startsWith('KOT-') ? source : `KOT-${source.slice(0, 8)}`;
}

function orderStatus(order: OrderRecord, isKitchen: boolean) {
  return text(isKitchen ? order.status : order.order_status, isKitchen ? 'Pending' : 'placed');
}

function getCustomerOrderParams(page: ChefOrderPage, status: string) {
  const params: Record<string, string> = {};
  if (page === 'home-delivery' || page === 'delivery') {
    params.order_type = 'home_delivery';
  } else if (page === 'pickup') {
    params.order_type = 'pickup';
  }
  if (page === 'new') {
    params.status = 'placed';
  } else if (page === 'cancelled') {
    params.status = 'cancelled';
  } else if (status !== 'All') {
    params.status = status;
  }
  return params;
}

function orderIdentity(order: OrderRecord, isKitchen: boolean) {
  return text(
    isKitchen
      ? order.order_id ?? order.id
      : order.order_number ?? order.id,
    '',
  );
}

function ChefOrdersScreen({ page }: { page: ChefOrderPage }) {
  const insets = useSafeAreaInsets();
  const isKitchen = page === 'kitchen' || page === 'dining';
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortLatest, setSortLatest] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [assignmentOrder, setAssignmentOrder] = useState<OrderRecord | null>(null);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      if (isKitchen) {
        const response = await api.get('/kitchen-orders', {
          params: page === 'dining' ? { order_type: 'dine-in' } : undefined,
          signal,
        });
        setOrders(readArray(response.data, 'orders') as OrderRecord[]);
      } else {
        const response = await api.get('/orders/management', {
          params: getCustomerOrderParams(page, statusFilter),
          signal,
        });
        setOrders(readArray(response.data) as OrderRecord[]);
      }

      if (page === 'delivery') {
        const partnerResponse = await api.get('/delivery-partners', { signal });
        setPartners(readArray(partnerResponse.data) as DeliveryPartner[]);
      }
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(errorMessage(loadError));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [isKitchen, page, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadOrders(controller.signal);
    const interval = setInterval(() => {
      loadOrders();
    }, isKitchen ? 10000 : 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [isKitchen, loadOrders, refreshVersion]);

  const counts = useMemo(() => {
    return orders.reduce<Record<string, number>>((result, order) => {
      const currentStatus = orderStatus(order, isKitchen);
      result[currentStatus] = (result[currentStatus] || 0) + 1;
      return result;
    }, {});
  }, [isKitchen, orders]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter(order => {
        if (statusFilter !== 'All' && orderStatus(order, isKitchen) !== statusFilter) {
          return false;
        }
        if (page === 'delivery') {
          const current = orderStatus(order, false).toLowerCase();
          if (['delivered', 'completed', 'cancelled'].includes(current)) {
            return false;
          }
        }
        if (!term) {
          return true;
        }
        const items = Array.isArray(order.items) ? order.items : [];
        return [
          order.order_id,
          order.order_number,
          order.kot_number,
          order.table_number,
          order.bill_number,
          order.customer_name,
          order.customer_phone,
          ...items.map(item => item.food_name ?? item.product_name),
        ].some(value => text(value, '').toLowerCase().includes(term));
      })
      .sort((left, right) => {
        const first = new Date(String(left.created_at || 0)).getTime();
        const second = new Date(String(right.created_at || 0)).getTime();
        return sortLatest ? second - first : first - second;
      });
  }, [isKitchen, orders, page, search, sortLatest, statusFilter]);

  const updateOrder = async (
    order: OrderRecord,
    status: string,
    deliveryPartnerId?: string,
  ) => {
    const id = orderIdentity(order, isKitchen);
    if (!id) {
      setError('This order is missing its order number.');
      return false;
    }
    setUpdatingId(id);
    setError('');
    try {
      const response = isKitchen
        ? await api.patch(
            `/kitchen-orders/${encodeURIComponent(id)}/status`,
            { status },
          )
        : await api.patch(
            `/orders/management/${encodeURIComponent(id)}/status`,
            {
              status,
              ...(deliveryPartnerId
                ? { delivery_partner_id: deliveryPartnerId }
                : {}),
            },
          );
      if (!isRecord(response.data) || response.data.success !== true) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The order status could not be updated.',
        );
      }
      setOrders(current =>
        current.map(item =>
          orderIdentity(item, isKitchen) === id
            ? {
                ...item,
                ...(isKitchen ? { status } : { order_status: status }),
              }
            : item,
        ),
      );
      if (assignmentOrder && orderIdentity(assignmentOrder, false) === id) {
        setAssignmentOrder(null);
      }
      if (selectedOrder && orderIdentity(selectedOrder, isKitchen) === id) {
        setSelectedOrder(current =>
          current
            ? {
                ...current,
                ...(isKitchen ? { status } : { order_status: status }),
              }
            : null,
        );
      }
      return true;
    } catch (updateError) {
      setError(errorMessage(updateError));
      return false;
    } finally {
      setUpdatingId('');
    }
  };

  const nextKitchenStatus = (status: string) => {
    if (status === 'Pending') return 'Preparing';
    if (status === 'Preparing') return 'Ready to Serve';
    if (status === 'Ready to Serve') return 'Served';
    return '';
  };

  const nextCustomerStatus = (order: OrderRecord) => {
    const status = orderStatus(order, false).toLowerCase();
    if (status === 'placed') return 'preparing';
    if (status === 'preparing') return 'ready';
    if (status === 'ready') {
      return order.order_type === 'pickup' ? 'delivered' : 'assigned';
    }
    if (status === 'assigned') return 'accepted';
    if (status === 'accepted') return 'reached_pickup';
    if (status === 'reached_pickup') return 'picked_up';
    if (status === 'picked_up') return 'out_for_delivery';
    if (status === 'out_for_delivery') return 'reached_customer';
    if (status === 'reached_customer') return 'delivered';
    return '';
  };

  const startAssignment = (order: OrderRecord) => {
    setAssignmentOrder(order);
    setSelectedPartner('');
  };

  const submitAssignment = () => {
    if (!assignmentOrder || !selectedPartner) {
      setError('Select an available delivery partner to assign this order.');
      return;
    }
    updateOrder(assignmentOrder, 'assigned', selectedPartner);
  };

  const details = pageDetails[page];
  const filters = isKitchen ? kitchenStatuses : customerStatuses;
  const selectedAddress =
    selectedOrder && isRecord(selectedOrder.address)
      ? selectedOrder.address
      : null;
  const formattedAddress = selectedAddress
    ? [
        selectedAddress.address_line,
        selectedAddress.area_locality,
        selectedAddress.landmark,
        selectedAddress.city,
        selectedAddress.state,
        selectedAddress.pincode,
      ]
        .filter(value => value !== undefined && value !== null && String(value).trim())
        .map(String)
        .join(', ')
    : '';
  const isTerminal = (order: OrderRecord) =>
    ['served', 'cancelled', 'delivered', 'completed'].includes(
      orderStatus(order, isKitchen).toLowerCase(),
    );

  return (
    <View className="gap-4 pb-6">
      <View>
        <Text className="text-[22px] font-extrabold text-[#012711]">
          {details.title}
        </Text>
        <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
          {details.subtitle}
        </Text>
      </View>

      {isKitchen ? (
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {[
            { label: 'Pending', value: counts.Pending || 0 },
            { label: 'Preparing', value: counts.Preparing || 0 },
            { label: 'Ready to serve', value: counts['Ready to Serve'] || 0 },
            { label: 'Served', value: counts.Served || 0 },
          ].map(stat => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === stat.label }}
              key={stat.label}
              onPress={() =>
                setStatusFilter(current =>
                  current === stat.label ? 'All' : stat.label,
                )
              }
              className={`w-[48%] rounded-2xl border p-3.5 ${
                statusFilter === stat.label
                  ? 'border-[#116C0B] bg-[#F0F7EE]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text className="text-[10px] font-bold uppercase text-[#6B7280]">
                {stat.label}
              </Text>
              <Text className="mt-2 text-2xl font-extrabold text-[#012711]">
                {loading ? '…' : stat.value}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <ScrollView
          contentContainerClassName="gap-2 pr-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map(filter => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === filter }}
              key={filter}
              onPress={() => setStatusFilter(filter)}
              className={`rounded-xl px-3 py-2 ${
                statusFilter === filter ? 'bg-[#123B2D]' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  statusFilter === filter ? 'text-white' : 'text-[#4B5563]'
                }`}
              >
                {filter === 'All' ? 'All statuses' : statusLabel(filter)}
                {filter !== 'All' && counts[filter]
                  ? ` (${counts[filter]})`
                  : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          accessibilityLabel="Search orders"
          className="min-h-11 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#012711]"
          onChangeText={setSearch}
          placeholder={
            isKitchen
              ? 'Search KOT, table, bill, or dish'
              : 'Search order, customer, phone, or dish'
          }
          placeholderTextColor="#9CA3AF"
          value={search}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setSortLatest(current => !current)}
          className="self-start rounded-lg bg-[#F0F7EE] px-3 py-2"
        >
          <Text className="text-[10px] font-semibold text-[#116C0B]">
            Sort: {sortLatest ? 'Latest first' : 'Oldest first'}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View className="rounded-xl border border-red-200 bg-red-50 p-3">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-red-700">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRefreshVersion(current => current + 1)}
            className="mt-2 self-start rounded-lg bg-red-100 px-3 py-2"
          >
            <Text className="text-xs font-bold text-red-800">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-xs text-[#6B7280]">Loading orders...</Text>
        </View>
      ) : visibleOrders.length ? (
        <View className="gap-3">
          {visibleOrders.map((order, index) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const id = orderIdentity(order, isKitchen);
            const currentStatus = orderStatus(order, isKitchen);
            const nextStatus = isKitchen
              ? nextKitchenStatus(currentStatus)
              : nextCustomerStatus(order);
            const isUpdating = updatingId === id;
            const totalAmount = isKitchen
              ? items.reduce(
                  (total, item) =>
                    total +
                    Number(item.unit_price || 0) * Number(item.quantity || 1),
                  0,
                )
              : Number(order.total_amount || 0);

            return (
              <View
                key={`${isKitchen ? 'kitchen' : 'customer'}-${id || index}`}
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedOrder(order)}
                  className="gap-3 p-4"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-[11px] font-extrabold text-[#123B2D]">
                        {isKitchen
                          ? formatKotNumber(order)
                          : `#${text(order.order_number)}`}
                      </Text>
                      <Text className="mt-1 text-sm font-bold text-[#111827]">
                        {isKitchen
                          ? `Table ${text(order.table_number)}`
                          : text(order.customer_name, 'Customer order')}
                      </Text>
                      <Text className="mt-1 text-[10px] text-[#6B7280]">
                        {formatTime(order.created_at)}
                      </Text>
                    </View>
                    <Text
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        statusColor(currentStatus)
                      }`}
                    >
                      {isKitchen ? currentStatus : statusLabel(currentStatus)}
                    </Text>
                  </View>

                  <View className="rounded-xl bg-[#F9FAFB] p-3">
                    {items.length ? (
                      items.slice(0, 4).map((item, itemIndex) => (
                        <Text
                          key={`${id}-item-${itemIndex}`}
                          numberOfLines={1}
                          className="py-1 text-[11px] leading-4 text-[#374151]"
                        >
                          <Text className="font-bold text-[#116C0B]">
                            {text(item.quantity, '1')}×{' '}
                          </Text>
                          {text(item.food_name ?? item.product_name, 'Menu item')}
                        </Text>
                      ))
                    ) : (
                      <Text className="text-[11px] text-[#6B7280]">
                        No items listed
                      </Text>
                    )}
                    {items.length > 4 ? (
                      <Text className="mt-1 text-[10px] text-[#6B7280]">
                        +{items.length - 4} more items
                      </Text>
                    ) : null}
                  </View>

                  <View className="flex-row flex-wrap justify-between gap-2">
                    <Text className="text-[10px] text-[#6B7280]">
                      {isKitchen
                        ? `${text(order.bill_number, 'No bill')} · Round ${text(order.round_number, '1')}`
                        : `${text(order.order_type) === 'home_delivery' ? 'Home delivery' : text(order.order_type, 'Pickup')} · ${text(order.customer_phone)}`}
                    </Text>
                    <Text className="text-[11px] font-extrabold text-[#123B2D]">
                      ₹{totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </Pressable>

                <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  {page === 'delivery' &&
                  !isKitchen &&
                  !order.assigned_delivery_partner_id &&
                  !isTerminal(order) ? (
                    <ActionButton
                      label="Assign delivery partner"
                      disabled={isUpdating}
                      onPress={() => startAssignment(order)}
                      className="bg-[#FC5805]"
                    />
                  ) : null}
                  {nextStatus &&
                  !isTerminal(order) &&
                  !(page === 'delivery' && nextStatus === 'assigned') ? (
                    <ActionButton
                      label={actionLabel(nextStatus)}
                      disabled={isUpdating}
                      onPress={() => {
                        if (nextStatus === 'assigned') {
                          startAssignment(order);
                        } else {
                          updateOrder(order, nextStatus);
                        }
                      }}
                      className={isKitchen ? 'bg-[#116C0B]' : 'bg-[#123B2D]'}
                    />
                  ) : null}
                  {isUpdating ? (
                    <ActivityIndicator color="#116C0B" size="small" />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-10">
          <Text className="text-center text-sm font-bold text-[#374151]">
            No orders to show
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-[#6B7280]">
            Orders matching this view will appear here.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => setRefreshVersion(current => current + 1)}
        className="items-center rounded-xl border border-[#E5E7EB] bg-white py-3"
      >
        <Text className="text-xs font-bold text-[#123B2D]">
          {loading ? 'Refreshing...' : 'Refresh orders'}
        </Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setSelectedOrder(null);
          setAssignmentOrder(null);
        }}
        transparent
        visible={selectedOrder !== null || assignmentOrder !== null}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="max-h-[90%] rounded-t-3xl bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {assignmentOrder ? (
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-extrabold text-[#123B2D]">
                      Assign delivery partner
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      Order #{text(assignmentOrder.order_number)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close delivery partner assignment"
                    accessibilityRole="button"
                    onPress={() => setAssignmentOrder(null)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
                  >
                    <Text className="text-lg text-[#374151]">×</Text>
                  </Pressable>
                </View>
                <ScrollView className="mt-3 max-h-[360px]">
                  {partners.map((partner, index) => {
                    const id = text(partner.employee_id, '');
                    const selected = id === selectedPartner;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={id || index}
                        onPress={() => setSelectedPartner(id)}
                        className={`mb-2 rounded-xl border p-3 ${
                          selected
                            ? 'border-[#116C0B] bg-[#F0F7EE]'
                            : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <Text className="text-sm font-bold text-[#012711]">
                          {text(partner.full_name, 'Delivery partner')}
                        </Text>
                        <Text className="mt-1 text-xs text-[#6B7280]">
                          {text(partner.phone_number, 'No phone number')}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {!partners.length ? (
                    <Text className="py-8 text-center text-sm text-[#6B7280]">
                      No available delivery partners were found.
                    </Text>
                  ) : null}
                </ScrollView>
                <ActionButton
                  label="Assign partner"
                  disabled={!selectedPartner || Boolean(updatingId)}
                  onPress={submitAssignment}
                  className="mt-2 bg-[#116C0B]"
                />
              </View>
            ) : selectedOrder ? (
              <>
                <View className="flex-row items-center justify-between border-b border-[#E5E7EB] p-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-[10px] font-bold uppercase text-[#6B7280]">
                      {isKitchen ? 'Kitchen order details' : 'Customer order details'}
                    </Text>
                    <Text className="mt-1 text-base font-extrabold text-[#123B2D]">
                      {isKitchen
                        ? formatKotNumber(selectedOrder)
                        : `#${text(selectedOrder.order_number)}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close order details"
                    accessibilityRole="button"
                    onPress={() => setSelectedOrder(null)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
                  >
                    <Text className="text-lg text-[#374151]">×</Text>
                  </Pressable>
                </View>
                <ScrollView
                  className="shrink"
                  contentContainerClassName="gap-3 p-4"
                >
                  <View className="rounded-xl bg-[#F9FAFB] p-3">
                    <Text className="text-sm font-bold text-[#012711]">
                      {isKitchen
                        ? `Table ${text(selectedOrder.table_number)}`
                        : text(selectedOrder.customer_name, 'Customer')}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      {formatTime(selectedOrder.created_at)}
                    </Text>
                    {!isKitchen ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {text(selectedOrder.customer_phone)}
                      </Text>
                    ) : null}
                    {formattedAddress ? (
                      <Text className="mt-2 text-xs leading-5 text-[#374151]">
                        Delivery address: {formattedAddress}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-sm font-extrabold text-[#111827]">
                    Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
                  </Text>
                  {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map(
                    (item, index) => {
                      const checkKey = `${orderIdentity(selectedOrder, isKitchen)}-${text(item.food_id ?? item.id, String(index))}`;
                      const checked = Boolean(checkedItems[checkKey]);
                      return (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          key={checkKey}
                          onPress={() =>
                            setCheckedItems(current => ({
                              ...current,
                              [checkKey]: !current[checkKey],
                            }))
                          }
                          className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                            checked
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#E5E7EB] bg-white'
                          }`}
                        >
                          <View
                            className={`h-5 w-5 items-center justify-center rounded border ${
                              checked
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-[#D1D5DB]'
                            }`}
                          >
                            {checked ? (
                              <Text className="text-[10px] font-bold text-white">✓</Text>
                            ) : null}
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-[#111827]">
                              {text(item.food_name ?? item.product_name, 'Menu item')}
                            </Text>
                            <Text className="mt-1 text-[10px] text-[#6B7280]">
                              {text(item.quantity, '1')} × ₹{Number(item.unit_price || 0).toFixed(2)}
                            </Text>
                            {item.cooking_notes || item.notes ? (
                              <Text className="mt-1 text-[10px] text-amber-700">
                                Note: {text(item.cooking_notes ?? item.notes)}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    },
                  )}
                  {selectedOrder.special_requests ? (
                    <View className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <Text className="text-[10px] font-bold uppercase text-amber-800">
                        Special requests
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-amber-950">
                        {text(selectedOrder.special_requests)}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
                {(() => {
                  const nextStatus = isKitchen
                    ? nextKitchenStatus(orderStatus(selectedOrder, true))
                    : nextCustomerStatus(selectedOrder);
                  return nextStatus ? (
                    <View className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
                      {nextStatus === 'assigned' ? (
                        <ActionButton
                          label="Assign delivery partner"
                          disabled={false}
                          onPress={() => {
                            setSelectedOrder(null);
                            startAssignment(selectedOrder);
                          }}
                          className="bg-[#FC5805]"
                        />
                      ) : (
                        <ActionButton
                          label={actionLabel(nextStatus)}
                          disabled={updatingId === orderIdentity(selectedOrder, isKitchen)}
                          onPress={() => updateOrder(selectedOrder, nextStatus)}
                          className="bg-[#116C0B]"
                        />
                      )}
                    </View>
                  ) : null;
                })()}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    placed: 'New',
    preparing: 'Preparing',
    ready: 'Ready',
    assigned: 'Assigned',
    accepted: 'Accepted',
    reached_pickup: 'Reached pickup',
    picked_up: 'Picked up',
    out_for_delivery: 'Out for delivery',
    reached_customer: 'Reached customer',
    delivered: 'Delivered',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function statusColor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'pending' || normalized === 'placed') {
    return 'bg-amber-50 text-amber-800';
  }
  if (normalized === 'preparing') {
    return 'bg-blue-50 text-blue-800';
  }
  if (normalized === 'ready' || normalized === 'ready to serve') {
    return 'bg-emerald-50 text-emerald-800';
  }
  if (normalized === 'cancelled') {
    return 'bg-rose-50 text-rose-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function actionLabel(status: string) {
  const labels: Record<string, string> = {
    Preparing: 'Start cooking',
    'Ready to Serve': 'Mark ready',
    Served: 'Mark served',
    preparing: 'Start preparing',
    ready: 'Mark ready',
    delivered: 'Mark delivered',
    accepted: 'Mark accepted',
    reached_pickup: 'Mark reached pickup',
    picked_up: 'Mark picked up',
    out_for_delivery: 'Start delivery',
    reached_customer: 'Mark reached customer',
  };
  return labels[status] || `Update to ${statusLabel(status)}`;
}

function ActionButton({
  label,
  disabled,
  className,
  onPress,
}: {
  label: string;
  disabled: boolean;
  className: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-xl px-3 py-2.5 ${className} ${
        disabled ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <Text className="text-[10px] font-extrabold text-white">
        {disabled ? 'Updating...' : label}
      </Text>
    </Pressable>
  );
}

export default ChefOrdersScreen;
