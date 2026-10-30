import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CustomersIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../api';
import colors from '../../theme/colors';
import { DetailsModal } from '../../components/popups';
import ChefListControls from './ChefListControls';
import ChefStatCards from './ChefStatCards';

type EventOrder = Record<string, unknown> & {
  id?: string | number;
  status?: string;
  items?: Record<string, unknown>[];
};

type EventOrderFilter =
  | 'All Confirmed'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Completed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOrders(payload: unknown): EventOrder[] {
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error(
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'The event orders response was invalid.',
    );
  }
  return payload.data.filter(isRecord) as EventOrder[];
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return 'Unable to load event orders. Please try again.';
}

function text(value: unknown, fallback = '—') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
}

function formatDate(value: unknown) {
  if (!value) {
    return 'Date unavailable';
  }
  const dateString = String(value).slice(0, 10);
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function formatTime(value: unknown) {
  if (!value) {
    return 'Time unavailable';
  }
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return String(value);
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateUrgency(value: unknown) {
  if (!value) {
    return 'Upcoming';
  }
  const eventDate = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) {
    return 'Upcoming';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((eventDate.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'Past event';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function orderId(order: EventOrder) {
  return text(order.id ?? order.event_order_number, '');
}

function OrderStatus({
  status,
}: {
  status: string;
}) {
  const badgeColor =
    status === 'Confirmed'
      ? ''
      : status === 'Preparing'
        ? 'bg-blue-50 text-blue-800'
        : status === 'Ready'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-slate-100 text-slate-700';
  return (
    <Text
      className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeColor}`}
      style={
        status === 'Confirmed'
          ? {
              backgroundColor: colors.surfaceSecondary,
              color: colors.primary,
            }
          : undefined
      }
    >
      {status}
    </Text>
  );
}

function ChefEventOrdersScreen() {
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] =
    useState<EventOrderFilter>('All Confirmed');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'guests'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<EventOrder | null>(null);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const response = await api.get('/event-orders', {
        params: {
          confirmedOnly: 'true',
          status: activeFilter === 'All Confirmed' ? undefined : activeFilter,
        },
        signal,
      });
      setOrders(readOrders(response.data));
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [activeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders, refreshVersion]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadOrders();
    }, 25000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter(order => {
        if (activeFilter !== 'All Confirmed' && order.status !== activeFilter) {
          return false;
        }
        if (!term) {
          return true;
        }
        const items = Array.isArray(order.items) ? order.items : [];
        return [
          order.event_order_number,
          order.customer_name,
          order.customer_phone,
          order.event_type,
          ...items.map(item => item.product_name),
        ].some(item => text(item, '').toLowerCase().includes(term));
      })
      .sort((left, right) => {
        if (sortBy === 'guests') {
          return Number(right.guest_count || 0) - Number(left.guest_count || 0);
        }
        return (
          new Date(String(left.event_date || 0)).getTime() -
          new Date(String(right.event_date || 0)).getTime()
        );
      });
  }, [activeFilter, orders, search, sortBy]);

  const counts = useMemo(() => {
    return orders.reduce<{
      confirmed: number;
      preparing: number;
      ready: number;
      completed: number;
    }>(
      (result, order) => {
        const status = text(order.status, '').toLowerCase();
        if (status === 'confirmed') result.confirmed += 1;
        if (status === 'preparing') result.preparing += 1;
        if (status === 'ready') result.ready += 1;
        if (status === 'completed') result.completed += 1;
        return result;
      },
      { confirmed: 0, preparing: 0, ready: 0, completed: 0 },
    );
  }, [orders]);

  const updateStatus = async (order: EventOrder, status: 'Preparing' | 'Ready' | 'Completed') => {
    const id = orderId(order);
    if (!id) {
      setError('This event order is missing its order ID.');
      return;
    }
    setUpdatingId(id);
    setError('');
    try {
      const response = await api.patch(`/event-orders/${id}/status`, {
        status,
        admin_notes: kitchenNotes.trim() || undefined,
      });
      if (!isRecord(response.data) || response.data.success !== true) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The event order status could not be updated.',
        );
      }
      setOrders(current =>
        current.map(item =>
          orderId(item) === id ? { ...item, status } : item,
        ),
      );
      setSelectedOrder(current =>
        current && orderId(current) === id ? { ...current, status } : current,
      );
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setUpdatingId('');
    }
  };

  const openPrepSheet = (order: EventOrder) => {
    setSelectedOrder(order);
    setKitchenNotes(text(order.admin_notes, ''));
  };

  const renderOrderActions = (order: EventOrder, isUpdating: boolean) => (
    <View className="flex-row flex-wrap items-center gap-2">
      <Pressable
        accessibilityRole="button"
        onPress={() => openPrepSheet(order)}
        className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2"
      >
        <Text className="text-[10px] font-bold text-[#374151]">Prep sheet</Text>
      </Pressable>
      {order.status === 'Confirmed' ? (
        <ActionButton
          label="Start cooking"
          disabled={isUpdating}
          onPress={() => void updateStatus(order, 'Preparing')}
          className="bg-[#116C0B]"
        />
      ) : null}
      {order.status === 'Preparing' ? (
        <ActionButton
          label="Mark ready"
          disabled={isUpdating}
          onPress={() => void updateStatus(order, 'Ready')}
          className="bg-emerald-600"
        />
      ) : null}
      {order.status === 'Ready' ? (
        <ActionButton
          label="Complete"
          disabled={isUpdating}
          onPress={() => void updateStatus(order, 'Completed')}
          className="bg-[#123B2D]"
        />
      ) : null}
      {order.status === 'Completed' ? (
        <Text className="px-2 text-[10px] font-bold text-[#6B7280]">
          Fulfilled
        </Text>
      ) : null}
      {isUpdating ? <ActivityIndicator size="small" color="#116C0B" /> : null}
    </View>
  );

  const renderOrderCard = (order: EventOrder) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const id = orderId(order);
    const isUpdating = updatingId === id;
    return (
      <View
        key={id}
        className="mb-3 w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
      >
        <View className="gap-3 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-wide text-[#14764A]">
                Order #{text(order.event_order_number)}
              </Text>
              <Text className="mt-1 text-base font-extrabold text-[#111827]">
                {text(order.event_type, 'Catering event')}
              </Text>
              <Text className="mt-1 text-[11px] font-medium text-[#6B7280]">
                {text(order.customer_name)}
                {order.customer_phone ? ` · ${text(order.customer_phone)}` : ''}
              </Text>
            </View>
            <View className="items-end gap-1.5">
              <OrderStatus status={text(order.status, 'Confirmed')} />
              <Text className="rounded-lg bg-[#FFF7E8] px-2 py-1 text-[9px] font-bold text-[#9A6200]">
                {dateUrgency(order.event_date)}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 rounded-xl bg-[#F8FAFC] p-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-[#94A3B8]">
                Event date & time
              </Text>
              <Text className="mt-1 text-[11px] font-bold text-[#1F2937]">
                {formatDate(order.event_date)}
              </Text>
              <Text className="text-[10px] font-semibold text-[#64748B]">
                {formatTime(order.event_time)}
              </Text>
            </View>
            <View className="w-px bg-[#E2E8F0]" />
            <View className="min-w-0 flex-1 pl-2">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-[#94A3B8]">
                Guests & diet
              </Text>
              <Text className="mt-1 text-[11px] font-extrabold text-[#123B2D]">
                {text(order.guest_count, '0')} guests
              </Text>
              <Text className="text-[10px] text-[#64748B]">
                {text(order.dietary_preference, 'Mixed')}
              </Text>
            </View>
          </View>

          <View className="rounded-xl border border-[#E8EFEA] bg-[#FBFDFC] p-3">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
              Dishes · {items.length}
            </Text>
            <Text className="mt-1 text-[11px] leading-5 text-[#374151]">
              {items
                .slice(0, 4)
                .map(item => `${text(item.product_name)} ×${text(item.quantity, '1')}`)
                .join('  ·  ') || 'No dish details'}
              {items.length > 4 ? `  ·  +${items.length - 4} more` : ''}
            </Text>
          </View>

          {order.venue_address ? (
            <Text numberOfLines={2} className="text-[10px] leading-4 text-[#64748B]">
              Venue: {text(order.venue_address)}
            </Text>
          ) : null}
          {order.special_requests ? (
            <View className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
              <Text className="text-[9px] font-bold uppercase text-rose-700">
                Customer notes
              </Text>
              <Text numberOfLines={3} className="mt-1 text-[10px] leading-4 text-rose-900">
                {text(order.special_requests)}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
          {renderOrderActions(order, isUpdating)}
        </View>
      </View>
    );
  };

  const renderOrderTableRow = (order: EventOrder, index: number) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const id = orderId(order);
    const isUpdating = updatingId === id;
    return (
      <View
        key={id}
        className="min-h-[72px] w-[1120px] flex-row items-center border-b border-[#EEF2F4] bg-white px-3 py-2"
      >
        <View className="w-[52px] items-center px-1">
          <Text className="text-[11px] font-semibold text-[#475569]">
            {index + 1}
          </Text>
        </View>
        <View className="w-[165px] px-2">
          <Text numberOfLines={1} className="text-[10px] font-extrabold text-[#14764A]">
            #{text(order.event_order_number)}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[11px] font-bold text-[#111827]">
            {text(order.event_type, 'Catering event')}
          </Text>
        </View>
        <View className="w-[165px] px-2">
          <Text numberOfLines={2} className="text-[11px] font-semibold text-[#1F2937]">
            {formatDate(order.event_date)}
          </Text>
          <Text className="mt-1 text-[10px] text-[#64748B]">
            {formatTime(order.event_time)}
          </Text>
          <Text className="mt-1 text-[9px] font-bold text-[#9A6200]">
            {dateUrgency(order.event_date)}
          </Text>
        </View>
        <View className="w-[105px] px-2">
          <Text className="text-[11px] font-bold text-[#123B2D]">
            {text(order.guest_count, '0')} guests
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[10px] text-[#64748B]">
            {text(order.dietary_preference, 'Mixed')}
          </Text>
        </View>
        <View className="w-[210px] px-2">
          <Text className="text-[10px] font-bold text-[#475569]">
            {items.length} dish{items.length === 1 ? '' : 'es'}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[10px] leading-4 text-[#64748B]">
            {items
              .slice(0, 3)
              .map(item => `${text(item.product_name)} ×${text(item.quantity, '1')}`)
              .join(' · ') || 'No dish details'}
            {items.length > 3 ? ` · +${items.length - 3} more` : ''}
          </Text>
        </View>
        <View className="w-[155px] px-2">
          <Text numberOfLines={2} className="text-[10px] font-semibold text-[#374151]">
            {text(order.customer_name)}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[9px] text-[#64748B]">
            {text(order.customer_phone)}
          </Text>
        </View>
        <View className="w-[105px] px-2">
          <OrderStatus status={text(order.status, 'Confirmed')} />
        </View>
        <View className="w-[160px] px-2">
          {renderOrderActions(order, isUpdating)}
        </View>
      </View>
    );
  };

  return (
    <View className="gap-4 pb-6">
      <View>
        <Text className="text-[22px] font-extrabold text-[#012711]">
          Event Catering Orders
        </Text>
        {/* <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
          Confirmed bulk orders for kitchen preparation and portion tracking.
        </Text> */}
      </View>

      <ChefStatCards
        isLoading={isLoading}
        stats={[
          {
            label: 'Confirmed',
            value: counts.confirmed,
            hint: 'Awaiting preparation',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
            onPress: () =>
              setActiveFilter(current =>
                current === 'Confirmed' ? 'All Confirmed' : 'Confirmed',
              ),
            isSelected: activeFilter === 'Confirmed',
          },
          {
            label: 'Preparing',
            value: counts.preparing,
            hint: 'In the kitchen',
            icon: <OrdersIcon color="#F6D36A" size={22} />,
            onPress: () =>
              setActiveFilter(current =>
                current === 'Preparing' ? 'All Confirmed' : 'Preparing',
              ),
            isSelected: activeFilter === 'Preparing',
          },
          {
            label: 'Ready',
            value: counts.ready,
            hint: 'Ready to serve',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
            onPress: () =>
              setActiveFilter(current =>
                current === 'Ready' ? 'All Confirmed' : 'Ready',
              ),
            isSelected: activeFilter === 'Ready',
          },
          {
            label: 'Completed',
            value: counts.completed,
            hint: 'Fulfilled events',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
            onPress: () =>
              setActiveFilter(current =>
                current === 'Completed' ? 'All Confirmed' : 'Completed',
              ),
            isSelected: activeFilter === 'Completed',
          },
        ]}
      />

      <ChefListControls
        filters={[
          {
            label: 'Status',
            value: activeFilter,
            options: [
              { value: 'All Confirmed', label: 'All confirmed' },
              { value: 'Confirmed', label: 'Confirmed' },
              { value: 'Preparing', label: 'Preparing' },
              { value: 'Ready', label: 'Ready' },
              { value: 'Completed', label: 'Completed' },
            ],
            onChange: value => {
              const next = [
                'All Confirmed',
                'Confirmed',
                'Preparing',
                'Ready',
                'Completed',
              ].find(option => option === value);
              if (next) setActiveFilter(next as EventOrderFilter);
            },
          },
        ]}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        placeholder="Search order, customer, phone, or dish..."
        search={search}
        searchLabel="Search event orders"
        sort={{
          value: sortBy,
          options: [
            { value: 'date', label: 'Upcoming event date' },
            { value: 'guests', label: 'Largest guest count' },
          ],
          onChange: value => {
            if (value === 'date' || value === 'guests') setSortBy(value);
          },
        }}
        viewMode={viewMode}
      />

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

      {isLoading ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-xs font-medium text-[#6B7280]">
            Loading confirmed event orders...
          </Text>
        </View>
      ) : filteredOrders.length ? (
        viewMode === 'grid' ? (
          <View className="gap-3">
            {filteredOrders.map(renderOrderCard)}
          </View>
        ) : (
          <View className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="w-[1120px]">
                <View className="h-10 w-[1120px] flex-row items-center border-b border-[#E5E7EB] bg-[#F8FAFC] px-3">
                  {[
                    { label: 'S. No.', width: 'w-[52px]' },
                    { label: 'Order / Event', width: 'w-[165px]' },
                    { label: 'Event date', width: 'w-[165px]' },
                    { label: 'Guests', width: 'w-[105px]' },
                    { label: 'Dishes', width: 'w-[210px]' },
                    { label: 'Customer', width: 'w-[155px]' },
                    { label: 'Status', width: 'w-[105px]' },
                    { label: 'Actions', width: 'w-[160px]' },
                  ].map(column => (
                    <Text
                      key={column.label}
                      className={`${column.width} px-2 text-[9px] font-bold uppercase tracking-wide text-[#64748B]`}
                    >
                      {column.label}
                    </Text>
                  ))}
                </View>
                {filteredOrders.map(renderOrderTableRow)}
              </View>
            </ScrollView>
          </View>
        )
      ) : (
        <View className="items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-10">
          <Text className="text-center text-sm font-bold text-[#374151]">
            No confirmed event orders found
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-[#6B7280]">
            Confirmed catering orders will appear here for kitchen preparation.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => setRefreshVersion(current => current + 1)}
        className="items-center rounded-xl border border-[#E5E7EB] bg-white py-3"
      >
        <Text className="text-xs font-bold text-[#123B2D]">
          {isLoading ? 'Refreshing...' : 'Refresh orders'}
        </Text>
      </Pressable>

      {selectedOrder ? (
        <DetailsModal
          visible={selectedOrder !== null}
          onClose={() => setSelectedOrder(null)}
          title={`#${text(selectedOrder.event_order_number)}`}
          subtitle={`${text(selectedOrder.event_type, 'Catering event')} · ${text(selectedOrder.customer_name)}`}
          badge={{
            label: text(selectedOrder.status, 'Pending'),
            bg: '#F0FDF4',
            text: '#116C0B',
            border: '#DCFCE7',
          }}
          footer={
            <View className="w-full flex-row gap-3">
              <Pressable
                onPress={() => setSelectedOrder(null)}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
              >
                <Text className="text-sm font-semibold text-[#334155]">Close</Text>
              </Pressable>
              {selectedOrder.status === 'Confirmed' ? (
                <Pressable
                  disabled={updatingId === orderId(selectedOrder)}
                  onPress={() => void updateStatus(selectedOrder, 'Preparing')}
                  className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
                >
                  <Text className="text-sm font-bold text-white">Start Preparing</Text>
                </Pressable>
              ) : null}
              {selectedOrder.status === 'Preparing' ? (
                <Pressable
                  disabled={updatingId === orderId(selectedOrder)}
                  onPress={() => void updateStatus(selectedOrder, 'Ready')}
                  className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-emerald-600 active:bg-emerald-700"
                >
                  <Text className="text-sm font-bold text-white">Mark Ready</Text>
                </Pressable>
              ) : null}
              {selectedOrder.status === 'Ready' ? (
                <Pressable
                  disabled={updatingId === orderId(selectedOrder)}
                  onPress={() => void updateStatus(selectedOrder, 'Completed')}
                  className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
                >
                  <Text className="text-sm font-bold text-white">Complete Order</Text>
                </Pressable>
              ) : null}
            </View>
          }
        >
          <View className="gap-3">
            <View className="flex-row gap-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Event timing
                </Text>
                <Text className="mt-1 text-sm font-bold text-[#0F172A]">
                  {formatDate(selectedOrder.event_date)}
                </Text>
                <Text className="text-xs text-[#64748B]">
                  {formatTime(selectedOrder.event_time)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Catering details
                </Text>
                <Text className="mt-1 text-sm font-bold text-[#0F172A]">
                  {text(selectedOrder.guest_count, '0')} guests
                </Text>
                <Text className="text-xs text-[#64748B]">
                  Diet: {text(selectedOrder.dietary_preference, 'Mixed')}
                </Text>
              </View>
            </View>

            {selectedOrder.special_requests ? (
              <View className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  Customer kitchen notes
                </Text>
                <Text className="mt-1 text-xs leading-5 text-rose-900">
                  {text(selectedOrder.special_requests)}
                </Text>
              </View>
            ) : null}

            {selectedOrder.venue_address ? (
              <View className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-3.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Venue / delivery location
                </Text>
                <Text className="mt-1 text-xs leading-5 text-[#334155]">
                  {text(selectedOrder.venue_address)}
                </Text>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Dishes to prepare
              </Text>
              {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map(
                (item, index) => {
                  const itemId = text(item.id, String(index));
                  const checkKey = `${orderId(selectedOrder)}-${itemId}`;
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
                            : 'border-[#94A3B8] bg-white'
                        }`}
                      >
                        {checked ? (
                          <Text className="text-[10px] font-bold text-white">✓</Text>
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-xs font-bold ${
                            checked ? 'text-[#64748B] line-through' : 'text-[#0F172A]'
                          }`}
                        >
                          {text(item.product_name, 'Menu item')}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#64748B]">
                          {text(item.category_name, '')}
                          {item.portion_size ? ` · ${text(item.portion_size)}` : ''}
                          {item.notes ? ` · Note: ${text(item.notes)}` : ''}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-[#116C0B]">
                        × {text(item.quantity, '1')}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Kitchen notes
              </Text>
              <TextInput
                accessibilityLabel="Kitchen notes"
                className="min-h-[82px] rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs text-[#0F172A]"
                multiline
                onChangeText={setKitchenNotes}
                placeholder="Add internal preparation notes"
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
                value={kitchenNotes}
              />
            </View>
          </View>
        </DetailsModal>
      ) : null}
    </View>
  );
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
      className={`rounded-xl px-3 py-2.5 ${className} ${
        disabled ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <Text className="text-[10px] font-extrabold text-white">
        {disabled ? 'Updating...' : label}
      </Text>
    </Pressable>
  );
}

export default ChefEventOrdersScreen;
