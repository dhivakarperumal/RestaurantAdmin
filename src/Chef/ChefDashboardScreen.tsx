import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
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
import MoreInnerHeader from '../Admin/Navigation/MoreInnerHeader';
import {
  ChartIcon,
  CustomersIcon,
  MenuIcon,
  OrdersIcon,
  ReceiptIcon,
} from '../Admin/Navigation/NavigationIcons';
import { FormModal } from '../components/popups';
import ChefBottomNavigation, { type ChefTab } from './ChefBottomNavigation';
import ChefHeader from './ChefHeader';
import ChefAttendanceScreen from './Tabs/ChefAttendanceScreen';
import ChefEventOrdersScreen from './Tabs/ChefEventOrdersScreen';
import ChefFoodsScreen, { type ChefFood } from './Tabs/ChefFoodsScreen';
import ChefListControls from './Tabs/ChefListControls';
import ChefMoreScreen from './Tabs/ChefMoreScreen';
import ChefOrdersMenuScreen from './Tabs/ChefOrdersMenuScreen';
import ChefOrdersScreen, { type ChefOrderPage } from './Tabs/ChefOrdersScreen';
import ChefProfileScreen from './Tabs/ChefProfileScreen';
import ChefStatCards from './Tabs/ChefStatCards';
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

function firstRequestItem(request: DataRow) {
  const items = Array.isArray(request.items) ? request.items : [];
  return isRecord(items[0]) ? items[0] : null;
}

function errorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Please check your connection and try again.';
}

function text(value: unknown, fallback = '-') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOrderDate(order: DataRow) {
  const value =
    order.created_at ?? order.order_date ?? order.order_datetime ?? order.createdAt;
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateValue = String(value).trim();
  const localDateTime = dateValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/,
  );
  if (localDateTime) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] =
      localDateTime;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: unknown) {
  if (!value) {
    return '-';
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '-'
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
    'inventory' | 'stock' | 'profile' | null
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
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
  const [inventorySort, setInventorySort] = useState<'latest' | 'oldest' | 'name'>(
    'latest',
  );
  const [inventoryViewMode, setInventoryViewMode] = useState<'grid' | 'table'>(
    'grid',
  );
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

  const inventoryStatuses = useMemo(
    () =>
      [...new Set(requests.map(request => text(request.status, 'Pending')))]
        .sort((first, second) => first.localeCompare(second)),
    [requests],
  );
  const filteredRequests = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    return requests
      .filter(request => {
        const firstItem = firstRequestItem(request);
        const matchesStatus =
          inventoryStatusFilter === 'all' ||
          text(request.status, 'Pending').toLowerCase() ===
            inventoryStatusFilter;
        const matchesSearch = [
          request.request_number,
          request.requested_by,
          request.department,
          firstItem?.product_name,
        ].some(value => text(value, '').toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
      })
      .sort((first, second) => {
        if (inventorySort === 'name') {
          return text(firstRequestItem(first)?.product_name, '').localeCompare(
            text(firstRequestItem(second)?.product_name, ''),
          );
        }
        const firstDate = new Date(
          String(first.created_at ?? first.request_date ?? 0),
        ).getTime();
        const secondDate = new Date(
          String(second.created_at ?? second.request_date ?? 0),
        ).getTime();
        return inventorySort === 'latest'
          ? secondDate - firstDate
          : firstDate - secondDate;
      });
  }, [inventorySearch, inventorySort, inventoryStatusFilter, requests]);

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
    const today = localDateKey(dashboardUpdatedAt ?? new Date());
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
        const createdAt = getOrderDate(order);
        return createdAt !== null && localDateKey(createdAt) === today;
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
        dateKey: localDateKey(date),
        day: date.toLocaleDateString([], { weekday: 'short' }),
        orders: 0,
      };
    });
    const countsByDate = new Map(days.map(day => [day.dateKey, day]));

    orders.forEach(order => {
      const createdAt = getOrderDate(order);
      if (!createdAt) {
        return;
      }
      const day = countsByDate.get(localDateKey(createdAt));
      if (day) {
        day.orders += 1;
      }
    });
    return days;
  }, [dashboardUpdatedAt, orders]);

  const hourlyOrders = useMemo(() => {
    const dashboardDate = dashboardUpdatedAt ?? new Date();
    const today = localDateKey(dashboardDate);
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: new Date(2000, 0, 1, hour).toLocaleTimeString([], {
        hour: 'numeric',
      }),
      orders: 0,
    }));

    orders.forEach(order => {
      const createdAt = getOrderDate(order);
      if (!createdAt || localDateKey(createdAt) !== today) {
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
        const name = text(item.food_name ?? item.product_name, '').trim();
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
      { name: 'Preparing', color: '#D34444', value: 0 },
      { name: 'Ready to Serve', color: '#1672C4', value: 0 },
      { name: 'Completed', color: '#31A95B', value: 0 },
      { name: 'Cancelled', color: '#F43F5E', value: 0 },
    ];
    orders.forEach(order => {
      const status = text(order.status, 'Pending').trim().toLowerCase();
      const normalizedStatus = status === 'served' ? 'completed' : status;
      const match = statuses.find(
        item => item.name.toLowerCase() === normalizedStatus,
      );
      if (match) {
        match.value += 1;
      }
    });
    return statuses.filter(
      status =>
        status.name !== 'Cancelled' ||
        status.value > 0,
    );
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

  // Android hardware back button: navigate within chef screens instead of exiting
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // 1. Account menu open -> close it
        if (isAccountMenuOpen) {
          setIsAccountMenuOpen(false);
          return true;
        }
        // 2. Request modal open -> close it
        if (isRequestModalOpen) {
          setIsRequestModalOpen(false);
          return true;
        }
        // 3. More inner page (inventory / stock) -> go back to More tab
        if (activeTab === 'more' && selectedMorePage !== null) {
          setSelectedMorePage(null);
          return true;
        }
        // 4. Orders inner page -> go back to Orders menu
        if (activeTab === 'orders' && selectedOrderPage !== null) {
          setSelectedOrderPage(null);
          return true;
        }
        // 5. Non-dashboard tab -> go to dashboard
        if (activeTab !== 'dashboard') {
          navigateToChefTab('dashboard');
          return true;
        }
        // 6. Already on dashboard -> let OS exit the app
        return false;
      },
    );
    return () => subscription.remove();
  }, [
    isAccountMenuOpen,
    isRequestModalOpen,
    activeTab,
    selectedMorePage,
    selectedOrderPage,
  ]);
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
    activeTab === 'more' &&
    selectedMorePage !== null &&
    selectedMorePage !== 'profile';
  const isOrderInnerPage =
    activeTab === 'orders' && selectedOrderPage !== null;
  const isInnerPage = isMoreInnerPage || isOrderInnerPage;

  const renderDashboard = () => (
    <>
      <View className="mb-5">
        <View className="mb-2.5 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-2 h-2 w-2 rounded-full bg-[#D4A843]" />
            <Text className="text-[10px] font-extrabold uppercase tracking-[1.7px] text-[#28704B]">
              Kitchen workspace
            </Text>
          </View>
          <Text className="text-[10px] font-semibold text-[#7D8981]">
            {new Date().toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[26px] font-extrabold leading-[32px] text-[#123B2D]">
              Welcome back,
            </Text>
            <Text
              numberOfLines={1}
              className="text-[26px] font-extrabold leading-[32px] text-[#14764A]"
            >
              {chefName}
            </Text>
            <Text className="mt-1.5 text-[13px] text-[#68766D]">
              Here's what's happening in your kitchen today.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => setRefreshCount(count => count + 1)}
            className="h-11 flex-row items-center justify-center rounded-full border border-[#CFE0D4] bg-white px-3.5"
          >
            <Text className="mr-1.5 text-base font-bold text-[#14764A]">↻</Text>
            <Text className="text-[11px] font-bold text-[#123B2D]">
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Pressable>
        </View>
        <View className="mt-3 flex-row items-center">
          <View className="h-[3px] w-9 rounded-full bg-[#D4A843]" />
          <View className="ml-1.5 h-[3px] flex-1 rounded-full bg-[#E4EEE7]" />
          {dashboardUpdatedAt ? (
            <Text className="ml-2 text-[9px] font-medium text-[#89948D]">
              Updated{' '}
              {dashboardUpdatedAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="relative mb-3 overflow-hidden rounded-[22px] border border-[#C9E9D4] bg-[#F1FBF4] p-3.5">
        <View
          pointerEvents="none"
          className="absolute -right-7 -top-8 h-24 w-24 rounded-full bg-[#D9F2E0] opacity-70"
        />
        <View className="relative flex-row items-center gap-2.5">
          <View className="h-[96px] w-[104px] shrink-0 items-center justify-center">
            <Image
              accessibilityLabel="Chef"
              resizeMode="contain"
              source={require('../images/chef.png')}
              className="h-full w-full"
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#28704B]">
                Today's Attendance
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
                  ? `Worked ${formatTime(attendance?.check_in)} - ${formatTime(attendance?.check_out)}`
                  : 'Clock in to start your shift'}
            </Text>
            <View className="mt-2 flex-row gap-1.5">
              <View className="min-w-0 flex-1 justify-center rounded-xl border border-[#D9EDE0] bg-white/80 px-2.5 py-2">
                <Text className="text-[8px] font-semibold text-[#52715E]">
                  Today's working time
                </Text>
                <Text className="mt-0.5 text-[10px] font-extrabold text-[#164D35]">
                  {formatDuration(attendanceSeconds)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isAttendanceBusy}
                onPress={updateAttendance}
                className="min-h-[52px] min-w-0 flex-1 items-center justify-center rounded-xl bg-[#08623F] px-2 py-2"
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
            <View className="h-[82px] w-[104px] shrink-0 items-center justify-center">
              <Image
                accessibilityLabel="Event calendar and cake"
                resizeMode="contain"
                source={require('../images/eventcalendar.png')}
                className="h-full w-full"
              />
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
                {text(upcomingEventOrders[0].guest_count, '-')} guests
                {'  ·  '}
                {formatShortDate(upcomingEventOrders[0].event_date)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateToChefTab('event-orders')}
                className="mt-2 items-center rounded-xl bg-[#8A4B14] px-2.5 py-2"
              >
                <Text className="text-[9px] font-extrabold text-white">
                  View Event Orders {'>'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View
        accessibilityLabel="Kitchen order summary"
        className="flex-row flex-wrap gap-2.5"
      >
        {[
          {
            label: 'Active Orders',
            value: orderCounts.active,
            detail: 'Open kitchen orders',
            color: '#08794A',
            border: '#C8EED8',
            icon: 'orders',
          },
          {
            label: 'Pending',
            value: orderCounts.pending,
            detail: 'Waiting to start',
            color: '#BC7200',
            border: '#FFE7AC',
            icon: 'pending',
          },
          {
            label: 'Preparing',
            value: orderCounts.preparing,
            detail: 'In progress',
            color: '#D34444',
            border: '#FFDADA',
            icon: 'preparing',
          },
          {
            label: 'Ready to Serve',
            value: orderCounts.ready,
            detail: 'Plated and hot',
            color: '#1672C4',
            border: '#D1EAFF',
            icon: 'ready',
          },
        ].map(stat => (
          <View
            key={stat.label}
            className="relative mb-0 min-h-[112px] w-[48%] flex-grow overflow-hidden rounded-[21px] border border-[#E5E7EB] bg-white p-3.5"
          >
            <View className="relative flex-row items-start justify-between gap-2">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: stat.border }}
              >
                {stat.icon === 'orders' ? (
                  <OrdersIcon color={stat.color} size={22} />
                ) : stat.icon === 'ready' ? (
                  <ReceiptIcon color={stat.color} size={22} />
                ) : (
                  <Text className="text-[20px] font-extrabold" style={{ color: stat.color }}>
                    {stat.icon === 'pending' ? '◷' : '♨'}
                  </Text>
                )}
              </View>
              <View
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: stat.border }}
              >
                <Text className="text-base font-bold" style={{ color: stat.color }}>
                  {'>'}
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[#52615A]">
              {stat.label}
            </Text>
            <View className="mt-0.5 flex-row items-end justify-between gap-1">
              <Text className="text-[26px] font-extrabold leading-8 text-[#123B2D]">
                {isLoading ? '...' : stat.value}
              </Text>
              <Text numberOfLines={1} className="mb-1 flex-1 text-right text-[9px] text-[#66756D]">
                {stat.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-6 mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6B7280]">
            At a glance
          </Text>
          <Text className="mt-1 text-[21px] font-extrabold text-[#123B2D]">
            Kitchen analytics
          </Text>
        </View>
      </View>

      <View className="mb-3 rounded-[22px] border border-[#E5EDE7] bg-white p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E8F5EC]">
              <ChartIcon color="#14764A" size={22} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-[#123B2D]">
                Order activity
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7280]">
                Kitchen orders received over the last 7 days
              </Text>
            </View>
          </View>
          <View className="rounded-xl bg-[#EFF7F0] px-3 py-2">
            <Text className="text-[9px] font-semibold text-[#52715E]">Total</Text>
            <Text className="text-right text-lg font-extrabold text-[#123B2D]">
              {dailyOrders.reduce((total, day) => total + day.orders, 0)}
            </Text>
          </View>
        </View>
        {orders.length ? (
          <View className="mt-5 h-36 flex-row items-end justify-between gap-2 border-b border-[#E9EEF0]">
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
                  <Text className="mb-1 text-[10px] font-bold text-[#475569]">
                    {day.orders}
                  </Text>
                  <View
                    className={`w-full rounded-t-lg ${
                      day.orders > 0 ? 'bg-[#31A95B]' : 'bg-[#E8EEF0]'
                    }`}
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
      </View>

      <View className="mb-3 rounded-[22px] border border-[#E5EDE7] bg-white p-4">
        <View className="mb-4 flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E8F5EC]">
            <Text className="text-[20px] font-extrabold text-[#14764A]">#</Text>
          </View>
          <View>
            <Text className="text-sm font-extrabold text-[#123B2D]">
              Order status mix
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#6B7280]">
              Current status of kitchen orders
            </Text>
          </View>
        </View>
        {orders.length ? (
          <View className="gap-3.5">
            {orderStatusData.map(status => (
              <View key={status.name} className="flex-row items-center gap-2">
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${status.color}20` }}
                >
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 text-[11px] font-semibold text-[#36443D]">
                    {status.name}
                  </Text>
                  <View className="h-2 overflow-hidden rounded-full bg-[#EFF2F4]">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${(status.value / Math.max(1, orders.length)) * 100}%`,
                        backgroundColor: status.color,
                      }}
                    />
                  </View>
                </View>
                <Text className="w-6 text-right text-xs font-extrabold text-[#123B2D]">
                  {status.value}
                </Text>
                <View className="h-5 w-px bg-[#D9E0E2]" />
                <Text className="w-9 text-right text-[10px] font-semibold text-[#68766D]">
                  {Math.round((status.value / Math.max(1, orders.length)) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="py-8 text-center text-xs text-[#6B7280]">
            Status distribution will appear when orders arrive.
          </Text>
        )}
      </View>

      <Card>
        <Text className="text-sm font-bold text-[#012711]">
          Today's order pace
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

      <View className="mb-3 rounded-[22px] border border-[#E5EDE7] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E8F5EC]">
              <MenuIcon color="#14764A" size={21} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-[#123B2D]">
                Most-ordered dishes
              </Text>
              <Text className="mt-0.5 text-[10px] text-[#6B7280]">
                Top dishes across kitchen orders
              </Text>
            </View>
          </View>
          <View className="rounded-full bg-[#F0F7F1] px-2.5 py-1.5">
            <Text className="text-[9px] font-bold text-[#28704B]">
              {topDishes.length} {topDishes.length === 1 ? 'dish' : 'dishes'}
            </Text>
          </View>
        </View>
        {topDishes.length ? (
          <View className="gap-2">
            {topDishes.map((dish, index) => {
              const isTopDish = index === 0;
              const barColor = isTopDish ? '#16834A' : '#53B878';
              return (
                <View
                  key={dish.name}
                  className={`rounded-2xl border px-3 py-2.5 ${
                    isTopDish
                      ? 'border-[#CFE9D7] bg-[#F5FBF6]'
                      : 'border-[#EDF1EE] bg-[#FCFDFC]'
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-xl ${
                        isTopDish ? 'bg-[#DDF2E3]' : 'bg-[#F0F4F1]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold ${
                          isTopDish ? 'text-[#14764A]' : 'text-[#68766D]'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="mb-1.5 flex-row items-center justify-between gap-2">
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-[11px] font-bold text-[#33443A]"
                        >
                          {dish.name}
                        </Text>
                        <Text className="text-[10px] font-extrabold text-[#123B2D]">
                          {dish.quantity} ordered
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-[#E9EFEB]">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${(dish.quantity / topDishes[0].quantity) * 100}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="py-7 text-center text-xs text-[#6B7280]">
            No dishes are available in kitchen orders yet.
          </Text>
        )}
      </View>

      <View className="mb-3 rounded-[22px] border border-[#E5EDE7] bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E8F5EC]">
              <OrdersIcon color="#14764A" size={21} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-extrabold text-[#123B2D]">
                Recent Kitchen Orders
              </Text>
              <Text className="mt-0.5 text-[10px] text-[#6B7280]">
                {orderCounts.today} orders received today
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setActiveTab('orders');
              setSelectedMorePage(null);
              setSelectedOrderPage('kitchen');
            }}
            className="rounded-full border border-[#D8E8DC] bg-[#F5FAF6] px-3 py-2"
          >
            <Text className="text-[10px] font-extrabold text-[#14764A]">
              All orders {'>'}
            </Text>
          </Pressable>
        </View>
        {orders.length ? (
          <View className="gap-2">
            {orders.slice(0, 6).map((order, index) => {
              const items = Array.isArray(order.items)
                ? order.items.filter(isRecord)
                : [];
              const itemSummary = items
                .map(
                  item =>
                    `${text(item.food_name, 'Item')} x ${text(item.quantity, '1')}`,
                )
                .join(', ');
              const status = text(order.status, 'Pending');
              const statusStyle =
                status.toLowerCase() === 'preparing'
                  ? 'bg-[#FFF0F0] text-[#B93838]'
                  : status.toLowerCase() === 'ready to serve'
                    ? 'bg-[#EDF7FF] text-[#1768AE]'
                    : status.toLowerCase() === 'served'
                      ? 'bg-[#E8F8EF] text-[#08794A]'
                      : status.toLowerCase() === 'cancelled'
                        ? 'bg-[#FFF0F0] text-[#B93838]'
                        : 'bg-[#FFF5DE] text-[#9A6200]';
              return (
                <View
                  key={text(order.order_id ?? order.id, String(index))}
                  className="rounded-2xl border border-[#E9EFEB] bg-[#FCFDFC] p-3"
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="min-w-0 flex-1 flex-row items-center gap-2">
                      <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#E8F5EC]">
                        <Text className="text-[10px] font-extrabold text-[#14764A]">
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-xs font-extrabold text-[#123B2D]">
                          Order {text(order.order_id ?? order.id, `#${index + 1}`)}
                        </Text>
                        <Text numberOfLines={1} className="mt-0.5 text-[9px] text-[#76827B]">
                          Table {text(order.table_number ?? order.table_id)}
                          {order.created_at
                            ? ` · ${formatTime(order.created_at)}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                    <Text className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${statusStyle}`}>
                      {status}
                    </Text>
                  </View>
                  <Text numberOfLines={2} className="ml-10 mt-2 text-[10px] leading-4 text-[#58665E]">
                    {itemSummary || 'No items'}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="py-6">
            <EmptyState message="No kitchen orders yet. New server orders will appear here." />
          </View>
        )}
      </View>
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
      onFoodAvailabilityChange={(foodId, updates) => {
        setFoods(current =>
          current.map(food =>
            food.food_id === foodId
              ? { ...food, ...updates }
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
      <ChefStatCards
        isLoading={isLoading}
        stats={[
          {
            label: 'Total requests',
            value: requests.length,
            hint: 'Kitchen supply requests',
            icon: <OrdersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Pending',
            value: requests.filter(
              request => text(request.status, 'Pending').toLowerCase() === 'pending',
            ).length,
            hint: 'Awaiting review',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Approved',
            value: requests.filter(
              request => text(request.status, '').toLowerCase() === 'approved',
            ).length,
            hint: 'Approved for fulfillment',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Rejected',
            value: requests.filter(
              request => text(request.status, '').toLowerCase() === 'rejected',
            ).length,
            hint: 'Not approved',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
        ]}
      />
      <ChefListControls
        filters={[
          {
            label: 'Status',
            value: inventoryStatusFilter,
            options: [
              { value: 'all', label: 'All statuses' },
              ...inventoryStatuses.map(status => ({
                value: status.toLowerCase(),
                label: status,
              })),
            ],
            onChange: setInventoryStatusFilter,
          },
        ]}
        onSearchChange={setInventorySearch}
        onViewModeChange={setInventoryViewMode}
        placeholder="Search request, requester, or product..."
        search={inventorySearch}
        searchLabel="Search inventory requests"
        sort={{
          value: inventorySort,
          options: [
            { value: 'latest', label: 'Latest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'name', label: 'Product name A-Z' },
          ],
          onChange: value => {
            if (
              value === 'latest' ||
              value === 'oldest' ||
              value === 'name'
            ) {
              setInventorySort(value);
            }
          },
        }}
        viewMode={inventoryViewMode}
      />
      {filteredRequests.length ? (
        <View
          className={`mt-3 ${
            inventoryViewMode === 'grid'
              ? 'flex-row flex-wrap justify-between gap-y-3'
              : 'gap-3'
          }`}
        >
          {filteredRequests.map((request, index) => {
            const firstItem = firstRequestItem(request);
            return (
              <Card
                key={text(request.id ?? request.request_number, String(index))}
                className={
                  inventoryViewMode === 'grid' ? 'w-[48%]' : 'w-full'
                }
              >
                <Text className="text-sm font-bold text-[#012711]">
                  {text(request.request_number, `Request ${index + 1}`)}
                </Text>
                <Text className="mt-1.5 text-xs text-[#6B7280]">
                  {firstItem
                    ? text(firstItem.product_name, 'Kitchen supplies')
                    : 'Kitchen supplies'}
                  {firstItem
                    ? ` · ${text(firstItem.quantity)} ${text(firstItem.unit, '')}`
                    : ''}
                </Text>
                <Text className="mt-2 text-xs font-bold text-[#116C0B]">
                  {text(request.status, 'Pending')}
                </Text>
              </Card>
            );
          })}
        </View>
      ) : (
        <View className="mt-3">
          <EmptyState
            message={
              requests.length
                ? 'No inventory requests match these filters.'
                : 'You have no inventory requests yet.'
            }
          />
        </View>
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
  } else if (activeTab === 'more' && selectedMorePage === 'profile') {
    pageContent = <ChefProfileScreen user={user} />;
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
              : selectedMorePage === 'stock'
                ? 'Stock Details'
                : 'Chef Profile'}
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
          activeTitle={
            activeTab === 'more' && selectedMorePage === 'profile'
              ? 'Profile'
              : pageTitles[activeTab]
          }
          onLogout={onLogout}
          onOpenProfile={() => {
            setActiveTab('more');
            setSelectedOrderPage(null);
            setSelectedMorePage('profile');
          }}
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
