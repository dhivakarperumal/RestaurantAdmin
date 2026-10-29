import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import api from '../../api';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import MoreInnerHeader from '../Admin/Navigation/MoreInnerHeader';
import { FormModal } from '../components/popups';
import ChefBottomNavigation, { type ChefTab } from './ChefBottomNavigation';
import ChefHeader from './ChefHeader';
import ChefAttendanceScreen from './Tabs/ChefAttendanceScreen';
import ChefEventOrdersScreen from './Tabs/ChefEventOrdersScreen';
import ChefFoodsScreen, { type ChefFood } from './Tabs/ChefFoodsScreen';
import ChefMoreScreen from './Tabs/ChefMoreScreen';
import ChefOrdersMenuScreen from './Tabs/ChefOrdersMenuScreen';
import ChefOrdersScreen, { type ChefOrderPage } from './Tabs/ChefOrdersScreen';
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

function errorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Please check your connection and try again.';
}

function text(value: unknown, fallback = '—') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ChefTab>('dashboard');
  const [selectedMorePage, setSelectedMorePage] = useState<
    'inventory' | 'stock' | null
  >(null);
  const [selectedOrderPage, setSelectedOrderPage] =
    useState<ChefOrderPage | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [foods, setFoods] = useState<DataRow[]>([]);
  const [orders, setOrders] = useState<DataRow[]>([]);
  const [eventOrders, setEventOrders] = useState<DataRow[]>([]);
  const [requests, setRequests] = useState<DataRow[]>([]);
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

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (activeTab === 'dashboard') {
          const [ordersResult, eventsResult] = await Promise.allSettled([
            api.get('/kitchen-orders'),
            api.get('/event-orders', { params: { confirmedOnly: 'true' } }),
          ]);
          if (!active) return;
          if (ordersResult.status === 'fulfilled') {
            setOrders(rowsFrom(ordersResult.value.data, ['orders']));
          }
          if (eventsResult.status === 'fulfilled') {
            setEventOrders(rowsFrom(eventsResult.value.data));
          }
          if (
            ordersResult.status === 'rejected' &&
            eventsResult.status === 'rejected'
          ) {
            throw ordersResult.reason;
          }
          if (
            ordersResult.status === 'rejected' ||
            eventsResult.status === 'rejected'
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
        }
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [activeTab, refreshCount, selectedMorePage]);

  const orderCounts = useMemo(() => {
    const activeOrders = orders.filter(order => {
      const status = text(order.status, 'Pending').toLowerCase();
      return status !== 'served' && status !== 'cancelled';
    });
    return {
      active: activeOrders.length,
      pending: activeOrders.filter(
        order => text(order.status, 'Pending').toLowerCase() === 'pending',
      ).length,
      preparing: activeOrders.filter(
        order => text(order.status, '').toLowerCase() === 'preparing',
      ).length,
      events: eventOrders.filter(order =>
        ['confirmed', 'preparing', 'ready'].includes(
          text(order.status, '').toLowerCase(),
        ),
      ).length,
    };
  }, [eventOrders, orders]);

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
    activeTab === 'more' && selectedMorePage !== null;
  const isOrderInnerPage =
    activeTab === 'orders' && selectedOrderPage !== null;
  const isInnerPage = isMoreInnerPage || isOrderInnerPage;

  const renderDashboard = () => (
    <>
      <PageHeading
        title={`Welcome${chefName ? `, ${chefName}` : ''}`}
        subtitle="Your kitchen workspace overview."
      />
      <View className="flex-row flex-wrap gap-2.5">
        {[
          { label: 'Active Orders', value: orderCounts.active },
          { label: 'Pending', value: orderCounts.pending },
          { label: 'Preparing', value: orderCounts.preparing },
          { label: 'Event Orders', value: orderCounts.events },
        ].map(stat => (
          <Card
            key={stat.label}
            className="mb-0 w-[48%] flex-grow"
          >
            <Text className="text-xs text-[#6B7280]">
              {stat.label}
            </Text>
            <Text className="mt-2 text-[26px] font-extrabold text-[#012711]">
              {stat.value}
            </Text>
          </Card>
        ))}
      </View>
      <Text className="mb-2.5 mt-[22px] text-[17px] font-bold text-[#012711]">
        Recent kitchen orders
      </Text>
      {orders.length ? (
        orders.slice(0, 6).map((order, index) => (
          <Card key={text(order.id ?? order.order_id, String(index))}>
            <Text className="text-sm font-bold text-[#012711]">
              Order {text(order.order_number ?? order.order_id ?? order.id, `#${index + 1}`)}
            </Text>
            <Text className="mt-1.5 text-xs text-[#6B7280]">
              {text(order.status, 'Pending')}
              {Array.isArray(order.items) ? ` · ${order.items.length} items` : ''}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState message="No kitchen orders to show right now." />
      )}
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
      {requests.length ? (
        requests.map((request, index) => {
          const itemList = Array.isArray(request.items) ? request.items : [];
          const firstItem = isRecord(itemList[0]) ? itemList[0] : null;
          return (
            <Card key={text(request.id ?? request.request_number, String(index))}>
              <Text className="text-sm font-bold text-[#012711]">
                {text(request.request_number, `Request ${index + 1}`)}
              </Text>
              <Text className="mt-1.5 text-xs text-[#6B7280]">
                {firstItem ? text(firstItem.product_name, 'Kitchen supplies') : 'Kitchen supplies'}
                {firstItem ? ` · ${text(firstItem.quantity)} ${text(firstItem.unit, '')}` : ''}
              </Text>
              <Text className="mt-2 text-xs font-bold text-[#116C0B]">
                {text(request.status, 'Pending')}
              </Text>
            </Card>
          );
        })
      ) : (
        <EmptyState message="You have no inventory requests yet." />
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
              : 'Stock Details'}
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
          activeTitle={pageTitles[activeTab]}
          onLogout={onLogout}
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
