import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../api';

type StockProduct = Record<string, unknown> & {
  id?: string | number;
  product_name?: string;
  sku?: string;
  barcode?: string;
  category_name?: string;
  unit_name?: string;
  current_stock?: number | string;
  reorder_level?: number | string;
  status?: string;
  created_at?: string;
};

type StockLevel = 'All Stock' | 'In Stock' | 'Low Stock' | 'Out of Stock';
type ProductStatus = 'All Status' | 'Active' | 'Inactive';
type SortOrder = 'latest' | 'name' | 'stock-low' | 'stock-high';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProducts(payload: unknown): StockProduct[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('The inventory service returned an invalid product list.');
  }
  return payload.data.filter(isRecord) as StockProduct[];
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return 'Unable to load stock details. Please try again.';
}

function stockLevel(product: StockProduct): Exclude<StockLevel, 'All Stock'> {
  const stock = Number(product.current_stock) || 0;
  const reorderLevel = Number(product.reorder_level) || 0;
  if (stock === 0) return 'Out of Stock';
  return stock <= reorderLevel ? 'Low Stock' : 'In Stock';
}

function formatNumber(value: unknown) {
  const number = Number(value);
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(number) ? number : 0);
}

function ChefStockDetailsScreen({
  onRequestProduct,
  onAddRequest,
}: {
  onRequestProduct: (product: StockProduct) => void;
  onAddRequest: () => void;
}) {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] =
    useState<ProductStatus>('All Status');
  const [selectedStockLevel, setSelectedStockLevel] =
    useState<StockLevel>('All Stock');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  const loadProducts = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const response = await api.get('/inventory/products', { signal });
      setProducts(readProducts(response.data));
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadProducts(controller.signal);
    return () => controller.abort();
  }, [loadProducts, refreshVersion]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter(product => {
        const searchMatches = [
          product.product_name,
          product.sku,
          product.barcode,
          product.category_name,
        ].some(value => String(value || '').toLowerCase().includes(term));
        const status = String(product.status || 'Active').toLowerCase();
        const statusMatches =
          selectedStatus === 'All Status' ||
          (selectedStatus === 'Active'
            ? status === 'active'
            : status !== 'active');
        const stockMatches =
          selectedStockLevel === 'All Stock' ||
          stockLevel(product) === selectedStockLevel;
        return searchMatches && statusMatches && stockMatches;
      })
      .sort((first, second) => {
        if (sortOrder === 'name') {
          return String(first.product_name || '').localeCompare(
            String(second.product_name || ''),
          );
        }
        if (sortOrder === 'stock-low') {
          return Number(first.current_stock || 0) - Number(second.current_stock || 0);
        }
        if (sortOrder === 'stock-high') {
          return Number(second.current_stock || 0) - Number(first.current_stock || 0);
        }
        return (
          new Date(String(second.created_at || 0)).getTime() -
          new Date(String(first.created_at || 0)).getTime()
        );
      });
  }, [products, search, selectedStatus, selectedStockLevel, sortOrder]);

  const categoryCount = new Set(
    products.map(product => product.category_name).filter(Boolean),
  ).size;
  const lowStockCount = products.filter(
    product => stockLevel(product) === 'Low Stock',
  ).length;
  const outOfStockCount = products.filter(
    product => stockLevel(product) === 'Out of Stock',
  ).length;

  return (
    <View className="gap-4 pb-6">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[22px] font-extrabold text-[#012711]">
            Inventory Stock
          </Text>
          <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
            View current stock levels for kitchen inventory.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onAddRequest}
          className="min-h-10 items-center justify-center rounded-xl bg-[#123B2D] px-3"
        >
          <Text className="text-[10px] font-bold text-white">Add Request</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {[
          { title: 'Stock Items', value: products.length, color: 'bg-green-50' },
          { title: 'Categories', value: categoryCount, color: 'bg-emerald-50' },
          { title: 'Low Stock', value: lowStockCount, color: 'bg-green-50' },
          { title: 'Out of Stock', value: outOfStockCount, color: 'bg-rose-50' },
        ].map(stat => (
          <View
            key={stat.title}
            className={`min-h-[90px] w-[48%] flex-grow rounded-2xl border border-[#E5E7EB] ${stat.color} p-3`}
          >
            <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
              {stat.title}
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-[#123B2D]">
              {loading ? '…' : formatNumber(stat.value)}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <TextInput
          accessibilityLabel="Search inventory stock"
          className="min-h-11 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search by name, SKU, or barcode"
          placeholderTextColor="#9CA3AF"
          value={search}
        />
        <ScrollView
          contentContainerClassName="gap-2 pr-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {(['All Status', 'Active', 'Inactive'] as const).map(status => (
            <FilterChip
              key={status}
              label={status}
              selected={selectedStatus === status}
              onPress={() => setSelectedStatus(status)}
            />
          ))}
        </ScrollView>
        <ScrollView
          contentContainerClassName="gap-2 pr-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {(['All Stock', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map(
            level => (
              <FilterChip
                key={level}
                label={level}
                selected={selectedStockLevel === level}
                onPress={() => setSelectedStockLevel(level)}
              />
            ),
          )}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setSortOrder(current => {
              const orders: SortOrder[] = [
                'latest',
                'name',
                'stock-low',
                'stock-high',
              ];
              return orders[(orders.indexOf(current) + 1) % orders.length];
            })
          }
          className="self-start rounded-lg bg-[#F0F7EE] px-3 py-2"
        >
          <Text className="text-[10px] font-semibold text-[#116C0B]">
            Sort: {sortLabel(sortOrder)}
          </Text>
        </Pressable>
      </View>

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

      {loading ? (
        <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white py-10">
          <ActivityIndicator color="#116C0B" />
          <Text className="mt-3 text-xs text-[#6B7280]">
            Loading stock details...
          </Text>
        </View>
      ) : filteredProducts.length ? (
        <View className="gap-3">
          {filteredProducts.map((product, index) => {
            const level = stockLevel(product);
            return (
              <View
                key={String(product.id ?? product.sku ?? index)}
                className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#123B2D]">
                      {product.product_name || 'Unnamed stock item'}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#6B7280]">
                      SKU: {product.sku || '—'}
                      {product.barcode ? ` · Barcode: ${product.barcode}` : ''}
                    </Text>
                  </View>
                  <Text
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stockLevelClass(level)}`}
                  >
                    {level}
                  </Text>
                </View>
                <View className="flex-row flex-wrap justify-between gap-2 rounded-xl bg-[#F9FAFB] p-3">
                  <View>
                    <Text className="text-[10px] text-[#6B7280]">Current stock</Text>
                    <Text className="mt-1 text-sm font-bold text-[#111827]">
                      {formatNumber(product.current_stock)}{' '}
                      {product.unit_name || 'units'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] text-[#6B7280]">Category</Text>
                    <Text className="mt-1 text-xs font-semibold text-[#374151]">
                      {product.category_name || 'Uncategorized'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-[10px] text-[#6B7280]">
                    Reorder at {formatNumber(product.reorder_level)}{' '}
                    {product.unit_name || 'units'} · {product.status || 'Active'}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Request ${product.product_name || 'stock item'}`}
                    accessibilityRole="button"
                    onPress={() => onRequestProduct(product)}
                    className="min-h-9 items-center justify-center rounded-lg bg-[#123B2D] px-3"
                  >
                    <Text className="text-[10px] font-bold text-white">Request</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-10">
          <Text className="text-center text-sm font-bold text-[#374151]">
            No stock records found
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-[#6B7280]">
            Try changing your search or filters.
          </Text>
        </View>
      )}
      {!loading && filteredProducts.length ? (
        <Text className="text-center text-[10px] text-[#6B7280]">
          Showing {filteredProducts.length} of {products.length} stock items
        </Text>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        selected ? 'border-[#116C0B] bg-[#116C0B]' : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <Text className={`text-[10px] font-semibold ${selected ? 'text-white' : 'text-[#4B5563]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function sortLabel(order: SortOrder) {
  const labels: Record<SortOrder, string> = {
    latest: 'Latest',
    name: 'Name A–Z',
    'stock-low': 'Stock low to high',
    'stock-high': 'Stock high to low',
  };
  return labels[order];
}

function stockLevelClass(level: Exclude<StockLevel, 'All Stock'>) {
  if (level === 'Out of Stock') return 'bg-rose-50 text-rose-700';
  if (level === 'Low Stock') return 'bg-green-50 text-green-800';
  return 'bg-emerald-50 text-emerald-700';
}

export default ChefStockDetailsScreen;
