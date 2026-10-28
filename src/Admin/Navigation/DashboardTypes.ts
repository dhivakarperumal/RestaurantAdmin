import type { ReceiptIcon } from './NavigationIcons';

export type QuickActionId =
  | 'invoice'
  | 'order'
  | 'customer'
  | 'product'
  | 'payment'
  | 'expense'
  | 'purchase'
  | 'stock';

export type LocalRecord = {
  id: number;
  action: QuickActionId;
  name: string;
  amount?: number;
  createdAt: string;
  status?: 'Pending' | 'Completed' | 'Cancelled';
};

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Declined'
  | 'Cancelled';

export type BillingLineItem = {
  id: string;
  name: string;
  category?: string;
  image?: string;
  amount: number | null;
  quantity: number;
};

export type ApiOrder = {
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

export type ApiOrderItem = {
  food_id?: string | number;
  food_name?: string;
  product_name?: string;
  quantity?: number | string;
  total_price?: number | string;
  unit_price?: number | string;
};

export type ApiBill = {
  bill_id?: string | number;
  bill_number?: string | number;
  table_number?: string | number;
  server_name?: string;
  status?: string;
  grand_total?: number | string;
  created_at?: string;
};

export type ApiKitchenTicket = {
  bill_id?: string | number;
  status?: string;
  items?: ApiOrderItem[];
};

export type ApiCatalogItem = {
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

export type ApiInventorySummary = {
  lowStock?: number;
  pendingKitchenRequests?: number;
};

export type ApiKitchenRequest = {
  status?: string;
};

export type ApiCategory = {
  category_id?: string | number;
  category_name?: string;
  category_image?: string;
  status?: string;
};

export type ApiRevenueSummary = {
  totalRevenue?: number | string;
};

export type ApiRevenueTrend = {
  date?: string;
  label?: string;
  revenue?: number | string;
  orders?: number | string;
};

export type ApiRevenueStatus = {
  status?: string;
  count?: number | string;
};

export type DashboardData = {
  orders: ApiOrder[];
  bills: ApiBill[];
  kitchenOrders: ApiKitchenTicket[];
  users: { role?: string }[];
  foods: ApiCatalogItem[];
  inventory: ApiInventorySummary;
  kitchenRequests: ApiKitchenRequest[];
  kitchenRequestsLoaded: boolean;
  categories: ApiCategory[];
};

export type DashboardDateFilter =
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

export type DashboardReport = {
  summary: ApiRevenueSummary | null;
  trend: ApiRevenueTrend[];
  statuses: ApiRevenueStatus[];
};

export type QuickAction = {
  id: QuickActionId;
  label: string;
  description: string;
  placeholder: string;
  amountLabel?: string;
  amountPlaceholder?: string;
  icon: typeof ReceiptIcon;
};
