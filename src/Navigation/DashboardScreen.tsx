import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import colors from '../theme/colors';
import {
  BellIcon,
  ChartIcon,
  CustomersIcon,
  HomeIcon,
  MenuIcon,
  MoreIcon,
  OrdersIcon,
  PaymentIcon,
  PlusIcon,
  ProductIcon,
  ReceiptIcon,
} from './NavigationIcons';
import TopHeader, { type HeaderUser } from './TopHeader';
import Bottombar, { type BottomBarTab } from './Bottombar';
import BannerManagementPage from '../Tabs/BannerManagement';
import api from '../../api';

type DashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type AppTab = 'home' | 'billing' | 'add' | 'orders' | 'more';
type QuickActionId =
  | 'invoice'
  | 'order'
  | 'customer'
  | 'product'
  | 'payment'
  | 'expense'
  | 'purchase'
  | 'stock';

type LocalRecord = {
  id: number;
  action: QuickActionId;
  name: string;
  amount?: number;
  createdAt: string;
  status?: 'Pending' | 'Completed' | 'Cancelled';
};

type ApiOrder = {
  order_id?: string | number;
  order_number?: string | number;
  id?: string | number;
  order_date?: string;
  created_at?: string;
  total_amount?: number | string;
  order_status?: string;
  customer_name?: string;
  order_type?: string;
  items?: ApiOrderItem[];
  payment_method?: string;
};

type ApiOrderItem = {
  food_id?: string | number;
  food_name?: string;
  product_name?: string;
  quantity?: number | string;
  total_price?: number | string;
  unit_price?: number | string;
};

type ApiBill = {
  bill_id?: string | number;
  bill_number?: string | number;
  table_number?: string | number;
  server_name?: string;
  status?: string;
  grand_total?: number | string;
  created_at?: string;
};

type ApiKitchenTicket = {
  bill_id?: string | number;
  status?: string;
  items?: ApiOrderItem[];
};

type ApiUser = {
  role?: string;
};

type ApiCatalogItem = {
  food_id?: string | number;
  product_name?: string;
  productName?: string;
  name?: string;
  food_name?: string;
  food_images?: unknown;
  is_menu_visible?: boolean | number;
  status?: string;
  category?: string;
  category_id?: string | number;
  category_name?: string;
  sub_category?: string;
  size_variants?: unknown;
  variants?: unknown;
  stock_quantity?: number | string;
  current_stock?: number | string;
  stock?: number | string;
  category_image?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiInventorySummary = {
  lowStock?: number;
  pendingKitchenRequests?: number;
};

type ApiKitchenRequest = {
  status?: string;
};

type ApiCategory = {
  category_id?: string | number;
  category_name?: string;
  category_image?: string;
  status?: string;
};

type ApiRevenueSummary = {
  totalRevenue?: number | string;
};

type ApiRevenueTrend = {
  date?: string;
  label?: string;
  revenue?: number | string;
  orders?: number | string;
};

type ApiRevenueStatus = {
  status?: string;
  count?: number | string;
};

type DashboardData = {
  orders: ApiOrder[];
  bills: ApiBill[];
  kitchenOrders: ApiKitchenTicket[];
  users: ApiUser[];
  foods: ApiCatalogItem[];
  inventory: ApiInventorySummary;
  kitchenRequests: ApiKitchenRequest[];
  kitchenRequestsLoaded: boolean;
  categories: ApiCategory[];
};

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | null;
      bills?: T[] | null;
      orders?: T[] | null;
    };

type DashboardDateFilter =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'lastWeek'
  | 'month'
  | 'lastMonth'
  | 'year'
  | 'lastYear'
  | 'all'
  | 'custom';

type DashboardReport = {
  summary: ApiRevenueSummary | null;
  trend: ApiRevenueTrend[];
  statuses: ApiRevenueStatus[];
};

type QuickAction = {
  id: QuickActionId;
  label: string;
  description: string;
  placeholder: string;
  amountLabel?: string;
  amountPlaceholder?: string;
  icon: typeof ReceiptIcon;
};

const quickActions: QuickAction[] = [
  {
    id: 'invoice',
    label: 'Create Invoice',
    description: 'Start a new customer invoice.',
    placeholder: 'Customer or invoice name',
    amountLabel: 'Invoice total',
    amountPlaceholder: '0.00',
    icon: ReceiptIcon,
  },
  {
    id: 'order',
    label: 'Add Order',
    description: 'Add an order to your order list.',
    placeholder: 'Order or customer name',
    amountLabel: 'Order total',
    amountPlaceholder: '0.00',
    icon: OrdersIcon,
  },
  {
    id: 'customer',
    label: 'Add Customer',
    description: 'Save a customer to your customer list.',
    placeholder: 'Customer name',
    icon: CustomersIcon,
  },
  {
    id: 'product',
    label: 'Add Product',
    description: 'Add a product to your inventory.',
    placeholder: 'Product name',
    icon: ProductIcon,
  },
  {
    id: 'payment',
    label: 'Record Payment',
    description: 'Record a payment received.',
    placeholder: 'Payment note or customer',
    amountLabel: 'Payment amount',
    amountPlaceholder: '0.00',
    icon: PaymentIcon,
  },
  {
    id: 'expense',
    label: 'Add Expense',
    description: 'Record a business expense.',
    placeholder: 'Expense description',
    amountLabel: 'Expense amount',
    amountPlaceholder: '0.00',
    icon: ChartIcon,
  },
  {
    id: 'purchase',
    label: 'Create Purchase',
    description: 'Record a supplier purchase.',
    placeholder: 'Supplier or purchase name',
    amountLabel: 'Purchase total',
    amountPlaceholder: '0.00',
    icon: MenuIcon,
  },
  {
    id: 'stock',
    label: 'Add Stock',
    description: 'Record a stock update.',
    placeholder: 'Product name',
    icon: ProductIcon,
  },
];

const dashboardPeriods: { value: DashboardDateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'all', label: 'All dates' },
  { value: 'custom', label: 'Custom' },
];

const moreFeatures: {
  title: string;
  subtitle: string;
  icon: typeof ProductIcon;
  action?: QuickActionId;
}[] = [
  { title: 'Banner Management', subtitle: 'Create and manage website banners', icon: ProductIcon },
];

function DashboardScreen({ user, onLogout }: DashboardScreenProps) {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickActionId | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [logoutError, setLogoutError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    orders: [],
    bills: [],
    kitchenOrders: [],
    users: [],
    foods: [],
    inventory: {},
    kitchenRequests: [],
    kitchenRequestsLoaded: false,
    categories: [],
  });
  const [dashboardReport, setDashboardReport] = useState<DashboardReport>({
    summary: null,
    trend: [],
    statuses: [],
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [reportError, setReportError] = useState('');
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const isWide = width >= 768;

  const userName =
    user?.name?.trim() || user?.username?.trim() || 'Restaurant Admin';
  const userEmail = user?.email?.trim() || 'No email on file';
  const userInitial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.username?.trim().charAt(0).toUpperCase() ||
    'U';

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadDashboard = async () => {
      setIsDashboardLoading(true);
      setDashboardError('');
      const endpoints = [
        { key: 'orders', path: '/orders/management' },
        { key: 'bills', path: '/table-bills' },
        { key: 'kitchenOrders', path: '/kitchen-orders' },
        { key: 'users', path: '/users' },
        { key: 'foods', path: '/foods' },
        { key: 'inventory', path: '/inventory/dashboard' },
        { key: 'kitchenRequests', path: '/inventory/kitchen-requests' },
        { key: 'categories', path: '/categories' },
      ] as const;

      const results = await Promise.allSettled(
        endpoints.map(endpoint =>
          api.get(endpoint.path, { signal: controller.signal }),
        ),
      );
      if (!isActive || controller.signal.aborted) {
        return;
      }

      const failedEndpoints: string[] = [];
      const nextData: Partial<DashboardData> = {};
      results.forEach((result, index) => {
        const endpoint = endpoints[index];
        if (result.status === 'fulfilled') {
          switch (endpoint.key) {
            case 'orders':
              nextData.orders = readResponseRows<ApiOrder>(
                result.value.data as ApiListResponse<ApiOrder>,
              );
              break;
            case 'bills':
              nextData.bills = readResponsePropertyRows<ApiBill>(
                result.value.data,
                'bills',
              );
              break;
            case 'kitchenOrders':
              nextData.kitchenOrders = readResponsePropertyRows<ApiKitchenTicket>(
                result.value.data,
                'orders',
              );
              break;
            case 'users':
              nextData.users = readResponseRows<ApiUser>(
                result.value.data as ApiListResponse<ApiUser>,
              );
              break;
            case 'foods':
              nextData.foods = readResponseRows<ApiCatalogItem>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              break;
            case 'inventory':
              nextData.inventory = readResponseObject<ApiInventorySummary>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              break;
            case 'kitchenRequests':
              nextData.kitchenRequests = readResponseRows<ApiKitchenRequest>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              nextData.kitchenRequestsLoaded = true;
              break;
            case 'categories':
              nextData.categories = readResponseRows<ApiCategory>(
                result.value.data as ApiListResponse<ApiCategory>,
              );
              break;
          }
        } else {
          failedEndpoints.push(endpoint.path);
        }
      });
      setDashboardData(current => ({ ...current, ...nextData }));

      if (failedEndpoints.length) {
        const failedNames = failedEndpoints.join(', ');
        const firstError = results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        )?.reason;
        setDashboardError(
          `Could not load ${failedNames}. ${getErrorMessage(firstError)}`,
        );
      }
      setIsDashboardLoading(false);
    };

    void loadDashboard();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [dashboardRefresh]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    setReportError('');
    if (dateFilter === 'custom' && !isValidDateRange(customFrom, customTo)) {
      setIsReportLoading(false);
      return () => {
        isActive = false;
      };
    }
    setIsReportLoading(true);
    const params = {
      range: dateFilter,
      ...(dateFilter === 'custom'
        ? { startDate: customFrom, endDate: customTo }
        : {}),
    };
    const trend = dateFilter === 'year' || dateFilter === 'lastYear' ? 'year' : 'month';

    Promise.allSettled([
      api.get('/revenue/summary', { params, signal: controller.signal }),
      api.get('/revenue/trend', {
        params: { ...params, trend, dateBasis: 'delivered' },
        signal: controller.signal,
      }),
      api.get('/revenue/status', { params, signal: controller.signal }),
    ]).then(results => {
      if (!isActive) {
        return;
      }
      const [summaryResult, trendResult, statusResult] = results;
      setDashboardReport(current => ({
        summary:
          summaryResult.status === 'fulfilled'
            ? readResponseObject<ApiRevenueSummary>(summaryResult.value.data)
            : current.summary,
        trend:
          trendResult.status === 'fulfilled'
            ? readResponseRows<ApiRevenueTrend>(trendResult.value.data)
            : current.trend,
        statuses:
          statusResult.status === 'fulfilled'
            ? readResponseRows<ApiRevenueStatus>(statusResult.value.data)
            : current.statuses,
      }));
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length) {
        setReportError(
          `Some revenue report data could not be loaded. ${getErrorMessage(
            failures[0].status === 'rejected' ? failures[0].reason : null,
          )}`,
        );
      }
      setIsReportLoading(false);
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [dateFilter, customFrom, customTo, dashboardRefresh]);

  const navigateToTab = (tab: AppTab) => {
    setActiveTab(tab);
    setSelectedAction(null);
    setSelectedFeature(null);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const navigateToAction = (action: QuickActionId) => {
    setSelectedAction(action);
    setSelectedFeature(null);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleSaveAction = (name: string, amount?: number) => {
    if (!selectedAction) {
      return;
    }
    setRecords(current => [
      {
        id: Date.now(),
        action: selectedAction,
        name: name.trim(),
        amount,
        createdAt: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
        status: selectedAction === 'order' ? 'Pending' : undefined,
      },
      ...current,
    ]);
    setSelectedAction(null);
    if (selectedAction === 'invoice') {
      setActiveTab('billing');
    } else if (selectedAction === 'order') {
      setActiveTab('orders');
    } else {
      setActiveTab('more');
      setSelectedFeature(
        selectedAction === 'customer'
          ? 'Customers'
          : selectedAction === 'product' || selectedAction === 'stock'
            ? 'Products & Inventory'
            : selectedAction === 'purchase'
              ? 'Suppliers & Purchases'
              : 'Payments & Expenses',
      );
    }
  };

  const updateOrderStatus = (
    orderId: number,
    status: NonNullable<LocalRecord['status']>,
  ) => {
    setRecords(current =>
      current.map(record =>
        record.id === orderId ? { ...record, status } : record,
      ),
    );
  };

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await onLogout();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : 'Unable to log out. Please try again.',
      );
    }
  };

  const invoices = records.filter(record => record.action === 'invoice');
  const orders = records.filter(record => record.action === 'order');
  const selectedActionDetails = quickActions.find(
    action => action.id === selectedAction,
  );
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 bg-[#F9FAFB]"
    >
      <TopHeader
        user={user}
        unreadNotifications={0}
        onToggleSidebar={() => {
          setIsNotificationsOpen(false);
          setIsSidebarOpen(open => !open);
        }}
        onOpenNotifications={() => {
          setIsSidebarOpen(false);
          setIsNotificationsOpen(open => !open);
        }}
        onOpenProfile={() => {
          setSelectedAction(null);
          setSelectedFeature('Profile');
          setActiveTab('more');
        }}
        onLogout={handleLogout}
      />

      {isWide && isSidebarOpen ? (
        <View className="flex-1 flex-row">
          <Sidebar
            onClose={() => setIsSidebarOpen(false)}
            onNavigate={tab => {
              navigateToTab(tab);
              setIsSidebarOpen(false);
            }}
          />
          <View className="flex-1">
            <MainContent
              activeTab={activeTab}
              invoices={invoices}
              orders={orders}
              records={records}
              dashboardData={dashboardData}
              dashboardReport={dashboardReport}
              dashboardError={[dashboardError, reportError].filter(Boolean).join(' ')}
              isDashboardLoading={isDashboardLoading}
              isReportLoading={isReportLoading}
              dateFilter={dateFilter}
              customFrom={customFrom}
              customTo={customTo}
              selectedAction={selectedActionDetails}
              selectedFeature={selectedFeature}
              userEmail={userEmail}
              userInitial={userInitial}
              userName={userName}
              onSelectAction={navigateToAction}
              onSelectFeature={setSelectedFeature}
              onUpdateOrderStatus={updateOrderStatus}
              onRefreshDashboard={() => setDashboardRefresh(count => count + 1)}
              onSetDateFilter={setDateFilter}
              onSetCustomFrom={setCustomFrom}
              onSetCustomTo={setCustomTo}
            />
          </View>
        </View>
      ) : (
        <View className="flex-1">
          {logoutError ? (
            <Text
              accessibilityRole="alert"
              className="bg-[#FEF2F2] px-5 py-3 text-[#DC2626]"
            >
              {logoutError}
            </Text>
          ) : null}
          <MainContent
            activeTab={activeTab}
            invoices={invoices}
            orders={orders}
            records={records}
            dashboardData={dashboardData}
            dashboardReport={dashboardReport}
            dashboardError={[dashboardError, reportError].filter(Boolean).join(' ')}
            isDashboardLoading={isDashboardLoading}
            isReportLoading={isReportLoading}
            dateFilter={dateFilter}
            customFrom={customFrom}
            customTo={customTo}
            selectedAction={selectedActionDetails}
            selectedFeature={selectedFeature}
            userEmail={userEmail}
            userInitial={userInitial}
            userName={userName}
            onSelectAction={navigateToAction}
            onSelectFeature={setSelectedFeature}
            onUpdateOrderStatus={updateOrderStatus}
            onRefreshDashboard={() => setDashboardRefresh(count => count + 1)}
            onSetDateFilter={setDateFilter}
            onSetCustomFrom={setCustomFrom}
            onSetCustomTo={setCustomTo}
          />
        </View>
      )}

      <BottomNavigation
        activeTab={activeTab}
        onPressTab={navigateToTab}
      />

      {!isWide && isSidebarOpen ? (
        <View className="absolute bottom-0 left-0 right-0 top-0 z-[30]">
          <Pressable
            accessibilityLabel="Close sidebar"
            onPress={() => setIsSidebarOpen(false)}
            className="absolute bottom-0 left-0 right-0 top-0 z-0 bg-[#11182766]"
          />
          <View
            className="absolute bottom-0 left-0 right-0 top-0 z-[1] w-full bg-white"
            style={{ elevation: 12 }}
          >
            <Sidebar
              fullWidth
              onClose={() => setIsSidebarOpen(false)}
              onNavigate={tab => {
                navigateToTab(tab);
                setIsSidebarOpen(false);
              }}
            />
          </View>
        </View>
      ) : null}

      {isNotificationsOpen ? (
        <View className="absolute bottom-0 left-0 right-0 top-[72px] z-[25]">
          <Pressable
            accessibilityLabel="Close notifications"
            onPress={() => setIsNotificationsOpen(false)}
            className="absolute bottom-0 left-0 right-0 top-0 bg-[#11182733]"
          />
          <View
            className={`mt-2 w-[320px] max-w-[92%] self-end rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl ${width < 480 ? 'mx-3' : 'mx-6'}`}
            style={{ elevation: 10 }}
          >
            <View className="flex-row items-center gap-2.5">
              <BellIcon color={colors.textPrimary} size={19} />
              <Text className="text-base font-bold text-[#012711]">
                Notifications
              </Text>
            </View>
            <Text className="mt-2 text-[13px] leading-5 text-[#6B7280]">
              You’re all caught up. New notifications will appear here.
            </Text>
          </View>
        </View>
      ) : null}

      {selectedActionDetails ? (
        <Modal
          animationType="slide"
          onRequestClose={() => setSelectedAction(null)}
          transparent
          visible
        >
          <EntryForm
            action={selectedActionDetails}
            onCancel={() => setSelectedAction(null)}
            onSave={handleSaveAction}
          />
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function getRecordTimestamp(value?: string) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getOrderDate(order: { order_date?: string; created_at?: string }) {
  const value = order.order_date || order.created_at;
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function filterOrdersByPeriod<T extends { order_date?: string; created_at?: string }>(
  orders: T[],
  filter: DashboardDateFilter,
  customFrom = '',
  customTo = '',
) {
  if (filter === 'all') {
    return orders;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (date: Date, days: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  let start = today;
  let end = shift(today, 1);
  if (filter === 'custom') {
    if (!isValidDateRange(customFrom, customTo)) {
      return [];
    }
    start = new Date(`${customFrom}T00:00:00`);
    end = shift(new Date(`${customTo}T00:00:00`), 1);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return [];
    }
  } else {
    switch (filter) {
      case 'yesterday':
        start = shift(today, -1);
        end = today;
        break;
      case 'week':
        start = shift(today, -((today.getDay() + 6) % 7));
        break;
      case 'lastWeek':
        end = shift(today, -((today.getDay() + 6) % 7));
        start = shift(end, -7);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear(), 0, 1);
        break;
    }
  }
  return orders.filter(order => {
    const date = getOrderDate(order);
    return date !== null && date >= start && date < end;
  });
}

function isValidDateRange(from: string, to: string) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(from) || !datePattern.test(to)) {
    return false;
  }
  const makeDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? date
      : null;
  };
  const start = makeDate(from);
  const end = makeDate(to);
  return (
    start !== null &&
    end !== null &&
    end >= start
  );
}

function getDateFilterLabel(filter: DashboardDateFilter) {
  switch (filter) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'week':
      return 'This week';
    case 'lastWeek':
      return 'Last week';
    case 'month':
      return 'This month';
    case 'lastMonth':
      return 'Last month';
    case 'year':
      return 'This year';
    case 'lastYear':
      return 'Last year';
    case 'all':
      return 'All time';
    case 'custom':
      return 'Custom range';
  }
}

function getItemStock(item: ApiCatalogItem) {
  const variantsValue = item.size_variants ?? item.variants;
  let variants: unknown[] = [];
  if (Array.isArray(variantsValue)) {
    variants = variantsValue;
  } else if (typeof variantsValue === 'string') {
    try {
      const parsed: unknown = JSON.parse(variantsValue);
      variants = Array.isArray(parsed) ? parsed : [];
    } catch {
      variants = [];
    }
  }
  if (variants.length) {
    let total = 0;
    for (const variant of variants) {
      if (typeof variant !== 'object' || variant === null || !('stock' in variant)) {
        continue;
      }
      const stock = variant.stock;
      total += Number(stock || 0);
    }
    return total;
  }
  return Number(item.current_stock ?? item.stock_quantity ?? 0) || 0;
}

function readResponseRows<T>(payload: ApiListResponse<T> | unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const rows = payload.data;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function readResponsePropertyRows<T>(
  payload: unknown,
  property: 'bills' | 'orders',
): T[] {
  if (typeof payload !== 'object' || payload === null) {
    return [];
  }
  const data = 'data' in payload ? payload.data : payload;
  if (typeof data !== 'object' || data === null || !(property in data)) {
    return [];
  }
  const rows = (data as Record<string, unknown>)[property];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function readResponseObject<T>(payload: unknown): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    typeof payload.data === 'object' &&
    payload.data !== null
  ) {
    return payload.data as T;
  }
  return {} as T;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Check your connection and try again.';
}

function MainContent({
  activeTab,
  invoices,
  orders,
  records,
  dashboardData,
  dashboardReport,
  dashboardError,
  isDashboardLoading,
  isReportLoading,
  dateFilter,
  customFrom,
  customTo,
  selectedAction,
  selectedFeature,
  userEmail,
  userInitial,
  userName,
  onSelectAction,
  onSelectFeature,
  onUpdateOrderStatus,
  onRefreshDashboard,
  onSetDateFilter,
  onSetCustomFrom,
  onSetCustomTo,
}: {
  activeTab: AppTab;
  invoices: LocalRecord[];
  orders: LocalRecord[];
  records: LocalRecord[];
  dashboardData: DashboardData;
  dashboardReport: DashboardReport;
  dashboardError: string;
  isDashboardLoading: boolean;
  isReportLoading: boolean;
  dateFilter: DashboardDateFilter;
  customFrom: string;
  customTo: string;
  selectedAction?: QuickAction;
  selectedFeature: string | null;
  userEmail: string;
  userInitial: string;
  userName: string;
  onSelectAction: (action: QuickActionId) => void;
  onSelectFeature: (feature: string | null) => void;
  onUpdateOrderStatus: (
    orderId: number,
    status: NonNullable<LocalRecord['status']>,
  ) => void;
  onRefreshDashboard: () => void;
  onSetDateFilter: (filter: DashboardDateFilter) => void;
  onSetCustomFrom: (date: string) => void;
  onSetCustomTo: (date: string) => void;
}) {
  if (selectedAction) {
    return (
      <PageShell title={selectedAction.label} subtitle={selectedAction.description}>
        <Text className="text-sm text-[#6B7280]">
          Complete the form to add this item.
        </Text>
      </PageShell>
    );
  }

  if (selectedFeature) {
    if (selectedFeature === 'Banner Management') {
      return <BannerManagementPage onBack={() => onSelectFeature(null)} />;
    }
    if (selectedFeature === 'Profile') {
      return (
        <PageShell title="Profile" subtitle="Your account details">
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
            <Avatar initial={userInitial} size={56} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-[#012711]">{userName}</Text>
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">{userEmail}</Text>
            </View>
          </View>
        </PageShell>
      );
    }
    const feature = moreFeatures.find(item => item.title === selectedFeature);
    const relatedAction = feature?.action;
    return (
      <PageShell
        title={selectedFeature}
        subtitle={feature?.subtitle || 'Business tools and account options'}
      >
        {relatedAction ? (
          <Pressable
            accessibilityLabel={
              quickActions.find(action => action.id === relatedAction)?.label
            }
            accessibilityRole="button"
            onPress={() => onSelectAction(relatedAction)}
              className="flex-row items-center gap-2 rounded-xl bg-[#116C0B] px-[15px] py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <PlusIcon color={colors.surface} size={18} />
            <Text className="text-[13px] font-bold text-white">
              {quickActions.find(action => action.id === relatedAction)?.label}
            </Text>
          </Pressable>
        ) : null}
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
          <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
            {feature
              ? `You’re viewing ${selectedFeature}. Connect your business data to start using this section.`
              : 'Manage your account details and preferences.'}
          </Text>
        </View>
        <TextButton label="Back to More" onPress={() => onSelectFeature(null)} />
      </PageShell>
    );
  }

  if (activeTab === 'billing') {
    return <BillingPage invoices={invoices} onCreateInvoice={() => onSelectAction('invoice')} />;
  }
  if (activeTab === 'orders') {
    return (
      <OrdersPage
        orders={orders}
        onAddOrder={() => onSelectAction('order')}
        onUpdateOrderStatus={onUpdateOrderStatus}
      />
    );
  }
  if (activeTab === 'add') {
    return <AddItemsPage onSelectAction={onSelectAction} />;
  }
  if (activeTab === 'more') {
    return <MorePage onSelectFeature={onSelectFeature} />;
  }
  return (
    <HomePage
      apiData={dashboardData}
      report={dashboardReport}
      dateFilter={dateFilter}
      customFrom={customFrom}
      customTo={customTo}
      error={dashboardError}
      isLoading={isDashboardLoading}
      isReportLoading={isReportLoading}
      records={records}
      userName={userName}
      onRefresh={onRefreshDashboard}
      onSetDateFilter={onSetDateFilter}
      onSetCustomFrom={onSetCustomFrom}
      onSetCustomTo={onSetCustomTo}
    />
  );
}

function AddItemsPage({
  onSelectAction,
}: {
  onSelectAction: (action: QuickActionId) => void;
}) {
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">QUICK ENTRY</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Add items</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Choose what you would like to add to your restaurant.
      </Text>
      <View className="mt-[22px] gap-3">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              key={action.id}
              onPress={() => onSelectAction(action.id)}
              className="min-h-[76px] flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3.5 py-3.5"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F3F7FF' : colors.surface,
              })}
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
                <Icon color={colors.primary} size={21} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#012711]">{action.label}</Text>
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{action.description}</Text>
              </View>
              <PlusIcon color={colors.primary} size={18} />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function HomePage({
  apiData,
  report,
  dateFilter,
  customFrom,
  customTo,
  error,
  isLoading,
  isReportLoading,
  records,
  userName,
  onRefresh,
  onSetDateFilter,
  onSetCustomFrom,
  onSetCustomTo,
}: {
  apiData: DashboardData;
  report: DashboardReport;
  dateFilter: DashboardDateFilter;
  customFrom: string;
  customTo: string;
  error: string;
  isLoading: boolean;
  isReportLoading: boolean;
  records: LocalRecord[];
  userName: string;
  onRefresh: () => void;
  onSetDateFilter: (filter: DashboardDateFilter) => void;
  onSetCustomFrom: (date: string) => void;
  onSetCustomTo: (date: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const summaryCardBasis =
    screenWidth >= 1100 ? '23%' : screenWidth < 360 ? '100%' : '48%';
  const filteredOrders = filterOrdersByPeriod(
    apiData.orders,
    dateFilter,
    customFrom,
    customTo,
  );
  const filteredBills = filterOrdersByPeriod(
    apiData.bills,
    dateFilter,
    customFrom,
    customTo,
  );
  const todayOrders = filterOrdersByPeriod(apiData.orders, 'today');
  const todayBills = filterOrdersByPeriod(apiData.bills, 'today');
  const apiRevenue =
    filteredOrders
      .filter(order =>
        ['delivered', 'completed', 'served'].includes(
          String(order.order_status || '').trim().toLowerCase(),
        ),
      )
      .reduce((total, order) => total + Number(order.total_amount || 0), 0) +
    filteredBills
      .filter(bill => String(bill.status || '').trim().toLowerCase() === 'paid')
      .reduce((total, bill) => total + Number(bill.grand_total || 0), 0);
  const localRevenue = records
    .filter(record => record.action === 'invoice')
    .reduce((total, record) => total + (record.amount || 0), 0);
  const sales = Number(report.summary?.totalRevenue ?? apiRevenue + localRevenue);
  const localOrders = records.filter(record => record.action === 'order');
  const reportOrderCount = report.statuses.reduce(
    (total, status) => total + Number(status.count || 0),
    0,
  );
  const orderCount =
    (report.statuses.length
      ? reportOrderCount
      : filteredOrders.length + filteredBills.length) + localOrders.length;
  const customerCount = apiData.users.filter(
    user => ['user', 'customer'].includes(String(user.role || '').trim().toLowerCase()),
  ).length;
  const catalogItems = apiData.foods;
  const lowStockItems = catalogItems.filter(
    (item: ApiCatalogItem) => getItemStock(item) <= 15,
  );
  const lowStockCount = Number(apiData.inventory.lowStock ?? lowStockItems.length);
  const todayRevenue =
    todayOrders
      .filter(order =>
        ['delivered', 'completed', 'served'].includes(
          String(order.order_status || '').trim().toLowerCase(),
        ),
      )
      .reduce((total, order) => total + Number(order.total_amount || 0), 0) +
    todayBills
      .filter(bill => String(bill.status || '').trim().toLowerCase() === 'paid')
      .reduce((total, bill) => total + Number(bill.grand_total || 0), 0);
  const todayOrderCount = todayOrders.length + todayBills.length;
  const pendingOrderCount = report.statuses.length
    ? report.statuses
        .filter(status =>
          ['pending', 'placed', 'preparing', 'ready'].includes(
            String(status.status || '').trim().toLowerCase(),
          ),
        )
        .reduce((total, status) => total + Number(status.count || 0), 0)
    : filteredOrders.filter(order =>
        ['pending', 'placed', 'confirmed', 'preparing', 'processing', 'ready'].includes(
          String(order.order_status || '').trim().toLowerCase(),
        ),
      ).length;
  const completedOrderCount = report.statuses.length
    ? report.statuses
        .filter(status =>
          ['delivered', 'completed', 'served'].includes(
            String(status.status || '').trim().toLowerCase(),
          ),
        )
        .reduce((total, status) => total + Number(status.count || 0), 0)
    : filteredOrders.filter(order =>
        ['delivered', 'completed', 'served'].includes(
          String(order.order_status || '').trim().toLowerCase(),
        ),
      ).length;
  const kitchenTicketsByBill = new Map<string, ApiKitchenTicket[]>();
  apiData.kitchenOrders.forEach(ticket => {
    if (!ticket.bill_id) {
      return;
    }
    const billId = String(ticket.bill_id);
    kitchenTicketsByBill.set(billId, [
      ...(kitchenTicketsByBill.get(billId) || []),
      ticket,
    ]);
  });
  const topItems = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  const addTopItem = (item: ApiOrderItem) => {
    const id = String(item.food_id || item.food_name || item.product_name || 'item');
    const name = item.food_name || item.product_name || 'Menu item';
    const quantity = Number(item.quantity || 0);
    const revenue = Number(
      item.total_price ?? quantity * Number(item.unit_price || 0),
    );
    const current = topItems.get(id) || { name, quantity: 0, revenue: 0 };
    current.quantity += quantity;
    current.revenue += revenue;
    topItems.set(id, current);
  };
  filteredOrders
    .filter(order => String(order.order_status || '').toLowerCase() === 'delivered')
    .forEach(order => (order.items || []).forEach(addTopItem));
  filteredBills
    .filter(bill => String(bill.status || '').toLowerCase() === 'paid')
    .forEach(bill => {
      const tickets = kitchenTicketsByBill.get(String(bill.bill_id || '')) || [];
      if (
        tickets.length &&
        tickets.every(ticket =>
          ['served', 'delivered'].includes(String(ticket.status || '').toLowerCase()),
        )
      ) {
        tickets.forEach(ticket => (ticket.items || []).forEach(addTopItem));
      }
    });
  const topSellingItems = [...topItems.entries()]
    .map(([id, item]) => ({ id, ...item }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);
  const recentApiOrders = [...filteredOrders]
    .sort(
      (a, b) =>
        getRecordTimestamp(b.order_date || b.created_at) -
        getRecordTimestamp(a.order_date || a.created_at),
    )
    .slice(0, 5);
  const hasAnyData =
    apiData.orders.length > 0 ||
    apiData.users.length > 0 ||
    apiData.foods.length > 0 ||
    apiData.bills.length > 0 ||
    apiData.kitchenOrders.length > 0 ||
    records.length > 0;
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1440px] px-5 pb-6 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">OVERVIEW</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Good day, {userName}</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Here’s your restaurant at a glance.</Text>

      <View className="mt-[18px] flex-row flex-wrap items-center justify-between gap-y-2.5">
        <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">Store performance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-1.5">
          {dashboardPeriods.map(({ value: filter, label }) => (
            <Pressable
              accessibilityLabel={`Show ${label.toLowerCase()} dashboard data`}
              accessibilityRole="button"
              accessibilityState={{ selected: dateFilter === filter }}
              key={filter}
              onPress={() => onSetDateFilter(filter)}
              className={`rounded-2xl border px-2.5 py-[7px] ${
                dateFilter === filter
                  ? 'border-[#116C0B] bg-[#116C0B]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  dateFilter === filter ? 'text-white' : 'text-[#6B7280]'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
          </View>
        </ScrollView>
      </View>
      {dateFilter === 'custom' ? (
        <View className="mb-3.5 flex-row gap-2">
          <TextInput
            accessibilityLabel="Custom range start date"
            onChangeText={onSetCustomFrom}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[13px] text-[#012711]"
            value={customFrom}
          />
          <TextInput
            accessibilityLabel="Custom range end date"
            onChangeText={onSetCustomTo}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[13px] text-[#012711]"
            value={customTo}
          />
        </View>
      ) : null}

      {error ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5">
          <Text className="flex-1 text-xs leading-[18px] text-[#DC2626]">
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry dashboard loading"
            accessibilityRole="button"
            onPress={onRefresh}
            className="px-2 py-1.5"
          >
            <Text className="text-xs font-bold text-[#116C0B]">
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        className="mt-5 flex-row flex-wrap"
        style={{
          columnGap: screenWidth >= 1100 ? 16 : 12,
          rowGap: screenWidth >= 1100 ? 20 : 12,
        }}
      >
        <StatCard
          label="Total Revenue"
          value={isLoading && !hasAnyData ? '—' : formatCurrency(sales)}
          detail="in selected period"
          badge="PERIOD"
          tone="green"
          basis={summaryCardBasis}
          icon={ChartIcon}
        />
        <StatCard
          label="Total Orders"
          value={isLoading && !hasAnyData ? '—' : String(orderCount)}
          detail="in selected period"
          badge="PERIOD"
          tone="blue"
          basis={summaryCardBasis}
          icon={OrdersIcon}
        />
        <StatCard
          label="Pending Orders"
          value={isLoading && !hasAnyData ? '—' : String(pendingOrderCount)}
          detail="active right now"
          badge="LIVE"
          tone="orange"
          basis={summaryCardBasis}
          icon={OrdersIcon}
        />
        <StatCard
          label="Completed Orders"
          value={isLoading && !hasAnyData ? '—' : String(completedOrderCount)}
          detail="in selected period"
          badge="PERIOD"
          tone="purple"
          basis={summaryCardBasis}
          icon={ProductIcon}
        />
        <StatCard
          label="Today’s Revenue"
          value={isLoading && !hasAnyData ? '—' : formatCurrency(todayRevenue)}
          detail="from all channels today"
          badge="TODAY"
          tone="cyan"
          basis={summaryCardBasis}
          icon={PaymentIcon}
        />
        <StatCard
          label="Today’s Orders"
          value={isLoading && !hasAnyData ? '—' : String(todayOrderCount)}
          detail="from all channels today"
          badge="TODAY"
          tone="pink"
          basis={summaryCardBasis}
          icon={OrdersIcon}
        />
        <StatCard
          label="Total Customers"
          value={isLoading && !hasAnyData ? '—' : String(customerCount)}
          detail="registered customers"
          badge="TOTAL"
          tone="teal"
          basis={summaryCardBasis}
          icon={CustomersIcon}
        />
        <StatCard
          label="Low Stock Items"
          value={isLoading && !hasAnyData ? '—' : String(lowStockCount)}
          detail="needs attention"
          badge="STOCK"
          tone="red"
          basis={summaryCardBasis}
          icon={ReceiptIcon}
        />
      </View>

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Sales overview</Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{getDateFilterLabel(dateFilter)}</Text>
      </View>
      {isReportLoading && !report.trend.length ? (
        <View className="min-h-[72px] items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SalesOverview orders={filteredOrders} trend={report.trend} />
      )}

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Recent orders</Text>
        <Pressable
          accessibilityLabel="Refresh dashboard"
          accessibilityRole="button"
          onPress={onRefresh}
          className="px-2 py-1.5"
        >
          <Text className="text-xs font-semibold text-[#116C0B]">
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {isLoading && !hasAnyData ? (
        <View className="min-h-[120px] items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">Loading your store data…</Text>
        </View>
      ) : recentApiOrders.length || localOrders.length ? (
        <>
          {recentApiOrders.map((order, index) => (
            <ApiOrderRow
              key={order.order_id || order.id || `recent-${index}`}
              order={order}
            />
          ))}
          {localOrders.slice(0, Math.max(0, 5 - recentApiOrders.length)).map(record => (
            <RecordRow key={`local-${record.id}`} record={record} />
          ))}
        </>
      ) : (
        <EmptyState
          icon={OrdersIcon}
          title={error ? 'Store data is unavailable' : 'No recent orders'}
          description={
            error
              ? 'Check the connection and retry to load your dashboard.'
              : 'New orders will appear here when they are placed.'
          }
        />
      )}

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Order status</Text>
      </View>
      <OrderStatusSummary
        orders={filteredOrders}
        reportStatuses={report.statuses}
      />

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Top-selling items</Text>
      </View>
      {topSellingItems.length ? (
        topSellingItems.map(item => (
          <View
            key={item.id}
            className="mb-2 flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white p-[18px]"
          >
            <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
              <ProductIcon color={colors.primary} size={18} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-[#012711]">{item.name}</Text>
              <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{item.quantity} sold</Text>
            </View>
            <Text className="text-[13px] font-bold text-[#012711]">{formatCurrency(item.revenue)}</Text>
          </View>
        ))
      ) : (
        <EmptyState
          icon={ProductIcon}
          title="No completed item sales"
          description="Completed food sales will appear here for this period."
        />
      )}

      {apiData.categories.length ? (
        <>
          <View className="mb-3 mt-7 flex-row items-center justify-between">
            <Text className="text-base font-bold text-[#012711]">Food categories</Text>
          </View>
          <View className="mt-5 flex-row flex-wrap gap-3">
            {apiData.categories.slice(0, 8).map((category, index) => (
              <View
                key={category.category_id || category.category_name || index}
                className="grow rounded-2xl border border-[#E5E7EB] bg-white p-[18px]"
                style={{ flexBasis: 150 }}
              >
                <Text className="text-sm font-semibold text-[#012711]">
                  {category.category_name || 'Category'}
                </Text>
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{category.status || 'Available'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {lowStockCount > 0 ? (
        <>
          <View className="mb-3 mt-7 flex-row items-center justify-between">
            <Text className="text-base font-bold text-[#012711]">Low stock alerts</Text>
            <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{lowStockCount} items</Text>
          </View>
          {lowStockItems.slice(0, 5).map((item: ApiCatalogItem, index) => (
              <View
                key={`${item.name || item.product_name || 'item'}-${index}`}
                className="mb-2 flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white p-[18px]"
              >
                <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
                  <ProductIcon color={colors.warning} size={18} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-[#012711]">
                    {item.food_name || item.product_name || item.name || 'Food'}
                  </Text>
                  <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">Stock is running low</Text>
                </View>
                <Text className="text-[13px] font-bold text-[#F59E0B]">
                  {getItemStock(item)} left
                </Text>
              </View>
            ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function SalesOverview({
  orders,
  trend,
}: {
  orders: ApiOrder[];
  trend: ApiRevenueTrend[];
}) {
  const revenueByDay = new Map<string, number>();
  orders.forEach(order => {
    const date = getOrderDate(order);
    if (!date) {
      return;
    }
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    revenueByDay.set(
      key,
      (revenueByDay.get(key) || 0) + Number(order.total_amount || 0),
    );
  });
  const fallbackDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: revenueByDay.get(key) || 0,
    };
  });
  const days = trend.length
    ? trend.slice(-7).map((entry, index) => ({
        label:
          entry.label ||
          entry.date ||
          `Period ${index + 1}`,
        value: Number(entry.revenue || 0),
      }))
    : fallbackDays;
  const maxValue = Math.max(...days.map(day => day.value), 1);

  return (
    <View className="rounded-2xl border border-[#E5E7EB] bg-white px-[18px] pb-[14px] pt-[18px]">
      <View className="h-[124px] flex-row justify-around">
        {days.map(day => (
          <View
            key={day.label}
            className="flex-1 items-center justify-end"
          >
            <View
              accessibilityLabel={`${day.label} sales ${formatCurrency(day.value)}`}
              className="w-[55%] max-w-6 rounded-[5px]"
              style={{
                backgroundColor: day.value ? colors.primary : '#E5E7EB',
                height: Math.max(day.value ? 8 : 4, (day.value / maxValue) * 88),
              }}
            />
            <Text className="mt-2 text-[10px] text-[#6B7280]">
              {day.label}
            </Text>
          </View>
        ))}
      </View>
      {orders.length === 0 ? (
        <Text className="mt-[3px] text-center text-[11px] leading-4 text-[#6B7280]">
          No sales are recorded for this period yet.
        </Text>
      ) : null}
    </View>
  );
}

function ApiOrderRow({ order }: { order: ApiOrder }) {
  const status = order.order_status?.trim() || 'Pending';
  const orderName = String(order.order_id || order.id || 'Order');
  const date = getOrderDate(order);
  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
        <OrdersIcon color={colors.primary} size={18} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#012711]">{orderName}</Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
          {order.customer_name || 'Customer'}
          {date ? ` · ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
        </Text>
      </View>
      <View className="items-end gap-1.5">
        <Text className="text-[13px] font-bold text-[#012711]">
          {formatCurrency(Number(order.total_amount || 0))}
        </Text>
        <StatusPill status={normalizeOrderStatus(status)} />
      </View>
    </View>
  );
}

function normalizeOrderStatus(status: string): NonNullable<LocalRecord['status']> {
  const normalized = status.toLowerCase();
  if (['delivered', 'completed', 'shipped'].includes(normalized)) {
    return 'Completed';
  }
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'Cancelled';
  }
  return 'Pending';
}

function OrderStatusSummary({
  orders,
  reportStatuses,
}: {
  orders: ApiOrder[];
  reportStatuses: ApiRevenueStatus[];
}) {
  const statuses = reportStatuses.length
    ? reportStatuses.map(entry => {
        const status = String(entry.status || 'Other').trim();
        const normalized = status.toLowerCase();
        const color = ['delivered', 'served', 'completed'].includes(normalized)
          ? '#15803D'
          : ['cancelled', 'canceled'].includes(normalized)
            ? colors.error
            : ['pending', 'placed'].includes(normalized)
              ? colors.warning
              : ['ready', 'preparing', 'processing'].includes(normalized)
                ? colors.info
                : colors.textSecondary;
        return { label: status, count: Number(entry.count || 0), color };
      })
    : [
        { label: 'Delivered', count: 0, color: '#15803D' },
        { label: 'Processing', count: 0, color: '#D97706' },
        { label: 'Shipped', count: 0, color: '#2563EB' },
        { label: 'Cancelled', count: 0, color: colors.error },
        { label: 'Other', count: 0, color: colors.textSecondary },
      ];
  if (!reportStatuses.length) {
    orders.forEach(order => {
      const status = (order.order_status || 'other').trim().toLowerCase();
      const category = ['delivered', 'completed'].includes(status)
        ? 'Delivered'
        : ['processing', 'packing', 'ready', 'out for delivery', 'out_for_delivery'].includes(status)
          ? 'Processing'
          : status === 'shipped'
            ? 'Shipped'
            : ['cancelled', 'canceled'].includes(status)
              ? 'Cancelled'
              : 'Other';
      const entry = statuses.find(item => item.label === category);
      if (entry) {
        entry.count += 1;
      }
    });
  }
  const total =
    reportStatuses.reduce((sum, status) => sum + Number(status.count || 0), 0) ||
    orders.length ||
    1;
  return (
    <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
      {statuses.map(status => (
        <View key={status.label}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded"
                style={{ backgroundColor: status.color }}
              />
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">{status.label}</Text>
            </View>
            <Text className="text-sm font-semibold text-[#012711]">
              {status.count} ({Math.round((status.count / total) * 100)}%)
            </Text>
          </View>
          <View className="mt-[7px] h-1.5 overflow-hidden rounded-[3px] bg-[#F9FAFB]">
            <View
              className="h-full rounded-[3px]"
              style={{
                backgroundColor: status.color,
                width: `${Math.round((status.count / total) * 100)}%`,
              }}
            />
          </View>
        </View>
      ))}
      {orders.length === 0 ? (
        <Text className="mt-[3px] text-center text-[11px] leading-4 text-[#6B7280]">
          Order status details will appear when orders are available.
        </Text>
      ) : null}
    </View>
  );
}

function BillingPage({
  invoices,
  onCreateInvoice,
}: {
  invoices: LocalRecord[];
  onCreateInvoice: () => void;
}) {
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">SALES</Text>
      <View className="mt-1 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Billing</Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Create and review invoices.</Text>
        </View>
        <Pressable
          accessibilityLabel="New invoice"
          accessibilityRole="button"
          onPress={onCreateInvoice}
          className="flex-row items-center gap-2 rounded-xl bg-[#116C0B] px-[15px] py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <PlusIcon color={colors.surface} size={18} />
          <Text className="text-[13px] font-bold text-white">New invoice</Text>
        </Pressable>
      </View>
      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Invoice history</Text>
        <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">{invoices.length} total</Text>
      </View>
      {invoices.length ? (
        invoices.map(invoice => <RecordRow key={invoice.id} record={invoice} />)
      ) : (
        <EmptyState
          icon={ReceiptIcon}
          title="No invoices yet"
          description="Invoices you create will be listed here."
        />
      )}
    </ScrollView>
  );
}

function OrdersPage({
  orders,
  onAddOrder,
  onUpdateOrderStatus,
}: {
  orders: LocalRecord[];
  onAddOrder: () => void;
  onUpdateOrderStatus: (
    orderId: number,
    status: NonNullable<LocalRecord['status']>,
  ) => void;
}) {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [selectedOrder, setSelectedOrder] = useState<LocalRecord | null>(null);
  const filters = ['All', 'Pending', 'Completed', 'Cancelled'] as const;
  const filteredOrders =
    filter === 'All' ? orders : orders.filter(order => order.status === filter);
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">FULFILLMENT</Text>
      <View className="mt-1 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Orders</Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Keep track of every customer order.</Text>
        </View>
        <Pressable
          accessibilityLabel="Add Order"
          accessibilityRole="button"
          onPress={onAddOrder}
          className="flex-row items-center gap-2 rounded-xl bg-[#116C0B] px-[15px] py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <PlusIcon color={colors.surface} size={18} />
          <Text className="text-[13px] font-bold text-white">Add order</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-5"
      >
        {filters.map(item => (
          <Pressable
            accessibilityLabel={`Filter orders by ${item}`}
            accessibilityRole="button"
            accessibilityState={{ selected: item === filter }}
            key={item}
            onPress={() => setFilter(item)}
            className={`rounded-full border px-4 py-[9px] ${
              item === filter
                ? 'border-[#116C0B] bg-[#116C0B]'
                : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                item === filter ? 'text-white' : 'text-[#6B7280]'
              }`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {filteredOrders.length ? (
        filteredOrders.map(order => (
          <Pressable
            accessibilityLabel={`View order ${order.name}`}
            accessibilityRole="button"
            key={order.id}
            onPress={() => setSelectedOrder(order)}
          >
            <RecordRow record={order} />
          </Pressable>
        ))
      ) : (
        <EmptyState
          icon={OrdersIcon}
          title={`No ${filter === 'All' ? '' : `${filter.toLowerCase()} `}orders`}
          description="Orders you add will show up here."
        />
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
        transparent
        visible={selectedOrder !== null}
      >
        {selectedOrder ? (
          <SafeAreaView
            edges={['bottom']}
            className="mt-auto rounded-t-3xl bg-white p-[22px]"
          >
            <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">ORDER DETAILS</Text>
            <Text className="mt-[5px] text-2xl font-bold text-[#012711]">{selectedOrder.name}</Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Created at {selectedOrder.createdAt}</Text>
            <View className="mt-[18px] rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">Order total</Text>
              <Text className="mt-1 text-2xl font-bold text-[#012711]">
                {formatCurrency(selectedOrder.amount || 0)}
              </Text>
              <View className="mt-3.5 flex-row items-center gap-2">
                <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">Status</Text>
                <StatusPill status={selectedOrder.status || 'Pending'} />
              </View>
            </View>
            <Text className="mb-2 mt-[18px] text-[13px] font-semibold text-[#012711]">Update status</Text>
            <View className="flex-row flex-wrap gap-2">
              {(['Pending', 'Completed', 'Cancelled'] as const).map(status => (
                <Pressable
                  accessibilityLabel={`Set order status to ${status}`}
                  accessibilityRole="button"
                  key={status}
                  onPress={() => {
                    onUpdateOrderStatus(selectedOrder.id, status);
                    setSelectedOrder({ ...selectedOrder, status });
                  }}
                  className={`rounded-full border px-3.5 py-[9px] ${
                    selectedOrder.status === status
                      ? 'border-[#116C0B] bg-[#116C0B]'
                      : 'border-[#E5E7EB] bg-[#F9FAFB]'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      selectedOrder.status === status ? 'text-white' : 'text-[#6B7280]'
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityLabel="Close order details"
              accessibilityRole="button"
              onPress={() => setSelectedOrder(null)}
              className="items-center py-[18px]"
            >
              <Text className="font-semibold text-[#116C0B]">Close details</Text>
            </Pressable>
          </SafeAreaView>
        ) : null}
      </Modal>
    </ScrollView>
  );
}

function MorePage({ onSelectFeature }: { onSelectFeature: (feature: string) => void }) {
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">TOOLS</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">More</Text>
      <View className="mt-[22px]">
        {moreFeatures.map(feature => {
          const Icon = feature.icon;
          return (
            <Pressable
              accessibilityLabel={`Open ${feature.title}`}
              accessibilityRole="button"
              key={feature.title}
              onPress={() => onSelectFeature(feature.title)}
              className="min-h-[76px] w-full flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F3F7FF' : colors.surface,
              })}
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
                <Icon color={colors.primary} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#012711]">{feature.title}</Text>
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{feature.subtitle}</Text>
              </View>
              <Text className="text-xl text-[#9CA3AF]">›</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function BottomNavigation({
  activeTab,
  onPressTab,
}: {
  activeTab: AppTab;
  onPressTab: (tab: AppTab) => void;
}) {
  const tabs: BottomBarTab<AppTab>[] = [
    { key: 'home', label: 'Home', icon: color => <HomeIcon color={color} size={21} /> },
    { key: 'billing', label: 'Billing', icon: color => <ReceiptIcon color={color} size={21} /> },
    { key: 'add', label: 'Add', icon: color => <PlusIcon color={color} size={21} /> },
    { key: 'orders', label: 'Orders', icon: color => <OrdersIcon color={color} size={21} /> },
    { key: 'more', label: 'More', icon: color => <MoreIcon color={color} size={21} /> },
  ];
  return <Bottombar tabs={tabs} activeTab={activeTab} onTabPress={onPressTab} />;
}

function EntryForm({
  action,
  onCancel,
  onSave,
}: {
  action: QuickAction;
  onCancel: () => void;
  onSave: (name: string, amount?: number) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const Icon = action.icon;
  const amountValue = Number(amount);
  const needsAmount = Boolean(action.amountLabel);
  const canSave =
    name.trim().length > 0 &&
    (!needsAmount || (amount.trim().length > 0 && Number.isFinite(amountValue) && amountValue >= 0));

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityLabel={`Close ${action.label}`}
        onPress={onCancel}
        className="absolute bottom-0 left-0 right-0 top-0 bg-[#11182766]"
      />
      <SafeAreaView
        edges={['bottom']}
        className="rounded-t-3xl bg-white p-[22px]"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
            <Icon color={colors.primary} size={21} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#012711]">{action.label}</Text>
            <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{action.description}</Text>
          </View>
          <Pressable accessibilityLabel="Close form" onPress={onCancel} hitSlop={8}>
            <Text className="text-2xl text-[#6B7280]">×</Text>
          </Pressable>
        </View>
        <Text className="mb-2 mt-5 text-[13px] font-semibold text-[#012711]">Name or description</Text>
        <TextInput
          autoFocus
          onChangeText={setName}
          placeholder={action.placeholder}
          placeholderTextColor={colors.textSecondary}
          className="min-h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] text-[15px] text-[#012711]"
          value={name}
        />
        {action.amountLabel ? (
          <>
            <Text className="mb-2 mt-5 text-[13px] font-semibold text-[#012711]">{action.amountLabel}</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={value => setAmount(value.replace(',', '.'))}
              placeholder={action.amountPlaceholder}
              placeholderTextColor={colors.textSecondary}
              className="min-h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] text-[15px] text-[#012711]"
              value={amount}
            />
          </>
        ) : null}
        <Text className="mt-3 text-[11px] leading-4 text-[#6B7280]">
          This draft is saved in this session only. Connect your business data service to sync it.
        </Text>
        <Pressable
          accessibilityLabel={`Save ${action.label}`}
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => onSave(name, needsAmount ? amountValue : undefined)}
          className="mt-5 min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#116C0B] px-[15px] py-3"
          style={({ pressed }) => ({
            opacity: !canSave ? 0.45 : pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-[13px] font-bold text-white">Save {action.label.toLowerCase()}</Text>
        </Pressable>
        <Pressable onPress={onCancel} className="items-center py-3.5">
          <Text className="text-sm text-[#6B7280]">Cancel</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Sidebar({
  fullWidth = false,
  onClose,
  onNavigate,
}: {
  fullWidth?: boolean;
  onClose: () => void;
  onNavigate: (tab: AppTab) => void;
}) {
  return (
    <View
      className={`${fullWidth ? 'w-full' : 'w-64'} flex-1 border-r border-[#E5E7EB] bg-white px-4 py-5`}
    >
      <View className="mb-5 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <Image
            accessibilityLabel="Buy Food logo"
            resizeMode="contain"
            source={require('../images/buy-food-logo.png')}
            className="h-12 w-12 shrink-0"
          />
          <Text className="flex-1 text-lg font-bold text-[#012711]">
            Buy Food
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close sidebar navigation"
          accessibilityRole="button"
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]"
        >
          <Text className="text-2xl leading-7 text-[#6B7280]">×</Text>
        </Pressable>
      </View>
      <Text className="mb-3 px-3 py-2 text-xs font-bold tracking-[1.5px] text-[#6B7280]">
        WORKSPACE
      </Text>
      <TabButtonLarge icon={HomeIcon} label="Home" onPress={() => onNavigate('home')} />
      <TabButtonLarge icon={ReceiptIcon} label="Billing" onPress={() => onNavigate('billing')} />
      <TabButtonLarge icon={OrdersIcon} label="Orders" onPress={() => onNavigate('orders')} />
      <TabButtonLarge icon={MoreIcon} label="More" onPress={() => onNavigate('more')} />
    </View>
  );
}

function TabButtonLarge({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof HomeIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className="w-full flex-row items-center gap-3 rounded-xl px-3 py-2.5"
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#EFF6FF' : colors.surface,
      })}
    >
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F7EE]">
        <Icon color={colors.primary} size={21} />
      </View>
      <Text className="flex-1 text-base font-semibold text-[#012711]">
        {label}
      </Text>
    </Pressable>
  );
}

function PageShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">WORKSPACE</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">{title}</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">{subtitle}</Text>
      <View className="mt-6 gap-3.5">{children}</View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  detail,
  badge,
  tone,
  basis,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  badge: string;
  tone: 'green' | 'blue' | 'orange' | 'purple' | 'cyan' | 'pink' | 'teal' | 'red';
  basis: `${number}%`;
  icon: typeof ChartIcon;
}) {
  const palette = statCardPalettes[tone];
  return (
    <View
      className="relative min-h-[175px] justify-between overflow-hidden rounded-2xl p-6"
      style={{ backgroundColor: palette.background, flexBasis: basis }}
    >
      <View className="z-[1] flex-row items-center gap-[15px]">
        <View
          className="h-[60px] w-[60px] items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.iconBackground }}
        >
          <Icon color="#FFFFFF" size={24} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-bold text-white">{label}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} className="mt-1 text-[29px] font-extrabold text-white">
            {value}
          </Text>
        </View>
      </View>
      <View className="z-[1] mt-[18px]">
        <View className="max-w-[90%] flex-row items-center gap-[9px]">
          <Text
            className="overflow-hidden rounded-[7px] px-[7px] py-1 text-[11px] font-extrabold text-white"
            style={{ backgroundColor: palette.badgeBackground }}
          >
            {badge}
          </Text>
          <Text numberOfLines={1} className="text-xs font-semibold text-white opacity-[0.88]">{detail}</Text>
        </View>
      </View>
      <Svg
        accessibilityElementsHidden
        importantForAccessibility="no"
        pointerEvents="none"
        className="absolute bottom-0 right-0 h-12 w-[122px] opacity-[0.95]"
        viewBox="0 0 120 32"
      >
        <Path
          d="M1 22 C18 14 31 14 49 22 S82 31 119 2"
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeWidth="2.5"
          opacity={0.4}
        />
      </Svg>
    </View>
  );
}

const statCardPalettes = {
  green: { background: '#20C463', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  blue: { background: '#3B82F6', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  orange: { background: '#F59E0B', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  purple: { background: '#8B5CF6', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  cyan: { background: '#06B6D4', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  pink: { background: '#EC4899', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  teal: { background: '#14B8A6', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
  red: { background: '#F43F5E', iconBackground: '#FFFFFF33', badgeBackground: '#FFFFFF33' },
} as const;

function Avatar({ initial, size = 42 }: { initial: string; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-[#EFF6FF]"
      style={{ height: size, width: size }}
    >
      <Text className="font-bold text-[#116C0B]" style={{ fontSize: size * 0.38 }}>
        {initial}
      </Text>
    </View>
  );
}

function RecordRow({ record }: { record: LocalRecord }) {
  const title = quickActions.find(action => action.id === record.action)?.label || 'Activity';
  return (
    <View className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
        <ReceiptIcon color={colors.primary} size={18} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#012711]">{record.name}</Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">{title} · {record.createdAt}</Text>
      </View>
      {record.amount !== undefined ? (
        <Text className="text-sm font-bold text-[#012711]">
          {formatCurrency(record.amount)}
        </Text>
      ) : null}
      {record.status ? <StatusPill status={record.status} /> : null}
    </View>
  );
}

function StatusPill({ status }: { status: NonNullable<LocalRecord['status']> }) {
  const tint = status === 'Pending' ? '#B45309' : status === 'Completed' ? '#15803D' : colors.error;
  const bg = status === 'Pending' ? '#FFFBEB' : status === 'Completed' ? '#F0FDF4' : '#FEF2F2';
  return (
    <View className="rounded-[14px] px-[9px] py-[5px]" style={{ backgroundColor: bg }}>
      <Text className="text-[11px] font-semibold" style={{ color: tint }}>{status}</Text>
    </View>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ReceiptIcon;
  title: string;
  description: string;
}) {
  return (
    <View className="items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
      <View className="mb-1.5 h-[52px] w-[52px] items-center justify-center rounded-[26px] bg-[#EFF6FF]">
        <Icon color={colors.primary} size={24} />
      </View>
      <Text className="text-sm font-semibold text-[#012711]">{title}</Text>
      <Text className="mt-1 text-center text-[13px] leading-[19px] text-[#6B7280]">{description}</Text>
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="py-3.5">
      <Text className="text-sm font-semibold text-[#116C0B]">{label}</Text>
    </Pressable>
  );
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default DashboardScreen;
