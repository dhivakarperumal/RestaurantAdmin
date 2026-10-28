import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api, { getApiErrorMessage } from '../../api';
import { PlusIcon } from '../Navigation/NavigationIcons';

type AssinedOrdertoDeliveryProps = {
  onBack: () => void;
};

type DeliveryOrder = {
  id: string;
  customerName: string;
  status: string;
};

type DeliveryPartner = {
  id: string;
  name: string;
  phone: string;
  shiftStatus: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRows(
  payload: unknown,
  collectionNames: string[],
): Record<string, unknown>[] {
  let current = payload;

  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord);
    }

    if (!isRecord(current)) {
      return [];
    }

    for (const collectionName of collectionNames) {
      const collection = current[collectionName];
      if (Array.isArray(collection)) {
        return collection.filter(isRecord);
      }
    }

    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }

  return [];
}

function readString(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }
  return fallback;
}

function readOrders(payload: unknown): DeliveryOrder[] {
  return readRows(payload, ['orders', 'results', 'rows']).flatMap(order => {
    const orderType = readString(order, ['order_type', 'orderType'], '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (orderType !== 'home_delivery') {
      return [];
    }

    const id = readString(order, ['order_id', 'id', 'order_number'], '');
    if (!id) {
      return [];
    }

    return [
      {
        id,
        customerName: readString(
          order,
          ['customer_name', 'full_name', 'name'],
          'Guest',
        ),
        status: readString(
          order,
          ['customer_order_status', 'order_status', 'status'],
          '',
        ),
      },
    ];
  });
}

function readPartners(payload: unknown): DeliveryPartner[] {
  return readRows(payload, [
    'delivery_partners',
    'deliveryPartners',
    'partners',
    'employees',
    'results',
    'rows',
  ]).flatMap(partner => {
    const id = readString(
      partner,
      ['delivery_partner_id', 'employee_id', 'id'],
      '',
    );
    if (!id) {
      return [];
    }

    const shiftStatus = readString(
      partner,
      ['today_shift_state', 'current_status', 'shift_status', 'status'],
      'Off Shift',
    );
    if (shiftStatus.trim().toLowerCase() !== 'available') {
      return [];
    }

    return [
      {
        id,
        name: readString(
          partner,
          ['full_name', 'name', 'employee_name'],
          'Delivery Partner',
        ),
        phone: readString(
          partner,
          ['phone_number', 'mobile_number', 'phone'],
          'No phone number',
        ),
        shiftStatus,
      },
    ];
  });
}

function isNotModified(error: unknown) {
  return isRecord(error) && Number(error.status) === 304;
}

function AssinedOrdertoDelivery({ onBack }: AssinedOrdertoDeliveryProps) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async (signal: AbortSignal) => {
    const config = {
      signal,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
    };

    const getFreshResponse = async (
      url: string,
      params: Record<string, string | boolean>,
    ) => {
      try {
        return await api.get(url, { ...config, params });
      } catch (error) {
        if (!isNotModified(error) || signal.aborted) {
          throw error;
        }
        return api.get(url, {
          ...config,
          params: { ...params, _refresh: String(Date.now()) },
        });
      }
    };

    setIsLoading(true);
    setErrorMessage('');
    try {
      const [ordersResponse, partnersResponse] = await Promise.all([
        getFreshResponse('/orders/management', {
          order_type: 'home_delivery',
        }),
        getFreshResponse('/delivery-partners', { all: true }),
      ]);

      if (signal.aborted) {
        return;
      }

      const nextOrders = readOrders(ordersResponse.data);
      const nextPartners = readPartners(partnersResponse.data);
      setOrders(nextOrders);
      setPartners(nextPartners);
      setSelectedOrderId(current =>
        nextOrders.some(order => order.id === current)
          ? current
          : nextOrders[0]?.id ?? '',
      );
      setSelectedPartnerId(current =>
        nextPartners.some(partner => partner.id === current) ? current : '',
      );
    } catch (error) {
      if (!signal.aborted) {
        setErrorMessage(
          getApiErrorMessage(error, 'Could not load orders and delivery partners.'),
        );
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, refreshKey]);

  const selectedOrder = useMemo(
    () => orders.find(order => order.id === selectedOrderId),
    [orders, selectedOrderId],
  );

  const handleAssign = async () => {
    if (!selectedOrder || !selectedPartnerId || isSaving) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    if (!selectedOrder.status) {
      setErrorMessage(
        'This order has no valid customer status. Refresh the orders and try again.',
      );
      return;
    }

    setIsSaving(true);
    try {
      await api.patch(
        `/orders/management/${encodeURIComponent(selectedOrder.id)}/status`,
        {
          status: 'Confirmed',
          delivery_partner_id: selectedPartnerId,
        },
      );
      setOrders(currentOrders =>
        currentOrders.map(order =>
          order.id === selectedOrder.id
            ? { ...order, status: 'Confirmed' }
            : order,
        ),
      );
      setSuccessMessage(
        'Delivery partner assigned successfully. Order status updated to Confirmed.',
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Could not assign the delivery partner.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="flex-row items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-4">
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-[#111827]">
            Assign Delivery Partner
          </Text>
          <Text className="mt-1 text-sm text-[#64748B]">
            Order <Text className="font-bold text-[#334155]">{selectedOrder?.id ?? '—'}</Text>
          </Text>
          {selectedOrder?.status ? (
            <Text className="mt-1 text-xs font-semibold text-[#116C0B]">
              Status: {selectedOrder.status}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Back to Orders"
          accessibilityRole="button"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center"
        >
          <Text className="text-2xl text-[#64748B]">×</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-4 py-5"
      >
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#116C0B" />
            <Text className="mt-3 text-sm text-[#64748B]">
              Loading delivery orders and partners...
            </Text>
          </View>
        ) : errorMessage && orders.length === 0 && partners.length === 0 ? (
          <View className="items-center gap-3 py-10">
            <Text accessibilityRole="alert" className="text-center text-sm text-[#B91C1C]">
              {errorMessage}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRefreshKey(count => count + 1)}
              className="rounded-xl bg-[#116C0B] px-5 py-3"
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text className="text-sm font-semibold text-[#475569]">
              Home Delivery Order
            </Text>
            <Pressable
              accessibilityLabel="Choose home delivery order"
              accessibilityRole="button"
              onPress={() => setIsOrderPickerOpen(open => !open)}
              className="flex-row items-center justify-between rounded-xl border border-[#F97316] bg-white px-4 py-4"
            >
              <Text className="font-bold text-[#1E293B]">
                {selectedOrder
                  ? `${selectedOrder.id} · ${selectedOrder.customerName}`
                  : 'Select an order'}
              </Text>
              <Text className="text-lg text-[#1E293B]">
                {isOrderPickerOpen ? '⌃' : '⌄'}
              </Text>
            </Pressable>
            {isOrderPickerOpen ? (
              <View className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-white">
                {orders.length ? (
                  orders.map(order => (
                    <Pressable
                      accessibilityLabel={`Select order ${order.id}`}
                      accessibilityRole="button"
                      key={order.id}
                      onPress={() => {
                        setSelectedOrderId(order.id);
                        setIsOrderPickerOpen(false);
                        setSuccessMessage('');
                      }}
                      className={`border-b border-[#E2E8F0] px-4 py-3 ${
                        order.id === selectedOrderId ? 'bg-[#E0F2FE]' : ''
                      }`}
                    >
                      <Text className="text-[#1E293B]">
                        {order.id} · {order.customerName}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="px-4 py-3 text-sm text-[#64748B]">
                    No home delivery orders found.
                  </Text>
                )}
              </View>
            ) : null}

            <View className="gap-3 pt-1">
              {partners.length ? (
                partners.map(partner => {
                  const isSelected = partner.id === selectedPartnerId;
                  return (
                    <Pressable
                      accessibilityLabel={`Select delivery partner ${partner.name}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      key={partner.id}
                      onPress={() => {
                        setSelectedPartnerId(partner.id);
                        setSuccessMessage('');
                      }}
                      className={`flex-row items-center gap-3 rounded-2xl border bg-white px-4 py-3 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#F0FDF4]'
                          : 'border-[#E2E8F0]'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-[#116C0B] bg-[#116C0B]'
                            : 'border-[#CBD5E1]'
                        }`}
                      >
                        {isSelected ? (
                          <View className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </View>
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FFF1E2]">
                        <Text className="text-base font-bold text-[#EA7A52]">
                          {partner.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-[#64748B]">
                          {partner.name}
                        </Text>
                        <Text className="mt-1 text-sm text-[#94A3B8]">
                          {partner.phone}
                        </Text>
                      </View>
                      <Text className="rounded-full bg-[#F1F5F9] px-3 py-2 text-xs font-semibold text-[#64748B]">
                        {partner.shiftStatus}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
                  No delivery partners are currently available.
                </Text>
              )}
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
                {errorMessage}
              </Text>
            ) : null}
            {successMessage ? (
              <Text accessibilityRole="alert" className="text-sm text-[#116C0B]">
                {successMessage}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {!isLoading && !(errorMessage && orders.length === 0 && partners.length === 0) ? (
        <View className="gap-2 border-t border-[#E2E8F0] bg-white px-4 py-4">
          <Pressable
            accessibilityLabel="Assign Delivery Partner"
            accessibilityRole="button"
            disabled={
              !selectedOrder ||
              !selectedOrder.status ||
              !selectedPartnerId ||
              isSaving
            }
            onPress={() => handleAssign()}
            className={`h-12 items-center justify-center rounded-xl ${
              selectedOrder &&
              selectedOrder.status &&
              selectedPartnerId &&
              !isSaving
                ? 'bg-[#FF9F70]'
                : 'bg-[#FDBA9B]'
            }`}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center gap-2">
                <PlusIcon color="#FFFFFF" size={16} />
                <Text className="font-bold text-white">
                  Assign Delivery Partner
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Cancel delivery assignment"
            accessibilityRole="button"
            onPress={onBack}
            className="h-12 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white"
          >
            <Text className="font-semibold text-[#334155]">Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default AssinedOrdertoDelivery;
