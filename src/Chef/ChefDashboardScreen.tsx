import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import {
  CustomersIcon,
  ReceiptIcon,
} from '../Admin/Navigation/NavigationIcons';
import MoreInnerHeader from '../Admin/Navigation/MoreInnerHeader';
import { FormModal } from '../components/popups';
import ChefBottomNavigation, { type ChefTab } from './ChefBottomNavigation';
import ChefHeader from './ChefHeader';
import ChefAttendanceScreen from './Tabs/ChefAttendanceScreen';
import ChefEventOrdersScreen from './Tabs/ChefEventOrdersScreen';
import ChefFoodsScreen, { type ChefFood } from './Tabs/ChefFoodsScreen';
import ChefMoreScreen from './Tabs/ChefMoreScreen';
import ChefOrdersMenuScreen from './Tabs/ChefOrdersMenuScreen';
import ChefOrdersScreen, { type ChefOrderPage } from './Tabs/ChefOrdersScreen';
import ChefStockDetailsScreen from './Tabs/ChefStockDetailsScreen';

type ChefDashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type DataRow = Record<string, unknown>;

const pageTitles: Record<ChefTab, string> = {
  dashboard: 'Dashboard',
  foods: 'Foods',
  orders: 'Orders',
  'event-orders': 'Event Orders',
  attendance: 'Attendance',
  more: 'More',
};

function isRecord(value: unknown): value is DataRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsFrom(payload: unknown, keys: string[] = []): DataRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  const nested = payload.data;
  if (Array.isArray(nested)) {
    return nested.filter(isRecord);
  }
  if (isRecord(nested)) {
    for (const key of keys) {
      const value = nested[key];
      if (Array.isArray(value)) {
        return value.filter(isRecord);
      }
    }
  }
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  return [];
}

function errorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Please check your connection and try again.';
}

function text(value: unknown, fallback = '—') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTime(value: unknown) {
  if (!value) {
    return '—';
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(numberValue(seconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatShortDate(value: unknown) {
  if (!value) {
    return 'Upcoming';
  }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Upcoming'
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`mb-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 ${className}`}>
      {children}
    </View>
  );
}

function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-[23px] font-extrabold text-[#012711]">
        {title}
      </Text>
      <Text className="mt-1 text-[13px] text-[#6B7280]">
        {subtitle}
      </Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <Text className="text-center text-sm text-[#6B7280]">
        {message}
      </Text>
    </Card>
  );
}

function ChefDashboardScreen({ user, onLogout }: ChefDashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<ChefTab>('dashboard');
  const [selectedMorePage, setSelectedMorePage] = useState<
    'inventory' | 'stock' | null
  >(null);
  const [selectedOrderPage, setSelectedOrderPage] =
    useState<ChefOrderPage | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState<Date | null>(null);
  const [attendanceClock, setAttendanceClock] = useState(Date.now());
  const [foods, setFoods] = useState<DataRow[]>([]);
  const [orders, setOrders] = useState<DataRow[]>([]);
  const [eventOrders, setEventOrders] = useState<DataRow[]>([]);
  const [requests, setRequests] = useState<DataRow[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<DataRow[]>([]);
  const [attendance, setAttendance] = useState<DataRow | null>(null);
  const [shiftInfo, setShiftInfo] = useState<DataRow | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<DataRow[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState('');
  const [requestProductId, setRequestProductId] = useState<string | number | null>(
    null,
  );
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [requestUnit, setRequestUnit] = useState('pcs');
  const [requestError, setRequestError] = useState('');
  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [isAttendanceBusy, setIsAttendanceBusy] = useState(false);

  const chefName =
    user?.name?.trim() || user?.username?.trim() || 'Chef';

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (activeTab === 'dashboard') {
          const [ordersResult, eventsResult, attendanceResult] = await Promise.allSettled([
            api.get('/kitchen-orders'),
            api.get('/event-orders', { params: { confirmedOnly: 'true' } }),
            api.get('/attendance/today'),
          ]);
          if (!active) return;
          if (ordersResult.status === 'fulfilled') {
            setOrders(rowsFrom(ordersResult.value.data, ['orders']));
          }
          if (eventsResult.status === 'fulfilled') {
            setEventOrders(rowsFrom(eventsResult.value.data));
          }
          if (attendanceResult.status === 'fulfilled') {
            const payload = attendanceResult.value.data as unknown;
            setAttendance(
              isRecord(payload) && isRecord(payload.data) ? payload.data : null,
            );
            setShiftInfo(
              isRecord(payload) && isRecord(payload.shift) ? payload.shift : null,
            );
          }
          if (
            ordersResult.status === 'rejected' &&
            eventsResult.status === 'rejected' &&
            attendanceResult.status === 'rejected'
          ) {
            throw ordersResult.reason;
          }
          if (
            ordersResult.status === 'rejected' ||
            eventsResult.status === 'rejected' ||
            attendanceResult.status === 'rejected'
          ) {
            setError('Some dashboard information could not be loaded.');
          }
        } else if (activeTab === 'foods') {
          const response = await api.get('/foods');
          if (active) {
            setFoods(rowsFrom(response.data, ['foods', 'items']));
          }
        } else if (
          (activeTab === 'more' && selectedMorePage === 'inventory')
        ) {
          const [requestResponse, productResponse] = await Promise.all([
            api.get('/inventory/kitchen-requests'),
            api.get('/inventory/products/options'),
          ]);
          if (active) {
            setRequests(rowsFrom(requestResponse.data));
            setInventoryProducts(rowsFrom(productResponse.data));
          }
        } else if (activeTab === 'attendance') {
          const [todayResult, historyResult] = await Promise.allSettled([
            api.get('/attendance/today'),
            api.get('/attendance/my-history?limit=100'),
          ]);
          if (!active) return;
          if (todayResult.status === 'fulfilled') {
            const payload = todayResult.value.data as unknown;
            setAttendance(
              isRecord(payload) && isRecord(payload.data) ? payload.data : null,
            );
            setShiftInfo(
              isRecord(payload) && isRecord(payload.shift) ? payload.shift : null,
            );
          }
          if (historyResult.status === 'fulfilled') {
            setAttendanceHistory(rowsFrom(historyResult.value.data));
          }
          if (
            todayResult.status === 'rejected' &&
            historyResult.status === 'rejected'
          ) {
            throw todayResult.reason;
          }
          if (
            todayResult.status === 'rejected' ||
            historyResult.status === 'rejected'
          ) {
            setError('Some attendance information could not be loaded.');
          }
        }
      } catch (loadError) {
        if (active) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (active) {
          setIsLoading(false);
          if (activeTab === 'dashboard') {
            setDashboardUpdatedAt(new Date());
          }
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [activeTab, refreshCount, selectedMorePage]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      return;
    }
    const timer = setInterval(() => {
      setRefreshCount(count => count + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    if (!attendance?.check_in || attendance?.check_out) {
      return;
    }
    const timer = setInterval(() => setAttendanceClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [attendance?.check_in, attendance?.check_out]);

  const orderCounts = useMemo(() => {
    const activeOrders = orders.filter(order => {
      const status = text(order.status, 'Pending').toLowerCase();
      return status !== 'served' && status !== 'cancelled';
    });
    const today = (dashboardUpdatedAt ?? new Date()).toLocaleDateString();
    return {
      active: activeOrders.length,
      pending: activeOrders.filter(
        order => text(order.status, 'Pending').toLowerCase() === 'pending',
      ).length,
      preparing: activeOrders.filter(
        order => text(order.status, '').toLowerCase() === 'preparing',
      ).length,
      ready: activeOrders.filter(
        order => text(order.status, '').toLowerCase() === 'ready to serve',
      ).length,
      today: orders.filter(order => {
        if (!order.created_at) {
          return false;
        }
        const createdAt = new Date(String(order.created_at));
        return (
          !Number.isNaN(createdAt.getTime()) &&
          createdAt.toLocaleDateString() === today
        );
      }).length,
    };
  }, [dashboardUpdatedAt, orders]);

  const dailyOrders = useMemo(() => {
    const today = new Date(dashboardUpdatedAt ?? Date.now());
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        dateKey: date.toLocaleDateString(),
        day: date.toLocaleDateString([], { weekday: 'short' }),
        orders: 0,
      };
    });
    const countsByDate = new Map(days.map(day => [day.dateKey, day]));

    orders.forEach(order => {
      if (!order.created_at) {
        return;
      }
      const createdAt = new Date(String(order.created_at));
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }
      const day = countsByDate.get(createdAt.toLocaleDateString());
      if (day) {
        day.orders += 1;
      }
    });
    return days;
  }, [dashboardUpdatedAt, orders]);

  const hourlyOrders = useMemo(() => {
    const dashboardDate = dashboardUpdatedAt ?? new Date();
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: new Date(2000, 0, 1, hour).toLocaleTimeString([], {
        hour: 'numeric',
      }),
      orders: 0,
    }));

    orders.forEach(order => {
      if (!order.created_at) {
        return;
      }
      const createdAt = new Date(String(order.created_at));
      if (
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toLocaleDateString() !== dashboardDate.toLocaleDateString()
      ) {
        return;
      }
      buckets[createdAt.getHours()].orders += 1;
    });
    return buckets.filter(bucket => bucket.hour % 3 === 0);
  }, [dashboardUpdatedAt, orders]);

  const topDishes = useMemo(() => {
    const quantities = new Map<string, number>();
    orders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        if (!isRecord(item)) {
          return;
        }
        const name = text(item.food_name, '').trim();
        if (!name) {
          return;
        }
        const quantity = numberValue(item.quantity, 1);
        quantities.set(
          name,
          (quantities.get(name) ?? 0) + (quantity > 0 ? quantity : 1),
        );
      });
    });
    return Array.from(quantities, ([name, quantity]) => ({ name, quantity }))
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 5);
  }, [orders]);

  const orderStatusData = useMemo(() => {
    const statuses = [
      { name: 'Pending', color: '#D4A843', value: 0 },
      { name: 'Preparing', color: '#3B82F6', value: 0 },
      { name: 'Ready to Serve', color: '#22C55E', value: 0 },
      { name: 'Served', color: '#64748B', value: 0 },
      { name: 'Cancelled', color: '#F43F5E', value: 0 },
      { name: 'Other', color: '#8B5CF6', value: 0 },
    ];
    orders.forEach(order => {
      const status = text(order.status, 'Pending').trim().toLowerCase();
      const match = statuses.find(
        item => item.name.toLowerCase() === status,
      );
      (match ?? statuses[statuses.length - 1]).value += 1;
    });
    return statuses.filter(status => status.value > 0);
  }, [orders]);

  const upcomingEventOrders = useMemo(
    () =>
      eventOrders.filter(order =>
        ['confirmed', 'preparing', 'ready'].includes(
          text(order.status, '').toLowerCase(),
        ),
      ),
    [eventOrders],
  );

  const attendanceIsWorking = Boolean(
    attendance?.check_in && !attendance?.check_out,
  );
  const attendanceSeconds = attendanceIsWorking
    ? numberValue(
        (attendanceClock -
          new Date(String(attendance?.check_in)).getTime()) /
          1000,
      )
    : attendance?.duration_seconds !== undefined &&
        attendance?.duration_seconds !== null
      ? numberValue(attendance.duration_seconds)
      : numberValue(attendance?.total_hours) * 3600;

  const openRequestModal = () => {
    setRequestProduct('');
    setRequestProductId(null);
    setRequestQuantity('1');
    setRequestUnit('pcs');
    setRequestError('');
    setIsRequestModalOpen(true);
  };

  const submitInventoryRequest = async () => {
    const quantity = Number(requestQuantity);
    if (!requestProduct.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setRequestError('Enter an item name and a quantity greater than zero.');
      return;
    }

    const matchedProduct = inventoryProducts.find(
      product =>
        text(product.product_name, '').toLowerCase() ===
        requestProduct.trim().toLowerCase(),
    );
    setIsSavingRequest(true);
    setRequestError('');
    try {
      await api.post('/inventory/kitchen-requests', {
        request_number: `KR-${Date.now()}`,
        requested_by: chefName,
        department: 'Kitchen',
        request_date: new Date().toISOString().slice(0, 10),
        priority: 'Normal',
        items: [
          {
            product_id: requestProductId ?? matchedProduct?.id ?? null,
            product_name: requestProduct.trim(),
            quantity,
            unit: requestUnit.trim() || 'pcs',
          },
        ],
      });
      setIsRequestModalOpen(false);
      setRefreshCount(count => count + 1);
    } catch (requestError) {
      setRequestError(errorMessage(requestError));
    } finally {
      setIsSavingRequest(false);
    }
  };

  const updateAttendance = async () => {
    const isWorking = Boolean(attendance?.check_in && !attendance?.check_out);
    setIsAttendanceBusy(true);
    setError('');
    try {
      const response = await api.post(
        isWorking ? '/attendance/clock-out' : '/attendance/clock-in',
      );
      const payload = response.data as unknown;
      if (!isRecord(payload) || payload.success !== true) {
        throw new Error(
          isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : `Unable to ${isWorking ? 'clock out' : 'clock in'}.`,
        );
      }
      setAttendance(isRecord(payload.data) ? payload.data : null);
      setRefreshCount(count => count + 1);
    } catch (attendanceError) {
      setError(errorMessage(attendanceError));
    } finally {
      setIsAttendanceBusy(false);
    }
  };

  const navigateToChefTab = (tab: ChefTab) => {
    setActiveTab(tab);
    setSelectedMorePage(null);
    setSelectedOrderPage(null);
  };

  const isMoreInnerPage =
    activeTab === 'more' && selectedMorePage !== null;
  const isOrderInnerPage =
    activeTab === 'orders' && selectedOrderPage !== null;
  const isInnerPage = isMoreInnerPage || isOrderInnerPage;

  const renderDashboard = () => (
    <>
      <View className="mb-4 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <PageHeading
            title={`Welcome${chefName ? `, ${chefName}` : ''}`}
            subtitle="Your kitchen workspace overview."
          />
          {dashboardUpdatedAt ? (
            <Text className="-mt-2 text-[11px] text-[#6B7280]">
              Updated{' '}
              {dashboardUpdatedAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => setRefreshCount(count => count + 1)}
          className="mb-4 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5"
        >
          <Text className="text-xs font-bold text-[#123B2D]">
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <View className="relative mb-3 overflow-hidden rounded-[22px] border border-[#C9E9D4] bg-[#F1FBF4] p-3.5">
        <View
          pointerEvents="none"
          className="absolute -right-7 -top-8 h-24 w-24 rounded-full bg-[#D9F2E0] opacity-70"
        />
        <View className="relative flex-row items-center gap-2.5">
          <View className="h-[50px] w-[50px] items-center justify-center rounded-2xl border border-[#D5EDDD] bg-white/80">
            <CustomersIcon color="#14764A" size={27} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#28704B]">
                Today’s Attendance
              </Text>
              {attendance?.status ? (
                <Text
                  className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase ${
                    text(attendance.status).toLowerCase() === 'late'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#D9F5E5] text-[#187443]'
                  }`}
                >
                  {text(attendance.status)}
                </Text>
              ) : null}
            </View>
            <Text className="mt-1 text-[13px] font-extrabold text-[#123B2D]">
              {attendanceIsWorking
                ? 'You are on duty'
                : attendance?.check_in && attendance?.check_out
                  ? 'Shift completed for today'
                  : 'Shift not yet started'}
            </Text>
            <Text numberOfLines={2} className="mt-0.5 text-[10px] leading-[15px] text-[#52665A]">
              {attendanceIsWorking
                ? `Clocked in at ${formatTime(attendance?.check_in)}`
                : attendance?.check_in && attendance?.check_out
                  ? `Worked ${formatTime(attendance?.check_in)} – ${formatTime(attendance?.check_out)}`
                  : 'Clock in to start your shift'}
            </Text>
          </View>
          <View className="w-[91px] items-stretch gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={isAttendanceBusy}
              onPress={updateAttendance}
              className="items-center rounded-xl bg-[#08623F] px-2 py-2.5"
            >
              <Text numberOfLines={1} className="text-[10px] font-extrabold text-white">
                {isAttendanceBusy
                  ? 'Please wait'
                  : attendanceIsWorking
                    ? 'Clock Out'
                    : attendance?.check_in && attendance?.check_out
                      ? 'Resume Shift'
                      : 'Clock In'}
              </Text>
            </Pressable>
            <View className="rounded-xl border border-[#D9EDE0] bg-white/80 px-2 py-1.5">
              <Text className="text-[8px] font-semibold text-[#52715E]">
                Today’s working time
              </Text>
              <Text className="mt-0.5 text-[10px] font-extrabold text-[#164D35]">
                {formatDuration(attendanceSeconds)}
              </Text>
            </View>
          </View>
        </View>
        <View className="relative mt-2.5 flex-row items-center justify-between border-t border-[#DCEFE2] pt-2">
          <Text numberOfLines={1} className="flex-1 text-[9px] text-[#617668]">
            Shift: {text(shiftInfo?.name ?? shiftInfo?.shift_name, 'Scheduled')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateToChefTab('attendance')}
            className="pl-2"
          >
            <Text className="text-[10px] font-extrabold text-[#14764A]">
              Attendance
            </Text>
          </Pressable>
        </View>
      </View>

      {upcomingEventOrders.length > 0 ? (
        <View className="relative mb-3 overflow-hidden rounded-[22px] border border-[#F2D98C] bg-[#FFF9E9] p-3.5">
          <View
            pointerEvents="none"
            className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#FCE9B9] opacity-60"
          />
          <View className="relative flex-row items-center gap-2.5">
            <View className="h-[48px] w-[48px] items-center justify-center rounded-2xl border border-[#F5E3B0] bg-white/80">
              <ReceiptIcon color="#B57618" size={25} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Text className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-[#9A671F]">
                  Confirmed Event Orders
                </Text>
                <Text className="rounded-full bg-[#FCE8B8] px-2 py-0.5 text-[8px] font-extrabold text-[#8A5A16]">
                  {upcomingEventOrders.length}{' '}
                  {upcomingEventOrders.length === 1 ? 'Order' : 'Orders'}
                </Text>
              </View>
              <Text className="mt-1 text-[13px] font-extrabold text-[#5B3512]">
                {upcomingEventOrders.length} Event Order
                {upcomingEventOrders.length === 1 ? '' : 's'} to Prepare
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#8A5A2A]">
                Next: {text(upcomingEventOrders[0].event_type, 'Catering Event')}
              </Text>
              <Text numberOfLines={1} className="mt-1 text-[9px] font-semibold text-[#8A5A2A]">
                {text(upcomingEventOrders[0].guest_count, '—')} guests
                {'  ·  '}
                {formatShortDate(upcomingEventOrders[0].event_date)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigateToChefTab('event-orders')}
              className="flex-row items-center rounded-full bg-[#8A4B14] px-2.5 py-2"
            >
              <Text className="text-[9px] font-extrabold text-white">
                Event Orders
              </Text>
              <Text className="ml-1 text-[13px] leading-4 text-white">›</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        accessibilityLabel="Kitchen order summary"
        className="flex-row flex-wrap gap-2.5"
      >
        {[
          { label: 'Active Orders', value: orderCounts.active, detail: 'Open kitchen orders' },
          { label: 'Pending', value: orderCounts.pending, detail: 'Waiting to start' },
          { label: 'Preparing', value: orderCounts.preparing, detail: 'In progress' },
          { label: 'Ready to Serve', value: orderCounts.ready, detail: 'Plated and hot' },
        ].map(stat => (
          <Card key={stat.label} className="mb-0 w-[48%] flex-grow">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
              {stat.label}
            </Text>
            <Text className="mt-2 text-[26px] font-extrabold text-[#012711]">
              {isLoading ? '…' : stat.value}
            </Text>
            <Text className="mt-1 text-[11px] text-[#6B7280]">
              {stat.detail}
            </Text>
          </Card>
        ))}
      </View>

      <View className="mt-6">
        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          At a glance
        </Text>
        <Text className="mt-1 text-lg font-bold text-[#012711]">
          Kitchen analytics
        </Text>
      </View>

      <Card>
        <Text className="text-sm font-bold text-[#012711]">
          Order activity
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Kitchen orders received over the last 7 days
        </Text>
        {orders.length ? (
          <View className="mt-5 h-36 flex-row items-end justify-between gap-2">
            {dailyOrders.map(day => {
              const maxOrders = Math.max(1, ...dailyOrders.map(item => item.orders));
              const height = day.orders
                ? Math.max(8, (day.orders / maxOrders) * 100)
                : 0;
              return (
                <View
                  key={day.dateKey}
                  accessibilityLabel={`${day.day}: ${day.orders} orders`}
                  className="flex-1 items-center justify-end"
                >
                  <Text className="mb-1 text-[10px] font-semibold text-[#475569]">
                    {day.orders}
                  </Text>
                  <View
                    className="w-full rounded-t-md bg-[#FF5A00]"
                    style={{ height: `${height}%` }}
                  />
                  <Text className="mt-1.5 text-[10px] text-[#64748B]">
                    {day.day}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="py-8 text-center text-xs text-[#6B7280]">
            No order activity yet.
          </Text>
        )}
      </Card>

      <Card>
        <Text className="text-sm font-bold text-[#012711]">
          Order status mix
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Current status of kitchen orders
        </Text>
        {orderStatusData.length ? (
          <View className="mt-4 gap-3">
            {orderStatusData.map(status => (
              <View key={status.name}>
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-xs text-[#475569]">{status.name}</Text>
                  <Text className="text-xs font-bold text-[#012711]">
                    {status.value}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(status.value / Math.max(1, orders.length)) * 100}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="py-8 text-center text-xs text-[#6B7280]">
            Status distribution will appear when orders arrive.
          </Text>
        )}
      </Card>

      <Card>
        <Text className="text-sm font-bold text-[#012711]">
          Today’s order pace
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Order arrivals by time of day
        </Text>
        {orderCounts.today ? (
          <View className="mt-5 h-32 flex-row items-end justify-between gap-1">
            {hourlyOrders.map(bucket => {
              const maxOrders = Math.max(1, ...hourlyOrders.map(item => item.orders));
              const height = bucket.orders
                ? Math.max(5, (bucket.orders / maxOrders) * 100)
                : 0;
              return (
                <View
                  key={bucket.hour}
                  accessibilityLabel={`${bucket.label}: ${bucket.orders} orders`}
                  className="flex-1 items-center justify-end"
                >
                  <View
                    className="w-full rounded-t-md bg-[#D4A843]"
                    style={{ height: `${height}%` }}
                  />
                  <Text className="mt-1.5 text-[9px] text-[#64748B]">
                    {bucket.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="py-8 text-center text-xs text-[#6B7280]">
            No kitchen orders have arrived today.
          </Text>
        )}
      </Card>

      <Card>
        <Text className="text-sm font-bold text-[#012711]">
          Most-ordered dishes
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Top 5 dishes by quantity across kitchen orders
        </Text>
        {topDishes.length ? (
          <View className="mt-4 gap-3">
            {topDishes.map(dish => (
              <View key={dish.name}>
                <View className="mb-1 flex-row justify-between gap-3">
                  <Text numberOfLines={1} className="flex-1 text-xs text-[#475569]">
                    {dish.name}
                  </Text>
                  <Text className="text-xs font-bold text-[#012711]">
                    {dish.quantity}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <View
                    className="h-full rounded-full bg-[#FF5A00]"
                    style={{
                      width: `${(dish.quantity / topDishes[0].quantity) * 100}%`,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="py-8 text-center text-xs text-[#6B7280]">
            Dish quantities will appear when orders arrive.
          </Text>
        )}
      </Card>

      <Card className="p-0">
        <View className="flex-row items-center justify-between border-b border-[#E5E7EB] px-4 py-4">
          <View className="flex-1">
            <Text className="text-sm font-bold text-[#012711]">
              Recent Kitchen Orders
            </Text>
            <Text className="mt-1 text-[11px] text-[#6B7280]">
              Today: {orderCounts.today}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setActiveTab('orders');
              setSelectedMorePage(null);
              setSelectedOrderPage('kitchen');
            }}
            className="px-2 py-2"
          >
            <Text className="text-xs font-bold text-[#123B2D]">
              All orders
            </Text>
          </Pressable>
        </View>
        {orders.length ? (
          orders.slice(0, 6).map((order, index) => {
            const items = Array.isArray(order.items)
              ? order.items.filter(isRecord)
              : [];
            const itemSummary = items
              .map(
                item =>
                  `${text(item.food_name, 'Item')} × ${text(item.quantity, '1')}`,
              )
              .join(', ');
            return (
              <View
                key={text(order.order_id ?? order.id, String(index))}
                className="border-b border-[#F1F5F9] px-4 py-3"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-sm font-bold text-[#012711]">
                    Order {text(order.order_id ?? order.id, `#${index + 1}`)}
                  </Text>
                  <Text className="rounded-full bg-[#F0F7EE] px-2.5 py-1 text-[10px] font-bold text-[#116C0B]">
                    {text(order.status, 'Pending')}
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-[#6B7280]">
                  Table {text(order.table_number ?? order.table_id)}
                  {' · '}
                  {itemSummary || 'No items'}
                </Text>
              </View>
            );
          })
        ) : (
          <View className="px-4 py-8">
            <EmptyState message="No kitchen orders yet. New server orders will appear here." />
          </View>
        )}
      </Card>
    </>
  );

  const renderFoods = () => (
    <ChefFoodsScreen
      error={error}
      foods={foods as ChefFood[]}
      isLoading={isLoading}
      onFoodVisibilityChange={(foodId, isVisible) => {
        setFoods(current =>
          current.map(food =>
            food.food_id === foodId
              ? { ...food, is_menu_visible: isVisible }
              : food,
          ),
        );
      }}
      onRefresh={() => setRefreshCount(count => count + 1)}
    />
  );

  const renderInventory = () => (
    <>
      <View
        className="mb-4 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-2">
          <PageHeading
            title="Inventory Requests"
            subtitle="Track kitchen stock requests."
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openRequestModal}
          className="rounded-xl bg-[#116C0B] px-3 py-2.5"
        >
          <Text className="text-xs font-bold text-white">
            New request
          </Text>
        </Pressable>
      </View>
      {requests.length ? (
        requests.map((request, index) => {
          const itemList = Array.isArray(request.items) ? request.items : [];
          const firstItem = isRecord(itemList[0]) ? itemList[0] : null;
          return (
            <Card key={text(request.id ?? request.request_number, String(index))}>
              <Text className="text-sm font-bold text-[#012711]">
                {text(request.request_number, `Request ${index + 1}`)}
              </Text>
              <Text className="mt-1.5 text-xs text-[#6B7280]">
                {firstItem ? text(firstItem.product_name, 'Kitchen supplies') : 'Kitchen supplies'}
                {firstItem ? ` · ${text(firstItem.quantity)} ${text(firstItem.unit, '')}` : ''}
              </Text>
              <Text className="mt-2 text-xs font-bold text-[#116C0B]">
                {text(request.status, 'Pending')}
              </Text>
            </Card>
          );
        })
      ) : (
        <EmptyState message="You have no inventory requests yet." />
      )}
    </>
  );

  let pageContent: React.ReactNode;
  if (activeTab === 'dashboard') {
    pageContent = renderDashboard();
  } else if (activeTab === 'foods') {
    pageContent = renderFoods();
  } else if (activeTab === 'event-orders') {
    pageContent = <ChefEventOrdersScreen />;
  } else if (activeTab === 'more' && selectedMorePage === 'inventory') {
    pageContent = renderInventory();
  } else if (activeTab === 'more' && selectedMorePage === 'stock') {
    pageContent = (
      <ChefStockDetailsScreen
        onAddRequest={() => {
          setSelectedMorePage('inventory');
          openRequestModal();
        }}
        onRequestProduct={product => {
          setRequestProduct(String(product.product_name || ''));
          setRequestProductId(product.id ?? null);
          setRequestQuantity('1');
          setRequestUnit(String(product.unit_name || 'pcs'));
          setRequestError('');
          setSelectedMorePage('inventory');
          setIsRequestModalOpen(true);
        }}
      />
    );
  } else if (activeTab === 'orders' && selectedOrderPage) {
    pageContent = <ChefOrdersScreen page={selectedOrderPage} />;
  } else if (activeTab === 'orders') {
    pageContent = (
      <ChefOrdersMenuScreen onSelectPage={setSelectedOrderPage} />
    );
  } else if (activeTab === 'more') {
    pageContent = (
      <ChefMoreScreen
        onSelectPage={page => {
          if (page === 'back-home') {
            navigateToChefTab('dashboard');
          } else {
            setSelectedMorePage(page);
          }
        }}
      />
    );
  } else {
    pageContent = (
      <ChefAttendanceScreen
        attendance={attendance}
        history={attendanceHistory}
        isBusy={isAttendanceBusy}
        onClockAction={updateAttendance}
        shiftInfo={shiftInfo}
      />
    );
  }

  return (
    <SafeAreaView
      edges={isInnerPage ? ['left', 'right', 'bottom'] : ['left', 'right']}
      className="flex-1 bg-[#F9FAFB]"
    >
      {isAccountMenuOpen ? (
        <Pressable
          accessibilityLabel="Close account menu"
          accessibilityRole="button"
          onPress={() => setIsAccountMenuOpen(false)}
          className="absolute inset-0 z-10"
        />
      ) : null}
      {isInnerPage ? (
        <MoreInnerHeader
          title={isOrderInnerPage
            ? {
                kitchen: 'Kitchen Orders',
                'home-delivery': 'Home Delivery Orders',
                pickup: 'Pickup Orders',
                dining: 'Dining Orders',
                new: 'New Order',
                all: 'All Orders',
                delivery: 'Delivery Orders',
                cancelled: 'Cancelled Orders',
              }[selectedOrderPage]
            : selectedMorePage === 'inventory'
              ? 'Inventory Requests'
              : 'Stock Details'}
          destination={isOrderInnerPage ? 'Orders' : 'More'}
          subtitle="Chef workspace"
          onBack={() => {
            if (isOrderInnerPage) {
              setSelectedOrderPage(null);
            } else {
              setSelectedMorePage(null);
            }
          }}
        />
      ) : (
        <ChefHeader
          activeTitle={pageTitles[activeTab]}
          onLogout={onLogout}
          onOpenSettings={() => navigateToChefTab('more')}
          onAccountMenuOpenChange={setIsAccountMenuOpen}
          user={user}
        />
      )}
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-6"
        refreshControl={
          <RefreshControl
            colors={['#116C0B']}
            onRefresh={() => setRefreshCount(count => count + 1)}
            refreshing={isLoading}
            tintColor="#116C0B"
          />
        }
      >
        {error &&
        activeTab !== 'foods' &&
        activeTab !== 'orders' &&
        activeTab !== 'event-orders' &&
        (activeTab !== 'more' || selectedMorePage !== null) ? (
          <View
            accessibilityRole="alert"
            className="mb-3.5 rounded-xl border border-red-200 bg-red-50 p-3"
          >
            <Text className="text-[13px] text-red-600">{error}</Text>
          </View>
        ) : null}
        {isLoading &&
        activeTab !== 'foods' &&
        activeTab !== 'orders' &&
        activeTab !== 'event-orders' &&
        (activeTab !== 'more' || selectedMorePage !== null) ? (
          <View className="items-center py-7">
            <ActivityIndicator color="#116C0B" />
          </View>
        ) : null}
        {pageContent}
      </ScrollView>
      {!isInnerPage ? (
        <ChefBottomNavigation
          activeTab={activeTab}
          onTabPress={navigateToChefTab}
        />
      ) : null}

      <FormModal
        visible={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="New Inventory Request"
        subtitle="Request kitchen ingredients and stock supplies"
        onSave={submitInventoryRequest}
        saveLabel="Send Request"
        cancelLabel="Cancel"
        isSaving={isSavingRequest}
        errorMessage={requestError}
      >
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Product Name *
            </Text>
            <TextInput
              accessibilityLabel="Product name"
              className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm text-[#0F172A]"
              onChangeText={setRequestProduct}
              placeholder="e.g. Basmati Rice, Butter, Tomatoes"
              placeholderTextColor="#94A3B8"
              value={requestProduct}
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Quantity *
              </Text>
              <TextInput
                accessibilityLabel="Quantity"
                className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm text-[#0F172A]"
                keyboardType="decimal-pad"
                onChangeText={setRequestQuantity}
                placeholder="e.g. 10"
                placeholderTextColor="#94A3B8"
                value={requestQuantity}
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Unit *
              </Text>
              <TextInput
                accessibilityLabel="Unit"
                className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm text-[#0F172A]"
                onChangeText={setRequestUnit}
                placeholder="kg / litres / pkts"
                placeholderTextColor="#94A3B8"
                value={requestUnit}
              />
            </View>
          </View>
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

export default ChefDashboardScreen;
