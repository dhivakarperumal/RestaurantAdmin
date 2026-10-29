import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import colors from '../../theme/colors';
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
  ProfileIcon,
  ProductIcon,
  ReceiptIcon,
} from './NavigationIcons';
import TopHeader, { type HeaderUser } from './TopHeader';
import MoreInnerHeader from './MoreInnerHeader';
import { BottomNavigation, type AppTab } from './Bottombar';
import type {
  ApiBill,
  ApiCatalogItem,
  ApiCategory,
  ApiInventorySummary,
  ApiKitchenRequest,
  ApiKitchenTicket,
  ApiOrder,
  ApiOrderItem,
  ApiRevenueSummary,
  ApiRevenueStatus,
  ApiRevenueTrend,
  BillingLineItem,
  DashboardData,
  DashboardDateFilter,
  DashboardReport,
  LocalRecord,
  QuickAction,
  QuickActionId,
} from './DashboardTypes';
import FloatingActionMenu from './FloatingActionMenu';
import AddCategoryIcon from './AddCategoryIcon';
import Bills, { type BillFood } from '../Tabs/Bills';
import Items from '../Tabs/Items';
import InventoryScreen from '../Tabs/Inventory';
import CategoriesScreen from '../Screens/Categories';
import AddCategoriesScreen from '../Screens/AddCategories';
import CuisineScreen from '../Screens/Cuisine';
import AddCuisineScreen from '../Screens/AddCuisine';
import EmployeeAttendance from '../Screens/EmployeeAttendance';
import EmployeesPage from '../Screens/Employees';
import ReservationsScreen from '../Screens/Reservations';
import OrdersScreen from '../Screens/Orders';
import BannerManagementPage from '../Tabs/BannerManagement';
import GalleryManagementPage from '../Tabs/GalleryManagement';
import ReviewsManagementPage from '../Tabs/ReviewsManagement';
import PrinterSetupScreen from '../Tabs/Settings/PrinterSetup/PrinterSetupScreen';
import TablesScreen from '../Screens/Tables';
import CustomersScreen from '../Screens/Customers';
import MorePage, { type MoreFeature } from '../Tabs/More';
import api from '../../../api';
import {
  BaseModal,
  CheckIcon,
  DetailsModal,
  FormModal,
} from '../../components/popups';

type DashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type ItemsAddRequest = { id: number; action: 'product' };
type ApiUser = {
  role?: string;
};

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[] | null;
      bills?: T[] | null;
      orders?: T[] | null;
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

const quickActionFeatureDetails: Record<
  string,
  { subtitle: string; action: QuickActionId }
> = Object.fromEntries(
  quickActions.map(({ id, label, description }) => [
    label,
    { subtitle: description, action: id },
  ]),
);

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

const moreFeatures: MoreFeature[] = [
  {
    title: 'Orders Management',
    subtitle: 'View and manage customer orders',
    icon: OrdersIcon,
  },
  {
    title: 'Categories',
    subtitle: 'Manage product categories',
    icon: AddCategoryIcon,
  },
  {
    title: 'Reservations',
    subtitle: 'Manage table bookings and guest requests',
    icon: ReceiptIcon,
  },
  {
    title: 'Cuisines',
    subtitle: 'View restaurant cuisines',
    icon: MenuIcon,
  },
  {
    title: 'Tables',
    subtitle: 'Manage restaurant tables and seating',
    icon: MenuIcon,
  },
  {
    title: 'Printer Setup',
    subtitle: 'Configure receipt and kitchen printers',
    icon: ReceiptIcon,
  },
  {
    title: 'Banner Management',
    subtitle: 'Create and manage website banners',
    icon: MenuIcon,
  },
  {
    title: 'Gallery Management',
    subtitle: 'Manage website photo galleries',
    icon: MenuIcon,
  },
  {
    title: 'Review Management',
    subtitle: 'Manage customer ratings and reviews',
    icon: CustomersIcon,
  },
  {
    title: 'Customers',
    subtitle: 'Customer list and details',
    icon: CustomersIcon,
    action: 'customer' as QuickActionId,
  },
  {
    title: 'Products & Inventory',
    subtitle: 'Products, prices, and stock',
    icon: ProductIcon,
    action: 'product' as QuickActionId,
  },
  {
    title: 'Kitchen Requests',
    subtitle: 'Review and manage kitchen inventory requests',
    icon: MenuIcon,
  },

  {
    title: 'Reports & Analytics',
    subtitle: 'Business performance overview',
    icon: ChartIcon,
  },

  
  {
    title: 'Staff & Employees',
    subtitle: 'Manage your team',
    icon: CustomersIcon,
  },
  {
    title: 'Employee Attendance',
    subtitle: 'Review daily shifts and attendance history',
    icon: ReceiptIcon,
  },

  {
    title: 'Help & Support',
    subtitle: 'Get help with your account',
    icon: ProfileIcon,
  },
  {
    title: 'Profile',
    subtitle: 'View your account details',
    icon: ProfileIcon,
  },
  
];

function DashboardScreen({ user, onLogout }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [itemsAddRequest, setItemsAddRequest] =
    useState<ItemsAddRequest | null>(null);
  const nextItemsAddRequestId = useRef(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isItemsInnerPageOpen, setIsItemsInnerPageOpen] = useState(false);
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false);
  const [isDeliveryAssignmentOpen, setIsDeliveryAssignmentOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickActionId | null>(
    null,
  );
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const cuisineReturnFeature = useRef<string | null>(null);
  const [billingItems, setBillingItems] = useState<BillingLineItem[]>([]);
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
              nextData.kitchenOrders =
                readResponsePropertyRows<ApiKitchenTicket>(
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
              nextData.foods = readCatalogRows(result.value.data);
              break;
            case 'inventory':
              nextData.inventory = readResponseObject<ApiInventorySummary>(
                result.value.data as ApiListResponse<ApiCatalogItem>,
              );
              break;
            case 'kitchenRequests':
              {
                const kitchenRequestRows = readResponseRows<ApiKitchenRequest>(
                  result.value.data,
                );
                nextData.kitchenRequests =
                  kitchenRequestRows.length > 0
                    ? kitchenRequestRows
                    : readResponsePropertyRows<ApiKitchenRequest>(
                        result.value.data,
                        'kitchen_requests',
                      );
              }
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
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
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
    const trend =
      dateFilter === 'year' || dateFilter === 'lastYear' ? 'year' : 'month';

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
    setIsItemsInnerPageOpen(false);
    setIsBillPreviewOpen(false);
    setIsDeliveryAssignmentOpen(false);
    setSelectedAction(null);
    setSelectedFeature(null);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const navigateToMoreFeature = (feature: string | null) => {
    setActiveTab('more');
    setIsItemsInnerPageOpen(false);
    setIsDeliveryAssignmentOpen(false);
    setSelectedAction(null);
    setSelectedFeature(feature);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const navigateFromSidebar = (tab: AppTab) => {
    if (tab === 'more') {
      navigateToMoreFeature(null);
      return;
    }
    navigateToTab(tab);
  };

  const handleItemsInnerPageVisibilityChange = (isVisible: boolean) => {
    setIsItemsInnerPageOpen(isVisible);
    if (isVisible) {
      setIsSidebarOpen(false);
      setIsNotificationsOpen(false);
    }
  };

  const navigateToAction = (action: QuickActionId) => {
    setSelectedAction(action);
    setSelectedFeature(null);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const openItemsAddForm = () => {
    nextItemsAddRequestId.current += 1;
    setItemsAddRequest({
      id: nextItemsAddRequestId.current,
      action: 'product',
    });
    navigateToTab('items');
  };

  const openAddCategoryPage = () => {
    setActiveTab('more');
    setIsItemsInnerPageOpen(false);
    setSelectedAction(null);
    setSelectedFeature('AddCategory');
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const openAddCuisinePage = (returnFeature: string | null) => {
    cuisineReturnFeature.current = returnFeature;
    setActiveTab('more');
    setSelectedAction(null);
    setSelectedFeature('AddCuisine');
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const closeAddCuisinePage = () => {
    const returnFeature = cuisineReturnFeature.current;
    cuisineReturnFeature.current = null;
    setSelectedFeature(returnFeature);
  };

  const handleItemsAddRequestHandled = (id: number) => {
    setItemsAddRequest(current => (current?.id === id ? null : current));
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

  const addFoodToBilling = (food: BillFood) => {
    const price = food.price;
    setBillingItems(current => [
      ...current,
      {
        id: `${food.id}-${Date.now()}-${current.length}`,
        name: food.name,
        category: food.category,
        image: food.image,
        amount: price,
        quantity: 1,
      },
    ]);
  };

  const updateBillingItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFoodFromBilling(itemId);
      return;
    }
    setBillingItems(current =>
      current.map(item => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const removeFoodFromBilling = (itemId: string) => {
    setBillingItems(current => current.filter(item => item.id !== itemId));
  };

  const createInvoiceFromBillingItems = () => {
    if (
      !billingItems.length ||
      billingItems.some(item => item.amount === null)
    ) {
      return;
    }
    const total = billingItems.reduce(
      (sum, item) => sum + (item.amount ?? 0) * item.quantity,
      0,
    );
    setRecords(current => [
      {
        id: Date.now(),
        action: 'invoice',
        name: `Food billing - ${billingItems.length} ${
          billingItems.length === 1 ? 'item' : 'items'
        }`,
        amount: total,
        createdAt: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
      ...current,
    ]);
    setBillingItems([]);
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
  const isMoreFeatureOpen =
    activeTab === 'more' && selectedFeature !== null && !selectedActionDetails;
  const moreFeatureBack = () => {
    if (selectedFeature === 'AddCategory') {
      setActiveTab('more');
      setSelectedFeature('Categories');
    } else if (selectedFeature === 'AddCuisine') {
      setActiveTab('more');
      closeAddCuisinePage();
    } else {
      setActiveTab('more');
      setSelectedAction(null);
      setSelectedFeature(null);
    }
  };

  // Global hardware back button handler — covers every navigable state
  // Priority (highest → lowest):
  //  1. Sidebar open          → close sidebar
  //  2. Notifications open    → close notifications
  //  3. Action modal open     → close modal
  //  4. More sub-feature open → go back inside More
  //  5. Non-home tab active   → go back to Home tab
  //  6. Home tab              → let OS handle (exit app)
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // 1. Sidebar
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return true;
        }
        // 2. Notifications panel
        if (isNotificationsOpen) {
          setIsNotificationsOpen(false);
          return true;
        }
        // 3. Action modal (EntryForm)
        if (selectedAction) {
          setSelectedAction(null);
          return true;
        }
        // 4. More sub-feature inner screen
        if (isMoreFeatureOpen) {
          moreFeatureBack();
          return true;
        }
        if (isBillPreviewOpen) {
          setIsBillPreviewOpen(false);
          setActiveTab('home');
          return true;
        }
        // 5. Non-home tab → go to home
        if (activeTab !== 'home') {
          setActiveTab('home');
          setIsDeliveryAssignmentOpen(false);
          setSelectedAction(null);
          setSelectedFeature(null);
          setIsItemsInnerPageOpen(false);
          return true;
        }
        // 6. Already on home — let OS decide (exit app)
        return false;
      },
    );

    return () => subscription.remove();
  }, [
    isSidebarOpen,
    isNotificationsOpen,
    selectedAction,
    isMoreFeatureOpen,
    isBillPreviewOpen,
    selectedFeature,
    activeTab,
  ]);

  return (
    <SafeAreaView
      edges={
        isItemsInnerPageOpen
          ? ['bottom']
          : isMoreFeatureOpen
          ? ['bottom']
          : isBillPreviewOpen
          ? ['bottom']
          : []
      }
      className="flex-1 bg-[#F9FAFB]"
    >
      {!isItemsInnerPageOpen &&
      !isMoreFeatureOpen &&
      !isDeliveryAssignmentOpen &&
      !isBillPreviewOpen ? (
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
      ) : null}
      {!isItemsInnerPageOpen && isMoreFeatureOpen ? (
        <MoreInnerHeader
          title={
            selectedFeature === 'AddCategory'
              ? 'Add Category'
              : selectedFeature === 'AddCuisine'
              ? 'Add Cuisine'
              : selectedFeature ?? 'More'
          }
          destination={
            selectedFeature === 'AddCategory'
              ? 'Categories'
              : selectedFeature === 'AddCuisine'
              ? 'Cuisines'
              : 'More'
          }
          onBack={moreFeatureBack}
        />
      ) : null}

      {isWide && isSidebarOpen ? (
        <View className="flex-1 flex-row">
          <Sidebar
            onClose={() => setIsSidebarOpen(false)}
            onNavigate={navigateFromSidebar}
            features={moreFeatures}
            onSelectFeature={navigateToMoreFeature}
          />
          <View className="flex-1">
            <MainContent
              activeTab={activeTab}
              invoices={invoices}
              billingItems={billingItems}
              orders={orders}
              records={records}
              dashboardData={dashboardData}
              dashboardReport={dashboardReport}
              dashboardError={[dashboardError, reportError]
                .filter(Boolean)
                .join(' ')}
              isDashboardLoading={isDashboardLoading}
              isReportLoading={isReportLoading}
              dateFilter={dateFilter}
              customFrom={customFrom}
              customTo={customTo}
              selectedAction={selectedActionDetails}
              selectedFeature={selectedFeature}
              userEmail={userEmail}
              userId={String(user?.user_id ?? user?.id ?? '')}
              userInitial={userInitial}
              userName={userName}
              itemsAddRequest={itemsAddRequest}
              onItemsAddRequestHandled={handleItemsAddRequestHandled}
              onOpenAddCuisine={openAddCuisinePage}
              onCloseAddCuisine={closeAddCuisinePage}
              onInnerPageVisibilityChange={handleItemsInnerPageVisibilityChange}
              onSelectAction={navigateToAction}
              onAddFoodToBilling={addFoodToBilling}
              onRemoveFoodFromBilling={removeFoodFromBilling}
              onQuantityChange={updateBillingItemQuantity}
              onOpenBilling={() => navigateToTab('billing')}
              onBillPreviewVisibilityChange={setIsBillPreviewOpen}
              onCreateInvoiceFromBillingItems={createInvoiceFromBillingItems}
              onCompleteBill={() => {
                createInvoiceFromBillingItems();
                navigateToTab('billing');
              }}
              onSelectFeature={navigateToMoreFeature}
              onUpdateOrderStatus={updateOrderStatus}
              onRefreshDashboard={() => setDashboardRefresh(count => count + 1)}
              onSetDateFilter={setDateFilter}
              onSetCustomFrom={setCustomFrom}
              onSetCustomTo={setCustomTo}
              onDeliveryAssignmentVisibilityChange={setIsDeliveryAssignmentOpen}
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
            billingItems={billingItems}
            orders={orders}
            records={records}
            dashboardData={dashboardData}
            dashboardReport={dashboardReport}
            dashboardError={[dashboardError, reportError]
              .filter(Boolean)
              .join(' ')}
            isDashboardLoading={isDashboardLoading}
            isReportLoading={isReportLoading}
            dateFilter={dateFilter}
            customFrom={customFrom}
            customTo={customTo}
            selectedAction={selectedActionDetails}
            selectedFeature={selectedFeature}
            userEmail={userEmail}
            userId={String(user?.user_id ?? user?.id ?? '')}
            userInitial={userInitial}
            userName={userName}
            itemsAddRequest={itemsAddRequest}
            onItemsAddRequestHandled={handleItemsAddRequestHandled}
            onOpenAddCuisine={openAddCuisinePage}
            onCloseAddCuisine={closeAddCuisinePage}
            onInnerPageVisibilityChange={handleItemsInnerPageVisibilityChange}
            onSelectAction={navigateToAction}
            onAddFoodToBilling={addFoodToBilling}
            onRemoveFoodFromBilling={removeFoodFromBilling}
            onQuantityChange={updateBillingItemQuantity}
            onOpenBilling={() => navigateToTab('billing')}
            onBillPreviewVisibilityChange={setIsBillPreviewOpen}
            onCreateInvoiceFromBillingItems={createInvoiceFromBillingItems}
            onCompleteBill={() => {
              createInvoiceFromBillingItems();
              navigateToTab('billing');
            }}
            onSelectFeature={navigateToMoreFeature}
            onUpdateOrderStatus={updateOrderStatus}
            onRefreshDashboard={() => setDashboardRefresh(count => count + 1)}
            onSetDateFilter={setDateFilter}
            onSetCustomFrom={setCustomFrom}
            onSetCustomTo={setCustomTo}
            onDeliveryAssignmentVisibilityChange={setIsDeliveryAssignmentOpen}
          />
        </View>
      )}

      {!isMoreFeatureOpen &&
      !isDeliveryAssignmentOpen &&
      !isItemsInnerPageOpen &&
      !isBillPreviewOpen ? (
        <BottomNavigation activeTab={activeTab} onPressTab={navigateToTab} />
      ) : null}
      {!isWide && activeTab === 'items' && !isItemsInnerPageOpen ? (
        <FloatingActionMenu
          onAddProduct={openItemsAddForm}
          onAddCategory={openAddCategoryPage}
          onAddCuisine={() => openAddCuisinePage(null)}
        />
      ) : null}

      {!isWide && isSidebarOpen ? (
        <View className="absolute bottom-0 left-0 right-0 top-0 z-[30]">
          <Pressable
            accessibilityLabel="Close sidebar"
            onPress={() => setIsSidebarOpen(false)}
            className="absolute bottom-0 left-0 right-0 top-0 z-0 bg-[#11182766]"
          />
          <View
            className="absolute bottom-0 left-0 right-0 top-0 z-[1] w-full bg-white"
            style={{ elevation: 12, paddingTop: insets.top }}
          >
            <Sidebar
              fullWidth
              onClose={() => setIsSidebarOpen(false)}
              onNavigate={navigateFromSidebar}
              features={moreFeatures}
              onSelectFeature={navigateToMoreFeature}
            />
          </View>
        </View>
      ) : null}

      {isNotificationsOpen ? (
        <View
          className="absolute bottom-0 left-0 right-0 z-[25]"
          style={{ top: insets.top + 70 }}
        >
          <Pressable
            accessibilityLabel="Close notifications"
            onPress={() => setIsNotificationsOpen(false)}
            className="absolute bottom-0 left-0 right-0 top-0 bg-[#11182733]"
          />
          <View
            className={`mt-2 w-[320px] max-w-[92%] self-end rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl ${
              width < 480 ? 'mx-3' : 'mx-6'
            }`}
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
        <EntryForm
          action={selectedActionDetails}
          onCancel={() => setSelectedAction(null)}
          onSave={handleSaveAction}
        />
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

function filterOrdersByPeriod<
  T extends { order_date?: string; created_at?: string },
>(orders: T[], filter: DashboardDateFilter, customFrom = '', customTo = '') {
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
  return start !== null && end !== null && end >= start;
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
      if (
        typeof variant !== 'object' ||
        variant === null ||
        !('stock' in variant)
      ) {
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

function readCatalogRows(payload: unknown, depth = 0): ApiCatalogItem[] {
  if (depth > 4) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is ApiCatalogItem =>
        typeof item === 'object' && item !== null,
    );
  }
  if (typeof payload !== 'object' || payload === null) {
    return [];
  }

  const response = payload as Record<string, unknown>;
  for (const key of ['foods', 'items', 'data']) {
    if (key in response) {
      const rows = readCatalogRows(response[key], depth + 1);
      if (rows.length > 0 || Array.isArray(response[key])) {
        return rows;
      }
    }
  }
  return [];
}

function readResponsePropertyRows<T>(
  payload: unknown,
  property: 'bills' | 'orders' | 'kitchen_requests',
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
  billingItems,
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
  userId,
  userInitial,
  userName,
  itemsAddRequest,
  onItemsAddRequestHandled,
  onOpenAddCuisine,
  onCloseAddCuisine,
  onInnerPageVisibilityChange,
  onSelectAction,
  onAddFoodToBilling,
  onRemoveFoodFromBilling,
  onQuantityChange,
  onOpenBilling,
  onBillPreviewVisibilityChange,
  onCreateInvoiceFromBillingItems,
  onCompleteBill,
  onSelectFeature,
  onUpdateOrderStatus,
  onRefreshDashboard,
  onSetDateFilter,
  onSetCustomFrom,
  onSetCustomTo,
  onDeliveryAssignmentVisibilityChange,
}: {
  activeTab: AppTab;
  invoices: LocalRecord[];
  billingItems: BillingLineItem[];
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
  userId: string;
  userInitial: string;
  userName: string;
  itemsAddRequest: ItemsAddRequest | null;
  onItemsAddRequestHandled: (id: number) => void;
  onOpenAddCuisine: (returnFeature: string | null) => void;
  onCloseAddCuisine: () => void;
  onInnerPageVisibilityChange: (isVisible: boolean) => void;
  onSelectAction: (action: QuickActionId) => void;
  onAddFoodToBilling: (food: BillFood) => void;
  onRemoveFoodFromBilling: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpenBilling: () => void;
  onBillPreviewVisibilityChange: (isVisible: boolean) => void;
  onCreateInvoiceFromBillingItems: () => void;
  onCompleteBill: () => void;
  onSelectFeature: (feature: string | null) => void;
  onUpdateOrderStatus: (
    orderId: number,
    status: NonNullable<LocalRecord['status']>,
  ) => void;
  onRefreshDashboard: () => void;
  onSetDateFilter: (filter: DashboardDateFilter) => void;
  onSetCustomFrom: (date: string) => void;
  onSetCustomTo: (date: string) => void;
  onDeliveryAssignmentVisibilityChange: (isVisible: boolean) => void;
}) {
  if (selectedAction) {
    return (
      <PageShell
        title={selectedAction.label}
        subtitle={selectedAction.description}
      >
        <Text className="text-sm text-[#6B7280]">
          Complete the form to add this item.
        </Text>
      </PageShell>
    );
  }

  if (selectedFeature) {
    if (selectedFeature === 'Products & Inventory') {
      return <InventoryScreen />;
    }
    if (selectedFeature === 'Reservations') {
      return <ReservationsScreen onBack={() => onSelectFeature(null)} />;
    }
    if (selectedFeature === 'Customers') {
      return (
        <CustomersScreen
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (selectedFeature === 'Tables') {
      return (
        <TablesScreen
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
          userId={userId}
        />
      );
    }
    if (selectedFeature === 'Cuisines') {
      return (
        <CuisineScreen
          onAddCuisine={() => onOpenAddCuisine('Cuisines')}
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (selectedFeature === 'AddCuisine') {
      return (
        <AddCuisineScreen
          onBack={onCloseAddCuisine}
          showBackButton={true}
        />
      );
    }
    if (selectedFeature === 'Categories') {
      return (
        <CategoriesScreen
          onAddCategory={() => onSelectFeature('AddCategory')}
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (selectedFeature === 'AddCategory') {
      return (
        <AddCategoriesScreen
          onBack={() => onSelectFeature('Categories')}
          showBackButton={true}
        />
      );
    }
    if (selectedFeature === 'Orders' || selectedFeature === 'Orders Management') {
      return (
        <OrdersScreen
          onBack={() => onSelectFeature(null)}
          onAddOrder={() => onSelectAction('order')}
          onDeliveryAssignmentVisibilityChange={
            onDeliveryAssignmentVisibilityChange
          }
        />
      );
    }
    if (selectedFeature === 'Kitchen Requests') {
      return <KitchenRequestsScreen />;
    }

    if (selectedFeature === 'Printer Setup') {
      return (
        <PrinterSetupScreen
          onBack={() => onSelectFeature(null)}
          showHeader={false}
        />
      );
    }
    if (selectedFeature === 'Banner Management') {
      return (
        <BannerManagementPage
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (selectedFeature === 'Gallery Management') {
      return (
        <GalleryManagementPage
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (selectedFeature === 'Review Management') {
      return (
        <ReviewsManagementPage
          currentUser={userName}
          onBack={() => onSelectFeature(null)}
          showBackButton={false}
        />
      );
    }
    if (
      selectedFeature === 'Employee Management' ||
      selectedFeature === 'Staff & Employees'
    ) {
      return <EmployeesPage onBack={() => onSelectFeature(null)} />;
    }
    if (selectedFeature === 'Employee Attendance') {
      return <EmployeeAttendance onBack={() => onSelectFeature(null)} />;
    }
    if (selectedFeature === 'Profile') {
      return (
        <PageShell title="Profile" subtitle="Your account details">
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
            <Avatar initial={userInitial} size={56} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-[#012711]">
                {userName}
              </Text>
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
                {userEmail}
              </Text>
            </View>
          </View>
        </PageShell>
      );
    }
    const feature =
      moreFeatures.find(item => item.title === selectedFeature) ||
      quickActionFeatureDetails[selectedFeature];
    const relatedAction = feature?.action;
    const relatedQuickAction = quickActions.find(
      action => action.id === relatedAction,
    );
    return (
      <PageShell
        title={selectedFeature}
        subtitle={feature?.subtitle || 'Business tools and account options'}
      >
        {relatedQuickAction ? (
          <Pressable
            accessibilityLabel={relatedQuickAction.label}
            accessibilityRole="button"
            onPress={() => onSelectAction(relatedQuickAction.id)}
            className="flex-row items-center gap-2 rounded-xl bg-[#116C0B] px-[15px] py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <PlusIcon color={colors.surface} size={18} />
            <Text className="text-[13px] font-bold text-white">
              {relatedQuickAction.label}
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
      </PageShell>
    );
  }

  if (activeTab === 'billing') {
    return (
      <BillingPage
        billingItems={billingItems}
        invoices={invoices}
        onCreateInvoice={() => onSelectAction('invoice')}
        onCreateInvoiceFromBillingItems={onCreateInvoiceFromBillingItems}
      />
    );
  }
  if (activeTab === 'orders') {
    return (
      <OrdersScreen
        onAddOrder={() => onSelectAction('order')}
        onDeliveryAssignmentVisibilityChange={
          onDeliveryAssignmentVisibilityChange
        }
      />
    );
  }
  if (activeTab === 'items') {
    return (
      <Items
        actor={userName}
        pendingAddRequest={itemsAddRequest}
        onAddRequestHandled={onItemsAddRequestHandled}
        onAddCuisine={() => onOpenAddCuisine(null)}
        onInnerPageVisibilityChange={onInnerPageVisibilityChange}
        showAddButton={false}
      />
    );
  }
  if (activeTab === 'add') {
    return (
      <Bills
        billingItems={billingItems}
        onAddFood={onAddFoodToBilling}
        onRemoveBillingItem={onRemoveFoodFromBilling}
        onQuantityChange={onQuantityChange}
        onOpenBilling={onOpenBilling}
        onConfirmBill={onCompleteBill}
        onBillPreviewVisibilityChange={onBillPreviewVisibilityChange}
      />
    );
  }
  if (activeTab === 'more') {
    return (
      <MorePage
        features={moreFeatures}
        onSelectFeature={onSelectFeature}
      />
    );
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
  const summaryCardGap = 10;
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
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
          String(order.order_status || '')
            .trim()
            .toLowerCase(),
        ),
      )
      .reduce((total, order) => total + Number(order.total_amount || 0), 0) +
    filteredBills
      .filter(
        bill =>
          String(bill.status || '')
            .trim()
            .toLowerCase() === 'paid',
      )
      .reduce((total, bill) => total + Number(bill.grand_total || 0), 0);
  const localRevenue = records
    .filter(record => record.action === 'invoice')
    .reduce((total, record) => total + (record.amount || 0), 0);
  const sales = Number(
    report.summary?.totalRevenue ?? apiRevenue + localRevenue,
  );
  const localOrders = records.filter(record => record.action === 'order');
  const reportOrderCount = report.statuses.reduce(
    (total, status) => total + Number(status.count || 0),
    0,
  );
  const orderCount =
    (report.statuses.length
      ? reportOrderCount
      : filteredOrders.length + filteredBills.length) + localOrders.length;
  const customerCount = apiData.users.filter(user =>
    ['user', 'customer'].includes(
      String(user.role || '')
        .trim()
        .toLowerCase(),
    ),
  ).length;
  const catalogItems = apiData.foods;
  const lowStockItems = catalogItems.filter(
    (item: ApiCatalogItem) => getItemStock(item) <= 15,
  );
  const lowStockCount = Number(
    apiData.inventory.lowStock ?? lowStockItems.length,
  );
  const todayRevenue =
    todayOrders
      .filter(order =>
        ['delivered', 'completed', 'served'].includes(
          String(order.order_status || '')
            .trim()
            .toLowerCase(),
        ),
      )
      .reduce((total, order) => total + Number(order.total_amount || 0), 0) +
    todayBills
      .filter(
        bill =>
          String(bill.status || '')
            .trim()
            .toLowerCase() === 'paid',
      )
      .reduce((total, bill) => total + Number(bill.grand_total || 0), 0);
  const todayOrderCount = todayOrders.length + todayBills.length;
  const pendingOrderCount = report.statuses.length
    ? report.statuses
        .filter(status =>
          ['pending', 'placed', 'preparing', 'ready'].includes(
            String(status.status || '')
              .trim()
              .toLowerCase(),
          ),
        )
        .reduce((total, status) => total + Number(status.count || 0), 0)
    : filteredOrders.filter(order =>
        [
          'pending',
          'placed',
          'confirmed',
          'preparing',
          'processing',
          'ready',
        ].includes(
          String(order.order_status || '')
            .trim()
            .toLowerCase(),
        ),
      ).length;
  const completedOrderCount = report.statuses.length
    ? report.statuses
        .filter(status =>
          ['delivered', 'completed', 'served'].includes(
            String(status.status || '')
              .trim()
              .toLowerCase(),
          ),
        )
        .reduce((total, status) => total + Number(status.count || 0), 0)
    : filteredOrders.filter(order =>
        ['delivered', 'completed', 'served'].includes(
          String(order.order_status || '')
            .trim()
            .toLowerCase(),
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
    const id = String(
      item.food_id || item.food_name || item.product_name || 'item',
    );
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
    .filter(
      order => String(order.order_status || '').toLowerCase() === 'delivered',
    )
    .forEach(order => (order.items || []).forEach(addTopItem));
  filteredBills
    .filter(bill => String(bill.status || '').toLowerCase() === 'paid')
    .forEach(bill => {
      const tickets =
        kitchenTicketsByBill.get(String(bill.bill_id || '')) || [];
      if (
        tickets.length &&
        tickets.every(ticket =>
          ['served', 'delivered'].includes(
            String(ticket.status || '').toLowerCase(),
          ),
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
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
      ? 'Good afternoon'
      : 'Good evening';
  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerClassName="mx-auto w-full max-w-[1440px] px-5 pb-6 pt-6"
    >
      <View className="flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3.5">
        <View className="mr-3 h-10 w-1 rounded-full bg-[#116C0B]" />
        <View className="flex-1">
          <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
            OVERVIEW
          </Text>
          <Text className="mt-0.5 text-xl font-bold text-[#012711]">
            {greeting}, {userName}
          </Text>
          <Text className="mt-0.5 text-xs leading-[18px] text-[#6B7280]">
            Here’s your restaurant at a glance.
          </Text>
        </View>
      </View>

      <View className="mt-[18px] flex-row flex-wrap items-center justify-between gap-y-2.5">
        <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
          Store performance
        </Text>
        <Pressable
          accessibilityLabel={`Date range: ${dashboardPeriods.find(period => period.value === dateFilter)?.label || 'Select'}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isDateFilterOpen }}
          onPress={() => setIsDateFilterOpen(true)}
          className="min-w-[142px] flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5"
        >
          <Text className="text-[12px] font-semibold text-[#012711]">
            {dashboardPeriods.find(period => period.value === dateFilter)?.label || 'Select range'}
          </Text>
          <Text className="ml-3 text-xs text-[#6B7280]">⌄</Text>
        </Pressable>
      </View>
      <BaseModal
        visible={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        title="Select Date Range"
        subtitle="Choose a period to analyze sales, orders, and attendance"
        variant="bottom-sheet"
      >
        <ScrollView className="max-h-[360px]" contentContainerClassName="gap-1 pb-4">
          {dashboardPeriods.map(({ value: filter, label }) => {
            const isSelected = dateFilter === filter;
            return (
              <Pressable
                accessibilityLabel={`Show ${label.toLowerCase()} dashboard data`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={filter}
                onPress={() => {
                  onSetDateFilter(filter);
                  setIsDateFilterOpen(false);
                }}
                className={`my-0.5 flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${
                  isSelected
                    ? 'border border-[#116C0B]/20 bg-[#116C0B]/10'
                    : 'border border-transparent bg-transparent active:bg-gray-100'
                }`}
              >
                <Text
                  className="text-sm"
                  style={{
                    color: isSelected ? '#116C0B' : '#1E293B',
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {label}
                </Text>
                {isSelected && <CheckIcon size={18} color="#116C0B" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </BaseModal>
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
            <Text className="text-xs font-bold text-[#116C0B]">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mt-5" style={{ gap: summaryCardGap }}>
        <View style={{ flexDirection: 'row', gap: summaryCardGap }}>
          <StatCard
            label="Total Revenue"
            value={isLoading && !hasAnyData ? '-' : formatCurrency(sales)}
            detail="in selected period"
            badge="PERIOD"
            tone="green"
            icon={ChartIcon}
          />
          <StatCard
            label="Total Orders"
            value={isLoading && !hasAnyData ? '-' : String(orderCount)}
            detail="in selected period"
            badge="PERIOD"
            tone="blue"
            icon={OrdersIcon}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: summaryCardGap }}>
          <StatCard
            label="Pending Orders"
            value={isLoading && !hasAnyData ? '-' : String(pendingOrderCount)}
            detail="active right now"
            badge="LIVE"
            tone="green"
            icon={OrdersIcon}
          />
          <StatCard
            label="Completed Orders"
            value={isLoading && !hasAnyData ? '-' : String(completedOrderCount)}
            detail="in selected period"
            badge="PERIOD"
            tone="purple"
            icon={ProductIcon}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: summaryCardGap }}>
          <StatCard
            label="Today's Revenue"
            value={isLoading && !hasAnyData ? '-' : formatCurrency(todayRevenue)}
            detail="from all channels today"
            badge="TODAY"
            tone="cyan"
            icon={PaymentIcon}
          />
          <StatCard
            label="Today's Orders"
            value={isLoading && !hasAnyData ? '-' : String(todayOrderCount)}
            detail="from all channels today"
            badge="TODAY"
            tone="pink"
            icon={OrdersIcon}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: summaryCardGap }}>
          <StatCard
            label="Total Customers"
            value={isLoading && !hasAnyData ? '-' : String(customerCount)}
            detail="registered customers"
            badge="TOTAL"
            tone="teal"
            icon={CustomersIcon}
          />
          <StatCard
            label="Low Stock Items"
            value={isLoading && !hasAnyData ? '-' : String(lowStockCount)}
            detail="needs attention"
            badge="STOCK"
            tone="red"
            icon={ReceiptIcon}
          />
        </View>
      </View>

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">
          Sales overview
        </Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
          {getDateFilterLabel(dateFilter)}
        </Text>
      </View>
      {isReportLoading && !report.trend.length ? (
        <View className="min-h-[72px] items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SalesOverview
          orders={apiData.orders}
          bills={apiData.bills}
          filteredOrders={filteredOrders}
          trend={report.trend}
        />
      )}

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">
          Recent orders
        </Text>
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
          <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
            Loading your store data…
          </Text>
        </View>
      ) : recentApiOrders.length || localOrders.length ? (
        <>
          {recentApiOrders.map((order, index) => (
            <ApiOrderRow
              key={order.order_id || order.id || `recent-${index}`}
              order={order}
            />
          ))}
          {localOrders
            .slice(0, Math.max(0, 5 - recentApiOrders.length))
            .map(record => (
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
        <Text className="text-base font-bold text-[#012711]">
          Top-selling items
        </Text>
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
              <Text className="text-sm font-semibold text-[#012711]">
                {item.name}
              </Text>
              <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
                {item.quantity} sold
              </Text>
            </View>
            <Text className="text-[13px] font-bold text-[#012711]">
              {formatCurrency(item.revenue)}
            </Text>
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
            <Text className="text-base font-bold text-[#012711]">
              Food categories
            </Text>
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
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
                  {category.status || 'Available'}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {lowStockCount > 0 ? (
        <>
          <View className="mb-3 mt-7 flex-row items-center justify-between">
            <Text className="text-base font-bold text-[#012711]">
              Low stock alerts
            </Text>
            <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
              {lowStockCount} items
            </Text>
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
                <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
                  Stock is running low
                </Text>
              </View>
              <Text className="text-[13px] font-bold" style={{ color: colors.primary }}>
                {getItemStock(item)} left
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

type SalesFilterMode = 'daily' | 'weekly' | 'monthly';

type SalesBarItem = {
  key: string;
  label: string;
  sublabel: string;
  fullLabel: string;
  revenue: number;
  orderCount: number;
};

function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(amount)}`;
}

function computeSalesData(
  mode: SalesFilterMode,
  orders: ApiOrder[],
  bills: ApiBill[],
  trend: ApiRevenueTrend[],
): SalesBarItem[] {
  const now = new Date();

  type Transaction = {
    date: Date;
    amount: number;
  };

  const transactions: Transaction[] = [];

  orders.forEach(order => {
    const status = String(order.order_status || '').trim().toLowerCase();
    if (['cancelled', 'canceled'].includes(status)) {
      return;
    }
    const d = getOrderDate(order);
    if (!d) return;
    const amt = Number(order.total_amount || 0);
    if (amt >= 0) {
      transactions.push({ date: d, amount: amt });
    }
  });

  bills.forEach(bill => {
    const status = String(bill.status || '').trim().toLowerCase();
    if (['cancelled', 'canceled'].includes(status)) {
      return;
    }
    const d = getOrderDate(bill);
    if (!d) return;
    const amt = Number(bill.grand_total || 0);
    if (amt >= 0) {
      transactions.push({ date: d, amount: amt });
    }
  });

  const hasTransactions = transactions.length > 0;

  if (mode === 'daily') {
    const items: SalesBarItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

      const shortDay = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayNum = String(d.getDate());
      const fullLabel =
        i === 0
          ? `Today (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
          : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      let revenue = 0;
      let orderCount = 0;

      if (hasTransactions) {
        transactions.forEach(t => {
          const time = t.date.getTime();
          if (time >= start && time <= end) {
            revenue += t.amount;
            orderCount += 1;
          }
        });
      }

      items.push({
        key: `daily-${i}`,
        label: shortDay,
        sublabel: dayNum,
        fullLabel,
        revenue,
        orderCount,
      });
    }

    if (!hasTransactions && trend.length > 0) {
      const slice = trend.slice(-7);
      return slice.map((t, idx) => ({
        key: `trend-d-${idx}`,
        label: t.label || t.date || `Day ${idx + 1}`,
        sublabel: '',
        fullLabel: t.label || t.date || `Period ${idx + 1}`,
        revenue: Number(t.revenue || 0),
        orderCount: Number(t.orders || 0),
      }));
    }

    return items;
  }

  if (mode === 'weekly') {
    const items: SalesBarItem[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w * 7), 23, 59, 59, 999);
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w * 7 + 6), 0, 0, 0, 0);

      const startMs = weekStart.getTime();
      const endMs = weekEnd.getTime();

      const startMonth = weekStart.toLocaleDateString('en-IN', { month: 'short' });
      const endMonth = weekEnd.toLocaleDateString('en-IN', { month: 'short' });
      const sublabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${endMonth}`;
      const label = w === 0 ? 'This Wk' : `Wk ${4 - w}`;
      const fullLabel =
        w === 0
          ? `This Week (${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth})`
          : `Week ${4 - w} (${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth})`;

      let revenue = 0;
      let orderCount = 0;

      if (hasTransactions) {
        transactions.forEach(t => {
          const time = t.date.getTime();
          if (time >= startMs && time <= endMs) {
            revenue += t.amount;
            orderCount += 1;
          }
        });
      }

      items.push({
        key: `weekly-${w}`,
        label,
        sublabel,
        fullLabel,
        revenue,
        orderCount,
      });
    }

    return items;
  }

  // mode === 'monthly'
  const items: SalesBarItem[] = [];
  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const startMs = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const shortMonth = monthDate.toLocaleDateString('en-IN', { month: 'short' });
    const fullYear = monthDate.getFullYear();
    const sublabel = `'${String(fullYear).slice(-2)}`;
    const fullLabel = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    let revenue = 0;
    let orderCount = 0;

    if (hasTransactions) {
      transactions.forEach(t => {
        const time = t.date.getTime();
        if (time >= startMs && time <= endMs) {
          revenue += t.amount;
          orderCount += 1;
        }
      });
    }

    items.push({
      key: `monthly-${m}`,
      label: shortMonth,
      sublabel,
      fullLabel,
      revenue,
      orderCount,
    });
  }

  if (!hasTransactions && trend.length > 0) {
    const slice = trend.slice(-6);
    return slice.map((t, idx) => ({
      key: `trend-m-${idx}`,
      label: t.label || t.date || `M${idx + 1}`,
      sublabel: '',
      fullLabel: t.label || t.date || `Month ${idx + 1}`,
      revenue: Number(t.revenue || 0),
      orderCount: Number(t.orders || 0),
    }));
  }

  return items;
}

function SalesOverview({
  orders = [],
  bills = [],
  filteredOrders,
  trend = [],
}: {
  orders?: ApiOrder[];
  bills?: ApiBill[];
  filteredOrders?: ApiOrder[];
  trend?: ApiRevenueTrend[];
}) {
  const [filterMode, setFilterMode] = useState<SalesFilterMode>('daily');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const dataset = useMemo(
    () => computeSalesData(filterMode, orders, bills, trend),
    [filterMode, orders, bills, trend],
  );

  const activeIndex =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < dataset.length
      ? selectedIndex
      : dataset.length - 1;

  const activeItem = dataset[activeIndex] || dataset[0] || {
    key: 'empty',
    label: '',
    sublabel: '',
    fullLabel: 'No data',
    revenue: 0,
    orderCount: 0,
  };

  const totalRevenue = useMemo(
    () => dataset.reduce((sum, item) => sum + item.revenue, 0),
    [dataset],
  );

  const avgRevenue = useMemo(
    () => (dataset.length > 0 ? Math.round(totalRevenue / dataset.length) : 0),
    [dataset, totalRevenue],
  );

  const peakItem = useMemo(() => {
    if (dataset.length === 0) return null;
    return dataset.reduce((max, item) => (item.revenue > max.revenue ? item : max), dataset[0]);
  }, [dataset]);

  const maxRevenue = Math.max(...dataset.map(item => item.revenue), 1);
  const chartHeight = 110;

  const barWidth =
    filterMode === 'weekly' ? 36 : filterMode === 'monthly' ? 26 : 20;

  return (
    <View className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      {/* Top Header with title and segmented filter */}
      <View className="flex-row items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
            <ChartIcon color="#116C0B" size={16} />
          </View>
          <View>
            <Text className="text-sm font-bold text-[#012711]">Sales Overview</Text>
            <Text className="text-[10px] text-[#6B7280]">
              {filterMode === 'daily'
                ? 'Past 7 Days'
                : filterMode === 'weekly'
                ? 'Past 4 Weeks'
                : 'Past 6 Months'}
            </Text>
          </View>
        </View>

        {/* Segmented Filter Pills */}
        <View className="flex-row items-center rounded-xl bg-[#F3F4F6] p-1">
          {(['daily', 'weekly', 'monthly'] as const).map(mode => {
            const isActive = filterMode === mode;
            const title =
              mode === 'daily' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly';
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  setFilterMode(mode);
                  setSelectedIndex(null);
                }}
                className={`rounded-lg px-2.5 py-1 ${
                  isActive ? 'bg-[#116C0B] shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    isActive ? 'text-white' : 'text-[#6B7280]'
                  }`}
                >
                  {title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Period Spotlight Card */}
      <View className="mt-3.5 mb-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] p-3 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[11px] font-medium text-[#166534]">
            {activeItem.fullLabel}
          </Text>
          <Text className="text-xl font-extrabold text-[#012711] mt-0.5">
            {formatCurrency(activeItem.revenue)}
          </Text>
        </View>
        <View className="items-end gap-1">
          <View className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5">
            <Text className="text-[10px] font-bold text-[#166534]">
              {activeItem.orderCount} {activeItem.orderCount === 1 ? 'order' : 'orders'}
            </Text>
          </View>
          {peakItem && peakItem.revenue > 0 && activeItem.revenue === peakItem.revenue ? (
            <Text className="text-[10px] font-semibold text-[#D97706]">
              ★ Peak Period
            </Text>
          ) : null}
        </View>
      </View>

      {/* Chart Canvas */}
      <View className="h-[155px] flex-row items-end justify-between px-1 pt-4">
        {dataset.map((item, index) => {
          const isSelected = index === activeIndex;
          const barHeight =
            item.revenue > 0
              ? Math.max(12, Math.round((item.revenue / maxRevenue) * chartHeight))
              : 6;

          return (
            <Pressable
              key={item.key}
              onPress={() => setSelectedIndex(index)}
              className="flex-1 items-center justify-end"
            >
              {/* Tooltip bubble above selected bar */}
              {isSelected ? (
                <View className="mb-1 items-center">
                  <View className="rounded bg-[#012711] px-1.5 py-0.5 shadow-sm">
                    <Text className="text-[9px] font-bold text-white">
                      {formatCompactCurrency(item.revenue)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 3,
                      borderRightWidth: 3,
                      borderTopWidth: 3,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: '#012711',
                    }}
                  />
                </View>
              ) : (
                <View className="h-5" />
              )}

              {/* Bar Rect */}
              <View
                style={{
                  width: barWidth,
                  height: barHeight,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: isSelected
                    ? '#0B4D1A'
                    : item.revenue > 0
                    ? '#116C0B'
                    : '#E5E7EB',
                  shadowColor: isSelected ? '#116C0B' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSelected ? 0.35 : 0,
                  shadowRadius: 4,
                  elevation: isSelected ? 3 : 0,
                }}
              />

              {/* Labels */}
              <View className="mt-2 items-center">
                <Text
                  className={`text-center text-[10px] ${
                    isSelected
                      ? 'font-bold text-[#116C0B]'
                      : item.revenue > 0
                      ? 'font-semibold text-[#374151]'
                      : 'font-normal text-[#9CA3AF]'
                  }`}
                >
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text
                    className={`text-[9px] ${
                      isSelected ? 'font-medium text-[#116C0B]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {item.sublabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Empty State message if no sales */}
      {totalRevenue === 0 && (
        <Text className="mt-2 text-center text-[11px] leading-4 text-[#9CA3AF]">
          No recorded sales in this period.
        </Text>
      )}

      {/* Footer Summary Stats */}
      <View className="mt-3.5 pt-3 border-t border-[#F3F4F6] flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280]">
            Total
          </Text>
          <Text className="text-xs font-bold text-[#012711] mt-0.5">
            {formatCurrency(totalRevenue)}
          </Text>
        </View>

        <View className="h-6 w-[1px] bg-[#E5E7EB] mx-1.5" />

        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280]">
            {filterMode === 'daily'
              ? 'Daily Avg'
              : filterMode === 'weekly'
              ? 'Weekly Avg'
              : 'Monthly Avg'}
          </Text>
          <Text className="text-xs font-bold text-[#012711] mt-0.5">
            {formatCurrency(avgRevenue)}
          </Text>
        </View>

        <View className="h-6 w-[1px] bg-[#E5E7EB] mx-1.5" />

        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280]">
            Peak
          </Text>
          <Text className="text-xs font-bold text-[#16803D] mt-0.5" numberOfLines={1}>
            {peakItem && peakItem.revenue > 0
              ? `${peakItem.label} (${formatCompactCurrency(peakItem.revenue)})`
              : '—'}
          </Text>
        </View>
      </View>
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
        <Text className="text-sm font-semibold text-[#012711]">
          {orderName}
        </Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
          {order.customer_name || 'Customer'}
          {date
            ? ` · ${date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}`
            : ''}
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

function normalizeOrderStatus(
  status: string,
): NonNullable<LocalRecord['status']> {
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
        : [
            'processing',
            'packing',
            'ready',
            'out for delivery',
            'out_for_delivery',
          ].includes(status)
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
    reportStatuses.reduce(
      (sum, status) => sum + Number(status.count || 0),
      0,
    ) ||
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
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
                {status.label}
              </Text>
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
  billingItems,
  onCreateInvoice,
  onCreateInvoiceFromBillingItems,
}: {
  invoices: LocalRecord[];
  billingItems: BillingLineItem[];
  onCreateInvoice: () => void;
  onCreateInvoiceFromBillingItems: () => void;
}) {
  const billingHasUnpricedItems = billingItems.some(
    item => item.amount === null,
  );
  const billingTotal = billingItems.reduce(
    (total, item) => total + (item.amount ?? 0) * item.quantity,
    0,
  );
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">
        SALES
      </Text>
      <View className="mt-1 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
            Billing
          </Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
            Create and review invoices.
          </Text>
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
      {billingItems.length ? (
        <View className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-[#012711]">
              Current bill
            </Text>
            <Text className="text-sm font-semibold text-[#6B7280]">
              {billingItems.length}{' '}
              {billingItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View className="mt-3 gap-2">
            {billingItems.map(item => (
              <View
                key={item.id}
                className="flex-row items-center justify-between gap-3"
              >
                <Text
                  numberOfLines={1}
                  className="flex-1 text-sm text-[#012711]"
                >
                  {item.name}
                </Text>
                <Text className="text-sm font-semibold text-[#012711]">
                  {item.amount === null
                    ? 'Price needed'
                    : `${formatCurrency(item.amount)} × ${item.quantity}`}
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-4 flex-row items-center justify-between border-t border-[#E5E7EB] pt-3">
            <Text className="font-bold text-[#012711]">Total</Text>
            <Text className="text-base font-extrabold text-[#012711]">
              {formatCurrency(billingTotal)}
            </Text>
          </View>
          {billingHasUnpricedItems ? (
            <Text className="mt-2 text-xs text-[#116C0B]">
              Set a price for every item before creating the invoice.
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Create invoice from billing items"
            accessibilityRole="button"
            disabled={billingHasUnpricedItems}
            onPress={onCreateInvoiceFromBillingItems}
            className={`mt-4 items-center rounded-xl px-4 py-3 ${
              billingHasUnpricedItems ? 'bg-[#D1D5DB]' : 'bg-[#116C0B]'
            }`}
          >
            <Text className="font-bold text-white">
              {billingHasUnpricedItems ? 'Price required' : 'Create invoice'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">
          Invoice history
        </Text>
        <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
          {invoices.length} total
        </Text>
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
  const [filter, setFilter] = useState<
    'All' | 'Pending' | 'Completed' | 'Cancelled'
  >('All');
  const [selectedOrder, setSelectedOrder] = useState<LocalRecord | null>(null);
  const filters = ['All', 'Pending', 'Completed', 'Cancelled'] as const;
  const filteredOrders =
    filter === 'All' ? orders : orders.filter(order => order.status === filter);
  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">
        FULFILLMENT
      </Text>
      <View className="mt-1 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
            Orders
          </Text>
          <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
            Keep track of every customer order.
          </Text>
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
          title={`No ${
            filter === 'All' ? '' : `${filter.toLowerCase()} `
          }orders`}
          description="Orders you add will show up here."
        />
      )}
      {selectedOrder ? (
        <DetailsModal
          visible={selectedOrder !== null}
          onClose={() => setSelectedOrder(null)}
          title={selectedOrder.name}
          subtitle={`Created at ${selectedOrder.createdAt}`}
          badge={{
            label: selectedOrder.status || 'Pending',
            bg:
              selectedOrder.status === 'Completed'
                ? '#F0FDF4'
                : selectedOrder.status === 'Cancelled'
                ? '#FEF2F2'
                : '#FEF3C7',
            text:
              selectedOrder.status === 'Completed'
                ? '#15803D'
                : selectedOrder.status === 'Cancelled'
                ? '#DC2626'
                : '#D97706',
            border:
              selectedOrder.status === 'Completed'
                ? '#DCFCE7'
                : selectedOrder.status === 'Cancelled'
                ? '#FECACA'
                : '#FDE68A',
          }}
          footer={
            <Pressable
              accessibilityLabel="Close order details"
              accessibilityRole="button"
              onPress={() => setSelectedOrder(null)}
              className="min-h-12 w-full items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
            >
              <Text className="text-sm font-semibold text-[#334155]">Close Details</Text>
            </Pressable>
          }
        >
          <View className="gap-4">
            <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Order Total
              </Text>
              <Text className="mt-1 text-2xl font-black text-[#0F172A]">
                {formatCurrency(selectedOrder.amount || 0)}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Update Order Status
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(['Pending', 'Completed', 'Cancelled'] as const).map(status => {
                  const isSelected = selectedOrder.status === status;
                  return (
                    <Pressable
                      accessibilityLabel={`Set order status to ${status}`}
                      accessibilityRole="button"
                      key={status}
                      onPress={() => {
                        onUpdateOrderStatus(selectedOrder.id, status);
                        setSelectedOrder({ ...selectedOrder, status });
                      }}
                      className={`rounded-2xl border px-4 py-2.5 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#116C0B]'
                          : 'border-[#CBD5E1] bg-white active:bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-[#475569]'
                        }`}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </DetailsModal>
      ) : null}
    </ScrollView>
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
    (!needsAmount ||
      (amount.trim().length > 0 &&
        Number.isFinite(amountValue) &&
        amountValue >= 0));

  return (
    <FormModal
      visible
      onClose={onCancel}
      title={action.label}
      subtitle={action.description}
      onSave={() => onSave(name, needsAmount ? amountValue : undefined)}
      saveLabel={`Save ${action.label.toLowerCase()}`}
      isSaveDisabled={!canSave}
      icon={<Icon color={colors.primary} size={22} />}
    >
      <View className="gap-4">
        <View className="gap-1.5">
          <Text className="text-[13px] font-semibold text-[#0F172A]">
            Name or description
          </Text>
          <TextInput
            autoFocus
            onChangeText={setName}
            placeholder={action.placeholder}
            placeholderTextColor="#94A3B8"
            className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-[15px] text-[#0F172A]"
            value={name}
          />
        </View>
        {action.amountLabel ? (
          <View className="gap-1.5">
            <Text className="text-[13px] font-semibold text-[#0F172A]">
              {action.amountLabel}
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={value => setAmount(value.replace(',', '.'))}
              placeholder={action.amountPlaceholder}
              placeholderTextColor="#94A3B8"
              className="min-h-12 rounded-2xl border border-[#CBD5E1] bg-white px-4 text-[15px] text-[#0F172A]"
              value={amount}
            />
          </View>
        ) : null}
        <Text className="text-[12px] leading-5 text-[#64748B]">
          This draft is saved in this session only. Connect your business data
          service to sync it.
        </Text>
      </View>
    </FormModal>
  );
}

function Sidebar({
  fullWidth = false,
  onClose,
  onNavigate,
  features,
  onSelectFeature,
}: {
  fullWidth?: boolean;
  onClose: () => void;
  onNavigate: (tab: AppTab) => void;
  features: MoreFeature[];
  onSelectFeature: (feature: string) => void;
}) {
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);

  return (
    <View
      className={`${
        fullWidth ? 'w-full' : 'w-64'
      } flex-1 border-r border-[#E5E7EB] bg-white px-4 py-5`}
    >
      <View className="mb-5 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <Image
            accessibilityLabel="Buy Food logo"
            resizeMode="contain"
            source={require('../../images/buy-food-logo.png')}
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-5"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-3 px-3 py-2 text-xs font-bold tracking-[1.5px] text-[#6B7280]">
          WORKSPACE
        </Text>
        <TabButtonLarge
          icon={HomeIcon}
          label="Home"
          onPress={() => onNavigate('home')}
        />
        <TabButtonLarge
          icon={ReceiptIcon}
          label="Billing"
          onPress={() => onNavigate('billing')}
        />
        <TabButtonLarge
          icon={ProductIcon}
          label="Items"
          onPress={() => onNavigate('items')}
        />
        <TabButtonLarge
          icon={OrdersIcon}
          label="Orders"
          onPress={() => onNavigate('orders')}
        />
        <Pressable
          accessibilityLabel="More"
          accessibilityRole="button"
          accessibilityState={{ expanded: isMoreExpanded }}
          onPress={() => setIsMoreExpanded(expanded => !expanded)}
          className="w-full flex-row items-center gap-3 rounded-xl px-3 py-2.5"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#EFF6FF' : colors.surface,
          })}
        >
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F7EE]">
            <MoreIcon color={colors.primary} size={21} />
          </View>
          <Text className="flex-1 text-base font-semibold text-[#012711]">
            More
          </Text>
          <Text className="px-2 text-sm text-[#6B7280]">
            {isMoreExpanded ? '⌃' : '⌄'}
          </Text>
        </Pressable>
        {isMoreExpanded ? (
          <View className="ml-4 mt-1 gap-1 border-l border-[#E5E7EB] pl-2">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <Pressable
                  accessibilityLabel={`Open ${feature.title}`}
                  accessibilityRole="button"
                  key={feature.title}
                  onPress={() => onSelectFeature(feature.title)}
                  className="min-h-12 w-full flex-row items-center gap-3 rounded-xl px-3 py-2"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#F3F7FF' : colors.surface,
                  })}
                >
                  <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F7EE]">
                    <Icon color={colors.primary} size={17} />
                  </View>
                  <Text className="flex-1 text-sm font-medium text-[#012711]">
                    {feature.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
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
      <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">
        WORKSPACE
      </Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
        {title}
      </Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        {subtitle}
      </Text>
      <View className="mt-6 gap-3.5">{children}</View>
    </ScrollView>
  );
}

type KitchenRequestRow = Record<string, unknown>;

function readKitchenRequestRows(payload: unknown): KitchenRequestRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (row): row is KitchenRequestRow =>
        typeof row === 'object' && row !== null,
    );
  }
  if (typeof payload !== 'object' || payload === null) {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of [
    'data',
    'kitchen_requests',
    'kitchenRequests',
    'requests',
    'items',
  ]) {
    if (key in record) {
      const rows = readKitchenRequestRows(record[key]);
      if (rows.length > 0 || Array.isArray(record[key])) {
        return rows;
      }
    }
  }
  return [];
}

function kitchenRequestValue(
  request: KitchenRequestRow,
  keys: string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = request[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }
  return fallback;
}

function KitchenRequestsScreen() {
  const [requests, setRequests] = useState<KitchenRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/inventory/kitchen-requests');
      setRequests(readKitchenRequestRows(response.data));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter(request => {
      const status = kitchenRequestValue(request, ['status', 'state'], 'Pending');
      const matchesStatus =
        statusFilter === 'All' ||
        status.trim().toLowerCase() === statusFilter.toLowerCase();
      if (!matchesStatus) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        kitchenRequestValue(
          request,
          ['request_id', 'requestId', 'id'],
          '',
        ),
        kitchenRequestValue(
          request,
          ['item_name', 'product_name', 'food_name', 'item', 'name'],
          '',
        ),
        kitchenRequestValue(
          request,
          ['requested_by', 'requestedBy', 'employee_name', 'user_name'],
          '',
        ),
      ].some(value => value.toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  return (
    <PageShell
      title="Kitchen Requests"
      subtitle="Review and manage kitchen inventory requests"
    >
      <TextInput
        accessibilityLabel="Search kitchen requests"
        value={search}
        onChangeText={setSearch}
        placeholder="Search item, request ID, or requester"
        placeholderTextColor="#94A3B8"
        className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#012711]"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {['All', 'Pending', 'Approved', 'Rejected', 'Completed'].map(status => (
          <Pressable
            key={status}
            accessibilityLabel={`Filter kitchen requests by ${status}`}
            accessibilityRole="button"
            onPress={() => setStatusFilter(status)}
            className={`rounded-full border px-4 py-2 ${
              statusFilter === status
                ? 'border-[#116C0B] bg-[#116C0B]'
                : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                statusFilter === status ? 'text-white' : 'text-[#475569]'
              }`}
            >
              {status}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-sm text-[#6B7280]">
            Loading kitchen requests...
          </Text>
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-[#FECACA] bg-white p-[18px]">
          <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
            {error}
          </Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
          <Text className="text-sm text-[#6B7280]">
            {requests.length === 0
              ? 'No kitchen requests found.'
              : 'No kitchen requests match the selected filters.'}
          </Text>
        </View>
      ) : (
        filteredRequests.map((request, index) => {
          const requestId = kitchenRequestValue(
            request,
            ['request_id', 'requestId', 'id'],
            `Request ${index + 1}`,
          );
          const item = kitchenRequestValue(
            request,
            ['item_name', 'product_name', 'food_name', 'item', 'name'],
            'Inventory item',
          );
          const quantity = kitchenRequestValue(
            request,
            ['quantity', 'requested_quantity', 'qty'],
            '—',
          );
          const status = kitchenRequestValue(request, ['status', 'state'], 'Pending');
          const requestedBy = kitchenRequestValue(
            request,
            ['requested_by', 'requestedBy', 'employee_name', 'user_name'],
            '',
          );
          return (
            <View
              key={`${requestId}-${index}`}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-[18px]"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#012711]">
                    {item}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7280]">
                    {requestId}
                  </Text>
                </View>
                <Text
                  className="rounded-lg px-2.5 py-1 text-xs font-bold capitalize"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.primary,
                  }}
                >
                  {status}
                </Text>
              </View>
              <Text className="mt-3 text-sm text-[#475569]">
                Quantity: <Text className="font-bold">{quantity}</Text>
              </Text>
              {requestedBy ? (
                <Text className="mt-1 text-sm text-[#475569]">
                  Requested by: <Text className="font-bold">{requestedBy}</Text>
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </PageShell>
  );
}

type StatTone =
  | 'green'
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'pink'
  | 'teal'
  | 'red';

const statCardGradients: Record<
  StatTone,
  {
    bg: string;
    bgMid: string;
    bgDark: string;
    glow1: string;
    glow2: string;
  }
> = {
  green:  {
    bg: colors.primaryDark,
    bgMid: colors.primary,
    bgDark: colors.primaryLight,
    glow1: colors.primaryGlow,
    glow2: colors.primaryGlowSoft,
  },
  blue:   { bg: '#0B1E4D', bgMid: '#1230A0', bgDark: '#1D4ED8', glow1: 'rgba(96,165,250,0.22)', glow2: 'rgba(59,130,246,0.14)' },
  purple: { bg: '#2E1065', bgMid: '#5B21B6', bgDark: '#7C3AED', glow1: 'rgba(167,139,250,0.22)', glow2: 'rgba(139,92,246,0.14)' },
  cyan:   { bg: '#083344', bgMid: '#0E7490', bgDark: '#0891B2', glow1: 'rgba(34,211,238,0.22)',  glow2: 'rgba(6,182,212,0.14)' },
  pink:   { bg: '#500724', bgMid: '#9D174D', bgDark: '#BE185D', glow1: 'rgba(244,114,182,0.22)', glow2: 'rgba(236,72,153,0.14)' },
  teal:   { bg: '#042F2E', bgMid: '#0F766E', bgDark: '#0D9488', glow1: 'rgba(45,212,191,0.22)',  glow2: 'rgba(20,184,166,0.14)' },
  red:    { bg: '#450A0A', bgMid: '#991B1B', bgDark: '#DC2626', glow1: 'rgba(248,113,113,0.22)', glow2: 'rgba(239,68,68,0.14)' },
};

function StatCard({
  label,
  value,
  detail,
  badge,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  badge: string;
  tone: StatTone;
  icon: typeof ChartIcon;
}) {
  const isLive = badge === 'LIVE';
  const g = statCardGradients[tone];

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        minHeight: 155,
        overflow: 'hidden',
        backgroundColor: g.bgMid,
        shadowColor: g.bg,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.50,
        shadowRadius: 14,
        elevation: 10,
      }}
    >
      {/* Dark top-left corner overlay */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: g.bg,
          opacity: 0.55,
        }}
      />

      {/* Glow circle — top right */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 130,
          height: 130,
          borderRadius: 65,
          top: -35,
          right: -35,
          backgroundColor: g.glow1,
        }}
      />

      {/* Glow circle — bottom left */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          borderRadius: 50,
          bottom: -25,
          left: -25,
          backgroundColor: g.glow2,
        }}
      />

      {/* Glow circle — bottom right (accent) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: 45,
          bottom: -10,
          right: 10,
          backgroundColor: g.glow1,
        }}
      />

      {/* Card content */}
      <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
        {/* Top row: icon box + badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.22)',
            }}
          >
            <Icon color="#FFFFFF" size={19} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(0,0,0,0.32)',
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            {isLive ? (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: '#81C238',
                }}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: 0.8,
              }}
            >
              {badge}
            </Text>
          </View>
        </View>

        {/* Value + label */}
        <View style={{ marginTop: 14 }}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.5,
            }}
          >
            {value}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: 3,
              fontSize: 10,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
        </View>

        {/* Bottom divider + detail */}
        <View
          style={{
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.20)',
            paddingTop: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.60)',
              fontWeight: '500',
            }}
          >
            {detail}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Avatar({ initial, size = 42 }: { initial: string; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-[#EFF6FF]"
      style={{ height: size, width: size }}
    >
      <Text
        className="font-bold text-[#116C0B]"
        style={{ fontSize: size * 0.38 }}
      >
        {initial}
      </Text>
    </View>
  );
}

function RecordRow({ record }: { record: LocalRecord }) {
  const title =
    quickActions.find(action => action.id === record.action)?.label ||
    'Activity';
  return (
    <View className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#EFF6FF]">
        <ReceiptIcon color={colors.primary} size={18} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#012711]">
          {record.name}
        </Text>
        <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
          {title} · {record.createdAt}
        </Text>
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

function StatusPill({
  status,
}: {
  status: NonNullable<LocalRecord['status']>;
}) {
  const tint =
    status === 'Pending'
      ? colors.primary
      : status === 'Completed'
      ? colors.success
      : colors.error;
  const bg =
    status === 'Pending'
      ? colors.surfaceSecondary
      : status === 'Completed'
      ? '#F0FDF4'
      : '#FEF2F2';
  return (
    <View
      className="rounded-[14px] px-[9px] py-[5px]"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-[11px] font-semibold" style={{ color: tint }}>
        {status}
      </Text>
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
      <Text className="mt-1 text-center text-[13px] leading-[19px] text-[#6B7280]">
        {description}
      </Text>
    </View>
  );
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default DashboardScreen;
