import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../api';
import colors from '../../theme/colors';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';

export type AdminTableRecord = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  status?: string;
};

type BillRecord = Record<string, unknown>;

type ActiveBillPreviewProps = {
  table: AdminTableRecord;
  onBack: () => void;
  onAddItems: (details: {
    billId: string;
    tableId: string;
    tableNumber: string;
  }) => void;
  onCompleted: () => void;
};

type BillItem = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
};

function isRecord(value: unknown): value is BillRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchActiveBill(table: AdminTableRecord) {
  const identifiers = Array.from(
    new Set(
      [table.table_id, table.id, table.table_number]
        .filter(
          value =>
            value !== undefined && value !== null && String(value).trim(),
        )
        .map(value => String(value)),
    ),
  );
  let lastLookupError: unknown = null;
  for (const identifier of identifiers) {
    try {
      const response = await api.get(
        `/table-bills/active/${encodeURIComponent(identifier)}`,
        {
          params: { _refresh: Date.now() },
          headers: {
            'Cache-Control': 'no-cache, no-store',
            Pragma: 'no-cache',
          },
        },
      );
      const bill = readBill(response.data);
      if (getBillId(bill)) {
        return bill;
      }
    } catch (error) {
      if (isRecord(error) && Number(error.status) === 404) {
        lastLookupError = error;
        continue;
      }
      throw error;
    }
  }
  if (!identifiers.length) {
    throw new Error('This table is missing its ID.');
  }
  if (lastLookupError && identifiers.length === 1) {
    throw lastLookupError;
  }
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

function readBill(payload: unknown): BillRecord | null {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!isRecord(current)) {
      return null;
    }
    if (isRecord(current.bill)) {
      current = current.bill;
      continue;
    }
    if ('bill' in current && current.bill == null) {
      return null;
    }
    if (isRecord(current.data)) {
      current = current.data;
      continue;
    }
    if ('data' in current && current.data == null) {
      return null;
    }
    return current;
  }
  return null;
}

function readAmount(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getBillId(bill: BillRecord | null) {
  const value = bill?.bill_id ?? bill?.id;
  return value === undefined || value === null || !String(value).trim()
    ? null
    : String(value);
}

function getItemRows(bill: BillRecord): BillRecord[] {
  if (Array.isArray(bill.rounds)) {
    const roundItems = bill.rounds.flatMap(round =>
      isRecord(round) && Array.isArray(round.items)
        ? round.items.filter(isRecord)
        : [],
    );
    if (roundItems.length) {
      return roundItems;
    }
  }
  for (const key of ['consolidated_items', 'items', 'order_items']) {
    if (Array.isArray(bill[key])) {
      return (bill[key] as unknown[]).filter(isRecord);
    }
  }
  return [];
}

function getBillItems(bill: BillRecord): BillItem[] {
  return getItemRows(bill).map((item, index) => {
    const quantity = readAmount(item.quantity) ?? 1;
    const total = readAmount(item.total_price, item.line_total);
    const unitPrice =
      readAmount(item.unit_price, item.price) ??
      (total === null || quantity <= 0 ? null : total / quantity);
    return {
      key: `${String(
        item.food_id ?? item.product_id ?? item.id ?? index,
      )}-${index}`,
      name: String(
        item.food_name ??
          item.product_name ??
          item.name ??
          item.item_name ??
          'Food item',
      ),
      quantity,
      unitPrice,
      total: total ?? (unitPrice === null ? null : unitPrice * quantity),
    };
  });
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return '—';
  }
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  return String(value);
}

function statusIsAvailable(value: unknown) {
  return (
    typeof value === 'string' && value.trim().toLowerCase() === 'available'
  );
}

function findTable(
  payload: unknown,
  table: AdminTableRecord,
): BillRecord | null {
  let current = payload;
  let rows: BillRecord[] = [];
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      rows = current.filter(isRecord);
      break;
    }
    if (!isRecord(current)) {
      break;
    }
    const tableRows = current.server_tables ?? current.tables;
    if (Array.isArray(tableRows)) {
      rows = tableRows.filter(isRecord);
      break;
    }
    current = current.data;
  }
  const tableId = table.table_id ?? table.id;
  return (
    rows.find(row => {
      const rowId = row.table_id ?? row.id;
      return (
        (tableId !== undefined &&
          tableId !== null &&
          String(rowId) === String(tableId)) ||
        (table.table_number !== undefined &&
          String(row.table_number) === String(table.table_number))
      );
    }) ?? null
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-1.5">
      <Text className="text-sm text-[#64748B]">{label}</Text>
      <Text className="text-right text-sm font-semibold text-[#111827]">
        {value}
      </Text>
    </View>
  );
}

export default function ActiveBillPreview({
  table,
  onBack,
  onAddItems,
  onCompleted,
}: ActiveBillPreviewProps) {
  const [bill, setBill] = useState<BillRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionConfirmed, setCompletionConfirmed] = useState(false);
  const completionLock = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const tableId = table.table_id ?? table.id;
  const tableNumber = String(table.table_number ?? '—');

  const verifyCompletedBill = useCallback(async () => {
    if (tableId === undefined || tableId === null || !String(tableId).trim()) {
      throw new Error(
        'The table ID is missing; its status cannot be verified.',
      );
    }
    const activeBill = await fetchActiveBill(table);
    const activeBillId = getBillId(activeBill);
    if (activeBill && activeBillId) {
      const detailsResponse = await api.get(
        `/table-bills/${encodeURIComponent(activeBillId)}`,
      );
      const details = readBill(detailsResponse.data);
      setBill(details ? { ...activeBill, ...details } : activeBill);
    }

    const tablesResponse = await api.get('/server-tables', {
      params: { _refresh: Date.now() },
      headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
    });
    const latestTable = findTable(tablesResponse.data, table);
    if (activeBillId) {
      setError(
        `The payment was accepted, but the backend still reports an active bill${
          latestTable?.status
            ? ` and table status ${String(latestTable.status)}`
            : ''
        }. Refresh to check again.`,
      );
      return false;
    }
    if (!latestTable || !statusIsAvailable(latestTable.status)) {
      setError(
        'Payment was accepted, but the backend has not confirmed this table is Available. Refresh to check again.',
      );
      return false;
    }
    return true;
  }, [table, tableId]);

  const loadBill = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (
        tableId === undefined ||
        tableId === null ||
        !String(tableId).trim()
      ) {
        throw new Error('This table is missing its ID.');
      }
      const activeBill = await fetchActiveBill(table);
      const billId = getBillId(activeBill);
      if (!activeBill || !billId) {
        setBill(null);
        setError('No active bill was found for this occupied table.');
        return;
      }
      const detailsResponse = await api.get(
        `/table-bills/${encodeURIComponent(billId)}`,
      );
      const detailedBill = readBill(detailsResponse.data);
      const currentBill = detailedBill
        ? { ...activeBill, ...detailedBill }
        : activeBill;
      setBill(currentBill);
      const currentMethod = String(
        currentBill.payment_method ?? '',
      ).toLowerCase();
      const matchingMethod = ['Cash', 'Card', 'UPI'].find(
        method => method.toLowerCase() === currentMethod,
      );
      if (matchingMethod) {
        setPaymentMethod(matchingMethod);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load the active bill.'));
    } finally {
      setIsLoading(false);
    }
  }, [table, tableId]);

  useEffect(() => {
    void loadBill();
  }, [loadBill, refreshKey]);

  const items = useMemo(() => (bill ? getBillItems(bill) : []), [bill]);
  const billId = getBillId(bill);
  const total = readAmount(bill?.grand_total, bill?.total, bill?.total_amount);
  const subtotal = readAmount(
    bill?.subtotal,
    bill?.sub_total,
    bill?.total_amount,
  );
  const directTax = readAmount(
    bill?.tax_amount,
    bill?.total_tax,
    bill?.tax_total,
    bill?.tax,
  );
  const componentTax =
    readAmount(bill?.cgst_amount, bill?.cgst) === null &&
    readAmount(bill?.sgst_amount, bill?.sgst) === null
      ? null
      : (readAmount(bill?.cgst_amount, bill?.cgst) ?? 0) +
        (readAmount(bill?.sgst_amount, bill?.sgst) ?? 0);
  const taxes = directTax ?? componentTax;
  const discount = readAmount(
    bill?.discount_amount,
    bill?.discount,
    bill?.total_discount,
  );
  const billStatus = bill?.status ?? bill?.bill_status;
  const paymentStatus = bill?.payment_status ?? bill?.paymentStatus;
  const isBillClosed = /^(completed|complete|settled|closed|paid)$/i.test(
    String(billStatus ?? ''),
  );
  const canComplete =
    Boolean(billId) &&
    tableId !== undefined &&
    tableId !== null &&
    String(tableId).trim().length > 0 &&
    !isLoading &&
    !isCompleting &&
    !completionConfirmed &&
    !isBillClosed &&
    !/^(completed|complete|settled|closed|paid)$/i.test(
      String(paymentStatus ?? ''),
    ) &&
    items.length > 0 &&
    items.every(
      item =>
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        item.total !== null &&
        item.total >= 0,
    ) &&
    total !== null &&
    total >= 0;

  const refresh = async () => {
    if (completionConfirmed) {
      setIsLoading(true);
      setError('');
      try {
        if (await verifyCompletedBill()) {
          Alert.alert(
            'Bill completed',
            `Table ${String(bill?.table_number ?? tableNumber)} is Available.`,
          );
          onCompleted();
        }
      } catch (verificationError) {
        setError(
          getErrorMessage(
            verificationError,
            'Unable to verify the latest table and bill status.',
          ),
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setRefreshKey(value => value + 1);
  };

  const completeBill = async () => {
    if (!canComplete || !billId || completionLock.current) {
      return;
    }
    completionLock.current = true;
    setIsCompleting(true);
    setError('');
    try {
      const response = await api.post(
        `/table-bills/${encodeURIComponent(billId)}/settle`,
        { payment_method: paymentMethod, discount: 0 },
      );
      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'The bill could not be completed.',
        );
      }
      setCompletionConfirmed(true);
      if (await verifyCompletedBill()) {
        onCompleted();
      }
    } catch (completionError) {
      setError(
        getErrorMessage(
          completionError,
          'Unable to complete the bill. Please retry.',
        ),
      );
    } finally {
      completionLock.current = false;
      setIsCompleting(false);
    }
  };

  const beginAddingItems = () => {
    const resolvedTableId = bill?.table_id ?? tableId;
    if (!billId || resolvedTableId === undefined || resolvedTableId === null) {
      setError('The active bill is missing its bill ID or table ID.');
      return;
    }
    onAddItems({
      billId,
      tableId: String(resolvedTableId),
      tableNumber: String(bill?.table_number ?? tableNumber),
    });
  };

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F9FAFB]">
      <MoreInnerHeader
        title="Bill Preview"
        destination="Tables"
        subtitle={`Table ${String(
          bill?.table_number ?? tableNumber,
        )} · Bill #${formatValue(bill?.bill_number ?? billId)}`}
        onBack={onBack}
      />
      {isLoading && !bill ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-[#64748B]">Loading active bill...</Text>
        </View>
      ) : (
        <>
          {error ? (
            <View className="mx-4 mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
              <Text
                accessibilityRole="alert"
                className="text-sm text-[#B91C1C]"
              >
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh()}
                className="mt-2 self-start rounded-lg bg-[#116C0B] px-3 py-2"
              >
                <Text className="text-xs font-bold text-white">
                  {completionConfirmed ? 'Verify again' : 'Retry'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => void refresh()}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            contentContainerClassName="mx-auto w-full max-w-[900px] gap-4 px-4 py-4"
          >
            {isLoading && bill ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-xs text-[#64748B]">
                  Refreshing bill...
                </Text>
              </View>
            ) : null}
            {bill ? (
              <>
                <View className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <Text className="text-lg font-bold text-[#012711]">
                    Table {String(bill.table_number ?? tableNumber)}
                  </Text>
                  <Text className="mt-1 text-sm text-[#64748B]">
                    Bill #{formatValue(bill.bill_number ?? billId)}
                  </Text>
                  <View className="mt-3 border-t border-[#E5E7EB] pt-3">
                    <SummaryRow
                      label="Bill status"
                      value={formatValue(billStatus)}
                    />
                    <SummaryRow
                      label="Payment status"
                      value={formatValue(paymentStatus)}
                    />
                    {bill.payment_method ? (
                      <SummaryRow
                        label="Payment method"
                        value={formatValue(bill.payment_method)}
                      />
                    ) : null}
                    {bill.customer_name ? (
                      <SummaryRow
                        label="Customer"
                        value={formatValue(bill.customer_name)}
                      />
                    ) : null}
                    {bill.customer_phone ? (
                      <SummaryRow
                        label="Customer phone"
                        value={formatValue(bill.customer_phone)}
                      />
                    ) : null}
                    {bill.order_type ? (
                      <SummaryRow
                        label="Order type"
                        value={formatValue(bill.order_type)}
                      />
                    ) : null}
                    {bill.server_name ? (
                      <SummaryRow
                        label="Server"
                        value={formatValue(bill.server_name)}
                      />
                    ) : null}
                    {bill.created_at ? (
                      <SummaryRow
                        label="Created"
                        value={formatValue(bill.created_at)}
                      />
                    ) : null}
                  </View>
                </View>

                <View className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                  <View className="border-b border-[#E5E7EB] px-4 py-3">
                    <Text className="font-bold text-[#012711]">
                      Ordered items ({items.length})
                    </Text>
                  </View>
                  {items.length ? (
                    items.map(item => (
                      <View
                        key={item.key}
                        className="flex-row items-center justify-between gap-4 border-b border-[#F1F5F9] px-4 py-3"
                      >
                        <View className="min-w-0 flex-1">
                          <Text className="font-semibold text-[#111827]">
                            {item.name}
                          </Text>
                          <Text className="mt-1 text-xs text-[#64748B]">
                            Qty {item.quantity} ·{' '}
                            {formatCurrency(item.unitPrice)} each
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-[#111827]">
                          {formatCurrency(item.total)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="px-4 py-5 text-sm text-[#64748B]">
                      No order items were returned for this bill.
                    </Text>
                  )}
                  <View className="bg-[#F8FAFC] px-4 py-3">
                    <SummaryRow
                      label="Subtotal"
                      value={formatCurrency(subtotal)}
                    />
                    <SummaryRow label="Taxes" value={formatCurrency(taxes)} />
                    <SummaryRow
                      label="Discount"
                      value={formatCurrency(discount)}
                    />
                    <View className="mt-1 border-t border-[#E2E8F0] pt-2">
                      <SummaryRow
                        label="Grand total"
                        value={formatCurrency(total)}
                      />
                    </View>
                  </View>
                </View>

                <View className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <Text className="text-sm font-bold text-[#012711]">
                    Payment method
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    {['Cash', 'Card', 'UPI'].map(method => {
                      const selected = paymentMethod === method;
                      return (
                        <Pressable
                          key={method}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected,
                            disabled: isCompleting || completionConfirmed,
                          }}
                          disabled={isCompleting || completionConfirmed}
                          onPress={() => setPaymentMethod(method)}
                          className={`min-h-11 flex-1 items-center justify-center rounded-xl border ${
                            selected
                              ? 'border-[#116C0B] bg-[#116C0B]'
                              : 'border-[#CBD5E1] bg-white'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              selected ? 'text-white' : 'text-[#475569]'
                            }`}
                          >
                            {method}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : !error ? (
              <Text className="rounded-2xl bg-white p-5 text-center text-sm text-[#64748B]">
                No active bill is available for Table {tableNumber}.
              </Text>
            ) : null}
          </ScrollView>

          {bill ? (
            <View className="gap-2 border-t border-[#E5E7EB] bg-white px-4 py-3">
              <Pressable
                accessibilityLabel="Add items to existing bill"
                accessibilityRole="button"
                disabled={!billId || isLoading || completionConfirmed}
                onPress={beginAddingItems}
                className={`min-h-12 items-center justify-center rounded-xl border border-[#116C0B] ${
                  !billId || isLoading || completionConfirmed
                    ? 'opacity-50'
                    : 'active:bg-[#F0F7EE]'
                }`}
              >
                <Text className="text-sm font-bold text-[#116C0B]">
                  Add Items
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Refresh bill"
                accessibilityRole="button"
                disabled={isLoading || isCompleting}
                onPress={() => void refresh()}
                className="min-h-12 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white"
              >
                <Text className="text-sm font-semibold text-[#334155]">
                  Refresh Bill
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Complete bill, payable ${formatCurrency(
                  total,
                )}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canComplete }}
                disabled={!canComplete}
                onPress={() => void completeBill()}
                className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl ${
                  canComplete ? 'bg-[#116C0B]' : 'bg-[#9CA3AF]'
                }`}
              >
                {isCompleting ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text className="text-sm font-bold text-white">
                  {completionConfirmed
                    ? `Payment accepted · ${formatCurrency(total)}`
                    : `Complete Bill · ${formatCurrency(total)}`}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}
