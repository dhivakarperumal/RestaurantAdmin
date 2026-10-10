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
import api from '../../api';

type DashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type AppTab = 'home' | 'billing' | 'orders' | 'more';
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
  id?: string | number;
  order_date?: string;
  created_at?: string;
  total_amount?: number | string;
  order_status?: string;
  customer_name?: string;
  payment_method?: string;
};

type ApiUser = {
  role?: string;
};

type ApiCatalogItem = {
  product_name?: string;
  productName?: string;
  name?: string;
  category?: string;
  sub_category?: string;
  size_variants?: unknown;
  variants?: unknown;
  stock_quantity?: number | string;
  current_stock?: number | string;
  stock?: number | string;
  created_at?: string;
  updated_at?: string;
};

type DashboardData = {
  orders: ApiOrder[];
  users: ApiUser[];
  products: ApiCatalogItem[];
  albums: ApiCatalogItem[];
  gifts: ApiCatalogItem[];
};

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | null;
    };

type DashboardDateFilter = 'today' | 'this-week' | 'this-month' | 'all';

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
  const [isQuickSheetOpen, setIsQuickSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickActionId | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [logoutError, setLogoutError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    orders: [],
    users: [],
    products: [],
    albums: [],
    gifts: [],
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>('this-month');
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

    const loadDashboard = async () => {
      setIsDashboardLoading(true);
      setDashboardError('');
      const endpoints = [
        { key: 'orders', path: '/orders' },
        { key: 'users', path: '/users' },
        { key: 'products', path: '/products' },
        { key: 'albums', path: '/albums' },
        { key: 'gifts', path: '/gift-boxes' },
      ] as const;

      const results = await Promise.allSettled(
        endpoints.map(endpoint => api.get(endpoint.path)),
      );
      if (!isActive) {
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
            case 'users':
              nextData.users = readResponseRows<ApiUser>(
                result.value.data as ApiListResponse<ApiUser>,
              );
              break;
            case 'products':
              nextData.products = readResponseRows<ApiCatalogItem>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              break;
            case 'albums':
              nextData.albums = readResponseRows<ApiCatalogItem>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              break;
            case 'gifts':
              nextData.gifts = readResponseRows<ApiCatalogItem>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
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
    };
  }, [dashboardRefresh]);

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
    setIsQuickSheetOpen(false);
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
              dashboardError={dashboardError}
              isDashboardLoading={isDashboardLoading}
              dateFilter={dateFilter}
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
            dashboardError={dashboardError}
            isDashboardLoading={isDashboardLoading}
            dateFilter={dateFilter}
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
          />
        </View>
      )}

      <BottomNavigation
        activeTab={activeTab}
        onPressTab={navigateToTab}
        onPressPlus={() => {
          setSelectedAction(null);
          setIsQuickSheetOpen(true);
        }}
      />

      <Modal
        animationType="slide"
        onRequestClose={() => setIsQuickSheetOpen(false)}
        transparent
        visible={isQuickSheetOpen}
      >
        <QuickActionSheet
          onClose={() => setIsQuickSheetOpen(false)}
          onSelect={navigateToAction}
        />
      </Modal>

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

function getOrderDate(order: ApiOrder) {
  const value = order.order_date || order.created_at;
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function filterOrdersByPeriod(
  orders: ApiOrder[],
  filter: DashboardDateFilter,
) {
  if (filter === 'all') {
    return orders;
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'this-week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (filter === 'this-month') {
    start.setDate(1);
  }
  return orders.filter(order => {
    const date = getOrderDate(order);
    return date !== null && date >= start && date <= now;
  });
}

function getDateFilterLabel(filter: DashboardDateFilter) {
  switch (filter) {
    case 'today':
      return 'Today';
    case 'this-week':
      return 'This week';
    case 'this-month':
      return 'This month';
    case 'all':
      return 'All time';
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
  dashboardError,
  isDashboardLoading,
  dateFilter,
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
}: {
  activeTab: AppTab;
  invoices: LocalRecord[];
  orders: LocalRecord[];
  records: LocalRecord[];
  dashboardData: DashboardData;
  dashboardError: string;
  isDashboardLoading: boolean;
  dateFilter: DashboardDateFilter;
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
      <OrdersPage orders={orders} onUpdateOrderStatus={onUpdateOrderStatus} />
    );
  }
  if (activeTab === 'more') {
    return <MorePage onSelectFeature={onSelectFeature} />;
  }
  return (
    <HomePage
      apiData={dashboardData}
      dateFilter={dateFilter}
      error={dashboardError}
      isLoading={isDashboardLoading}
      records={records}
      userName={userName}
      onRefresh={onRefreshDashboard}
      onSetDateFilter={onSetDateFilter}
    />
  );
}

function HomePage({
  apiData,
  dateFilter,
  error,
  isLoading,
  records,
  userName,
  onRefresh,
  onSetDateFilter,
}: {
  apiData: DashboardData;
  dateFilter: DashboardDateFilter;
  error: string;
  isLoading: boolean;
  records: LocalRecord[];
  userName: string;
  onRefresh: () => void;
  onSetDateFilter: (filter: DashboardDateFilter) => void;
}) {
  const filteredOrders = filterOrdersByPeriod(apiData.orders, dateFilter);
  const apiRevenue = filteredOrders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
    0,
  );
  const localRevenue = records
    .filter(record => record.action === 'invoice')
    .reduce((total, record) => total + (record.amount || 0), 0);
  const sales = apiRevenue + localRevenue;
  const localOrders = records.filter(record => record.action === 'order');
  const orderCount = filteredOrders.length + localOrders.length;
  const customerCount = apiData.users.filter(
    user => !['admin', 'super admin'].includes(String(user.role || '').toLowerCase()),
  ).length;
  const catalogCount =
    apiData.products.length + apiData.albums.length + apiData.gifts.length;
  const catalogItems: ApiCatalogItem[] = [
    ...apiData.products,
    ...apiData.albums,
    ...apiData.gifts,
  ];
  const lowStockItems = catalogItems.filter(
    (item: ApiCatalogItem) => getItemStock(item) <= 15,
  );
  const lowStockCount = lowStockItems.length;
  const recentApiOrders = [...apiData.orders]
    .sort(
      (a, b) =>
        getRecordTimestamp(b.order_date || b.created_at) -
        getRecordTimestamp(a.order_date || a.created_at),
    )
    .slice(0, 5);
  const hasAnyData =
    apiData.orders.length > 0 ||
    apiData.users.length > 0 ||
    apiData.products.length > 0 ||
    apiData.albums.length > 0 ||
    apiData.gifts.length > 0 ||
    records.length > 0;
  return (
    <ScrollView
      contentContainerStyle={{
        alignSelf: 'center',
        maxWidth: 1100,
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
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([
            ['today', 'Today'],
            ['this-week', 'Week'],
            ['this-month', 'Month'],
            ['all', 'All'],
          ] as const).map(([filter, label]) => (
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
      </View>

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

      <View style={styles.statsGrid}>
        <StatCard
          label="Total sales"
          value={isLoading && !hasAnyData ? '—' : formatCurrency(sales)}
          icon={ChartIcon}
        />
        <StatCard
          label="Orders"
          value={isLoading && !hasAnyData ? '—' : String(orderCount)}
          icon={OrdersIcon}
        />
        <StatCard
          label="Customers"
          value={isLoading && !hasAnyData ? '—' : String(customerCount)}
          icon={CustomersIcon}
        />
        <StatCard
          label="Products"
          value={isLoading && !hasAnyData ? '—' : String(catalogCount)}
          icon={ProductIcon}
        />
        <StatCard
          label="Low stock"
          value={isLoading && !hasAnyData ? '—' : String(lowStockCount)}
          icon={ReceiptIcon}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sales overview</Text>
        <Text style={styles.smallMuted}>{getDateFilterLabel(dateFilter)}</Text>
      </View>
      <SalesOverview orders={filteredOrders} />

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
      <OrderStatusSummary orders={filteredOrders} />

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
                    {item.product_name || item.name || 'Product'}
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

function SalesOverview({ orders }: { orders: ApiOrder[] }) {
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
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: revenueByDay.get(key) || 0,
    };
  });
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

function OrderStatusSummary({ orders }: { orders: ApiOrder[] }) {
  const statuses = [
    { label: 'Delivered', count: 0, color: '#15803D' },
    { label: 'Processing', count: 0, color: '#D97706' },
    { label: 'Shipped', count: 0, color: '#2563EB' },
    { label: 'Cancelled', count: 0, color: colors.error },
    { label: 'Other', count: 0, color: colors.textSecondary },
  ];
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
  const total = orders.length || 1;
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
  onUpdateOrderStatus,
}: {
  orders: LocalRecord[];
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
      <Text style={styles.pageTitle}>Orders</Text>
      <Text style={styles.pageSubtitle}>Keep track of every customer order.</Text>
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
  onPressPlus,
}: {
  activeTab: AppTab;
  onPressTab: (tab: AppTab) => void;
  onPressPlus: () => void;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        elevation: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        minHeight: 68,
        paddingHorizontal: 4,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }}
    >
      <TabButton
        active={activeTab === 'home'}
        icon={HomeIcon}
        label="Home"
        onPress={() => onPressTab('home')}
      />
      <TabButton
        active={activeTab === 'billing'}
        icon={ReceiptIcon}
        label="Billing"
        onPress={() => onPressTab('billing')}
      />
      <Pressable
        accessibilityLabel="Quick actions"
        accessibilityRole="button"
        onPress={onPressPlus}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: pressed ? '#1D4ED8' : colors.primary,
          borderColor: colors.surface,
          borderRadius: 30,
          borderWidth: 4,
          elevation: 8,
          height: 58,
          justifyContent: 'center',
          marginTop: -25,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.24,
          shadowRadius: 7,
          width: 58,
        })}
      >
        <PlusIcon color={colors.surface} size={27} />
      </Pressable>
      <TabButton
        active={activeTab === 'orders'}
        icon={OrdersIcon}
        label="Orders"
        onPress={() => onPressTab('orders')}
      />
      <TabButton
        active={activeTab === 'more'}
        icon={MoreIcon}
        label="More"
        onPress={() => onPressTab('more')}
      />
    </View>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof HomeIcon;
  label: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tint = active ? colors.primary : colors.textSecondary;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed || hovered ? '#F3F7FF' : 'transparent',
        borderRadius: 12,
        flex: 1,
        gap: 4,
        justifyContent: 'center',
        minHeight: 58,
      })}
    >
      <Icon color={tint} size={21} />
      <Text
        numberOfLines={1}
        style={{
          color: tint,
          fontSize: 10,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QuickActionSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (action: QuickActionId) => void;
}) {
  const { width } = useWindowDimensions();
  const columns = width >= 600 ? 4 : 2;
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityLabel="Close quick actions"
        onPress={onClose}
        style={{ ...overlayFill, backgroundColor: '#11182766', top: 0 }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          elevation: 24,
          maxHeight: '82%',
          paddingBottom: 8,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.16,
          shadowRadius: 18,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: colors.border,
            borderRadius: 3,
            height: 5,
            marginTop: 10,
            width: 38,
          }}
        />
        <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14 }}>
          <Text style={styles.pageTitle}>Quick actions</Text>
          <Text style={styles.pageSubtitle}>What would you like to do?</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Pressable
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                  key={action.id}
                  onPress={() => onSelect(action.id)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: pressed ? '#F3F7FF' : colors.surface,
                    borderColor: colors.border,
                    borderRadius: 16,
                    borderWidth: 1,
                    marginBottom: 10,
                    marginHorizontal: '1.5%',
                    minHeight: 98,
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                    width: `${(100 - columns * 3) / columns}%`,
                  })}
                >
                  <View style={styles.featureIcon}>
                    <Icon color={colors.primary} size={21} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '600',
                      marginTop: 9,
                      textAlign: 'center',
                    }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
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
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ChartIcon;
}) {
  return (
    <View style={[styles.card, { flex: 1, minWidth: 145, padding: 16 }]}>
      <View style={styles.statIcon}>
        <Icon color={colors.primary} size={18} />
      </View>
      <Text style={[styles.mutedText, { marginTop: 16 }]}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

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
    gap: 10,
    marginTop: 22,
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
