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
import Svg, { Path } from 'react-native-svg';
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
import FloatingActionMenu from './FloatingActionMenu';
import AddCategoryIcon from './AddCategoryIcon';
import Bills, { type BillFood } from '../Tabs/Bills';
import Items from '../Tabs/Items';
import CategoriesScreen from '../Screens/Categories';
import AddCategoriesScreen from '../Screens/AddCategories';
import CuisineScreen from '../Screens/Cuisine';
import AddCuisineScreen from '../Screens/AddCuisine';
import OrdersScreen from '../Screens/Orders';
import BannerManagementPage from '../Tabs/BannerManagement';
import GalleryManagementPage from '../Tabs/GalleryManagement';
import ReviewsManagementPage from '../Tabs/ReviewsManagement';
import PrinterSetupScreen from '../Tabs/Settings/PrinterSetup/PrinterSetupScreen';
import TablesScreen from '../Screens/Tables';
import CustomersScreen from '../Screens/Customers';
import MorePage, { type MoreFeature } from '../Tabs/More';
import api from '../../../api';

type DashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type ItemsAddRequest = { id: number; action: 'product' };
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

type ReservationStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Cancelled';

type BillingLineItem = {
  id: string;
  name: string;
  category?: string;
  image?: string;
  amount: number | null;
  quantity: number;
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

type ApiEmployee = {
  employee_id?: string | number;
  full_name?: string;
  employee_type?: string;
  email?: string;
  phone_number?: string;
  status?: string;
  current_status?: string;
  gender?: string;
  date_of_birth?: string;
  whatsapp_number?: string;
  cuisine_type?: string;
  experience_years?: string | number;
  food_preference?: string;
  special_dishes?: string[] | string;
  description?: string;
  address?: string;
  area_locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: string | number;
  longitude?: string | number;
  vehicle_type?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  driving_license_number?: string;
  driving_license_expiry_date?: string;
  commission_percent?: string | number;
  working_days?: string[] | string;
  start_time?: string;
  end_time?: string;
  salary_type?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  pan_number?: string;
  basic_salary?: string | number;
  allowances?: string | number;
  deductions?: string | number;
  net_salary?: string | number;
  payroll_notes?: string;
  available_for_delivery?: boolean | string | number;
  today_shift_state?: string;
  today_check_in?: string;
  today_check_out?: string;
};

type ApiCatalogItem = {
  food_id?: string | number;
  product_name?: string;
  productName?: string;
  name?: string;
  food_name?: string;
  food_images?: unknown;
  image?: unknown;
  image_url?: unknown;
  food_image?: unknown;
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
  price?: number | string;
  selling_price?: number | string;
  unit_price?: number | string;
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
  const [isFoodDetailsOpen, setIsFoodDetailsOpen] = useState(false);
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
    setIsFoodDetailsOpen(false);
    setSelectedAction(null);
    setSelectedFeature(null);
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const navigateToMoreFeature = (feature: string | null) => {
    setActiveTab('more');
    setIsFoodDetailsOpen(false);
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

  const handleFoodDetailsVisibilityChange = (isVisible: boolean) => {
    setIsFoodDetailsOpen(isVisible);
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
    setIsFoodDetailsOpen(false);
    setSelectedAction(null);
    setSelectedFeature('AddCategory');
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
  };

  const openAddCuisinePage = (returnFeature: string | null) => {
    cuisineReturnFeature.current = returnFeature;
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
        // 5. Non-home tab → go to home
        if (activeTab !== 'home') {
          setActiveTab('home');
          setSelectedAction(null);
          setSelectedFeature(null);
          setIsFoodDetailsOpen(false);
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
    selectedFeature,
    activeTab,
  ]);

  return (
    <SafeAreaView
      edges={
        isFoodDetailsOpen
          ? ['top', 'bottom']
          : isMoreFeatureOpen
          ? ['bottom']
          : []
      }
      className="flex-1 bg-[#F9FAFB]"
    >
      {!isFoodDetailsOpen && !isMoreFeatureOpen ? (
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
      {!isFoodDetailsOpen && isMoreFeatureOpen ? (
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
              onFoodDetailsVisibilityChange={handleFoodDetailsVisibilityChange}
              onSelectAction={navigateToAction}
              onAddFoodToBilling={addFoodToBilling}
              onRemoveFoodFromBilling={removeFoodFromBilling}
              onQuantityChange={updateBillingItemQuantity}
              onOpenBilling={() => navigateToTab('billing')}
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
            onFoodDetailsVisibilityChange={handleFoodDetailsVisibilityChange}
            onSelectAction={navigateToAction}
            onAddFoodToBilling={addFoodToBilling}
            onRemoveFoodFromBilling={removeFoodFromBilling}
            onQuantityChange={updateBillingItemQuantity}
            onOpenBilling={() => navigateToTab('billing')}
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
          />
        </View>
      )}

      {!isMoreFeatureOpen ? (
        <BottomNavigation activeTab={activeTab} onPressTab={navigateToTab} />
      ) : null}
      {!isWide && activeTab === 'items' && !isFoodDetailsOpen ? (
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

function readEmployeeRows(payload: unknown): ApiEmployee[] {
  const responseBody =
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload
      ? payload.data
      : payload;
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'employees' in responseBody
  ) {
    return Array.isArray(responseBody.employees)
      ? (responseBody.employees as ApiEmployee[])
      : [];
  }
  return readResponseRows<ApiEmployee>(payload);
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
  onFoodDetailsVisibilityChange,
  onSelectAction,
  onAddFoodToBilling,
  onRemoveFoodFromBilling,
  onQuantityChange,
  onOpenBilling,
  onCreateInvoiceFromBillingItems,
  onCompleteBill,
  onSelectFeature,
  onUpdateOrderStatus,
  onRefreshDashboard,
  onSetDateFilter,
  onSetCustomFrom,
  onSetCustomTo,
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
  onFoodDetailsVisibilityChange: (isVisible: boolean) => void;
  onSelectAction: (action: QuickActionId) => void;
  onAddFoodToBilling: (food: BillFood) => void;
  onRemoveFoodFromBilling: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpenBilling: () => void;
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
    if (selectedFeature === 'Reservations') {
      return <ReservationScreen onBack={() => onSelectFeature(null)} />;
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
        />
      );
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
        onFoodDetailsVisibilityChange={onFoodDetailsVisibilityChange}
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

type ReservationApiRecord = {
  reservation_id: string;
  user_id?: string;
  table_id?: string;
  table_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  reservation_date?: string;
  start_time?: string;
  end_time?: string;
  guests?: number;
  notes?: string;
  status?: ReservationStatus;
  created_at?: string;
};

const reservationStatusStyles: Record<ReservationStatus, string> = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Declined: 'border-rose-200 bg-rose-50 text-rose-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

function ReservationScreen({ onBack }: { onBack: () => void }) {
  const [reservations, setReservations] = useState<ReservationApiRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | ReservationStatus>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/reservations', {
        params: { status: selectedStatus === 'All' ? 'All' : selectedStatus },
      });
      setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not load reservation data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  const visibleReservations = useMemo(() => {
    return [...reservations]
      .filter(reservation =>
        selectedStatus === 'All' ? true : reservation.status === selectedStatus,
      )
      .sort((left, right) => {
        const leftValue = new Date(`${left.reservation_date || '1970-01-01'}T${left.start_time || '00:00'}`).getTime();
        const rightValue = new Date(`${right.reservation_date || '1970-01-01'}T${right.start_time || '00:00'}`).getTime();
        return leftValue - rightValue;
      });
  }, [reservations, selectedStatus]);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setErrorMessage('');
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      await fetchReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reservation status could not be updated.';
      setErrorMessage(message);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { void fetchReservations(); }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-5"
    >
      <View className="mb-4">
        <Pressable
          accessibilityLabel="Back to More"
          onPress={onBack}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
        >
          <Text className="text-sm font-semibold text-[#116C0B]">‹ More</Text>
        </Pressable>
      </View>

      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        TABLE BOOKING
      </Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
        Reservations
      </Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Review guest requests, confirm table bookings, and manage the dining flow.
      </Text>

      {errorMessage ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-xs font-medium text-red-700">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row flex-wrap gap-2">
        {(['All', 'Pending', 'Confirmed', 'Declined', 'Cancelled'] as const).map(status => (
          <Pressable
            key={status}
            accessibilityRole="button"
            onPress={() => setSelectedStatus(status)}
            className={`rounded-full border px-3 py-1.5 ${
              selectedStatus === status
                ? 'border-[#116C0B] bg-[#E8F5E9] text-[#116C0B]'
                : 'border-[#E5E7EB] bg-white text-[#374151]'
            }`}
          >
            <Text className="text-xs font-semibold">{status}</Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-5 gap-3">
        {isLoading ? (
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <Text className="text-center text-sm text-[#6B7280]">Loading reservations...</Text>
          </View>
        ) : visibleReservations.length ? (
          visibleReservations.map(reservation => (
            <View
              key={reservation.reservation_id}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
            >
              <View className="mb-3 flex-row items-start justify-between gap-3">
                <View>
                  <Text className="text-base font-bold text-[#012711]">
                    {reservation.customer_name || 'Guest'}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7280]">
                    {reservation.table_number || reservation.table_id || 'Table'} • {reservation.guests || 1} guests
                  </Text>
                </View>
                <View
                  className={`rounded-full border px-2.5 py-1 ${reservationStatusStyles[reservation.status || 'Pending']}`}
                >
                  <Text className="text-[10px] font-bold uppercase">
                    {reservation.status || 'Pending'}
                  </Text>
                </View>
              </View>

              <View className="gap-1 text-sm text-[#374151]">
                <Text>
                  {reservation.reservation_date || 'Date'} at {reservation.start_time || 'Time'}
                </Text>
                <Text>{reservation.customer_phone || reservation.customer_email || 'No contact provided'}</Text>
                {reservation.notes ? <Text>{reservation.notes}</Text> : null}
              </View>

              {reservation.status === 'Pending' ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => { void updateStatus(reservation.reservation_id, 'Confirmed'); }}
                    className="rounded-lg bg-[#116C0B] px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-white">Confirm</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { void updateStatus(reservation.reservation_id, 'Declined'); }}
                    className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-[#B91C1C]">Decline</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <View className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-6">
            <Text className="text-center text-sm text-[#6B7280]">
              No reservations match this filter.
            </Text>
          </View>
        )}
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
      <Modal
        visible={isDateFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDateFilterOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close date range options"
          onPress={() => setIsDateFilterOpen(false)}
          className="flex-1 justify-center bg-black/30 px-8"
        >
          <Pressable
            onPress={event => event.stopPropagation()}
            className="max-h-[75%] rounded-2xl border border-[#E5E7EB] bg-white p-2"
          >
            <Text className="px-3 pb-2 pt-2 text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">
              Select date range
            </Text>
            <ScrollView>
              {dashboardPeriods.map(({ value: filter, label }) => (
                <Pressable
                  accessibilityLabel={`Show ${label.toLowerCase()} dashboard data`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateFilter === filter }}
                  key={filter}
                  onPress={() => {
                    onSetDateFilter(filter);
                    setIsDateFilterOpen(false);
                  }}
                  className={`rounded-xl px-3 py-3 ${
                    dateFilter === filter ? 'bg-[#E8F5E9]' : 'bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      dateFilter === filter ? 'text-[#116C0B]' : 'text-[#374151]'
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
            tone="orange"
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
            <Text className="mt-2 text-xs text-[#B45309]">
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
            <Text className="text-[#6B7280] text-[10px] font-bold tracking-[1.2px]">
              ORDER DETAILS
            </Text>
            <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
              {selectedOrder.name}
            </Text>
            <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
              Created at {selectedOrder.createdAt}
            </Text>
            <View className="mt-[18px] rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
              <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
                Order total
              </Text>
              <Text className="mt-1 text-2xl font-bold text-[#012711]">
                {formatCurrency(selectedOrder.amount || 0)}
              </Text>
              <View className="mt-3.5 flex-row items-center gap-2">
                <Text className="mt-1 text-[13px] leading-[19px] text-[#6B7280]">
                  Status
                </Text>
                <StatusPill status={selectedOrder.status || 'Pending'} />
              </View>
            </View>
            <Text className="mb-2 mt-[18px] text-[13px] font-semibold text-[#012711]">
              Update status
            </Text>
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
                      selectedOrder.status === status
                        ? 'text-white'
                        : 'text-[#6B7280]'
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
              <Text className="font-semibold text-[#116C0B]">
                Close details
              </Text>
            </Pressable>
          </SafeAreaView>
        ) : null}
      </Modal>
    </ScrollView>
  );
}

type EmployeeFormValues = Record<string, string>;

type EmployeeFormFieldDefinition = {
  name: string;
  label: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  secureTextEntry?: boolean;
  placeholder?: string;
};

const employeeRoleOptions = [
  'Chef',
  'Delivery Partner',
  'Server',
  'Cashier',
  'Manager',
  'Cleaner',
];
const employeeWorkingDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function createEmployeeFormValues(employee?: ApiEmployee): EmployeeFormValues {
  const values: EmployeeFormValues = {
    employee_type: employee?.employee_type || 'Chef',
    status: employee?.status || 'Active',
    salary_type: employee?.salary_type || 'Monthly Basis',
    available_for_delivery:
      employee?.available_for_delivery === true ||
      employee?.available_for_delivery === 1 ||
      employee?.available_for_delivery === '1' ||
      employee?.available_for_delivery === 'Yes'
        ? 'Yes'
        : 'No',
    password: '',
    confirm_password: '',
  };
  const fields = [
    'full_name',
    'email',
    'phone_number',
    'gender',
    'date_of_birth',
    'whatsapp_number',
    'cuisine_type',
    'experience_years',
    'food_preference',
    'special_dishes',
    'address',
    'area_locality',
    'city',
    'district',
    'state',
    'pincode',
    'latitude',
    'longitude',
    'vehicle_type',
    'vehicle_number',
    'vehicle_model',
    'driving_license_number',
    'driving_license_expiry_date',
    'working_days',
    'start_time',
    'end_time',
    'commission_percent',
    'account_holder_name',
    'bank_name',
    'account_number',
    'ifsc_code',
    'upi_id',
    'pan_number',
    'basic_salary',
    'allowances',
    'deductions',
    'net_salary',
    'payroll_notes',
  ] as const;
  fields.forEach(field => {
    const value = employee?.[field];
    if (Array.isArray(value)) {
      values[field] = value.join(', ');
    } else if (value !== null && value !== undefined) {
      values[field] = String(value);
    }
  });
  values.description_about_chef = employee?.description || '';
  if (employee?.working_days) {
    const rawDays = employee.working_days;
    if (Array.isArray(rawDays)) {
      values.working_days = rawDays.join(', ');
    } else {
      try {
        const parsed: unknown = JSON.parse(rawDays);
        if (Array.isArray(parsed)) {
          values.working_days = parsed.map(String).join(', ');
        }
      } catch {
        values.working_days = rawDays;
      }
    }
  }
  if (employee?.date_of_birth) {
    values.date_of_birth = employee.date_of_birth.slice(0, 10);
  }
  if (employee?.driving_license_expiry_date) {
    values.driving_license_expiry_date =
      employee.driving_license_expiry_date.slice(0, 10);
  }
  return values;
}

function readEmployeeObject(payload: unknown): ApiEmployee | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const outer = payload as Record<string, unknown>;
  const body =
    typeof outer.data === 'object' && outer.data !== null
      ? (outer.data as Record<string, unknown>)
      : outer;
  const employee = body.employee;
  return typeof employee === 'object' && employee !== null
    ? (employee as ApiEmployee)
    : null;
}

function validateEmployeeForm(
  values: EmployeeFormValues,
  isEditing: boolean,
): string {
  const requiredFields = [
    ['full_name', 'Full name'],
    ['phone_number', 'Phone number'],
    ['email', 'Email'],
    ['address', 'Street address'],
    ['area_locality', 'Area / locality'],
    ['city', 'City'],
    ['district', 'District'],
    ['state', 'State'],
    ['pincode', 'Pincode'],
  ];
  for (const [field, label] of requiredFields) {
    if (!values[field]?.trim()) {
      return `${label} is required.`;
    }
  }
  if (!/^[6-9]\d{9}$/.test(values.phone_number.replace(/^\+91/, '').replace(/[\s\-()]/g, ''))) {
    return 'Phone number must be a 10-digit Indian mobile number.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (values.pincode && !/^\d{6}$/.test(values.pincode.trim())) {
    return 'Pincode must be 6 digits.';
  }
  if (
    values.account_number &&
    !/^\d{9,18}$/.test(values.account_number.replace(/[\s-]/g, ''))
  ) {
    return 'Bank account number must contain 9 to 18 digits.';
  }
  if (
    values.ifsc_code &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifsc_code.trim().toUpperCase())
  ) {
    return 'IFSC code must be 11 characters (for example SBIN0001234).';
  }
  if (
    values.pan_number &&
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.pan_number.trim().toUpperCase())
  ) {
    return 'PAN number must have 5 letters, 4 digits, and 1 letter.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.vehicle_number &&
    !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(
      values.vehicle_number.replace(/[\s-]/g, '').toUpperCase(),
    )
  ) {
    return 'Enter a valid vehicle registration number.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.driving_license_number &&
    !/^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/.test(
      values.driving_license_number.replace(/[\s-]/g, '').toUpperCase(),
    )
  ) {
    return 'Enter a valid driving license number.';
  }
  if (values.employee_type === 'Chef' && !values.cuisine_type.trim()) {
    return 'Cuisine type is required for a Chef.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    (!values.vehicle_type.trim() ||
      !values.vehicle_number.trim() ||
      !values.driving_license_number.trim())
  ) {
    return 'Vehicle type, vehicle number, and driving license are required for a Delivery Partner.';
  }
  if (
    values.employee_type === 'Delivery Partner' &&
    values.salary_type === 'Order Basis'
  ) {
    if (!values.commission_percent.trim()) {
      return 'Commission percentage is required for order-based salary.';
    }
  } else if (!values.basic_salary.trim()) {
    return 'Basic salary is required.';
  }
  if (!isEditing && !values.password.trim()) {
    return 'Password is required for a new employee.';
  }
  if (values.password || values.confirm_password) {
    if (values.password !== values.confirm_password) {
      return 'Password and confirm password do not match.';
    }
  }
  return '';
}

function EmployeesPage({ onBack }: { onBack?: () => void } = {}) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Working' | 'Break' | 'Off shift'>('All');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorEmployeeId, setEditorEmployeeId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [editorDetailsLoaded, setEditorDetailsLoaded] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [formValues, setFormValues] = useState<EmployeeFormValues>(() =>
    createEmployeeFormValues(),
  );

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadEmployees = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/employees', { signal: controller.signal });
        const rows = readEmployeeRows(response.data);
        if (isActive) {
          setEmployees(rows);
        }
      } catch (apiError) {
        if (isActive) {
          setError(getErrorMessage(apiError));
          setEmployees([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [refreshKey]);

  const openAddEmployee = () => {
    setEditorEmployeeId(null);
    setFormValues(createEmployeeFormValues());
    setEditorError('');
    setIsEditorLoading(false);
    setEditorDetailsLoaded(true);
    setIsEditorOpen(true);
  };

  const openEditEmployee = async (employee: ApiEmployee) => {
    const employeeId = employee.employee_id;
    if (employeeId === undefined || employeeId === null || String(employeeId).trim() === '') {
      setError('This employee cannot be edited because the record has no employee ID.');
      return;
    }

    setEditorEmployeeId(String(employeeId));
    setFormValues(createEmployeeFormValues(employee));
    setEditorError('');
    setIsEditorLoading(true);
    setEditorDetailsLoaded(false);
    setIsEditorOpen(true);
    try {
      const response = await api.get(`/employees/${encodeURIComponent(String(employeeId))}`);
      const detail = readEmployeeObject(response.data);
      if (!detail) {
        throw new Error('The server did not return employee details.');
      }
      setFormValues(createEmployeeFormValues(detail));
      setEditorDetailsLoaded(true);
    } catch (apiError) {
      setEditorError(getErrorMessage(apiError));
    } finally {
      setIsEditorLoading(false);
    }
  };

  const saveEmployee = async () => {
    setEditorError('');
    const validationError = validateEmployeeForm(formValues, Boolean(editorEmployeeId));
    if (validationError) {
      setEditorError(validationError);
      return;
    }

    const payload = new FormData();
    Object.entries(formValues).forEach(([field, value]) => {
      if (
        formValues.employee_type !== 'Delivery Partner' &&
        ['salary_type', 'available_for_delivery'].includes(field)
      ) {
        return;
      }
      if (
        formValues.employee_type !== 'Chef' &&
        ['special_dishes', 'description_about_chef', 'cuisine_type', 'food_preference', 'experience_years'].includes(field)
      ) {
        return;
      }
      if (
        formValues.employee_type !== 'Delivery Partner' &&
        ['vehicle_type', 'vehicle_number', 'vehicle_model', 'driving_license_number', 'driving_license_expiry_date', 'working_days', 'start_time', 'end_time', 'commission_percent'].includes(field)
      ) {
        return;
      }
      if (field === 'password' && editorEmployeeId && !value.trim()) {
        return;
      }
      if (field === 'special_dishes' || field === 'working_days') {
        value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .forEach(item => payload.append(field, item));
        return;
      }
      payload.append(field, value);
    });

    setIsSavingEmployee(true);
    try {
      if (editorEmployeeId) {
        await api.put(`/employees/${encodeURIComponent(editorEmployeeId)}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/employees', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setIsEditorOpen(false);
      setRefreshKey(current => current + 1);
    } catch (apiError) {
      const responseData =
        typeof apiError === 'object' && apiError !== null && 'data' in apiError
          ? apiError.data
          : undefined;
      const responseMessage =
        typeof responseData === 'object' &&
        responseData !== null &&
        'message' in responseData &&
        typeof responseData.message === 'string'
          ? responseData.message
          : getErrorMessage(apiError);
      setEditorError(responseMessage);
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const updateFormValue = (field: string, value: string) => {
    setFormValues(current => ({ ...current, [field]: value }));
  };

  const personalFields: EmployeeFormFieldDefinition[] = [
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'phone_number', label: 'Phone number', required: true, keyboardType: 'phone-pad' },
    { name: 'email', label: 'Email', required: true, keyboardType: 'email-address' },
    { name: 'date_of_birth', label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
    ...(formValues.employee_type === 'Delivery Partner'
      ? [{ name: 'whatsapp_number', label: 'WhatsApp number', keyboardType: 'phone-pad' as const }]
      : []),
  ];
  const locationFields: EmployeeFormFieldDefinition[] = [
    { name: 'address', label: 'Street address', required: true, multiline: true },
    { name: 'area_locality', label: 'Area / locality', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'district', label: 'District', required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'pincode', label: 'Pincode', required: true, keyboardType: 'numeric' },
  ];
  const bankFields: EmployeeFormFieldDefinition[] = [
    { name: 'account_holder_name', label: 'Account holder name' },
    { name: 'bank_name', label: 'Bank name' },
    { name: 'account_number', label: 'Account number', keyboardType: 'numeric' },
    { name: 'ifsc_code', label: 'IFSC code' },
    { name: 'upi_id', label: 'UPI ID' },
    { name: 'pan_number', label: 'PAN number' },
  ];
  const salaryFields: EmployeeFormFieldDefinition[] = [
    { name: 'basic_salary', label: 'Basic salary', required: true, keyboardType: 'numeric' },
    { name: 'allowances', label: 'Allowances', keyboardType: 'numeric' },
    { name: 'deductions', label: 'Deductions', keyboardType: 'numeric' },
    { name: 'net_salary', label: 'Net salary', keyboardType: 'numeric' },
    { name: 'payroll_notes', label: 'Payroll notes', multiline: true },
  ];
  const roleFields: EmployeeFormFieldDefinition[] =
    formValues.employee_type === 'Chef'
      ? [
          { name: 'experience_years', label: 'Experience (years)', keyboardType: 'numeric' },
          { name: 'special_dishes', label: 'Special dishes', placeholder: 'Separate dishes with commas' },
          { name: 'description_about_chef', label: 'About the chef', multiline: true },
        ]
      : formValues.employee_type === 'Delivery Partner'
        ? [
            { name: 'vehicle_number', label: 'Vehicle number', required: true },
            { name: 'vehicle_model', label: 'Vehicle model' },
            { name: 'driving_license_number', label: 'Driving license number', required: true },
            { name: 'driving_license_expiry_date', label: 'License expiry date', placeholder: 'YYYY-MM-DD' },
            { name: 'commission_percent', label: 'Commission %', keyboardType: 'numeric' },
            { name: 'start_time', label: 'Shift start time', placeholder: 'HH:MM' },
            { name: 'end_time', label: 'Shift end time', placeholder: 'HH:MM' },
          ]
        : [];

  const normalizeEmployeeStatus = (employee: ApiEmployee) => {
    const status = String(employee.current_status || employee.status || '').trim();
    if (status && !['Active', 'Inactive'].includes(status)) {
      return status;
    }
    return employee.status || 'Active';
  };

  const filteredEmployees = employees.filter(employee => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      String(employee.full_name || '').toLowerCase().includes(searchValue) ||
      String(employee.employee_type || '').toLowerCase().includes(searchValue) ||
      String(employee.email || '').toLowerCase().includes(searchValue) ||
      String(employee.phone_number || '').toLowerCase().includes(searchValue);

    const matchesStatus =
      statusFilter === 'All' ||
      normalizeEmployeeStatus(employee).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const total = employees.length;
  const onDutyCount = employees.filter(employee => {
    const normalized = normalizeEmployeeStatus(employee).toLowerCase();
    return normalized === 'working' || normalized === 'on duty' || normalized === 'available';
  }).length;

  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-6">
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">TEAM</Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">Employees</Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">Manage your restaurant staff and daily coverage.</Text>

      {/* <View className="mt-[18px] flex-row flex-wrap items-center justify-between gap-y-2.5">
        <StatCard
          label="Total Staff"
          value={isLoading && !employees.length ? '—' : String(total)}
          detail="scheduled team members"
          badge="TEAM"
          tone="blue"
          basis="48%"
          icon={CustomersIcon}
        />
        <StatCard
          label="On Duty"
          value={isLoading && !employees.length ? '—' : String(onDutyCount)}
          detail="available now"
          badge="LIVE"
          tone="green"
          basis="48%"
          icon={HomeIcon}
        />
        <StatCard
          label="Shift Hours"
          value={isLoading && !employees.length ? '—' : '42h'}
          detail="today’s coverage"
          badge="PLAN"
          tone="purple"
          basis="48%"
          icon={OrdersIcon}
        />
      </View> */}

      <View className="mt-7 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <View className="flex-row flex-wrap items-center gap-2.5">
          <View className="min-w-[180px] flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
            <Text className="text-[11px] font-semibold text-[#6B7280]">Search employee</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Name, role, email"
              placeholderTextColor={colors.textSecondary}
              className="mt-1 text-[13px] text-[#012711]"
            />
          </View>
          <View className="min-w-[140px] rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
            <Text className="text-[11px] font-semibold text-[#6B7280]">Status</Text>
            <TextInput
              value={statusFilter}
              editable={false}
              className="mt-1 text-[13px] text-[#012711]"
            />
          </View>
          <Pressable
            accessibilityLabel="Add new employee"
            accessibilityRole="button"
            onPress={openAddEmployee}
            className="rounded-xl bg-[#116C0B] px-3 py-3"
          >
            <Text className="text-[12px] font-semibold text-white">+ Add employee</Text>
          </Pressable>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {(['All', 'Active', 'Inactive', 'Working'] as const).map(filter => (
            <Pressable
              accessibilityRole="button"
              key={filter}
              onPress={() => setStatusFilter(filter)}
              className={`rounded-full border px-3 py-1.5 ${
                statusFilter === filter
                  ? 'border-[#116C0B] bg-[#116C0B]'
                  : 'border-[#E5E7EB] bg-[#F9FAFB]'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  statusFilter === filter ? 'text-white' : 'text-[#6B7280]'
                }`}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <Text className="text-[13px] font-medium text-[#991B1B]">{error}</Text>
        </View>
      ) : null}

      <View className="mb-3 mt-7 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#012711]">Team roster</Text>
        <Text className="text-[11px] text-[#6B7280]">{filteredEmployees.length} employees</Text>
      </View>

      {isLoading && !employees.length ? (
        <View className="min-h-[120px] items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-[13px] text-[#6B7280]">Loading employees…</Text>
        </View>
      ) : filteredEmployees.length ? (
        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
          {filteredEmployees.map(employee => {
            const employeeStatus = normalizeEmployeeStatus(employee);
            const statusClass =
              employeeStatus.toLowerCase() === 'working' || employeeStatus.toLowerCase() === 'on duty' || employeeStatus.toLowerCase() === 'available'
                ? 'bg-[#DCFCE7] text-[#166534]'
                : employeeStatus.toLowerCase() === 'break'
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : 'bg-[#F3F4F6] text-[#4B5563]';
            const initials = String(employee.full_name || 'E')
              .split(' ')
              .map(part => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <View
                key={String(employee.employee_id || employee.full_name || initials)}
                className="flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                  <Text className="text-sm font-bold text-[#0F172A]">{initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-[#012711]">{employee.full_name || 'Employee'}</Text>
                  <Text className="mt-[2px] text-[11px] leading-4 text-[#6B7280]">
                    {employee.employee_type || 'Staff'} • {employee.current_status || employee.status || 'Active'}
                  </Text>
                  <Text className="mt-[2px] text-[11px] leading-4 text-[#6B7280]">{employee.email || employee.phone_number || 'No contact added'}</Text>
                </View>
                <View className="items-end">
                  <Text className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>
                    {employeeStatus}
                  </Text>
                  <Text className="mt-2 text-[10px] font-medium text-[#6B7280]">
                    {employee.today_shift_state || employee.status || 'Active'}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Edit employee ${employee.full_name || 'record'}`}
                    accessibilityRole="button"
                    onPress={() => openEditEmployee(employee)}
                    className="mt-2 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5"
                  >
                    <Text className="text-[11px] font-semibold text-[#116C0B]">Edit</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="mt-1 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <Text className="text-[13px] text-[#6B7280]">
            No employees match your current filter.
          </Text>
        </View>
      )}

      <View className="mt-7 rounded-2xl border border-[#E5E7EB] bg-white p-[18px]">
        <Text className="text-base font-bold text-[#012711]">Contact directory</Text>
        <View className="mt-4 gap-3">
          {employees.slice(0, 4).map(employee => (
            <View key={`${employee.employee_id || employee.full_name}-contact`} className="flex-row items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <View>
                <Text className="text-sm font-semibold text-[#012711]">{employee.full_name || 'Employee'}</Text>
                <Text className="text-[11px] text-[#6B7280]">{employee.employee_type || 'Staff'}</Text>
              </View>
              <Text className="text-[11px] text-[#6B7280]">{employee.phone_number || employee.email || '—'}</Text>
            </View>
          ))}
        </View>
      </View>

      {onBack ? (
        <View className="mt-5">
          <TextButton label="Back to More" onPress={onBack} />
        </View>
      ) : null}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsEditorOpen(false)}
        transparent
        visible={isEditorOpen}
      >
        <View className="flex-1 justify-end bg-[#11182799]">
          <SafeAreaView edges={['bottom']} className="max-h-[94%] rounded-t-3xl bg-[#F9FAFB]">
            <View className="flex-row items-center justify-between border-b border-[#E5E7EB] bg-white px-5 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-[#012711]">
                  {editorEmployeeId ? 'Edit employee' : 'Add new employee'}
                </Text>
                <Text className="mt-1 text-xs text-[#6B7280]">
                  {editorEmployeeId
                    ? `Update ${formValues.full_name || 'employee'} details`
                    : 'Create a staff profile with login and payroll details'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close employee form"
                accessibilityRole="button"
                disabled={isSavingEmployee}
                onPress={() => setIsEditorOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
              >
                <Text className="text-2xl leading-7 text-[#6B7280]">×</Text>
              </Pressable>
            </View>
            {isEditorLoading ? (
              <View className="min-h-[220px] items-center justify-center gap-3">
                <ActivityIndicator color={colors.primary} />
                <Text className="text-sm text-[#6B7280]">Loading employee details…</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="gap-4 px-4 py-4"
              >
                {!editorEmployeeId ? (
                  <View className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                    <Text className="mb-3 text-sm font-bold text-[#012711]">Select employee role</Text>
                    <EmployeeChoiceField
                      accessibilityLabel="Employee role"
                      multiple={false}
                      onChange={value => updateFormValue('employee_type', value)}
                      options={employeeRoleOptions}
                      value={formValues.employee_type}
                    />
                  </View>
                ) : null}

                <EmployeeFormSection title="Personal & access details">
                  <EmployeeChoiceField
                    label="Gender"
                    multiple={false}
                    onChange={value => updateFormValue('gender', value)}
                    options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
                    value={formValues.gender || ''}
                  />
                  {personalFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                  <EmployeeChoiceField
                    accessibilityLabel="Employee status"
                    label="Status"
                    multiple={false}
                    onChange={value => updateFormValue('status', value)}
                    options={['Active', 'Inactive']}
                    value={formValues.status}
                  />
                  {editorEmployeeId ? (
                    <Text className="text-xs leading-5 text-[#6B7280]">
                      Leave both password fields blank to keep the current password.
                    </Text>
                  ) : null}
                  <EmployeeFormField
                    label={editorEmployeeId ? 'New password (optional)' : 'Password'}
                    name="password"
                    onChangeText={value => updateFormValue('password', value)}
                    required={!editorEmployeeId}
                    secureTextEntry
                    value={formValues.password}
                  />
                  <EmployeeFormField
                    label="Confirm password"
                    name="confirm_password"
                    onChangeText={value => updateFormValue('confirm_password', value)}
                    required={!editorEmployeeId}
                    secureTextEntry
                    value={formValues.confirm_password}
                  />
                </EmployeeFormSection>

                {formValues.employee_type === 'Chef' ? (
                  <EmployeeFormSection title="Culinary details">
                    <EmployeeChoiceField
                      label="Cuisine type"
                      multiple={false}
                      onChange={value => updateFormValue('cuisine_type', value)}
                      options={['South Indian', 'North Indian', 'Chinese', 'Bakery', 'Italian', 'Continental', 'Other']}
                      value={formValues.cuisine_type || ''}
                    />
                    <EmployeeChoiceField
                      label="Food preference"
                      multiple={false}
                      onChange={value => updateFormValue('food_preference', value)}
                      options={['Veg', 'Non-Veg', 'Both']}
                      value={formValues.food_preference || ''}
                    />
                    {roleFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                  </EmployeeFormSection>
                ) : null}

                {formValues.employee_type === 'Delivery Partner' ? (
                  <EmployeeFormSection title="Vehicle & schedule">
                    <EmployeeChoiceField
                      label="Vehicle type"
                      multiple={false}
                      onChange={value => updateFormValue('vehicle_type', value)}
                      options={['Bike', 'Scooter', 'Bicycle', 'Electric Vehicle']}
                      value={formValues.vehicle_type || ''}
                    />
                    {roleFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                    <EmployeeChoiceField
                      label="Working days"
                      multiple
                      onChange={value => updateFormValue('working_days', value)}
                      options={employeeWorkingDays}
                      value={formValues.working_days || ''}
                    />
                    <EmployeeChoiceField
                      label="Available for delivery"
                      multiple={false}
                      onChange={value => updateFormValue('available_for_delivery', value)}
                      options={['Yes', 'No']}
                      value={formValues.available_for_delivery}
                    />
                    <EmployeeChoiceField
                      label="Salary structure"
                      multiple={false}
                      onChange={value => updateFormValue('salary_type', value)}
                      options={['Monthly Basis', 'Order Basis']}
                      value={formValues.salary_type}
                    />
                    {formValues.salary_type === 'Order Basis' ? (
                      <EmployeeFormField
                        keyboardType="numeric"
                        label="Commission %"
                        name="commission_percent"
                        onChangeText={value => updateFormValue('commission_percent', value)}
                        value={formValues.commission_percent || ''}
                      />
                    ) : null}
                  </EmployeeFormSection>
                ) : null}

                <EmployeeFormSection title="Location & address">
                  {locationFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                  {(formValues.employee_type === 'Chef' ||
                    formValues.employee_type === 'Delivery Partner') ? (
                    <>
                      <EmployeeFormField
                        label="Latitude"
                        name="latitude"
                        onChangeText={value => updateFormValue('latitude', value)}
                        value={formValues.latitude || ''}
                      />
                      <EmployeeFormField
                        label="Longitude"
                        name="longitude"
                        onChangeText={value => updateFormValue('longitude', value)}
                        value={formValues.longitude || ''}
                      />
                    </>
                  ) : null}
                </EmployeeFormSection>

                <EmployeeFormSection title="Bank & payment details">
                  {bankFields.map(field => (
                    <EmployeeFormField
                      key={field.name}
                      {...field}
                      onChangeText={value => updateFormValue(field.name, value)}
                      value={formValues[field.name] || ''}
                    />
                  ))}
                </EmployeeFormSection>

                {formValues.employee_type !== 'Delivery Partner' ||
                formValues.salary_type === 'Monthly Basis' ? (
                  <EmployeeFormSection title="Compensation & payroll">
                    {salaryFields.map(field => (
                      <EmployeeFormField
                        key={field.name}
                        {...field}
                        onChangeText={value => updateFormValue(field.name, value)}
                        value={formValues[field.name] || ''}
                      />
                    ))}
                  </EmployeeFormSection>
                ) : null}

                {editorError ? (
                  <View className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                    <Text accessibilityRole="alert" className="text-sm leading-5 text-[#991B1B]">
                      {editorError}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityLabel={editorEmployeeId ? 'Save employee changes' : 'Create employee'}
                  accessibilityRole="button"
                  disabled={
                    isSavingEmployee ||
                    isEditorLoading ||
                    (Boolean(editorEmployeeId) && !editorDetailsLoaded)
                  }
                  onPress={saveEmployee}
                  className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#116C0B] px-4 py-3"
                  style={({ pressed }) => ({
                    opacity: isSavingEmployee ? 0.6 : pressed ? 0.85 : 1,
                  })}
                >
                  {isSavingEmployee ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <Text className="text-sm font-bold text-white">
                    {isSavingEmployee
                      ? 'Saving…'
                      : editorEmployeeId
                        ? 'Save changes'
                        : 'Create employee'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSavingEmployee}
                  onPress={() => setIsEditorOpen(false)}
                  className="items-center py-2"
                >
                  <Text className="text-sm font-semibold text-[#6B7280]">Cancel</Text>
                </Pressable>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function EmployeeFormSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <Text className="text-sm font-bold text-[#012711]">{title}</Text>
      {children}
    </View>
  );
}

function EmployeeFormField({
  keyboardType = 'default',
  label,
  multiline = false,
  name,
  onChangeText,
  placeholder,
  required = false,
  secureTextEntry = false,
  value,
}: EmployeeFormFieldDefinition & {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecure = secureTextEntry && !isPasswordVisible;
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-[#374151]">
        {label}{required ? ' *' : ''}
      </Text>
      <View className="flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pr-2">
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isSecure}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
          className={`min-w-0 flex-1 px-3.5 text-sm text-[#012711] ${
            multiline ? 'min-h-[88px] py-3' : 'min-h-11 py-2'
          }`}
          nativeID={`employee-${name}`}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={`${isPasswordVisible ? 'Hide' : 'Show'} ${name === 'confirm_password' ? 'confirm password' : 'password'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isPasswordVisible }}
            onPress={() => setIsPasswordVisible(visible => !visible)}
            className="h-10 w-10 items-center justify-center rounded-lg"
            hitSlop={6}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
                stroke={colors.textSecondary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
                stroke={colors.textSecondary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {!isPasswordVisible ? (
                <Path
                  d="m4 20 16-16"
                  stroke={colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmployeeChoiceField({
  accessibilityLabel,
  label,
  multiple,
  onChange,
  options,
  value,
}: {
  accessibilityLabel?: string;
  label?: string;
  multiple: boolean;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const selectedValues = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-xs font-semibold text-[#374151]">{label}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const selected = selectedValues.includes(option);
          return (
            <Pressable
              accessibilityLabel={
                accessibilityLabel
                  ? `${accessibilityLabel}: ${option}`
                  : `${label || 'Option'}: ${option}`
              }
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => {
                if (multiple) {
                  const next = selected
                    ? selectedValues.filter(item => item !== option)
                    : [...selectedValues, option];
                  onChange(next.join(', '));
                } else {
                  onChange(option);
                }
              }}
              className={`rounded-full border px-3 py-2 ${
                selected
                  ? 'border-[#116C0B] bg-[#F0F7EE]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-[#116C0B]' : 'text-[#6B7280]'
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    (!needsAmount ||
      (amount.trim().length > 0 &&
        Number.isFinite(amountValue) &&
        amountValue >= 0));

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
            <Text className="text-base font-bold text-[#012711]">
              {action.label}
            </Text>
            <Text className="mt-[3px] text-[11px] leading-4 text-[#6B7280]">
              {action.description}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close form"
            onPress={onCancel}
            hitSlop={8}
          >
            <Text className="text-2xl text-[#6B7280]">×</Text>
          </Pressable>
        </View>
        <Text className="mb-2 mt-5 text-[13px] font-semibold text-[#012711]">
          Name or description
        </Text>
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
            <Text className="mb-2 mt-5 text-[13px] font-semibold text-[#012711]">
              {action.amountLabel}
            </Text>
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
          This draft is saved in this session only. Connect your business data
          service to sync it.
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
          <Text className="text-[13px] font-bold text-white">
            Save {action.label.toLowerCase()}
          </Text>
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

type StatTone =
  | 'green'
  | 'blue'
  | 'orange'
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
  green:  { bg: '#052E10', bgMid: '#0B4D1A', bgDark: '#147524', glow1: 'rgba(129,194,56,0.22)', glow2: 'rgba(34,197,94,0.14)' },
  blue:   { bg: '#0B1E4D', bgMid: '#1230A0', bgDark: '#1D4ED8', glow1: 'rgba(96,165,250,0.22)', glow2: 'rgba(59,130,246,0.14)' },
  orange: { bg: '#431407', bgMid: '#9A3412', bgDark: '#C2410C', glow1: 'rgba(251,146,60,0.22)',  glow2: 'rgba(249,115,22,0.14)' },
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
                  backgroundColor: '#FFC107',
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
      ? '#B45309'
      : status === 'Completed'
      ? '#15803D'
      : colors.error;
  const bg =
    status === 'Pending'
      ? '#FFFBEB'
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

function TextButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
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
