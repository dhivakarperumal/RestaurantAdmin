import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';
import type { HeaderUser } from '../Admin/Navigation/TopHeader';
import colors from '../theme/colors';
import ChefBottomNavigation, { type ChefTab } from './ChefBottomNavigation';
import ChefHeader from './ChefHeader';

type ChefDashboardScreenProps = {
  user: HeaderUser | null;
  onLogout: () => void;
};

type DataRow = Record<string, unknown>;

const pageTitles: Record<ChefTab, string> = {
  dashboard: 'Dashboard',
  foods: 'Foods',
  inventory: 'Inventory Requests',
  stock: 'Stock Details',
  attendance: 'Attendance',
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
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          marginBottom: 12,
          padding: 16,
        },
        style,
      ]}
    >
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
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 23, fontWeight: '800' }}>
        {title}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
        {message}
      </Text>
    </Card>
  );
}

function ChefDashboardScreen({ user, onLogout }: ChefDashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<ChefTab>('dashboard');
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [foods, setFoods] = useState<DataRow[]>([]);
  const [orders, setOrders] = useState<DataRow[]>([]);
  const [eventOrders, setEventOrders] = useState<DataRow[]>([]);
  const [requests, setRequests] = useState<DataRow[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<DataRow[]>([]);
  const [attendance, setAttendance] = useState<DataRow | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<DataRow[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [requestUnit, setRequestUnit] = useState('pcs');
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
        } else if (activeTab === 'foods' || activeTab === 'stock') {
          const response = await api.get('/foods');
          if (active) {
            setFoods(rowsFrom(response.data, ['foods', 'items']));
          }
        } else if (activeTab === 'inventory') {
          const [requestResponse, productResponse] = await Promise.all([
            api.get('/inventory/kitchen-requests'),
            api.get('/inventory/products/options'),
          ]);
          if (active) {
            setRequests(rowsFrom(requestResponse.data));
            setInventoryProducts(rowsFrom(productResponse.data));
          }
        } else {
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
  }, [activeTab, refreshCount]);

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
    setRequestQuantity('1');
    setRequestUnit('pcs');
    setIsRequestModalOpen(true);
  };

  const submitInventoryRequest = async () => {
    const quantity = Number(requestQuantity);
    if (!requestProduct.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter an item name and a quantity greater than zero.');
      return;
    }

    const matchedProduct = inventoryProducts.find(
      product =>
        text(product.product_name, '').toLowerCase() ===
        requestProduct.trim().toLowerCase(),
    );
    setIsSavingRequest(true);
    setError('');
    try {
      await api.post('/inventory/kitchen-requests', {
        request_number: `KR-${Date.now()}`,
        requested_by: chefName,
        department: 'Kitchen',
        request_date: new Date().toISOString().slice(0, 10),
        priority: 'Normal',
        items: [
          {
            product_id: matchedProduct?.id ?? null,
            product_name: requestProduct.trim(),
            quantity,
            unit: requestUnit.trim() || 'pcs',
          },
        ],
      });
      setIsRequestModalOpen(false);
      setRefreshCount(count => count + 1);
    } catch (requestError) {
      setError(errorMessage(requestError));
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

  const renderDashboard = () => (
    <>
      <PageHeading
        title={`Welcome${chefName ? `, ${chefName}` : ''}`}
        subtitle="Your kitchen workspace overview."
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'Active Orders', value: orderCounts.active },
          { label: 'Pending', value: orderCounts.pending },
          { label: 'Preparing', value: orderCounts.preparing },
          { label: 'Event Orders', value: orderCounts.events },
        ].map(stat => (
          <Card
            key={stat.label}
            style={{ flexBasis: '47%', flexGrow: 1, marginBottom: 2 }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {stat.label}
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 26,
                fontWeight: '800',
                marginTop: 7,
              }}
            >
              {stat.value}
            </Text>
          </Card>
        ))}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 17,
          fontWeight: '700',
          marginBottom: 10,
          marginTop: 22,
        }}
      >
        Recent kitchen orders
      </Text>
      {orders.length ? (
        orders.slice(0, 6).map((order, index) => (
          <Card key={text(order.id ?? order.order_id, String(index))}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
              Order {text(order.order_number ?? order.order_id ?? order.id, `#${index + 1}`)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
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
    <>
      <PageHeading title="Foods" subtitle="Browse the restaurant food menu." />
      {foods.length ? (
        foods.map((food, index) => (
          <Card key={text(food.food_id ?? food.id, String(index))}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>
              {text(food.food_name, 'Untitled food')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
              {text(food.category_name, 'Uncategorized')}
              {food.final_price !== undefined
                ? ` · ₹${text(food.final_price, '0')}`
                : ''}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState message="No foods are available." />
      )}
    </>
  );

  const renderInventory = () => (
    <>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <PageHeading
            title="Inventory Requests"
            subtitle="Track kitchen stock requests."
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openRequestModal}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: colors.surface, fontSize: 12, fontWeight: '700' }}>
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
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                {text(request.request_number, `Request ${index + 1}`)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
                {firstItem ? text(firstItem.product_name, 'Kitchen supplies') : 'Kitchen supplies'}
                {firstItem ? ` · ${text(firstItem.quantity)} ${text(firstItem.unit, '')}` : ''}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 9 }}>
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

  const renderStock = () => {
    const lowStock = foods.filter(food => Number(food.stock_quantity || 0) <= 15);
    return (
      <>
        <PageHeading title="Stock Details" subtitle="Check current food stock levels." />
        {lowStock.length > 0 ? (
          <Card style={{ backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }}>
            <Text style={{ color: '#9A3412', fontSize: 13, fontWeight: '700' }}>
              {lowStock.length} item{lowStock.length === 1 ? '' : 's'} need a stock check
            </Text>
          </Card>
        ) : null}
        {foods.length ? (
          foods.map((food, index) => {
            const quantity = Number(food.stock_quantity ?? food.current_stock ?? 0);
            const status = quantity <= 0 ? 'Out of stock' : quantity <= 15 ? 'Low stock' : 'In stock';
            return (
              <Card key={text(food.food_id ?? food.id, String(index))}>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                      {text(food.food_name, 'Untitled food')}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {text(food.category_name, 'Uncategorized')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                      {quantity} units
                    </Text>
                    <Text
                      style={{
                        color: quantity <= 15 ? colors.warning : colors.success,
                        fontSize: 11,
                        fontWeight: '700',
                        marginTop: 3,
                      }}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState message="No stock details are available." />
        )}
      </>
    );
  };

  const renderAttendance = () => {
    const isWorking = Boolean(attendance?.check_in && !attendance?.check_out);
    const isCompleted = Boolean(attendance?.check_in && attendance?.check_out);
    return (
      <>
        <PageHeading title="Attendance" subtitle="Record and review your kitchen shifts." />
        <Card>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
            TODAY&apos;S SHIFT
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginTop: 8 }}>
            {isWorking ? 'You are clocked in' : isCompleted ? 'Shift completed' : 'Not clocked in'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
            {attendance?.check_in
              ? `Clock in: ${new Date(String(attendance.check_in)).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Clock in to start recording your shift.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isAttendanceBusy || isCompleted}
            onPress={updateAttendance}
            style={{
              alignItems: 'center',
              backgroundColor: isWorking ? colors.secondary : colors.primary,
              borderRadius: 11,
              marginTop: 16,
              minHeight: 46,
              justifyContent: 'center',
              opacity: isAttendanceBusy || isCompleted ? 0.6 : 1,
            }}
          >
            {isAttendanceBusy ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={{ color: colors.surface, fontSize: 14, fontWeight: '700' }}>
                {isWorking ? 'Clock out' : isCompleted ? 'Shift complete' : 'Clock in'}
              </Text>
            )}
          </Pressable>
        </Card>
        <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 10 }}>
          Attendance history
        </Text>
        {attendanceHistory.length ? (
          attendanceHistory.slice(0, 20).map((record, index) => (
            <Card key={text(record.id, `${text(record.date, 'shift')}-${index}`)}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                {text(record.date ?? record.attendance_date, 'Previous shift')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>
                In: {text(record.check_in)} · Out: {text(record.check_out)}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState message="No attendance history is available." />
        )}
      </>
    );
  };

  let pageContent: React.ReactNode;
  if (activeTab === 'dashboard') {
    pageContent = renderDashboard();
  } else if (activeTab === 'foods') {
    pageContent = renderFoods();
  } else if (activeTab === 'inventory') {
    pageContent = renderInventory();
  } else if (activeTab === 'stock') {
    pageContent = renderStock();
  } else {
    pageContent = renderAttendance();
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ChefHeader
        activeTitle={pageTitles[activeTab]}
        onLogout={onLogout}
        user={user}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => setRefreshCount(count => count + 1)}
            refreshing={isLoading}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FECACA',
              borderRadius: 12,
              borderWidth: 1,
              marginBottom: 14,
              padding: 12,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        {pageContent}
      </ScrollView>
      <ChefBottomNavigation activeTab={activeTab} onTabPress={setActiveTab} />

      <Modal
        animationType="slide"
        onRequestClose={() => setIsRequestModalOpen(false)}
        transparent
        visible={isRequestModalOpen}
      >
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.45)',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: 20,
              paddingBottom: 30,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginBottom: 16 }}>
              New inventory request
            </Text>
            <TextInput
              accessibilityLabel="Product name"
              onChangeText={setRequestProduct}
              placeholder="Product name"
              value={requestProduct}
              style={inputStyle}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                accessibilityLabel="Quantity"
                keyboardType="decimal-pad"
                onChangeText={setRequestQuantity}
                placeholder="Quantity"
                value={requestQuantity}
                style={[inputStyle, { flex: 1 }]}
              />
              <TextInput
                accessibilityLabel="Unit"
                onChangeText={setRequestUnit}
                placeholder="Unit"
                value={requestUnit}
                style={[inputStyle, { flex: 1 }]}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Pressable
                accessibilityRole="button"
                disabled={isSavingRequest}
                onPress={() => setIsRequestModalOpen(false)}
                style={[modalButtonStyle, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSavingRequest}
                onPress={submitInventoryRequest}
                style={[modalButtonStyle, { backgroundColor: colors.primary }]}
              >
                {isSavingRequest ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={{ color: colors.surface, fontWeight: '700' }}>Send request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 10,
  borderWidth: 1,
  color: colors.textPrimary,
  fontSize: 14,
  marginBottom: 10,
  minHeight: 48,
  paddingHorizontal: 12,
} as const;

const modalButtonStyle = {
  alignItems: 'center' as const,
  borderRadius: 10,
  flex: 1,
  justifyContent: 'center' as const,
  minHeight: 46,
};

export default ChefDashboardScreen;
