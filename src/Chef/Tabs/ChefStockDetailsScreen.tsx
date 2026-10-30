import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import api from '../../../api';
import {
  CustomersIcon,
  ProductIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';
import colors from '../../theme/colors';
import ChefListControls from './ChefListControls';
import ChefStatCards from './ChefStatCards';

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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

      <ChefStatCards
        isLoading={loading}
        stats={[
          {
            label: 'Stock items',
            value: formatNumber(products.length),
            hint: 'Tracked products',
            icon: <ProductIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Categories',
            value: formatNumber(categoryCount),
            hint: 'Stock categories',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Low stock',
            value: formatNumber(lowStockCount),
            hint: 'At or below reorder level',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Out of stock',
            value: formatNumber(outOfStockCount),
            hint: 'Needs replenishment',
            icon: <ProductIcon color="#F6D36A" size={22} />,
          },
        ]}
      />

      <ChefListControls
        filters={[
          {
            label: 'Status',
            value: selectedStatus,
            options: [
              { value: 'All Status', label: 'All statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ],
            onChange: value => {
              if (
                value === 'All Status' ||
                value === 'Active' ||
                value === 'Inactive'
              ) {
                setSelectedStatus(value);
              }
            },
          },
          {
            label: 'Stock level',
            value: selectedStockLevel,
            options: [
              { value: 'All Stock', label: 'All stock levels' },
              { value: 'In Stock', label: 'In stock' },
              { value: 'Low Stock', label: 'Low stock' },
              { value: 'Out of Stock', label: 'Out of stock' },
            ],
            onChange: value => {
              if (
                value === 'All Stock' ||
                value === 'In Stock' ||
                value === 'Low Stock' ||
                value === 'Out of Stock'
              ) {
                setSelectedStockLevel(value);
              }
            },
          },
        ]}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        placeholder="Search by name, SKU, or barcode..."
        search={search}
        searchLabel="Search inventory stock"
        sort={{
          value: sortOrder,
          options: [
            { value: 'latest', label: 'Latest' },
            { value: 'name', label: 'Name A-Z' },
            { value: 'stock-low', label: 'Lowest stock' },
            { value: 'stock-high', label: 'Highest stock' },
          ],
          onChange: value => {
            if (
              value === 'latest' ||
              value === 'name' ||
              value === 'stock-low' ||
              value === 'stock-high'
            ) {
              setSortOrder(value);
            }
          },
        }}
        viewMode={viewMode}
      />

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
        <View
          className={
            viewMode === 'grid'
              ? 'flex-row flex-wrap justify-between gap-y-3'
              : 'gap-3'
          }
        >
          {filteredProducts.map((product, index) => {
            const level = stockLevel(product);
            return (
              <View
                key={String(product.id ?? product.sku ?? index)}
                className={`gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 ${
                  viewMode === 'grid' ? 'w-[48%]' : 'w-full'
                }`}
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
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      stockLevelClass(level).className
                    }`}
                    style={stockLevelClass(level).style}
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

function stockLevelClass(level: Exclude<StockLevel, 'All Stock'>) {
  if (level === 'Out of Stock') {
    return { className: 'bg-rose-50 text-rose-700', style: undefined };
  }
  if (level === 'Low Stock') {
    return {
      className: '',
      style: { backgroundColor: colors.surfaceSecondary, color: colors.primary },
    };
  }
  return { className: 'bg-emerald-50 text-emerald-700', style: undefined };
}

export default ChefStockDetailsScreen;
