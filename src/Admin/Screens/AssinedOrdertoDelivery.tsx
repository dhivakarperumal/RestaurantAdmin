import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiErrorMessage } from '../../../api';
import { PlusIcon } from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';

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

function readBoolean(
  record: Record<string, unknown>,
  keys: string[],
  positiveState: string,
  negativeStates: string[],
): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number' && (value === 0 || value === 1)) {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (
        ['true', '1', 'yes', positiveState].includes(normalized)
      ) {
        return true;
      }
      if (
        ['false', '0', 'no', ...negativeStates].includes(normalized)
      ) {
        return false;
      }
    }
  }
  return null;
}

function isPartnerOnline(partner: Record<string, unknown>) {
  const attendanceStatus = readString(
    partner,
    [
      'attendance_status',
      'today_attendance_status',
      'today_status',
      'attendance',
      'today_shift_state',
      'shift_status',
      'presence_status',
      'status',
    ],
    '',
  ).toLowerCase();
  if (
    ['clocked out', 'checked out', 'absent', 'off shift', 'offline'].includes(
      attendanceStatus,
    )
  ) {
    return false;
  }

  const explicitOnline = readBoolean(partner, [
    'is_online',
    'isOnline',
    'online',
  ], 'online', ['offline']);
  if (explicitOnline !== null) {
    return explicitOnline;
  }

  if (
    ['clocked in', 'checked in', 'present', 'working', 'on duty', 'online'].includes(
      attendanceStatus,
    )
  ) {
    return true;
  }
  if (
    ['clocked out', 'checked out', 'absent', 'off shift', 'offline'].includes(
      attendanceStatus,
    )
  ) {
    return false;
  }

  const checkOut = readString(
    partner,
    ['today_check_out', 'check_out_time', 'check_out', 'clock_out_time'],
    '',
  );
  const checkIn = readString(
    partner,
    ['today_check_in', 'check_in_time', 'check_in', 'clock_in_time'],
    '',
  );
  if (checkOut) {
    return false;
  }
  if (checkIn) {
    return true;
  }

  return (
    readString(
      partner,
      ['online_status', 'connectivity_status'],
      '',
    ).toLowerCase() === 'online'
  );
}

function isPartnerAvailable(partner: Record<string, unknown>) {
  const explicitAvailability = readBoolean(partner, [
    'is_available',
    'isAvailable',
    'available',
    'available_for_delivery',
  ], 'available', ['unavailable', 'busy', 'offline']);
  if (explicitAvailability !== null) {
    return explicitAvailability;
  }

  const status = readString(
    partner,
    ['availability_status', 'today_shift_state', 'shift_status'],
    '',
  ).toLowerCase();
  return !['unavailable', 'busy', 'off shift', 'offline'].includes(status);
}

function readAttendanceRows(payload: unknown) {
  return readRows(payload, [
    'attendance',
    'attendances',
    'attendance_records',
    'records',
    'employees',
    'results',
    'rows',
  ]);
}

function readEmployeeRows(payload: unknown) {
  return readRows(payload, ['employees', 'results', 'rows']);
}

function readPartnerId(record: Record<string, unknown>) {
  return readString(
    record,
    ['delivery_partner_id', 'employee_id', 'staff_id', 'user_id', 'id'],
    '',
  );
}

function readOrders(payload: unknown): DeliveryOrder[] {
  return readRows(payload, ['orders', 'results', 'rows']).flatMap(order => {
    const orderType = readString(order, ['order_type', 'orderType'], '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (orderType !== 'home_delivery') {
      return [];
    }

    const orderStatus = readString(
      order,
      ['customer_order_status', 'order_status', 'status'],
      '',
    ).toLowerCase();
    const assignedPartnerId = readString(
      order,
      [
        'delivery_partner_id',
        'deliveryPartnerId',
        'assigned_delivery_partner_id',
        'assigned_partner_id',
        'delivery_partner',
        'assigned_to',
      ],
      '',
    );
    const assignmentStatus = readString(
      order,
      ['assignment_status', 'delivery_status', 'delivery_assignment_status'],
      '',
    ).toLowerCase();
    const isAssigned = readBoolean(
      order,
      ['is_assigned', 'isAssigned', 'delivery_assigned'],
      'assigned',
      ['unassigned', 'not_assigned'],
    );
    if (
      assignedPartnerId ||
      isAssigned === true ||
      ['confirmed', 'assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered'].includes(
        orderStatus,
      ) ||
      ['assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered'].includes(
        assignmentStatus,
      )
    ) {
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

function readPartners(
  payload: unknown,
  employeePayload: unknown,
  attendancePayload: unknown,
): DeliveryPartner[] {
  const attendanceByPartnerId = new Map(
    readAttendanceRows(attendancePayload)
      .map(attendance => [readPartnerId(attendance), attendance] as const)
      .filter(([id]) => id !== ''),
  );

  const employees = readEmployeeRows(employeePayload);
  const partnerRows = readRows(payload, [
    'delivery_partners',
    'deliveryPartners',
    'partners',
    'employees',
    'results',
    'rows',
  ]);
  const candidates = [
    ...partnerRows,
    ...employees.filter(employee =>
      readString(employee, ['employee_type', 'role', 'type'], '')
        .toLowerCase()
        .includes('delivery'),
    ),
  ];
  const candidatesById = new Map<string, Record<string, unknown>>();
  candidates.forEach((candidate, index) => {
    const id = readPartnerId(candidate) || `missing-id-${index}`;
    candidatesById.set(id, {
      ...(candidatesById.get(id) ?? {}),
      ...candidate,
    });
  });

  return [...candidatesById.values()].flatMap(partner => {
    const id = readPartnerId(partner);
    if (!id) {
      return [];
    }

    const employee = employees.find(
      row => readPartnerId(row) === id,
    );
    const attendance = attendanceByPartnerId.get(id);
    const statusRecord = {
      ...partner,
      ...(employee ?? {}),
      ...(attendance ?? {}),
    };
    const isActiveEmployee = readString(
      employee ?? statusRecord,
      ['employee_status', 'employeeStatus', 'current_status', 'status'],
      '',
    ).toLowerCase();
    if (
      !isPartnerOnline(statusRecord) ||
      !isPartnerAvailable(statusRecord) ||
      isActiveEmployee === 'inactive'
    ) {
      return [];
    }

    const name = readString(
      partner,
      ['full_name', 'name', 'employee_name'],
      readString(employee ?? {}, ['full_name', 'name', 'employee_name'], ''),
    );
    if (!name) {
      return [];
    }

    return [
      {
        id,
        name,
        phone: readString(
          { ...(employee ?? {}), ...partner },
          ['phone_number', 'mobile_number', 'phone'],
          'No phone number',
        ),
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

  const loadData = useCallback(async (signal: AbortSignal, showLoading = true) => {
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

    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMessage('');
    try {
      const [ordersResponse, partnersResponse, employeesResponse] =
        await Promise.all([
        getFreshResponse('/orders/management', {
          order_type: 'home_delivery',
        }),
        getFreshResponse('/delivery-partners', { all: true }),
        getFreshResponse('/employees', {}),
      ]);
      let attendancePayload: unknown = null;
      try {
        const attendanceResponse = await getFreshResponse(
          '/attendance/today',
          {},
        );
        attendancePayload = attendanceResponse.data;
      } catch {
        attendancePayload = null;
      }

      if (signal.aborted) {
        return;
      }

      const nextOrders = readOrders(ordersResponse.data);
      const nextPartners = readPartners(
        partnersResponse.data,
        employeesResponse.data,
        attendancePayload,
      );
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
      if (!signal.aborted && showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    const interval = setInterval(() => {
      loadData(controller.signal, false);
    }, 15000);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadData(controller.signal, false);
      }
    });
    return () => {
      controller.abort();
      appStateSubscription.remove();
      clearInterval(interval);
    };
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
      let latestPartnersResponse;
      let latestEmployeesResponse;
      let latestAttendanceResponse: { data: unknown } | null = null;
      try {
        const params = { all: true, _refresh: String(Date.now()) };
        const config = {
          params,
          headers: {
            'Cache-Control': 'no-cache, no-store',
            Pragma: 'no-cache',
          },
        };
        [latestPartnersResponse, latestEmployeesResponse] = await Promise.all([
          api.get('/delivery-partners', config),
          api.get('/employees', {
            ...config,
            params: { _refresh: params._refresh },
          }),
        ]);
        try {
          latestAttendanceResponse = await api.get('/attendance/today', {
            ...config,
            params: { _refresh: params._refresh },
          });
        } catch {
          latestAttendanceResponse = null;
        }
      } catch (error) {
        if (!isNotModified(error)) {
          throw error;
        }
        const refresh = String(Date.now() + 1);
        [latestPartnersResponse, latestEmployeesResponse] = await Promise.all([
          api.get('/delivery-partners', {
            params: { all: true, _refresh: refresh },
            headers: {
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          }),
          api.get('/employees', {
            params: { _refresh: refresh },
            headers: {
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          }),
        ]);
        try {
          latestAttendanceResponse = await api.get('/attendance/today', {
            params: { _refresh: refresh },
            headers: {
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          });
        } catch {
          latestAttendanceResponse = null;
        }
      }
      const latestPartners = readPartners(
        latestPartnersResponse.data,
        latestEmployeesResponse.data,
        latestAttendanceResponse?.data ?? null,
      );
      setPartners(latestPartners);
      if (!latestPartners.some(partner => partner.id === selectedPartnerId)) {
        setSelectedPartnerId('');
        setErrorMessage(
          'This delivery partner is offline. Please select another online partner.',
        );
        return;
      }

      await api.patch(
        `/orders/management/${encodeURIComponent(selectedOrder.id)}/status`,
        {
          status: 'assigned',
          delivery_partner_id: selectedPartnerId,
        },
      );
      setOrders(currentOrders => {
        const remainingOrders = currentOrders.filter(
          order => order.id !== selectedOrder.id,
        );
        setSelectedOrderId(remainingOrders[0]?.id ?? '');
        return remainingOrders;
      });
      setSuccessMessage(
        'Delivery partner assigned successfully. The order was removed from the assignment list.',
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
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-[#F9FAFB]">
      <View className="flex-row items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3">
        <Pressable
          accessibilityLabel="Back to Orders"
          accessibilityRole="button"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6]"
        >
          <Text className="text-2xl font-bold text-[#374151]">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-lg font-bold text-[#012711]">
            Assign Delivery Partner
          </Text>
        </View>
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
              className="flex-row items-center justify-between rounded-xl border bg-white px-4 py-4"
              style={{ borderColor: colors.primary }}
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
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#475569]">
                  Online delivery partners
                </Text>
                <Pressable
                  accessibilityLabel="Refresh delivery partners"
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={() => setRefreshKey(count => count + 1)}
                  className="rounded-lg px-3 py-2"
                >
                  <Text className="font-semibold" style={{ color: colors.primary }}>Refresh</Text>
                </Pressable>
              </View>
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
                      className="flex-row items-center gap-3 rounded-2xl border bg-white px-4 py-3"
                      style={
                        isSelected
                          ? {
                              borderColor: colors.primary,
                              backgroundColor: colors.surfaceSecondary,
                            }
                          : undefined
                      }
                    >
                      <View
                        className="h-5 w-5 items-center justify-center rounded-full border"
                        style={
                          isSelected
                            ? {
                                borderColor: colors.primary,
                                backgroundColor: colors.primary,
                              }
                            : undefined
                        }
                      >
                        {isSelected ? (
                          <View className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </View>
                      <View
                        className="h-12 w-12 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.surfaceSecondary }}
                      >
                        <Text
                          className="text-base font-bold"
                          style={{ color: colors.primary }}
                        >
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
                      <Text className="rounded-full bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#047857]">
                        Online · Available
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text
                  accessibilityRole="alert"
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]"
                >
                  No delivery partners are currently online.
                </Text>
              )}
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
                {errorMessage}
              </Text>
            ) : null}
            {successMessage ? (
              <Text
                accessibilityRole="alert"
                className="text-sm"
                style={{ color: colors.primary }}
              >
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
              !partners.some(partner => partner.id === selectedPartnerId) ||
              isSaving
            }
            onPress={() => handleAssign()}
            className={`h-12 items-center justify-center rounded-xl ${
              selectedOrder &&
              selectedOrder.status &&
              selectedPartnerId &&
              partners.some(partner => partner.id === selectedPartnerId) &&
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
    </SafeAreaView>
  );
}

export default AssinedOrdertoDelivery;
