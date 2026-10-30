import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlusIcon } from '../Navigation/NavigationIcons';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';
import colors from '../../theme/colors';
import { DetailsModal, PrinterIcon } from '../../components/popups';
import api from '../../../api';
import type { BillCompletionDetails } from './Bills';
import {
  canSelectTableForNewOrder,
  getReservationSummary,
  getTableStatus,
  isReservationActive,
  readActiveBillTables,
  tableHasActiveBill,
} from './tableAvailability';
import type { ActiveBillTableReference } from './tableAvailability';
import {
  createOrderRequestKey,
  isValidOrderRequestKey,
  readKitchenOrderReferences,
} from './orderSubmission';
import type { KitchenOrderReferences } from './orderSubmission';

type TableRecord = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  status?: string;
  reservation_is_active?: unknown;
  next_reservation_status?: unknown;
  next_reservation_date?: unknown;
  next_reservation_start_time?: unknown;
  next_reservation_end_time?: unknown;
  next_reservation_customer_name?: unknown;
  next_reservation_guests?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readTables(payload: unknown, depth = 0): TableRecord[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord).map(table => ({
      id:
        typeof table.id === 'string' || typeof table.id === 'number'
          ? table.id
          : undefined,
      table_id:
        typeof table.table_id === 'string' ||
        typeof table.table_id === 'number'
          ? table.table_id
          : undefined,
      table_number:
        typeof table.table_number === 'string' ||
        typeof table.table_number === 'number'
          ? table.table_number
          : undefined,
      status: typeof table.status === 'string' ? table.status : undefined,
      reservation_is_active: table.reservation_is_active,
      next_reservation_status: table.next_reservation_status,
      next_reservation_date: table.next_reservation_date,
      next_reservation_start_time: table.next_reservation_start_time,
      next_reservation_end_time: table.next_reservation_end_time,
      next_reservation_customer_name: table.next_reservation_customer_name,
      next_reservation_guests: table.next_reservation_guests,
    }));
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of ['server_tables', 'tables', 'data']) {
    if (key in payload) {
      const tables = readTables(payload[key], depth + 1);
      if (tables.length || Array.isArray(payload[key])) {
        return tables;
      }
    }
  }
  return [];
}

function getTableKey(table: TableRecord) {
  return String(table.table_id ?? table.id ?? table.table_number ?? '');
}

function getErrorMessage(
  error: unknown,
  fallback = 'Unable to load tables. Please try again.',
) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

export type BillPreviewItem = {
  id: string;
  productId?: string;
  name: string;
  category?: string;
  image?: string;
  amount: number | null;
  quantity: number;
};

type BillPreviewProps = {
  items: BillPreviewItem[];
  onRemoveItem: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onConfirm: (details: BillCompletionDetails) => void;
  onBack: () => void;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function BillPreview({
  items,
  onRemoveItem,
  onQuantityChange,
  onConfirm,
  onBack,
}: BillPreviewProps) {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [activeBills, setActiveBills] = useState<ActiveBillTableReference[]>([]);
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [tablesError, setTablesError] = useState('');
  const [tablesRetry, setTablesRetry] = useState(0);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [isKitchenOrderSent, setIsKitchenOrderSent] = useState(false);
  const [createdKitchenOrder, setCreatedKitchenOrder] =
    useState<KitchenOrderReferences | null>(null);
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away' | 'Delivery'>('Dine In');
  const [discount, setDiscount] = useState('0');
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const requestKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const submissionLockRef = useRef(false);
  const hasUnpricedItems = items.some(item => item.amount === null);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.amount ?? 0) * item.quantity,
    0,
  );
  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Number(discount.replace(/,/g, '')) || 0),
  );
  const taxableAmount = subtotal - discountAmount;
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const grandTotal = taxableAmount + cgst + sgst;
  const availableTableRecords = tables
    .filter(table =>
      canSelectTableForNewOrder(
        table,
        tableHasActiveBill(table, activeBills),
      ),
    )
    .filter(table => String(table.table_number ?? '').trim())
    .filter(
      (table, index, available) =>
        available.findIndex(
          candidate => getTableKey(candidate) === getTableKey(table),
        ) === index,
    );
  const selectedTableRecord =
    availableTableRecords.find(
      table => getTableKey(table) === selectedTableKey,
    ) ?? null;
  const selectedTable = selectedTableRecord
    ? String(selectedTableRecord.table_number).trim()
    : null;
  const canConfirm =
    !hasUnpricedItems &&
    items.length > 0 &&
    (orderType !== 'Dine In' ||
      (!isLoadingTables &&
        !tablesError &&
        selectedTableRecord !== null));
  const canSendToKitchen =
    canConfirm &&
    orderType === 'Dine In' &&
    selectedTableRecord !== null &&
    !isSendingToKitchen &&
    !isKitchenOrderSent;
  const now = new Date();
  const billNumber =
    createdKitchenOrder?.billNumber ||
    `BF${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-001`;
  const receiptText = [
    'BUY FOOD',
    `Bill No: ${billNumber}`,
    `Date: ${now.toLocaleDateString('en-GB')}`,
    `Table: ${orderType === 'Dine In' ? selectedTable ?? 'N/A' : 'N/A'}`,
    `Order Type: ${orderType}`,
    '',
    ...items.map(item =>
      `${item.name}  x${item.quantity}  ${
        item.amount === null
          ? 'Price needed'
          : formatCurrency(item.amount * item.quantity)
      }`,
    ),
    '',
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Discount: ${formatCurrency(discountAmount)}`,
    `CGST: ${formatCurrency(cgst)}`,
    `SGST: ${formatCurrency(sgst)}`,
    `Grand Total: ${formatCurrency(grandTotal)}`,
  ].join('\n');

  const printBill = async () => {
    try {
      await Share.share({ title: `Bill ${billNumber}`, message: receiptText });
    } catch (error) {
      Alert.alert(
        'Unable to open print options',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const sendToKitchen = async () => {
    if (
      submissionLockRef.current ||
      !canSendToKitchen ||
      !selectedTableRecord
    ) {
      return;
    }

    const itemsWithoutProductIds = items.filter(item => !item.productId);
    if (itemsWithoutProductIds.length) {
      Alert.alert(
        'Unable to send order',
        `Missing menu item IDs for: ${itemsWithoutProductIds
          .map(item => item.name)
          .join(', ')}.`,
      );
      return;
    }

    submissionLockRef.current = true;
    setIsSendingToKitchen(true);
    const requestKeyDiagnostic = {
      endpoint: '/kitchen-orders',
      bodyField: 'order_request_key',
      keyPresent: false,
      keyValid: false,
      payloadFields: [] as string[],
    };
    try {
      const selectedTableId =
        selectedTableRecord.table_id ?? selectedTableRecord.id;
      const tableIdentifier =
        selectedTableId ?? selectedTableRecord.table_number;
      const latestTablesResponse = await api.get('/server-tables', {
        params: { _refresh: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      if (
        isRecord(latestTablesResponse.data) &&
        latestTablesResponse.data.success === false
      ) {
        throw new Error(
          typeof latestTablesResponse.data.message === 'string'
            ? latestTablesResponse.data.message
            : 'Unable to verify the latest table status.',
        );
      }
      const latestTables = readTables(latestTablesResponse.data);
      const activeBillsResponse = await api.get('/table-bills', {
        params: { status: 'Active', _refresh: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      if (
        isRecord(activeBillsResponse.data) &&
        activeBillsResponse.data.success === false
      ) {
        throw new Error(
          typeof activeBillsResponse.data.message === 'string'
            ? activeBillsResponse.data.message
            : 'Unable to verify active table bills.',
        );
      }
      const latestActiveBills = readActiveBillTables(
        activeBillsResponse.data,
      );
      const latestTable = latestTables.find(table => {
        const latestIdentifier = table.table_id ?? table.id;
        if (selectedTableId !== undefined && selectedTableId !== null) {
          return (
            latestIdentifier !== undefined &&
            String(latestIdentifier) === String(selectedTableId)
          );
        }
        return String(table.table_number) === String(selectedTable);
      });
      if (!latestTable) {
        throw new Error(
          'The selected table could not be verified. Refresh tables and try again.',
        );
      }
      if (
        !canSelectTableForNewOrder(
          latestTable,
          tableHasActiveBill(latestTable, latestActiveBills),
        )
      ) {
        throw new Error(
          tableHasActiveBill(latestTable, latestActiveBills)
            ? `Table ${selectedTable} already has an active bill. Open it from Table Management to add items.`
            : isReservationActive(latestTable)
            ? `Table ${selectedTable} is currently reserved. Choose another table.`
            : `Table ${selectedTable} is no longer available. Choose another table.`,
        );
      }
      const cleanTableId =
        tableIdentifier !== undefined &&
        Number.isFinite(Number(tableIdentifier))
          ? Number(tableIdentifier)
          : tableIdentifier;
      const payload = {
        table_id: cleanTableId,
        table_number: selectedTable,
        items: items.map(item => ({
          food_id:
            item.productId && Number.isFinite(Number(item.productId))
              ? Number(item.productId)
              : item.productId,
          food_name: item.name,
          quantity: item.quantity,
          unit_price: item.amount,
          selected_addons: [],
          selected_customizations: {},
        })),
        total_amount: subtotal,
        status: 'pending',
      };
      const requestSignature = JSON.stringify(payload);
      if (requestKeyRef.current?.signature !== requestSignature) {
        requestKeyRef.current = {
          signature: requestSignature,
          key: createOrderRequestKey(),
        };
      }
      const requestKey = requestKeyRef.current.key;
      requestKeyDiagnostic.keyPresent = Boolean(requestKey);
      requestKeyDiagnostic.keyValid = isValidOrderRequestKey(requestKey);
      requestKeyDiagnostic.payloadFields = Object.keys(payload);
      if (!isValidOrderRequestKey(requestKey)) {
        console.error('KOT submission has an invalid order request key.', {
          ...requestKeyDiagnostic,
        });
        throw new Error(
          'Unable to create a valid order request key. Please try again.',
        );
      }
      const response = await api.post('/kitchen-orders', {
        ...payload,
        order_request_key: requestKey,
      });

      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'The kitchen rejected this order.',
        );
      }

      const createdOrder = readKitchenOrderReferences(response.data);
      if (createdOrder) {
        setCreatedKitchenOrder(createdOrder);
      }
      setIsKitchenOrderSent(true);
      Alert.alert(
        'Order sent',
        `${
          createdOrder?.kotNumber
            ? `KOT ${createdOrder.kotNumber} for Table ${selectedTable} has been sent to the kitchen.`
            : `The order for Table ${selectedTable} has been sent to the kitchen.`
        }${
          createdOrder?.billNumber
            ? ` Bill ${createdOrder.billNumber} was created.`
            : ''
        }`,
      );
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        'Please check the connection and try again.',
      );
      if (/order[_ ]request[_ ]key/i.test(errorMessage)) {
        console.error('KOT API rejected the order request key.', {
          ...requestKeyDiagnostic,
        });
      }
      Alert.alert(
        'Unable to send order',
        errorMessage,
      );
    } finally {
      submissionLockRef.current = false;
      setIsSendingToKitchen(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoadingTables(true);
    setTablesError('');

    const loadTables = async () => {
      const config = {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      };

      try {
        let response;
        let billsResponse;
        try {
          [response, billsResponse] = await Promise.all([
            api.get('/server-tables', config),
            api.get('/table-bills', {
              ...config,
              params: { status: 'Active' },
            }),
          ]);
        } catch (error) {
          if (
            isRecord(error) &&
            Number(error.status) === 304 &&
            !controller.signal.aborted
          ) {
            [response, billsResponse] = await Promise.all([
              api.get('/server-tables', {
                ...config,
                params: { _refresh: Date.now() },
              }),
              api.get('/table-bills', {
                ...config,
                params: { status: 'Active', _refresh: Date.now() },
              }),
            ]);
          } else {
            throw error;
          }
        }
        if (active) {
          if (
            (isRecord(response.data) && response.data.success === false) ||
            (isRecord(billsResponse.data) &&
              billsResponse.data.success === false)
          ) {
            const failedResponse =
              isRecord(response.data) && response.data.success === false
                ? response.data
                : billsResponse.data;
            throw new Error(
              typeof failedResponse.message === 'string'
                ? failedResponse.message
                : 'Unable to load tables and active bills.',
            );
          }
          setTables(readTables(response.data));
          setActiveBills(readActiveBillTables(billsResponse.data));
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setTablesError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoadingTables(false);
        }
      }
    };

    void loadTables();

    return () => {
      active = false;
      controller.abort();
    };
  }, [tablesRetry]);

  useEffect(() => {
    setIsKitchenOrderSent(false);
  }, [items]);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      <View className="flex-1">
        <MoreInnerHeader
          title="Invoice / Bill"
          destination="Add food"
          subtitle="Items / Food Details"
          onBack={onBack}
          rightContent={
            <Pressable
              accessibilityLabel="Complete bill"
              accessibilityRole="button"
              disabled={!canConfirm}
              onPress={() =>
                onConfirm({
                  orderType,
                  tableNumber: orderType === 'Dine In' ? selectedTable : null,
                  total: grandTotal,
                })
              }
              className={`h-10 w-10 items-center justify-center rounded-xl ${
                !canConfirm
                  ? 'bg-white/10'
                  : 'bg-white/20'
              }`}
            >
              <Text className="text-xl font-bold text-white">✓</Text>
            </Pressable>
          }
        />

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-row flex-wrap justify-between gap-y-2 px-4 py-3.5">
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Bill No</Text>
              <Text className="text-xs font-bold text-[#111827]">#{billNumber}</Text>
            </View>
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Date</Text>
              <Text className="text-xs font-bold text-[#111827]">
                {now.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            {orderType === 'Dine In' ? (
              <View className="w-full gap-2">
                <Text className="text-xs font-semibold text-[#374151]">
                  Select available table (required)
                </Text>
                {isLoadingTables ? (
                  <View className="flex-row items-center gap-2 py-1">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text className="text-xs text-[#6B7280]">Loading tables...</Text>
                  </View>
                ) : tablesError ? (
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text accessibilityRole="alert" className="text-xs text-[#DC2626]">
                      {tablesError}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setTablesRetry(value => value + 1)}
                      className="rounded-lg border border-[#DCE8D8] px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-[#116C0B]">Retry</Text>
                    </Pressable>
                  </View>
                ) : availableTableRecords.length ? (
                  <View className="flex-row flex-wrap gap-2">
                    {availableTableRecords.map(table => {
                      const tableNumber = String(table.table_number).trim();
                      const tableKey = getTableKey(table);
                      const isSelected = selectedTableKey === tableKey;
                      const status = getTableStatus(table);
                      const reservationSummary = getReservationSummary(table);
                      return (
                        <Pressable
                          accessibilityLabel={`Select table ${tableNumber}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={tableKey}
                          onPress={() => {
                            setSelectedTableKey(tableKey);
                            setIsKitchenOrderSent(false);
                          }}
                          className="max-w-full rounded-lg border px-3 py-2"
                          style={{
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            className="text-xs font-semibold"
                            style={{
                              color: isSelected
                                ? colors.textOnPrimary
                                : colors.textPrimary,
                            }}
                          >
                            Table {tableNumber} · {status}
                          </Text>
                          {reservationSummary ? (
                            <Text
                              numberOfLines={2}
                              className="mt-1 text-[10px] text-[#6B7280]"
                            >
                              {reservationSummary}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-xs text-[#DC2626]">
                    No available tables found. Add or free a table before completing this bill.
                  </Text>
                )}
                {!isLoadingTables &&
                !tablesError &&
                availableTableRecords.length > 0 &&
                !selectedTable ? (
                  <Text className="text-xs text-[#6B7280]">
                    Choose a table to enable bill completion.
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View className="w-[48%] flex-row justify-between gap-1">
              <Text className="text-xs text-[#374151]">Time</Text>
              <Text className="text-xs font-bold text-[#111827]">
                {now.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View className="w-full flex-row items-center justify-between">
              <Text className="text-xs text-[#374151]">Order Type</Text>
              <View className="flex-row gap-1.5">
                {(['Dine In', 'Take Away', 'Delivery'] as const).map(type => (
                  <Pressable
                    accessibilityLabel={`Set order type to ${type}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: orderType === type }}
                    key={type}
                    onPress={() => {
                      setOrderType(type);
                      setIsKitchenOrderSent(false);
                    }}
                    className="rounded-md border px-2 py-1"
                    style={
                      orderType === type
                        ? {
                            borderColor: colors.primary,
                            backgroundColor: colors.surfaceSecondary,
                          }
                        : { borderColor: colors.border, backgroundColor: colors.surface }
                    }
                  >
                    <Text
                      className="text-[10px] font-semibold"
                      style={{
                        color:
                          orderType === type
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View
                className="w-[520px] flex-row items-center px-3 py-2.5"
                style={{ backgroundColor: colors.surfaceSecondary }}
              >
                <Text className="w-8 text-xs font-bold" style={{ color: colors.primary }}>#</Text>
                <Text className="flex-1 text-xs font-bold" style={{ color: colors.primary }}>Item</Text>
                <Text className="w-[140px] text-center text-xs font-bold" style={{ color: colors.primary }}>Qty</Text>
                <Text className="w-[96px] text-right text-xs font-bold" style={{ color: colors.primary }}>Price / Total</Text>
              </View>
              {items.map((item, index) => {
                const lineTotal = (item.amount ?? 0) * item.quantity;
                return (
                  <View
                    key={item.id}
                    className="w-[520px] flex-row items-center border-b border-[#E5E7EB] px-3 py-2.5"
                  >
                    <Text className="w-8 text-xs text-[#374151]">{index + 1}</Text>
                    {item.image ? (
                      <Image
                        accessibilityLabel={`${item.name} image`}
                        source={{ uri: item.image }}
                        resizeMode="cover"
                        className="mr-2 h-10 w-10 rounded-md bg-[#F3F4F6]"
                      />
                    ) : null}
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-xs font-bold text-[#111827]">
                        {item.name}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7280]">
                        {item.category || 'Food'}
                      </Text>
                    </View>
                    <View className="w-[140px] flex-row items-center justify-center gap-2">
                      <Pressable
                        accessibilityLabel={`Decrease ${item.name} quantity`}
                        accessibilityRole="button"
                        onPress={() => {
                          if (item.quantity <= 1) {
                            onRemoveItem(item.id);
                          } else {
                            onQuantityChange(item.id, item.quantity - 1);
                          }
                        }}
                        className="h-8 w-8 items-center justify-center rounded-md border"
                        style={{ borderColor: colors.borderLight }}
                      >
                        <Text className="text-base" style={{ color: colors.primary }}>−</Text>
                      </Pressable>
                      <Text className="min-w-4 text-center text-xs text-[#111827]">
                        {item.quantity}
                      </Text>
                      <Pressable
                        accessibilityLabel={`Increase ${item.name} quantity`}
                        accessibilityRole="button"
                        onPress={() => onQuantityChange(item.id, item.quantity + 1)}
                        className="h-8 w-8 items-center justify-center rounded-md border"
                        style={{ borderColor: colors.borderLight }}
                      >
                        <PlusIcon color={colors.primary} size={14} />
                      </Pressable>
                    </View>
                    <View className="w-[96px] items-end">
                      {item.amount === null ? (
                        <Text className="text-[10px] font-semibold" style={{ color: colors.primary }}>Price needed</Text>
                      ) : (
                        <>
                          <Text className="text-[10px] text-[#6B7280]">
                            {formatCurrency(item.amount)} each
                          </Text>
                          <Text className="text-xs font-bold text-[#111827]">
                            {formatCurrency(lineTotal)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="gap-3 px-4 py-4">
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-[#374151]">Discount</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-[#374151]">₹</Text>
                <TextInput
                  accessibilityLabel="Bill discount"
                  keyboardType="decimal-pad"
                  onChangeText={setDiscount}
                  value={discount}
                  className="w-20 rounded-md border border-[#D1D5DB] px-2 py-1.5 text-right text-sm text-[#111827]"
                />
              </View>
            </View>
            <SummaryRow label="CGST (2.5%)" value={formatCurrency(cgst)} />
            <SummaryRow label="SGST (2.5%)" value={formatCurrency(sgst)} />
          </View>
        </ScrollView>

        {hasUnpricedItems ? (
          <Text
            className="px-4 py-2 text-center text-xs"
            style={{
              backgroundColor: colors.surfaceSecondary,
              color: colors.primary,
            }}
          >
            Enter prices for all items before sending the bill.
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel={
            isKitchenOrderSent ? 'Order sent to kitchen' : 'Send order to kitchen'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSendToKitchen }}
          disabled={!canSendToKitchen}
          onPress={sendToKitchen}
          className={`mx-4 mb-2 h-12 flex-row items-center justify-center gap-2 rounded-xl ${
            canSendToKitchen ? 'bg-[#0B4D1A]' : 'bg-[#9CA3AF]'
          }`}
        >
          {isSendingToKitchen ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
          <Text className="text-sm font-bold text-white">
            {isKitchenOrderSent
              ? 'Sent to Kitchen'
              : isSendingToKitchen
              ? 'Sending to Kitchen...'
              : 'Send to Kitchen'}
          </Text>
        </Pressable>
        <View
          className="flex-row items-center justify-between px-5 py-3.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-lg font-extrabold text-white">Grand Total</Text>
          <Text className="text-lg font-extrabold text-white">
            {formatCurrency(grandTotal)}
          </Text>
        </View>
        <View className="flex-row gap-3 border-t border-[#E5E7EB] bg-white px-4 py-3">
          <Pressable
            accessibilityLabel="Preview Bill"
            accessibilityRole="button"
            onPress={() => setIsReceiptPreviewOpen(true)}
            className="h-12 flex-1 items-center justify-center rounded-xl border bg-white"
            style={{ borderColor: colors.primary }}
          >
            <Text className="text-sm font-bold" style={{ color: colors.primary }}>Preview Bill</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Print Bill"
            accessibilityRole="button"
            onPress={printBill}
            className="h-12 flex-1 items-center justify-center rounded-xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-bold text-white">Print Bill</Text>
          </Pressable>
        </View>
      </View>
      <DetailsModal
        visible={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
        title="Bill Preview"
        subtitle={`Invoice #${billNumber}`}
        icon={<PrinterIcon size={22} color="#116C0B" />}
        badge={{
          label: orderType,
          bg: '#F0FDF4',
          text: '#116C0B',
          border: '#DCFCE7',
        }}
        maxWidth={500}
        footer={
          <View className="w-full flex-row gap-3">
            <Pressable
              accessibilityLabel="Close bill preview"
              accessibilityRole="button"
              onPress={() => setIsReceiptPreviewOpen(false)}
              className="mt-4 items-center rounded-xl py-3 justify-center min-h-12 flex-1"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-sm font-semibold text-[#334155]">Close</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Print or Share Bill"
              accessibilityRole="button"
              onPress={() => {
                setIsReceiptPreviewOpen(false);
                printBill();
              }}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] active:bg-[#EA580C]"
            >
              <PrinterIcon size={18} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Print / Share</Text>
            </Pressable>
          </View>
        }
      >
        <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <Text className="font-mono text-xs leading-5 text-[#334155]">{receiptText}</Text>
        </View>
      </DetailsModal>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-[#374151]">{label}</Text>
      <Text className="text-sm font-semibold text-[#111827]">{value}</Text>
    </View>
  );
}

export default BillPreview;
