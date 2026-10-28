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

const filters: EventOrderFilter[] = [
  'All Confirmed',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
];

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
      ? 'bg-green-50 text-green-800'
      : status === 'Preparing'
        ? 'bg-blue-50 text-blue-800'
        : status === 'Ready'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-slate-100 text-slate-700';
  return (
    <Text className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeColor}`}>
      {status}
    </Text>
  );
}

function ChefEventOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] =
    useState<EventOrderFilter>('All Confirmed');
  const [search, setSearch] = useState('');
  const [sortByGuests, setSortByGuests] = useState(false);
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
        if (sortByGuests) {
          return Number(right.guest_count || 0) - Number(left.guest_count || 0);
        }
        return (
          new Date(String(left.event_date || 0)).getTime() -
          new Date(String(right.event_date || 0)).getTime()
        );
      });
  }, [activeFilter, orders, search, sortByGuests]);

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

  return (
    <View className="gap-4 pb-6">
      <View>
        <Text className="text-[22px] font-extrabold text-[#012711]">
          Event Catering Orders
        </Text>
        <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
          Confirmed bulk orders for kitchen preparation and portion tracking.
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-2.5">
        {[
          { label: 'Confirmed', value: counts.confirmed, filter: 'Confirmed' as const },
          { label: 'Preparing', value: counts.preparing, filter: 'Preparing' as const },
          { label: 'Ready', value: counts.ready, filter: 'Ready' as const },
          { label: 'Completed', value: counts.completed, filter: 'Completed' as const },
        ].map(stat => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === stat.filter }}
            key={stat.label}
            onPress={() =>
              setActiveFilter(current =>
                current === stat.filter ? 'All Confirmed' : stat.filter,
              )
            }
            className={`w-[48%] rounded-2xl border bg-white p-3.5 ${
              activeFilter === stat.filter
                ? 'border-[#116C0B] bg-[#F0F7EE]'
                : 'border-[#E5E7EB]'
            }`}
          >
            <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
              {stat.label}
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-[#012711]">
              {isLoading ? '…' : stat.value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <ScrollView
          contentContainerClassName="gap-2 pr-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map(filter => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === filter }}
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`rounded-xl px-3 py-2 ${
                activeFilter === filter ? 'bg-[#123B2D]' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  activeFilter === filter ? 'text-white' : 'text-[#4B5563]'
                }`}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          accessibilityLabel="Search event orders"
          className="min-h-11 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search order, customer, phone, or dish"
          placeholderTextColor="#9CA3AF"
          value={search}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setSortByGuests(current => !current)}
          className="self-start rounded-lg bg-[#F0F7EE] px-3 py-2"
        >
          <Text className="text-[10px] font-semibold text-[#116C0B]">
            Sort: {sortByGuests ? 'Largest guest count' : 'Upcoming event date'}
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

      {isLoading ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-xs font-medium text-[#6B7280]">
            Loading confirmed event orders...
          </Text>
        </View>
      ) : filteredOrders.length ? (
        <View className="gap-3">
          {filteredOrders.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const id = orderId(order);
            const isUpdating = updatingId === id;
            return (
              <View
                key={id}
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              >
                <View className="gap-3 p-4">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-[11px] font-extrabold text-[#123B2D]">
                        #{text(order.event_order_number)}
                      </Text>
                      <Text className="mt-1 text-base font-extrabold text-[#111827]">
                        {text(order.event_type, 'Catering event')}
                      </Text>
                    </View>
                    <View className="items-end gap-1.5">
                      <OrderStatus status={text(order.status, 'Confirmed')} />
                      <Text className="rounded-lg bg-[#F3F4F6] px-2 py-1 text-[9px] font-bold text-[#4B5563]">
                        {dateUrgency(order.event_date)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2 rounded-xl bg-[#F9FAFB] p-3">
                    <View className="flex-1">
                      <Text className="text-[9px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                        Event date
                      </Text>
                      <Text className="mt-1 text-[11px] font-bold text-[#1F2937]">
                        {formatDate(order.event_date)}
                      </Text>
                      <Text className="text-[10px] font-semibold text-[#6B7280]">
                        {formatTime(order.event_time)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[9px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                        Guests & diet
                      </Text>
                      <Text className="mt-1 text-[11px] font-extrabold text-[#123B2D]">
                        {text(order.guest_count, '0')} guests
                      </Text>
                      <Text className="text-[10px] text-[#6B7280]">
                        {text(order.dietary_preference, 'Mixed')}
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-bold text-[#1F2937]">
                      {items.length} dish{items.length === 1 ? '' : 'es'}
                    </Text>
                    <Text className="mt-1 text-[10px] leading-4 text-[#6B7280]">
                      {items
                        .slice(0, 3)
                        .map(item => `${text(item.product_name)} ×${text(item.quantity, '1')}`)
                        .join(' · ') || 'No dish details'}
                      {items.length > 3 ? ` · +${items.length - 3} more` : ''}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-[11px] font-semibold text-[#374151]">
                      {text(order.customer_name)}
                      {order.customer_phone ? ` · ${text(order.customer_phone)}` : ''}
                    </Text>
                    {order.venue_address ? (
                      <Text className="mt-1 text-[10px] leading-4 text-[#6B7280]">
                        Venue: {text(order.venue_address)}
                      </Text>
                    ) : null}
                  </View>

                  {order.special_requests ? (
                    <View className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                      <Text className="text-[9px] font-bold uppercase text-rose-700">
                        Customer notes
                      </Text>
                      <Text className="mt-1 text-[11px] leading-4 text-rose-900">
                        {text(order.special_requests)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openPrepSheet(order)}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
                  >
                    <Text className="text-[10px] font-bold text-[#374151]">
                      Prep sheet
                    </Text>
                  </Pressable>
                  {order.status === 'Confirmed' ? (
                    <ActionButton
                      label="Start cooking"
                      disabled={isUpdating}
                      onPress={() => void updateStatus(order, 'Preparing')}
                      className="bg-blue-600"
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
                    <Text className="text-[10px] font-bold text-[#6B7280]">
                      Fulfilled
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
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

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
        transparent
        visible={selectedOrder !== null}
      >
        {selectedOrder ? (
          <View className="flex-1 justify-end bg-black/50">
            <View
              className="max-h-[90%] rounded-t-3xl bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <View className="flex-row items-center justify-between border-b border-[#E5E7EB] p-4">
                <View className="flex-1 pr-3">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
                    Kitchen prep sheet
                  </Text>
                  <Text className="mt-1 text-base font-extrabold text-[#123B2D]">
                    #{text(selectedOrder.event_order_number)}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7280]">
                    {text(selectedOrder.event_type, 'Catering event')} · {text(selectedOrder.customer_name)}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close event order prep sheet"
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
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-row gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
                  <View className="flex-1">
                    <Text className="text-[9px] font-bold uppercase text-green-700">
                      Event timing
                    </Text>
                    <Text className="mt-1 text-xs font-extrabold text-green-950">
                      {formatDate(selectedOrder.event_date)}
                    </Text>
                    <Text className="text-[10px] font-semibold text-green-800">
                      {formatTime(selectedOrder.event_time)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[9px] font-bold uppercase text-green-700">
                      Catering details
                    </Text>
                    <Text className="mt-1 text-xs font-extrabold text-[#123B2D]">
                      {text(selectedOrder.guest_count, '0')} guests
                    </Text>
                    <Text className="text-[10px] text-[#6B7280]">
                      Diet: {text(selectedOrder.dietary_preference, 'Mixed')}
                    </Text>
                  </View>
                </View>

                {selectedOrder.special_requests ? (
                  <View className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                    <Text className="text-[9px] font-bold uppercase text-rose-700">
                      Customer kitchen notes
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-rose-900">
                      {text(selectedOrder.special_requests)}
                    </Text>
                  </View>
                ) : null}

                {selectedOrder.venue_address ? (
                  <View className="rounded-xl bg-[#F9FAFB] p-3">
                    <Text className="text-[9px] font-bold uppercase text-[#6B7280]">
                      Venue / delivery location
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-[#1F2937]">
                      {text(selectedOrder.venue_address)}
                    </Text>
                  </View>
                ) : null}

                <View>
                  <Text className="mb-2 text-sm font-extrabold text-[#111827]">
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
                          className={`mb-2 flex-row items-center gap-3 rounded-xl border p-3 ${
                            checked
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#E5E7EB] bg-white'
                          }`}
                        >
                          <View
                            className={`h-5 w-5 items-center justify-center rounded border ${
                              checked
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-[#D1D5DB] bg-white'
                            }`}
                          >
                            {checked ? (
                              <Text className="text-[10px] font-bold text-white">✓</Text>
                            ) : null}
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`text-xs font-bold ${
                                checked ? 'text-[#6B7280] line-through' : 'text-[#111827]'
                              }`}
                            >
                              {text(item.product_name, 'Menu item')}
                            </Text>
                            <Text className="mt-1 text-[10px] text-[#6B7280]">
                              {text(item.category_name, '')}
                              {item.portion_size ? ` · ${text(item.portion_size)}` : ''}
                              {item.notes ? ` · Note: ${text(item.notes)}` : ''}
                            </Text>
                          </View>
                          <Text className="text-[10px] font-extrabold text-[#123B2D]">
                            × {text(item.quantity, '1')}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-[#374151]">
                    Kitchen notes
                  </Text>
                  <TextInput
                    accessibilityLabel="Kitchen notes"
                    className="min-h-[82px] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#1F2937]"
                    multiline
                    onChangeText={setKitchenNotes}
                    placeholder="Add internal preparation notes"
                    textAlignVertical="top"
                    value={kitchenNotes}
                  />
                </View>
              </ScrollView>

              <View className="flex-row flex-wrap justify-end gap-2 border-t border-[#E5E7EB] bg-[#F9FAFB] p-3">
                {selectedOrder.status === 'Confirmed' ? (
                  <ActionButton
                    label="Start preparing"
                    disabled={updatingId === orderId(selectedOrder)}
                    onPress={() => void updateStatus(selectedOrder, 'Preparing')}
                    className="bg-blue-600"
                  />
                ) : null}
                {selectedOrder.status === 'Preparing' ? (
                  <ActionButton
                    label="Mark ready"
                    disabled={updatingId === orderId(selectedOrder)}
                    onPress={() => void updateStatus(selectedOrder, 'Ready')}
                    className="bg-emerald-600"
                  />
                ) : null}
                {selectedOrder.status === 'Ready' ? (
                  <ActionButton
                    label="Complete order"
                    disabled={updatingId === orderId(selectedOrder)}
                    onPress={() => void updateStatus(selectedOrder, 'Completed')}
                    className="bg-[#123B2D]"
                  />
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
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
