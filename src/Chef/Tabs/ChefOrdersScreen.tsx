import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../api';
import {
  CustomersIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';
import {
  CheckIcon,
  DetailsModal,
  FormModal,
} from '../../components/popups';
import ChefDishThumbnail from './ChefDishThumbnail';
import ChefListControls from './ChefListControls';
import ChefStatCards from './ChefStatCards';

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
  const rows = key
    ? payload[key]
    : Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.orders)
    ? payload.orders
    : isRecord(payload.data) && Array.isArray(payload.data.data)
    ? payload.data.data
    : isRecord(payload.data) && Array.isArray(payload.data.orders)
    ? payload.data.orders
    : undefined;
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

function OrderSkeletonCard({ viewMode }: { viewMode: 'grid' | 'table' }) {
  if (viewMode === 'table') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mb-2 min-h-[88px] w-[1460px] flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2"
      >
        {[50, 250, 345, 160, 185, 110, 140, 220].map((width, index) => (
          <View key={index} className="gap-2 px-2" style={{ width }}>
            <View className="h-3 w-3/4 rounded-md bg-slate-100" />
            {index === 2 ? (
              <View className="flex-row items-center gap-2">
                <View className="h-9 w-9 rounded-xl bg-slate-100" />
                <View className="h-3 w-24 rounded-md bg-slate-100" />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white"
    >
      <View className="gap-3 p-3.5">
        <View className="flex-row items-start justify-between">
          <View className="gap-2">
            <View className="h-3 w-24 rounded-md bg-slate-100" />
            <View className="h-5 w-40 rounded-md bg-slate-100" />
            <View className="h-3 w-32 rounded-md bg-slate-100" />
          </View>
          <View className="h-7 w-20 rounded-full bg-slate-100" />
        </View>
        <View className="gap-2 rounded-2xl bg-[#F7FAF8] p-3">
          {[0, 1, 2].map(index => (
            <View key={index} className="flex-row items-center gap-2.5">
              <View className="h-11 w-11 rounded-xl bg-slate-100" />
              <View className="flex-1 gap-2">
                <View className="h-3 w-2/3 rounded-md bg-slate-100" />
                <View className="h-2.5 w-1/3 rounded-md bg-slate-100" />
              </View>
              <View className="h-3 w-8 rounded-md bg-slate-100" />
            </View>
          ))}
        </View>
        <View className="h-10 rounded-xl bg-slate-50" />
      </View>
      <View className="h-[62px] border-t border-[#E5E7EB] bg-white" />
    </View>
  );
}

function ChefOrdersScreen({ page }: { page: ChefOrderPage }) {
  const isKitchen = page === 'kitchen' || page === 'dining';
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortLatest, setSortLatest] = useState(true);
  const [allOrdersViewMode, setAllOrdersViewMode] = useState<'grid' | 'table'>(
    'grid',
  );
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
  const usesListControls = [
    'all',
    'kitchen',
    'dining',
    'new',
    'pickup',
    'home-delivery',
    'delivery',
    'cancelled',
  ].includes(page);
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
  const countStatuses = (...statuses: string[]) =>
    orders.filter(order =>
      statuses.includes(orderStatus(order, isKitchen).toLowerCase()),
    ).length;
  const itemCount = orders.reduce(
    (total, order) =>
      total +
      (Array.isArray(order.items)
        ? order.items.reduce(
            (itemTotal, item) =>
              itemTotal + (Number(item.quantity) > 0 ? Number(item.quantity) : 1),
            0,
          )
        : 0),
    0,
  );
  const customerCount = new Set(
    orders
      .map(order => text(order.customer_name, '').trim())
      .filter(Boolean),
  ).size;
  const orderValue = orders.reduce(
    (total, order) =>
      total +
      (isKitchen
        ? (Array.isArray(order.items) ? order.items : []).reduce(
            (sum, item) =>
              sum + Number(item.unit_price || 0) * Number(item.quantity || 1),
            0,
          )
        : Number(order.total_amount || 0)),
    0,
  );
  const orderStats = isKitchen
    ? [
        {
          label: 'Active orders',
          value: orders.filter(order => !isTerminal(order)).length,
          hint: 'Open kitchen orders',
          icon: <OrdersIcon color="#F6D36A" size={22} />,
        },
        {
          label: 'Pending',
          value: countStatuses('pending'),
          hint: 'Waiting to start',
          icon: <ReceiptIcon color="#F6D36A" size={22} />,
          onPress: () => setStatusFilter(current => current === 'Pending' ? 'All' : 'Pending'),
          isSelected: statusFilter === 'Pending',
        },
        {
          label: 'Preparing',
          value: countStatuses('preparing'),
          hint: 'In progress',
          icon: <OrdersIcon color="#F6D36A" size={22} />,
          onPress: () => setStatusFilter(current => current === 'Preparing' ? 'All' : 'Preparing'),
          isSelected: statusFilter === 'Preparing',
        },
        {
          label: 'Ready to serve',
          value: countStatuses('ready to serve'),
          hint: 'Plated and hot',
          icon: <CustomersIcon color="#F6D36A" size={22} />,
          onPress: () => setStatusFilter(current => current === 'Ready to Serve' ? 'All' : 'Ready to Serve'),
          isSelected: statusFilter === 'Ready to Serve',
        },
      ]
    : page === 'cancelled'
      ? [
          {
            label: 'Cancelled orders',
            value: orders.length,
            hint: 'Cancelled by customers',
            icon: <OrdersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Items',
            value: itemCount,
            hint: 'Items in cancelled orders',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Customers',
            value: customerCount,
            hint: 'Customers affected',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Order value',
            value: `₹${orderValue.toFixed(0)}`,
            hint: 'Total cancelled value',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
        ]
      : page === 'new'
        ? [
            {
              label: 'New orders',
              value: orders.length,
              hint: 'Waiting for kitchen',
              icon: <OrdersIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'Items',
              value: itemCount,
              hint: 'Items to prepare',
              icon: <ReceiptIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'Customers',
              value: customerCount,
              hint: 'Unique customers',
              icon: <CustomersIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'Order value',
              value: `₹${orderValue.toFixed(0)}`,
              hint: 'Total new order value',
              icon: <ReceiptIcon color="#F6D36A" size={22} />,
            },
          ]
        : [
            {
              label: 'Total orders',
              value: orders.length,
              hint: 'Orders in this view',
              icon: <OrdersIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'New',
              value: countStatuses('placed'),
              hint: 'Waiting to start',
              icon: <ReceiptIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'In progress',
              value: countStatuses('preparing', 'accepted', 'assigned', 'out_for_delivery'),
              hint: 'Being prepared or delivered',
              icon: <CustomersIcon color="#F6D36A" size={22} />,
            },
            {
              label: 'Completed',
              value: countStatuses('served', 'delivered', 'completed', 'picked_up'),
              hint: 'Successfully fulfilled',
              icon: <ReceiptIcon color="#F6D36A" size={22} />,
            },
          ];

  const renderOrderActions = (order: OrderRecord, isTable = false) => {
    const id = orderIdentity(order, isKitchen);
    const currentStatus = orderStatus(order, isKitchen);
    const nextStatus = isKitchen
      ? nextKitchenStatus(currentStatus)
      : nextCustomerStatus(order);
    const isUpdating = updatingId === id;
    const actionWidth = isTable ? 'w-[170px]' : 'flex-1';

    return (
      <View className="flex-row flex-wrap items-center gap-2">
          {page === 'delivery' &&
          !isKitchen &&
          !order.assigned_delivery_partner_id &&
          !isTerminal(order) ? (
            <ActionButton
              label="Assign partner"
              disabled={isUpdating}
              onPress={() => startAssignment(order)}
              className={actionWidth}
              style={{ backgroundColor: colors.primary }}
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
              className={actionWidth}
              style={{ backgroundColor: isKitchen ? '#116C0B' : '#123B2D' }}
            />
          ) : null}
          {isUpdating ? <ActivityIndicator color="#116C0B" size="small" /> : null}
          {!nextStatus && isTerminal(order) ? (
            <Text className="px-2 text-[10px] font-bold text-[#64748B]">
              Order complete
            </Text>
          ) : null}
      </View>
    );
  };

  const renderOrderCard = (order: OrderRecord, index: number) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const id = orderIdentity(order, isKitchen);
    const currentStatus = orderStatus(order, isKitchen);
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
          className="w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm"
      >
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedOrder(order)}
            className="gap-3 p-3.5"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-extrabold uppercase tracking-wide text-[#14764A]">
                  {isKitchen ? formatKotNumber(order) : `ORDER #${text(order.order_number)}`}
                </Text>
                <Text className="mt-1 text-base font-extrabold text-[#111827]">
                  {isKitchen
                    ? `Table ${text(order.table_number)}`
                    : text(order.customer_name, 'Customer order')}
                </Text>
                <Text className="mt-1 text-[11px] text-[#64748B]">
                  {isKitchen
                    ? `${text(order.bill_number, 'No bill')} · Round ${text(order.round_number, '1')}`
                    : text(order.customer_phone, 'No phone number')}
                </Text>
              </View>
              <View className="items-end gap-1.5">
                <Text
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColor(currentStatus).className}`}
                  style={statusColor(currentStatus).style}
                >
                  {isKitchen ? currentStatus : statusLabel(currentStatus)}
                </Text>
                <Text className="text-[10px] text-[#64748B]">
                  {formatTime(order.created_at)}
                </Text>
              </View>
            </View>

            <View className="overflow-hidden rounded-2xl border border-[#E8EFEA] bg-[#FCFDFC] px-3">
              <View className="h-10 flex-row items-center justify-between border-b border-[#E8EFEA]">
                <Text className="text-[10px] font-extrabold uppercase tracking-wide text-[#1F2937]">
                  Dishes · {items.length}
                </Text>
                <Text className="text-sm font-bold text-[#64748B]">›</Text>
              </View>
              {items.length ? (
                items.slice(0, 3).map((item, itemIndex) => (
                  <View
                    key={`${id}-item-${itemIndex}`}
                    className={`min-h-[58px] flex-row items-center gap-2.5 py-1.5 ${
                      itemIndex < Math.min(items.length, 3) - 1
                        ? 'border-b border-[#E8EFEA]'
                        : ''
                    }`}
                  >
                    <ChefDishThumbnail item={item} />
                    <Text
                      numberOfLines={2}
                      className="min-w-0 flex-1 text-xs text-[#1F2937]"
                    >
                      {text(item.food_name ?? item.product_name, 'Menu item')}
                    </Text>
                    <Text className="text-xs font-extrabold text-[#17633D]">
                      × {text(item.quantity, '1')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="py-4 text-xs text-[#64748B]">
                  No dish details
                </Text>
              )}
              {items.length > 3 ? (
                <Text className="border-t border-[#E8EFEA] py-2 text-[10px] font-semibold text-[#64748B]">
                  +{items.length - 3} more dishes
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center justify-between rounded-xl bg-[#F7FAF8] px-3 py-2.5">
              <View className="flex-1 pr-2">
                <Text className="text-[9px] font-bold uppercase tracking-wide text-[#84918B]">
                  {isKitchen ? 'Order details' : 'Order type'}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-[11px] font-semibold text-[#475569]">
                  {isKitchen
                    ? `Round ${text(order.round_number, '1')} · ${formatTime(order.created_at)}`
                    : text(order.order_type) === 'home_delivery'
                      ? 'Home delivery'
                      : text(order.order_type, 'Pickup')}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[9px] font-bold uppercase tracking-wide text-[#84918B]">
                  Total
                </Text>
                <Text className="mt-1 text-sm font-extrabold text-[#123B2D]">
                  ₹{totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </Pressable>

          <View className="flex-row flex-wrap items-center gap-2 border-t border-[#E5E7EB] bg-white p-3">
            {renderOrderActions(order)}
          </View>
      </View>
    );
  };

  const tableColumns = [
    { label: 'No.', width: 50 },
    { label: isKitchen ? 'KOT / Table' : 'Order / Customer', width: 250 },
    { label: 'Dishes', width: 345 },
    { label: isKitchen ? 'Bill / Round' : 'Order type', width: 160 },
    { label: 'Date & time', width: 185 },
    { label: 'Total', width: 110 },
    { label: 'Status', width: 140 },
    { label: 'Actions', width: 220 },
  ];

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

      <ChefStatCards isLoading={loading} stats={orderStats} />

      {usesListControls ? (
        <ChefListControls
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: filters.map(filter => ({
                value: filter,
                label:
                  filter === 'All'
                    ? 'All statuses'
                    : `${statusLabel(filter)}${
                        counts[filter] ? ` (${counts[filter]})` : ''
                      }`,
              })),
              onChange: setStatusFilter,
            },
          ]}
          onSearchChange={setSearch}
          onViewModeChange={setAllOrdersViewMode}
          placeholder="Search order, customer, phone, or dish..."
          search={search}
          searchLabel={`Search ${details.title.toLowerCase()}`}
          sort={{
            value: sortLatest ? 'latest' : 'oldest',
            options: [
              { value: 'latest', label: 'Latest first' },
              { value: 'oldest', label: 'Oldest first' },
            ],
            onChange: value => {
              if (value === 'latest' || value === 'oldest') {
                setSortLatest(value === 'latest');
              }
            },
          }}
          viewMode={allOrdersViewMode}
        />
      ) : (
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
      )}

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
        allOrdersViewMode === 'table' ? (
          <View className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="w-[1460px]">
                <View className="mb-2 h-10 w-[1460px] flex-row items-center rounded-xl border border-[#E5E7EB] bg-white px-3">
                  {tableColumns.map(column => (
                    <View
                      key={column.label}
                      className="px-2"
                      style={{ width: column.width }}
                    >
                      <View className="h-2.5 w-3/4 rounded-md bg-slate-200" />
                    </View>
                  ))}
                </View>
                {[0, 1, 2, 3].map(index => (
                  <OrderSkeletonCard key={index} viewMode="table" />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View className="gap-3">
            {[0, 1, 2].map(index => (
              <OrderSkeletonCard key={index} viewMode="grid" />
            ))}
          </View>
        )
      ) : visibleOrders.length ? (
        allOrdersViewMode === 'table' ? (
          <View className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="w-[1460px]">
                <View className="mb-2 h-10 w-[1460px] flex-row items-center rounded-xl border border-[#E5E7EB] bg-white px-3">
                  {tableColumns.map(column => (
                    <Text
                      key={column.label}
                      className="px-2 text-[9px] font-bold uppercase tracking-wide text-[#64748B]"
                      style={{ width: column.width }}
                    >
                      {column.label}
                    </Text>
                  ))}
                </View>
                {visibleOrders.map((order, index) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const id = orderIdentity(order, isKitchen);
                  const currentStatus = orderStatus(order, isKitchen);
                  const totalAmount = isKitchen
                    ? items.reduce(
                        (total, item) =>
                          total +
                          Number(item.unit_price || 0) *
                            Number(item.quantity || 1),
                        0,
                      )
                    : Number(order.total_amount || 0);
                  const mainItem = items[0];

                  return (
                    <View
                      key={`${isKitchen ? 'kitchen' : 'customer'}-${id || index}`}
                      className="mb-2 min-h-[88px] w-[1460px] flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm"
                    >
                      <Text className="w-[50px] px-2 text-xs font-bold text-[#64748B]">
                        {index + 1}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSelectedOrder(order)}
                        className="w-[250px] px-2"
                      >
                        <Text className="text-[10px] font-extrabold text-[#14764A]">
                          {isKitchen
                            ? formatKotNumber(order)
                            : `#${text(order.order_number)}`}
                        </Text>
                        <Text numberOfLines={1} className="mt-1 text-xs font-bold text-[#1F2937]">
                          {isKitchen
                            ? `Table ${text(order.table_number)}`
                            : text(order.customer_name, 'Customer order')}
                        </Text>
                        {!isKitchen ? (
                          <Text numberOfLines={1} className="mt-1 text-[10px] text-[#64748B]">
                            {text(order.customer_phone, 'No phone number')}
                          </Text>
                        ) : null}
                      </Pressable>
                      <View className="w-[345px] flex-row items-center gap-2 px-2">
                        {mainItem ? (
                          <ChefDishThumbnail item={mainItem} size={40} />
                        ) : (
                          <View className="h-10 w-10 rounded-xl bg-[#EAF4E7]" />
                        )}
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-xs font-semibold text-[#1F2937]">
                            {mainItem
                              ? text(mainItem.food_name ?? mainItem.product_name, 'Menu item')
                              : 'No dish details'}
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[10px] text-[#64748B]">
                            {items.length > 1
                              ? `+${items.length - 1} more dishes`
                              : mainItem
                                ? `${text(mainItem.quantity, '1')} item`
                                : 'No items listed'}
                          </Text>
                        </View>
                      </View>
                      <View className="w-[160px] px-2">
                        <Text numberOfLines={1} className="text-[10px] font-semibold text-[#475569]">
                          {isKitchen
                            ? `Bill ${text(order.bill_number, '—')}`
                            : text(order.order_type) === 'home_delivery'
                              ? 'Home delivery'
                              : text(order.order_type, 'Pickup')}
                        </Text>
                        {isKitchen ? (
                          <Text className="mt-1 text-[10px] text-[#64748B]">
                            Round {text(order.round_number, '1')}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="w-[185px] px-2 text-[10px] text-[#475569]">
                        {formatTime(order.created_at)}
                      </Text>
                      <Text className="w-[110px] px-2 text-xs font-extrabold text-[#123B2D]">
                        ₹{totalAmount.toFixed(2)}
                      </Text>
                      <View className="w-[140px] px-2">
                        <Text
                          className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColor(currentStatus).className}`}
                          style={statusColor(currentStatus).style}
                        >
                          {isKitchen ? currentStatus : statusLabel(currentStatus)}
                        </Text>
                      </View>
                      <View className="w-[220px] px-2">
                        {renderOrderActions(order, true)}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View className="gap-3">
            {visibleOrders.map(renderOrderCard)}
          </View>
        )
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

      {assignmentOrder ? (
        <FormModal
          visible={assignmentOrder !== null}
          onClose={() => setAssignmentOrder(null)}
          title="Assign Delivery Partner"
          subtitle={`Order #${text(assignmentOrder.order_number)}`}
          onSave={submitAssignment}
          saveLabel="Assign Partner"
          cancelLabel="Cancel"
          isSaveDisabled={!selectedPartner || Boolean(updatingId)}
          isSaving={Boolean(updatingId)}
        >
          <ScrollView className="max-h-[360px]" contentContainerClassName="gap-2 pb-2">
            {partners.map((partner, index) => {
              const id = text(partner.employee_id, '');
              const selected = id === selectedPartner;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={id || index}
                  onPress={() => setSelectedPartner(id)}
                  className={`flex-row items-center justify-between rounded-2xl border p-3.5 ${
                    selected
                      ? 'border-[#116C0B] bg-[#116C0B]/5'
                      : 'border-[#CBD5E1] bg-white active:bg-gray-50'
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-bold text-[#0F172A]">
                      {text(partner.full_name, 'Delivery partner')}
                    </Text>
                    <Text className="mt-1 text-xs text-[#64748B]">
                      {text(partner.phone_number, 'No phone number')}
                    </Text>
                  </View>
                  {selected && <CheckIcon size={18} color="#116C0B" />}
                </Pressable>
              );
            })}
            {!partners.length ? (
              <Text className="py-8 text-center text-sm text-[#64748B]">
                No available delivery partners were found.
              </Text>
            ) : null}
          </ScrollView>
        </FormModal>
      ) : null}

      {selectedOrder ? (
        <DetailsModal
          visible={selectedOrder !== null}
          onClose={() => setSelectedOrder(null)}
          title={
            isKitchen
              ? formatKotNumber(selectedOrder)
              : `#${text(selectedOrder.order_number)}`
          }
          subtitle={
            isKitchen
              ? `Table ${text(selectedOrder.table_number)} · ${formatTime(selectedOrder.created_at)}`
              : `${text(selectedOrder.customer_name, 'Customer')} · ${formatTime(selectedOrder.created_at)}`
          }
          badge={{
            label: String(orderStatus(selectedOrder, isKitchen) || 'Pending'),
            bg: '#F0FDF4',
            text: '#116C0B',
            border: '#DCFCE7',
          }}
          footer={(() => {
            const nextStatus = isKitchen
              ? nextKitchenStatus(orderStatus(selectedOrder, true))
              : nextCustomerStatus(selectedOrder);
            return (
              <View className="w-full flex-row gap-3">
                <Pressable
                  onPress={() => setSelectedOrder(null)}
                  className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
                >
                  <Text className="text-sm font-semibold text-[#334155]">Close</Text>
                </Pressable>
                {nextStatus ? (
                  nextStatus === 'assigned' ? (
                    <Pressable
                      onPress={() => {
                        const ord = selectedOrder;
                        setSelectedOrder(null);
                        startAssignment(ord);
                      }}
                      className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
                    >
                      <Text className="text-sm font-bold text-white">Assign Partner</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={updatingId === orderIdentity(selectedOrder, isKitchen)}
                      onPress={() => updateOrder(selectedOrder, nextStatus)}
                      className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
                    >
                      {updatingId === orderIdentity(selectedOrder, isKitchen) ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-sm font-bold text-white">
                          {actionLabel(nextStatus)}
                        </Text>
                      )}
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })()}
        >
          <View className="gap-3">
            {/* Customer & Address Details */}
            <View className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-3.5">
              <Text className="text-sm font-bold text-[#0F172A]">
                {isKitchen
                  ? `Table ${text(selectedOrder.table_number)}`
                  : text(selectedOrder.customer_name, 'Customer')}
              </Text>
              {!isKitchen && selectedOrder.customer_phone ? (
                <Text className="mt-1 text-xs text-[#64748B]">
                  {text(selectedOrder.customer_phone)}
                </Text>
              ) : null}
              {formattedAddress ? (
                <Text className="mt-2 text-xs leading-5 text-[#334155]">
                  Delivery address: {formattedAddress}
                </Text>
              ) : null}
            </View>

            {/* Checklist */}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Prep Checklist ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
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
                      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${
                        checked
                          ? 'border-[#116C0B] bg-[#116C0B]/5'
                          : 'border-[#CBD5E1] bg-white active:bg-gray-50'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-lg border ${
                          checked
                            ? 'border-[#116C0B] bg-[#116C0B]'
                            : 'border-[#94A3B8]'
                        }`}
                      >
                        {checked ? (
                          <Text className="text-[10px] font-bold text-white">✓</Text>
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-xs font-bold ${
                            checked ? 'line-through text-[#64748B]' : 'text-[#0F172A]'
                          }`}
                        >
                          {text(item.food_name ?? item.product_name, 'Menu item')}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#64748B]">
                          {text(item.quantity, '1')} × ₹{Number(item.unit_price || 0).toFixed(2)}
                        </Text>
                        {item.cooking_notes || item.notes ? (
                          <Text className="mt-1 text-[11px] font-semibold text-[#116C0B]">
                            Note: {text(item.cooking_notes ?? item.notes)}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                },
              )}
            </View>

            {selectedOrder.special_requests ? (
              <View className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Special Requests
                </Text>
                <Text className="mt-1 text-xs leading-5 text-amber-900">
                  {text(selectedOrder.special_requests)}
                </Text>
              </View>
            ) : null}
          </View>
        </DetailsModal>
      ) : null}
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

function statusColor(
  status: string,
): { className: string; style?: { backgroundColor: string; color: string } } {
  const normalized = status.toLowerCase();
  if (normalized === 'pending' || normalized === 'placed') {
    return {
      className: '',
      style: {
        backgroundColor: colors.surfaceSecondary,
        color: colors.primary,
      },
    };
  }
  if (normalized === 'preparing') {
    return { className: 'bg-blue-50 text-blue-800' };
  }
  if (normalized === 'ready' || normalized === 'ready to serve') {
    return { className: 'bg-emerald-50 text-emerald-800' };
  }
  if (normalized === 'cancelled') {
    return { className: 'bg-rose-50 text-rose-700' };
  }
  return { className: 'bg-slate-100 text-slate-700' };
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
  style,
  onPress,
}: {
  label: string;
  disabled: boolean;
  className: string;
  style?: { backgroundColor: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={style}
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
