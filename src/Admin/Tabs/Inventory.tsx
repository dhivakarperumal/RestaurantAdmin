import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api from '../../../api';
import colors from '../../theme/colors';

type InventorySection =
  | 'Overview'
  | 'Groceries'
  | 'Suppliers'
  | 'Purchases'
  | 'Stock'
  | 'Requests'
  | 'Low stock'
  | 'Expiry';

type InventoryRecord = Record<string, unknown>;

type InventorySummary = {
  totalProducts?: number | string;
  totalStockQuantity?: number | string;
  totalStockValue?: number | string;
  lowStock?: number | string;
  outOfStock?: number | string;
  expiringSoon?: number | string;
  todaysPurchase?: number | string;
  pendingKitchenRequests?: number | string;
};

const sections: InventorySection[] = [
  'Overview',
  'Groceries',
  'Suppliers',
  'Purchases',
  'Stock',
  'Requests',
  'Low stock',
  'Expiry',
];

const endpoints: Record<Exclude<InventorySection, 'Overview'>, string> = {
  Groceries: '/inventory/products',
  Suppliers: '/inventory/suppliers',
  Purchases: '/inventory/purchases',
  Stock: '/inventory/stock/history',
  Requests: '/inventory/kitchen-requests',
  'Low stock': '/inventory/low-stock',
  Expiry: '/inventory/expiry',
};

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Unable to load inventory. Please try again.';
}

function readRows(payload: unknown): InventoryRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is InventoryRecord =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    throw new Error('The inventory service returned an invalid response.');
  }
  const rows = payload.data;
  if (!Array.isArray(rows)) {
    throw new Error('The inventory service returned an invalid list.');
  }
  return rows.filter(
    (item): item is InventoryRecord =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  );
}

function readSummary(payload: unknown): InventorySummary {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null
  ) {
    throw new Error('The inventory service returned an invalid summary.');
  }
  return payload.data as InventorySummary;
}

function getValue(record: InventoryRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}

function formatNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('en-IN').format(number) : '0';
}

function formatCurrency(value: unknown) {
  const number = Number(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function InventoryScreen() {
  const [activeSection, setActiveSection] =
    useState<InventorySection>('Overview');
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [rows, setRows] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadSection = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (activeSection === 'Overview') {
          const response = await api.get('/inventory/dashboard', {
            signal: controller.signal,
          });
          setSummary(readSummary(response.data));
          setRows([]);
        } else {
          const response = await api.get(endpoints[activeSection], {
            signal: controller.signal,
          });
          setRows(readRows(response.data));
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadSection();
    return () => controller.abort();
  }, [activeSection, refreshKey]);

  const refresh = () => setRefreshKey(current => current + 1);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-[1100px] px-4 pb-8 pt-5"
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={refresh}
          refreshing={isLoading}
          tintColor={colors.primary}
        />
      }
    >
      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        INVENTORY MANAGEMENT
      </Text>
      <Text className="mt-1 text-2xl font-bold text-[#012711]">
        Products & Inventory
      </Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Review stock levels, supplier activity, and kitchen requests.
      </Text>

      <ScrollView
        className="mt-5"
        contentContainerClassName="gap-2 pr-4"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {sections.map(section => {
          const selected = activeSection === section;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={section}
              onPress={() => setActiveSection(section)}
              className={`rounded-full border px-4 py-2.5 ${
                selected
                  ? 'border-[#116C0B] bg-[#116C0B]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-white' : 'text-[#4B5563]'
                }`}
              >
                {section}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-5">
        {isLoading ? (
          <View className="min-h-[180px] items-center justify-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#6B7280]">
              Loading {activeSection.toLowerCase()}...
            </Text>
          </View>
        ) : error ? (
          <View
            accessibilityRole="alert"
            className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4"
          >
            <Text className="text-sm font-semibold text-[#B91C1C]">
              Inventory could not be loaded
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#7F1D1D]">
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-3 self-start rounded-lg bg-[#116C0B] px-4 py-2.5"
              onPress={refresh}
            >
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : activeSection === 'Overview' ? (
          <Overview summary={summary} />
        ) : (
          <InventoryList section={activeSection} rows={rows} />
        )}
      </View>
    </ScrollView>
  );
}

function Overview({ summary }: { summary: InventorySummary | null }) {
  const cards = [
    { label: 'Total products', value: formatNumber(summary?.totalProducts) },
    {
      label: 'Stock quantity',
      value: formatNumber(summary?.totalStockQuantity),
    },
    { label: 'Stock value', value: formatCurrency(summary?.totalStockValue) },
    { label: 'Low stock', value: formatNumber(summary?.lowStock) },
    { label: 'Out of stock', value: formatNumber(summary?.outOfStock) },
    { label: 'Expiring soon', value: formatNumber(summary?.expiringSoon) },
    {
      label: "Today's purchases",
      value: formatCurrency(summary?.todaysPurchase),
    },
    {
      label: 'Pending kitchen requests',
      value: formatNumber(summary?.pendingKitchenRequests),
    },
  ];

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {cards.map(card => (
        <View
          key={card.label}
          className="min-h-[92px] w-[48%] justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4"
        >
          <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#6B7280]">
            {card.label}
          </Text>
          <Text className="mt-3 text-xl font-bold text-[#012711]">
            {card.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InventoryList({
  section,
  rows,
}: {
  section: Exclude<InventorySection, 'Overview'>;
  rows: InventoryRecord[];
}) {
  if (!rows.length) {
    return (
      <View className="items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-10">
        <Text className="text-sm font-semibold text-[#374151]">
          No {section.toLowerCase()} found
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Inventory records will appear here when available.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {rows.map((row, index) => {
        const title =
          section === 'Groceries' || section === 'Low stock' || section === 'Expiry'
            ? getValue(row, 'product_name', 'name')
            : section === 'Suppliers'
              ? getValue(row, 'supplier_name', 'company_name', 'name')
              : section === 'Purchases'
                ? getValue(row, 'purchase_number', 'invoice_number', 'id')
                : section === 'Stock'
                  ? getValue(row, 'product_name', 'item_name', 'product_id')
                  : getValue(row, 'request_number', 'requested_by', 'id');
        const subtitle = getSubtitle(section, row);
        const detail = getDetail(section, row);
        const status = getValue(row, 'status', 'transaction_type');
        const sectionName = section === 'Groceries' ? 'Grocery' : section;

        return (
          <View
            key={getValue(row, 'id', 'product_id', 'request_number') || `${section}-${index}`}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#012711]">
                  {title || `${sectionName} record ${index + 1}`}
                </Text>
                {subtitle ? (
                  <Text className="mt-1 text-xs leading-[18px] text-[#6B7280]">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {status ? (
                <Text className="rounded-full bg-[#F0F7EE] px-2.5 py-1 text-[10px] font-semibold text-[#116C0B]">
                  {status}
                </Text>
              ) : null}
            </View>
            {detail ? (
              <Text className="mt-3 text-xs font-semibold text-[#374151]">
                {detail}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function getSubtitle(section: Exclude<InventorySection, 'Overview'>, row: InventoryRecord) {
  switch (section) {
    case 'Groceries':
    case 'Low stock':
    case 'Expiry':
      return [
        getValue(row, 'sku'),
        getValue(row, 'category_name', 'category'),
        getValue(row, 'supplier_name'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'Suppliers':
      return [
        getValue(row, 'contact_person'),
        getValue(row, 'phone', 'phone_number', 'mobile'),
        getValue(row, 'email'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'Purchases':
      return [
        getValue(row, 'supplier_name'),
        getValue(row, 'purchase_date', 'created_at'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'Stock':
      return [
        getValue(row, 'transaction_type'),
        getValue(row, 'created_at', 'transaction_date'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'Requests':
      return [
        getValue(row, 'requested_by'),
        getValue(row, 'request_date'),
      ]
        .filter(Boolean)
        .join(' · ');
  }
}

function getDetail(section: Exclude<InventorySection, 'Overview'>, row: InventoryRecord) {
  switch (section) {
    case 'Groceries':
    case 'Low stock':
      return `Stock: ${formatNumber(row.current_stock)} ${getValue(row, 'unit_name', 'unit')}`.trim();
    case 'Expiry':
      return getValue(row, 'expiry_date')
        ? `Expiry: ${getValue(row, 'expiry_date')}`
        : '';
    case 'Suppliers':
      return getValue(row, 'address');
    case 'Purchases':
      return formatCurrency(row.grand_total ?? row.total_amount);
    case 'Stock':
      return `Quantity: ${formatNumber(row.quantity)} ${getValue(row, 'unit')}`.trim();
    case 'Requests':
      return Array.isArray(row.items) ? `${row.items.length} requested item(s)` : '';
  }
}

export default InventoryScreen;
