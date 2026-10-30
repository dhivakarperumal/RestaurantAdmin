import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CustomersIcon,
  MenuIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import {
  CalendarIcon,
  ClockIcon,
  DetailsModal,
} from '../../components/popups';
import {
  getEventDishImageUrl,
  getFoodImageUrl,
} from '../eventOrderImages';
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

function DishThumbnail({ item }: { item: Record<string, unknown> }) {
  const [imageUri, setImageUri] = useState(() =>
    getEventDishImageUrl(item, API_BASE_URL),
  );
  const imageLookupAttempted = useRef(false);
  const foodId = text(item.food_id ?? item.foodId, '');

  const fetchCurrentFoodImage = useCallback(async () => {
    if (imageLookupAttempted.current || !foodId) return;
    imageLookupAttempted.current = true;
    try {
      const response = await api.get(
        `/foods/${encodeURIComponent(foodId)}`,
      );
      const food = isRecord(response.data) && isRecord(response.data.data)
        ? response.data.data
        : null;
      const fallbackImage = food
        ? getFoodImageUrl(food, API_BASE_URL)
        : null;
      if (fallbackImage && fallbackImage !== imageUri) {
        setImageUri(fallbackImage);
      }
    } catch (imageError) {
      console.warn('Could not load the current image for an event dish:', imageError);
    }
  }, [foodId, imageUri]);

  useEffect(() => {
    if (!imageUri) {
      void fetchCurrentFoodImage();
    }
  }, [fetchCurrentFoodImage, imageUri]);

  return (
    <View className="h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EAF4E7]">
      {!imageUri ? <Text className="text-lg">🍽️</Text> : null}
      {imageUri ? (
        <Image
          accessibilityLabel={text(item.product_name ?? item.food_name, 'Dish image')}
          source={{ uri: imageUri }}
          resizeMode="cover"
          onError={() => {
            setImageUri(null);
            void fetchCurrentFoodImage();
          }}
          className="absolute h-full w-full"
        />
      ) : null}
    </View>
  );
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

function EventOrderSkeletonCard({
  viewMode,
}: {
  viewMode: 'grid' | 'table';
}) {
  if (viewMode === 'table') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mb-2 min-h-[112px] w-[1418px] flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 shadow-sm"
      >
        <View className="w-[48px] items-center px-1">
          <View className="h-7 w-7 rounded-full bg-slate-100" />
        </View>
        <View className="w-[210px] gap-2 px-2">
          <View className="h-3 w-20 rounded-md bg-slate-100" />
          <View className="h-4 w-28 rounded-md bg-slate-100" />
          <View className="h-3 w-24 rounded-md bg-slate-100" />
        </View>
        <View className="w-[205px] gap-2 rounded-xl bg-[#F7FAF8] px-3 py-2">
          <View className="h-3 w-24 rounded-md bg-slate-100" />
          <View className="h-3 w-28 rounded-md bg-slate-100" />
          <View className="h-3 w-16 rounded-md bg-slate-100" />
        </View>
        <View className="w-[150px] gap-2 px-2">
          <View className="h-3 w-14 rounded-md bg-slate-100" />
          <View className="h-3 w-20 rounded-md bg-slate-100" />
        </View>
        <View className="w-[270px] gap-2 px-2">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 rounded-lg bg-slate-100" />
            <View className="h-3 w-32 rounded-md bg-slate-100" />
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 rounded-lg bg-slate-100" />
            <View className="h-3 w-24 rounded-md bg-slate-100" />
          </View>
        </View>
        <View className="w-[230px] gap-2 px-2">
          <View className="h-3 w-28 rounded-md bg-slate-100" />
          <View className="h-3 w-24 rounded-md bg-slate-100" />
        </View>
        <View className="w-[115px] px-2">
          <View className="h-6 w-16 rounded-full bg-slate-100" />
        </View>
        <View className="w-[190px] px-2">
          <View className="h-10 w-32 rounded-xl bg-slate-100" />
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mb-3 w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white p-3.5"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-2">
          <View className="h-3 w-24 rounded-md bg-slate-100" />
          <View className="h-5 w-2/3 rounded-md bg-slate-100" />
          <View className="h-3 w-1/2 rounded-md bg-slate-100" />
        </View>
        <View className="items-end gap-2">
          <View className="h-6 w-20 rounded-full bg-slate-100" />
          <View className="h-5 w-16 rounded-full bg-slate-100" />
        </View>
      </View>
      <View className="mt-3 flex-row rounded-2xl bg-[#F7FAF8] p-3">
        <View className="flex-1 gap-2">
          <View className="h-3 w-24 rounded-md bg-slate-100" />
          <View className="h-3 w-28 rounded-md bg-slate-100" />
          <View className="h-3 w-16 rounded-md bg-slate-100" />
        </View>
        <View className="mx-3 h-12 w-px bg-[#DDE5E0]" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-20 rounded-md bg-slate-100" />
          <View className="h-3 w-16 rounded-md bg-slate-100" />
          <View className="h-3 w-24 rounded-md bg-slate-100" />
        </View>
      </View>
      <View className="mt-3 gap-3 rounded-2xl border border-[#E8EFEA] bg-[#FCFDFC] p-3">
        <View className="h-3 w-24 rounded-md bg-slate-100" />
        {[0, 1].map(index => (
          <View key={index} className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-xl bg-slate-100" />
            <View className="flex-1 gap-2">
              <View className="h-3 w-2/3 rounded-md bg-slate-100" />
              <View className="h-3 w-1/3 rounded-md bg-slate-100" />
            </View>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row gap-2">
        <View className="h-11 flex-1 rounded-2xl bg-slate-100" />
        <View className="h-11 flex-1 rounded-2xl bg-slate-100" />
      </View>
    </View>
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
    const nextAction =
      order.status === 'Confirmed'
        ? { label: 'Start cooking', nextStatus: 'Preparing' as const }
        : order.status === 'Preparing'
          ? { label: 'Mark ready', nextStatus: 'Ready' as const }
          : order.status === 'Ready'
            ? { label: 'Complete order', nextStatus: 'Completed' as const }
            : null;
    return (
      <View
        key={id}
        className="mb-3 w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm"
      >
        <View className="gap-3 p-3.5">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-wide text-[#14764A]">
                ORDER #{text(order.event_order_number)}
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-[#111827]">
                {text(order.event_type, 'Catering event')}
              </Text>
              <Text className="mt-1 text-xs text-[#475569]">
                {text(order.customer_name)} · {text(order.customer_phone)}
              </Text>
            </View>
            <View className="items-end gap-1.5">
              <OrderStatus status={text(order.status, 'Confirmed')} />
              <Text className="rounded-full bg-[#FFF7E8] px-2.5 py-1.5 text-[9px] font-bold text-[#9A6200]">
                {dateUrgency(order.event_date)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl bg-[#F7FAF8] p-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-[#84918B]">
                Event date & time
              </Text>
              <View className="mt-1.5 flex-row items-center gap-1.5">
                <CalendarIcon color="#14764A" size={14} />
                <Text className="text-xs font-extrabold text-[#1F2937]">
                  {formatDate(order.event_date)}
                </Text>
              </View>
              <View className="mt-1 flex-row items-center gap-1.5">
                <ClockIcon color="#14764A" size={14} />
                <Text className="text-[11px] text-[#64748B]">
                  {formatTime(order.event_time)}
                </Text>
              </View>
            </View>
            <View className="mx-3 h-12 w-px bg-[#DDE5E0]" />
            <View className="min-w-0 flex-1">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-[#84918B]">
                Guests & diet
              </Text>
              <View className="mt-1.5 flex-row items-center gap-1.5">
                <CustomersIcon color="#14764A" size={14} />
                <Text className="text-xs font-extrabold text-[#123B2D]">
                  {text(order.guest_count, '0')} guests
                </Text>
              </View>
              <View className="mt-1 flex-row items-center gap-1.5">
                <MenuIcon color="#14764A" size={14} />
                <Text className="text-[11px] text-[#64748B]">
                  {text(order.dietary_preference, 'Mixed')}
                </Text>
              </View>
            </View>
          </View>

          <View className="overflow-hidden rounded-2xl border border-[#E8EFEA] bg-[#FCFDFC] px-3">
            <View className="h-11 flex-row items-center justify-between border-b border-[#E8EFEA]">
              <View className="flex-row items-center gap-2">
                <Text className="text-base text-[#D99B18]">♨</Text>
                <Text className="text-xs font-extrabold uppercase text-[#1F2937]">
                  Dishes · {items.length}
                </Text>
              </View>
              <Text className="text-lg font-semibold text-[#334155]">›</Text>
            </View>
            {items.length ? (
              items.map((item, index) => {
                return (
                  <View
                    key={`${id}-dish-${text(item.id, String(index))}`}
                    className={`min-h-[58px] flex-row items-center gap-2.5 py-1.5 ${
                      index < items.length - 1 ? 'border-b border-[#E8EFEA]' : ''
                    }`}
                  >
                    <DishThumbnail item={item} />
                    <Text
                      numberOfLines={2}
                      className="min-w-0 flex-1 text-xs text-[#1F2937]"
                    >
                      {text(item.product_name ?? item.food_name, 'Menu item')}
                    </Text>
                    <Text className="text-xs font-extrabold text-[#17633D]">
                      × {text(item.quantity, '1')}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text className="py-4 text-xs text-[#64748B]">No dish details</Text>
            )}
          </View>

          {order.venue_address ? (
            <View className="flex-row items-start gap-2 px-1">
              <Text className="text-sm text-[#D99B18]">●</Text>
              <Text numberOfLines={2} className="flex-1 text-xs leading-5 text-[#475569]">
                Venue: {text(order.venue_address)}
              </Text>
            </View>
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
        <View className="flex-row items-center gap-2.5 border-t border-[#E5E7EB] bg-white p-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => openPrepSheet(order)}
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-[#14764A] bg-white px-3"
          >
            <ReceiptIcon color="#14764A" size={18} />
            <Text className="text-xs font-extrabold text-[#145A3A]">Prep sheet</Text>
          </Pressable>
          {nextAction ? (
            <Pressable
              accessibilityRole="button"
              disabled={isUpdating}
              onPress={() => void updateStatus(order, nextAction.nextStatus)}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#005C3B] px-3 disabled:opacity-50"
            >
              <Text className="text-base text-[#F4C84A]">♧</Text>
              <Text className="text-xs font-extrabold text-white">
                {isUpdating ? 'Updating...' : nextAction.label}
              </Text>
              <Text className="text-base font-bold text-white">→</Text>
            </Pressable>
          ) : (
            <Text className="flex-1 text-center text-xs font-bold text-[#64748B]">
              Order fulfilled
            </Text>
          )}
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
        className="mb-2 min-h-[112px] w-[1418px] flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 shadow-sm"
      >
        <View className="w-[48px] items-center px-1">
          <Text className="h-7 w-7 rounded-full bg-[#EAF4E7] pt-1.5 text-center text-[10px] font-extrabold text-[#14764A]">
            {index + 1}
          </Text>
        </View>
        <View className="w-[210px] px-2">
          <Text numberOfLines={1} className="text-[9px] font-extrabold uppercase tracking-wide text-[#14764A]">
            ORDER #{text(order.event_order_number)}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-sm font-extrabold text-[#111827]">
            {text(order.event_type, 'Catering event')}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[10px] text-[#475569]">
            {text(order.customer_name)} · {text(order.customer_phone)}
          </Text>
        </View>
        <View className="w-[205px] rounded-xl bg-[#F7FAF8] px-3 py-2">
          <View className="flex-row items-center gap-1.5">
            <CalendarIcon color="#14764A" size={13} />
            <Text numberOfLines={1} className="flex-1 text-[10px] font-extrabold text-[#1F2937]">
              {formatDate(order.event_date)}
            </Text>
          </View>
          <View className="mt-1.5 flex-row items-center gap-1.5">
            <ClockIcon color="#14764A" size={13} />
            <Text className="text-[10px] text-[#64748B]">
              {formatTime(order.event_time)}
            </Text>
          </View>
          <Text className="mt-1.5 text-[9px] font-bold text-[#9A6200]">
            {dateUrgency(order.event_date)}
          </Text>
        </View>
        <View className="w-[150px] px-2">
          <View className="flex-row items-center gap-1.5">
            <CustomersIcon color="#14764A" size={14} />
            <Text className="text-[11px] font-extrabold text-[#123B2D]">
              {text(order.guest_count, '0')} guests
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-1.5">
            <MenuIcon color="#14764A" size={14} />
            <Text numberOfLines={2} className="flex-1 text-[10px] text-[#64748B]">
              {text(order.dietary_preference, 'Mixed')}
            </Text>
          </View>
        </View>
        <View className="w-[270px] rounded-xl border border-[#E8EFEA] bg-[#FCFDFC] px-2.5 py-2">
          <Text className="mb-1.5 text-[9px] font-extrabold uppercase text-[#1F2937]">
            Dishes · {items.length}
          </Text>
          {items.length ? (
            items.slice(0, 2).map((item, dishIndex) => (
              <View
                key={`${id}-table-dish-${text(item.id, String(dishIndex))}`}
                className="mb-1 flex-row items-center gap-2"
              >
                <DishThumbnail item={item} />
                <Text numberOfLines={1} className="min-w-0 flex-1 text-[10px] text-[#1F2937]">
                  {text(item.product_name ?? item.food_name, 'Menu item')}
                </Text>
                <Text className="text-[10px] font-extrabold text-[#17633D]">
                  ×{text(item.quantity, '1')}
                </Text>
              </View>
            ))
          ) : (
            <Text className="py-1 text-[10px] text-[#64748B]">No dish details</Text>
          )}
          {items.length > 2 ? (
            <Text className="text-[9px] font-semibold text-[#64748B]">
              +{items.length - 2} more
            </Text>
          ) : null}
        </View>
        <View className="w-[230px] gap-1 px-2">
          <Text numberOfLines={2} className="text-[10px] leading-4 text-[#475569]">
            Venue: {text(order.venue_address, 'Not specified')}
          </Text>
          {order.special_requests ? (
            <View className="rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5">
              <Text className="text-[8px] font-bold uppercase text-rose-700">
                Customer notes
              </Text>
              <Text numberOfLines={2} className="mt-0.5 text-[9px] leading-3 text-rose-900">
                {text(order.special_requests)}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="w-[115px] px-2">
          <OrderStatus status={text(order.status, 'Confirmed')} />
        </View>
        <View className="w-[190px] px-2">
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
        <View
          accessibilityLabel="Loading event orders"
          className={viewMode === 'grid' ? 'gap-3' : ''}
        >
          {viewMode === 'table' ? (
            <View className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2">
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View className="w-[1418px]">
                  <View className="mb-2 h-10 w-[1418px] flex-row items-center rounded-xl border border-[#E5E7EB] bg-white px-3">
                    {[48, 210, 205, 150, 270, 230, 115, 190].map(
                      (width, index) => (
                        <View
                          key={index}
                          className="px-2"
                          style={{ width }}
                        >
                          <View className="h-2.5 w-3/4 rounded-md bg-slate-200" />
                        </View>
                      ),
                    )}
                  </View>
                  {[0, 1, 2, 3].map(index => (
                    <EventOrderSkeletonCard key={index} viewMode="table" />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            [0, 1, 2, 3].map(index => (
              <EventOrderSkeletonCard key={index} viewMode="grid" />
            ))
          )}
        </View>
      ) : filteredOrders.length ? (
        viewMode === 'grid' ? (
          <View className="gap-3">
            {filteredOrders.map(renderOrderCard)}
          </View>
        ) : (
          <View className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="w-[1418px]">
                <View className="mb-2 h-10 w-[1418px] flex-row items-center rounded-xl border border-[#E5E7EB] bg-white px-3">
                  {[
                    { label: 'No.', width: 'w-[48px]' },
                    { label: 'Order / Event', width: 'w-[210px]' },
                    { label: 'Event date & time', width: 'w-[205px]' },
                    { label: 'Guests & diet', width: 'w-[150px]' },
                    { label: 'Dishes', width: 'w-[270px]' },
                    { label: 'Venue / notes', width: 'w-[230px]' },
                    { label: 'Status', width: 'w-[115px]' },
                    { label: 'Actions', width: 'w-[190px]' },
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
