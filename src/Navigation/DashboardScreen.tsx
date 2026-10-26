import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  ProfileIcon,
  ReceiptIcon,
} from './NavigationIcons';
import TopHeader, { type HeaderUser } from './TopHeader';
import Bottombar, { type BottomBarTab } from './Bottombar';
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

const moreFeatures = [
  { title: 'Customers', subtitle: 'Customer list and details', icon: CustomersIcon, action: 'customer' as QuickActionId },
  { title: 'Products & Inventory', subtitle: 'Products, prices, and stock', icon: ProductIcon, action: 'product' as QuickActionId },
  { title: 'Suppliers & Purchases', subtitle: 'Supplier records and purchases', icon: MenuIcon, action: 'purchase' as QuickActionId },
  { title: 'Payments & Expenses', subtitle: 'Track money in and out', icon: PaymentIcon, action: 'payment' as QuickActionId },
  { title: 'Returns & Refunds', subtitle: 'Manage returned items and refunds', icon: ReceiptIcon },
  { title: 'Pending Payments', subtitle: 'Review outstanding balances', icon: PaymentIcon },
  { title: 'Reports & Analytics', subtitle: 'Business performance overview', icon: ChartIcon },
  { title: 'Sales Reports', subtitle: 'Review sales over time', icon: ChartIcon },
  { title: 'Profit & Revenue', subtitle: 'Revenue and profitability summary', icon: ChartIcon },
  { title: 'Offers & Discounts', subtitle: 'Manage promotional offers', icon: ReceiptIcon },
  { title: 'Staff & Employees', subtitle: 'Manage your team', icon: CustomersIcon },
  { title: 'Branch Management', subtitle: 'Manage restaurant locations', icon: MenuIcon },
  { title: 'Barcode Scanner', subtitle: 'Scan or look up products', icon: ProductIcon },
  { title: 'Tax & GST Reports', subtitle: 'Review tax summaries', icon: ReceiptIcon },
  { title: 'Notifications', subtitle: 'Review recent updates', icon: BellIcon },
  { title: 'Backup & Restore', subtitle: 'Manage business data backups', icon: MenuIcon },
  { title: 'Help & Support', subtitle: 'Get help with your account', icon: ProfileIcon },
  { title: 'Settings', subtitle: 'Manage app preferences', icon: MenuIcon },
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
      style={{ backgroundColor: colors.background, flex: 1 }}
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
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Sidebar
            onNavigate={tab => {
              navigateToTab(tab);
              setIsSidebarOpen(false);
            }}
          />
          <View style={{ flex: 1 }}>
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
        <View style={{ flex: 1 }}>
          {logoutError ? (
            <Text
              accessibilityRole="alert"
              style={{
                backgroundColor: '#FEF2F2',
                color: colors.error,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
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
        <View style={{ ...overlayFill, top: 72, zIndex: 30 }}>
          <Pressable
            accessibilityLabel="Close sidebar"
            onPress={() => setIsSidebarOpen(false)}
            style={{ ...overlayFill, backgroundColor: '#11182766' }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              bottom: 0,
              left: 0,
              position: 'absolute',
              top: 0,
              width: Math.min(width - 48, 280),
            }}
          >
            <Sidebar
              onNavigate={tab => {
                navigateToTab(tab);
                setIsSidebarOpen(false);
              }}
            />
          </View>
        </View>
      ) : null}

      {isNotificationsOpen ? (
        <View style={{ ...overlayFill, top: 72, zIndex: 25 }}>
          <Pressable
            accessibilityLabel="Close notifications"
            onPress={() => setIsNotificationsOpen(false)}
            style={{ ...overlayFill, backgroundColor: '#11182733' }}
          />
          <View
            style={{
              alignSelf: 'flex-end',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              borderWidth: 1,
              elevation: 10,
              marginHorizontal: width < 480 ? 12 : 24,
              marginTop: 8,
              maxWidth: '92%',
              padding: 20,
              shadowColor: '#111827',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              width: 320,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
              <BellIcon color={colors.textPrimary} size={19} />
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>
                Notifications
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
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

const overlayFill = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
};

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
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          Complete the form to add this item.
        </Text>
      </PageShell>
    );
  }

  if (selectedFeature) {
    if (selectedFeature === 'Profile') {
      return (
        <PageShell title="Profile" subtitle="Your account details">
          <View style={styles.card}>
            <Avatar initial={userInitial} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{userName}</Text>
              <Text style={styles.mutedText}>{userEmail}</Text>
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
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <PlusIcon color={colors.surface} size={18} />
            <Text style={styles.primaryButtonText}>
              {quickActions.find(action => action.id === relatedAction)?.label}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.mutedText}>
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
    <ScrollView contentContainerStyle={pageContentStyle}>
      <Text style={styles.eyebrow}>QUICK ENTRY</Text>
      <Text style={styles.pageTitle}>Add items</Text>
      <Text style={styles.pageSubtitle}>
        Choose what you would like to add to your restaurant.
      </Text>
      <View style={{ gap: 12, marginTop: 22 }}>
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              key={action.id}
              onPress={() => onSelectAction(action.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#F3F7FF' : colors.surface,
                borderColor: colors.border,
                borderRadius: 16,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 14,
                minHeight: 76,
                padding: 14,
              })}
            >
              <View style={styles.featureIcon}>
                <Icon color={colors.primary} size={21} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{action.label}</Text>
                <Text style={styles.smallMuted}>{action.description}</Text>
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
    <ScrollView
      contentContainerStyle={{
        alignSelf: 'center',
        maxWidth: 1440,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 24,
        width: '100%',
      }}
    >
      <Text style={styles.eyebrow}>OVERVIEW</Text>
      <Text style={styles.pageTitle}>Good day, {userName}</Text>
      <Text style={styles.pageSubtitle}>Here’s your restaurant at a glance.</Text>

      <View style={styles.dashboardToolbar}>
        <Text style={styles.mutedText}>Store performance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
          {dashboardPeriods.map(({ value: filter, label }) => (
            <Pressable
              accessibilityLabel={`Show ${label.toLowerCase()} dashboard data`}
              accessibilityRole="button"
              accessibilityState={{ selected: dateFilter === filter }}
              key={filter}
              onPress={() => onSetDateFilter(filter)}
              style={{
                backgroundColor:
                  dateFilter === filter ? colors.primary : colors.surface,
                borderColor: dateFilter === filter ? colors.primary : colors.border,
                borderRadius: 16,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  color:
                    dateFilter === filter ? colors.surface : colors.textSecondary,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
          </View>
        </ScrollView>
      </View>
      {dateFilter === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <TextInput
            accessibilityLabel="Custom range start date"
            onChangeText={onSetCustomFrom}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 10,
              borderWidth: 1,
              color: colors.textPrimary,
              flex: 1,
              fontSize: 13,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            value={customFrom}
          />
          <TextInput
            accessibilityLabel="Custom range end date"
            onChangeText={onSetCustomTo}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 10,
              borderWidth: 1,
              color: colors.textPrimary,
              flex: 1,
              fontSize: 13,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            value={customTo}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={{ color: colors.error, flex: 1, fontSize: 12, lineHeight: 18 }}>
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry dashboard loading"
            accessibilityRole="button"
            onPress={onRefresh}
            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          >
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.statsGrid,
          {
            columnGap: screenWidth >= 1100 ? 16 : 12,
            rowGap: screenWidth >= 1100 ? 20 : 12,
          },
        ]}
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sales overview</Text>
        <Text style={styles.smallMuted}>{getDateFilterLabel(dateFilter)}</Text>
      </View>
      {isReportLoading && !report.trend.length ? (
        <View style={[styles.emptyCard, { minHeight: 72 }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SalesOverview orders={filteredOrders} trend={report.trend} />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent orders</Text>
        <Pressable
          accessibilityLabel="Refresh dashboard"
          accessibilityRole="button"
          onPress={onRefresh}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {isLoading && !hasAnyData ? (
        <View style={[styles.emptyCard, { minHeight: 120 }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.mutedText}>Loading your store data…</Text>
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Order status</Text>
      </View>
      <OrderStatusSummary
        orders={filteredOrders}
        reportStatuses={report.statuses}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top-selling items</Text>
      </View>
      {topSellingItems.length ? (
        topSellingItems.map(item => (
          <View
            key={item.id}
            style={[
              styles.card,
              { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
            ]}
          >
            <View style={styles.featureIcon}>
              <ProductIcon color={colors.primary} size={18} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.smallMuted}>{item.quantity} sold</Text>
            </View>
            <Text style={styles.orderAmount}>{formatCurrency(item.revenue)}</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Food categories</Text>
          </View>
          <View style={styles.statsGrid}>
            {apiData.categories.slice(0, 8).map((category, index) => (
              <View
                key={category.category_id || category.category_name || index}
                style={[styles.card, { flexBasis: 150, flexGrow: 1 }]}
              >
                <Text style={styles.cardTitle}>
                  {category.category_name || 'Category'}
                </Text>
                <Text style={styles.smallMuted}>{category.status || 'Available'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {lowStockCount > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Low stock alerts</Text>
            <Text style={styles.smallMuted}>{lowStockCount} items</Text>
          </View>
          {lowStockItems.slice(0, 5).map((item: ApiCatalogItem, index) => (
              <View
                key={`${item.name || item.product_name || 'item'}-${index}`}
                style={[
                  styles.card,
                  { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
                ]}
              >
                <View style={styles.featureIcon}>
                  <ProductIcon color={colors.warning} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>
                    {item.food_name || item.product_name || item.name || 'Food'}
                  </Text>
                  <Text style={styles.smallMuted}>Stock is running low</Text>
                </View>
                <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>
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
    <View style={[styles.card, { paddingBottom: 14, paddingTop: 18 }]}>
      <View style={{ flexDirection: 'row', height: 124, justifyContent: 'space-around' }}>
        {days.map(day => (
          <View
            key={day.label}
            style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}
          >
            <View
              accessibilityLabel={`${day.label} sales ${formatCurrency(day.value)}`}
              style={{
                backgroundColor: day.value ? colors.primary : '#E5E7EB',
                borderRadius: 5,
                height: Math.max(day.value ? 8 : 4, (day.value / maxValue) * 88),
                maxWidth: 24,
                width: '55%',
              }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 8 }}>
              {day.label}
            </Text>
          </View>
        ))}
      </View>
      {orders.length === 0 ? (
        <Text style={[styles.smallMuted, { textAlign: 'center' }]}>
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
    <View style={[styles.card, styles.apiOrderRow]}>
      <View style={styles.featureIcon}>
        <OrdersIcon color={colors.primary} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{orderName}</Text>
        <Text style={styles.smallMuted}>
          {order.customer_name || 'Customer'}
          {date ? ` · ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.orderAmount}>
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
    <View style={[styles.card, { gap: 12 }]}>
      {statuses.map(status => (
        <View key={status.label}>
          <View style={styles.statusSummaryRow}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  backgroundColor: status.color,
                  borderRadius: 4,
                  height: 8,
                  width: 8,
                }}
              />
              <Text style={styles.mutedText}>{status.label}</Text>
            </View>
            <Text style={styles.cardTitle}>
              {status.count} ({Math.round((status.count / total) * 100)}%)
            </Text>
          </View>
          <View style={styles.statusBarTrack}>
            <View
              style={{
                backgroundColor: status.color,
                borderRadius: 3,
                height: '100%',
                width: `${Math.round((status.count / total) * 100)}%`,
              }}
            />
          </View>
        </View>
      ))}
      {orders.length === 0 ? (
        <Text style={[styles.smallMuted, { textAlign: 'center' }]}>
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
    <ScrollView contentContainerStyle={pageContentStyle}>
      <Text style={styles.eyebrow}>SALES</Text>
      <View style={styles.pageHeadingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Billing</Text>
          <Text style={styles.pageSubtitle}>Create and review invoices.</Text>
        </View>
        <Pressable
          accessibilityLabel="New invoice"
          accessibilityRole="button"
          onPress={onCreateInvoice}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
        >
          <PlusIcon color={colors.surface} size={18} />
          <Text style={styles.primaryButtonText}>New invoice</Text>
        </Pressable>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Invoice history</Text>
        <Text style={styles.mutedText}>{invoices.length} total</Text>
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
    <ScrollView contentContainerStyle={pageContentStyle}>
      <Text style={styles.eyebrow}>FULFILLMENT</Text>
      <View style={styles.pageHeadingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Orders</Text>
          <Text style={styles.pageSubtitle}>Keep track of every customer order.</Text>
        </View>
        <Pressable
          accessibilityLabel="Add Order"
          accessibilityRole="button"
          onPress={onAddOrder}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
        >
          <PlusIcon color={colors.surface} size={18} />
          <Text style={styles.primaryButtonText}>Add order</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 20 }}
      >
        {filters.map(item => (
          <Pressable
            accessibilityLabel={`Filter orders by ${item}`}
            accessibilityRole="button"
            accessibilityState={{ selected: item === filter }}
            key={item}
            onPress={() => setFilter(item)}
            style={{
              backgroundColor: item === filter ? colors.primary : colors.surface,
              borderColor: item === filter ? colors.primary : colors.border,
              borderRadius: 20,
              borderWidth: 1,
              paddingHorizontal: 16,
              paddingVertical: 9,
            }}
          >
            <Text
              style={{
                color: item === filter ? colors.surface : colors.textSecondary,
                fontSize: 13,
                fontWeight: '600',
              }}
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
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              marginTop: 'auto',
              padding: 22,
            }}
          >
            <Text style={styles.eyebrow}>ORDER DETAILS</Text>
            <Text style={styles.pageTitle}>{selectedOrder.name}</Text>
            <Text style={styles.pageSubtitle}>Created at {selectedOrder.createdAt}</Text>
            <View style={[styles.card, { marginTop: 18 }]}>
              <Text style={styles.mutedText}>Order total</Text>
              <Text style={[styles.pageTitle, { marginTop: 4 }]}>
                {formatCurrency(selectedOrder.amount || 0)}
              </Text>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Text style={styles.mutedText}>Status</Text>
                <StatusPill status={selectedOrder.status || 'Pending'} />
              </View>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Update status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['Pending', 'Completed', 'Cancelled'] as const).map(status => (
                <Pressable
                  accessibilityLabel={`Set order status to ${status}`}
                  accessibilityRole="button"
                  key={status}
                  onPress={() => {
                    onUpdateOrderStatus(selectedOrder.id, status);
                    setSelectedOrder({ ...selectedOrder, status });
                  }}
                  style={{
                    backgroundColor:
                      selectedOrder.status === status ? colors.primary : colors.background,
                    borderColor: colors.border,
                    borderRadius: 20,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedOrder.status === status
                          ? colors.surface
                          : colors.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
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
              style={{ alignItems: 'center', paddingVertical: 18 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Close details</Text>
            </Pressable>
          </SafeAreaView>
        ) : null}
      </Modal>
    </ScrollView>
  );
}

function MorePage({ onSelectFeature }: { onSelectFeature: (feature: string) => void }) {
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : width >= 420 ? 2 : 1;
  return (
    <ScrollView contentContainerStyle={pageContentStyle}>
      <Text style={styles.eyebrow}>TOOLS</Text>
      <Text style={styles.pageTitle}>More</Text>
      <Text style={styles.pageSubtitle}>Everything you need to run your business.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
        {moreFeatures.map(feature => {
          const Icon = feature.icon;
          return (
            <Pressable
              accessibilityLabel={feature.title}
              accessibilityRole="button"
              key={feature.title}
              onPress={() => onSelectFeature(feature.title)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? '#F3F7FF' : colors.surface,
                borderColor: colors.border,
                borderRadius: 16,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 12,
                minHeight: 76,
                padding: 14,
                width:
                  columns === 1 ? '100%' : columns === 2 ? '48%' : '31%',
              })}
            >
              <View style={styles.featureIcon}>
                <Icon color={colors.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{feature.title}</Text>
                <Text style={styles.smallMuted}>{feature.subtitle}</Text>
              </View>
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
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityLabel={`Close ${action.label}`}
        onPress={onCancel}
        style={{ ...overlayFill, backgroundColor: '#11182766', top: 0 }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 22,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <View style={styles.featureIcon}>
            <Icon color={colors.primary} size={21} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{action.label}</Text>
            <Text style={styles.smallMuted}>{action.description}</Text>
          </View>
          <Pressable accessibilityLabel="Close form" onPress={onCancel} hitSlop={8}>
            <Text style={{ color: colors.textSecondary, fontSize: 24 }}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.fieldLabel}>Name or description</Text>
        <TextInput
          autoFocus
          onChangeText={setName}
          placeholder={action.placeholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.textInput}
          value={name}
        />
        {action.amountLabel ? (
          <>
            <Text style={styles.fieldLabel}>{action.amountLabel}</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={value => setAmount(value.replace(',', '.'))}
              placeholder={action.amountPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={amount}
            />
          </>
        ) : null}
        <Text style={[styles.smallMuted, { marginTop: 12 }]}>
          This draft is saved in this session only. Connect your business data service to sync it.
        </Text>
        <Pressable
          accessibilityLabel={`Save ${action.label}`}
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => onSave(name, needsAmount ? amountValue : undefined)}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 20,
              minHeight: 48,
              opacity: !canSave ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>Save {action.label.toLowerCase()}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Sidebar({ onNavigate }: { onNavigate: (tab: AppTab) => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRightColor: colors.border,
        borderRightWidth: 1,
        padding: 12,
        width: 256,
      }}
    >
      <Text style={[styles.eyebrow, { marginHorizontal: 12, marginVertical: 12 }]}>
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
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? '#EFF6FF' : 'transparent',
        borderRadius: 10,
        flexDirection: 'row',
        gap: 12,
        minHeight: 48,
        paddingHorizontal: 12,
      })}
    >
      <Icon color={colors.textSecondary} size={20} />
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
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
    <ScrollView contentContainerStyle={pageContentStyle}>
      <Text style={styles.eyebrow}>WORKSPACE</Text>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
      <View style={{ gap: 14, marginTop: 24 }}>{children}</View>
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
      style={[
        styles.statCard,
        { backgroundColor: palette.background, flexBasis: basis },
      ]}
    >
      <View style={styles.statCardTop}>
        <View style={[styles.statCardIcon, { backgroundColor: palette.iconBackground }]}>
          <Icon color="#FFFFFF" size={24} />
        </View>
        <View style={styles.statCardCopy}>
          <Text numberOfLines={1} style={styles.statCardLabel}>{label}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statCardValue}>
            {value}
          </Text>
        </View>
      </View>
      <View style={styles.statCardFooter}>
        <View style={styles.statCardDetail}>
          <Text style={[styles.statCardBadge, { backgroundColor: palette.badgeBackground }]}>
            {badge}
          </Text>
          <Text numberOfLines={1} style={styles.statCardDetailText}>{detail}</Text>
        </View>
      </View>
      <Svg
        accessibilityElementsHidden
        importantForAccessibility="no"
        pointerEvents="none"
        style={styles.statCardWave}
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
      style={{
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: size / 2,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Text style={{ color: colors.primary, fontSize: size * 0.38, fontWeight: '700' }}>
        {initial}
      </Text>
    </View>
  );
}

function RecordRow({ record }: { record: LocalRecord }) {
  const title = quickActions.find(action => action.id === record.action)?.label || 'Activity';
  return (
    <View style={[styles.card, { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 10 }]}>
      <View style={styles.featureIcon}>
        <ReceiptIcon color={colors.primary} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{record.name}</Text>
        <Text style={styles.smallMuted}>{title} · {record.createdAt}</Text>
      </View>
      {record.amount !== undefined ? (
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
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
    <View style={{ backgroundColor: bg, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text style={{ color: tint, fontSize: 11, fontWeight: '600' }}>{status}</Text>
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
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Icon color={colors.primary} size={24} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.mutedText, { textAlign: 'center' }]}>{description}</Text>
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 14 }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const pageContentStyle = {
  alignSelf: 'center' as const,
  maxWidth: 1100,
  paddingHorizontal: 20,
  paddingTop: 24,
  paddingBottom: 28,
  width: '100%' as const,
};

const styles = {
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700' as const,
    marginTop: 5,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    borderRadius: 16,
    justifyContent: 'space-between' as const,
    minHeight: 175,
    overflow: 'hidden' as const,
    padding: 24,
    position: 'relative' as const,
  },
  statCardTop: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 15,
    zIndex: 1,
  },
  statCardIcon: {
    alignItems: 'center' as const,
    borderRadius: 12,
    height: 60,
    justifyContent: 'center' as const,
    width: 60,
  },
  statCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  statCardLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  statCardFooter: {
    marginTop: 18,
    zIndex: 1,
  },
  statCardDetail: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 9,
    maxWidth: '90%',
  },
  statCardBadge: {
    borderRadius: 7,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800' as const,
    overflow: 'hidden' as const,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statCardDetailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    opacity: 0.88,
  },
  statCardWave: {
    bottom: 0,
    height: 48,
    opacity: 0.95,
    position: 'absolute' as const,
    right: 0,
    width: 122,
  },
  dashboardToolbar: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    marginTop: 18,
    rowGap: 10,
  },
  errorBanner: {
    alignItems: 'center' as const,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionHeader: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  apiOrderRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 8,
    padding: 14,
  },
  orderAmount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  statusSummaryRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  statusBarTrack: {
    backgroundColor: colors.background,
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    overflow: 'hidden' as const,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  smallMuted: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  emptyCard: {
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  emptyIcon: {
    alignItems: 'center' as const,
    backgroundColor: '#EFF6FF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center' as const,
    marginBottom: 6,
    width: 52,
  },
  featureIcon: {
    alignItems: 'center' as const,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center' as const,
    width: 42,
  },
  statIcon: {
    alignItems: 'center' as const,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center' as const,
    width: 34,
  },
  pageHeadingRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center' as const,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 20,
  },
  textInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
};

export default DashboardScreen;
