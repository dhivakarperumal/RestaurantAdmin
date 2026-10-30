import { useEffect, useMemo, useState } from 'react';
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
import { ReceiptIcon } from '../Navigation/NavigationIcons';

type BillRecord = Record<string, unknown>;

export type BillHistoryEntry = {
  billId: string;
  tableId: string;
  tableNumber: string;
};

type HistoryBill = {
  id: string;
  billId: string;
  billNumber: string;
  tableId: string;
  tableNumber: string;
  status: string;
  completed: boolean;
  total: number | null;
  server: string;
  createdAt: string;
};

type BillHistoryProps = {
  onAddItems: (entry: BillHistoryEntry) => void;
};

type HistoryFilter = 'All' | 'Occupied' | 'Completed';

function isRecord(value: unknown): value is BillRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBills(payload: unknown, depth = 0): BillRecord[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of ['bills', 'data', 'results']) {
    if (key in payload) {
      const rows = readBills(payload[key], depth + 1);
      if (rows.length || Array.isArray(payload[key])) {
        return rows;
      }
    }
  }
  return [];
}

function readText(...values: unknown[]) {
  const value = values.find(
    candidate =>
      (typeof candidate === 'string' || typeof candidate === 'number') &&
      String(candidate).trim(),
  );
  return value === undefined ? '' : String(value).trim();
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

function normalizeBill(bill: BillRecord, index: number): HistoryBill {
  const status = readText(bill.status, bill.bill_status, bill.payment_status);
  const completed = [bill.status, bill.bill_status, bill.payment_status].some(
    value =>
      typeof value === 'string' &&
      /^(completed|complete|settled|closed|paid)$/i.test(value.trim()),
  );
  const id = readText(bill.bill_id, bill.id) || `bill-${index}`;
  return {
    id,
    billId: readText(bill.bill_id, bill.id),
    billNumber: readText(bill.bill_number, bill.invoice_number, bill.bill_id, bill.id) || id,
    tableId: readText(bill.table_id, bill.tableId),
    tableNumber: readText(bill.table_number, bill.tableNumber) || '—',
    status: status || (completed ? 'Completed' : 'Occupied'),
    completed,
    total: readAmount(
      bill.grand_total,
      bill.total_amount,
      bill.total,
      bill.amount,
    ),
    server: readText(
      bill.server_name,
      bill.assigned_server_name,
      bill.employee_name,
    ) || 'Not assigned',
    createdAt: readText(bill.created_at, bill.createdAt, bill.created_on),
  };
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

function formatCreatedAt(value: string) {
  if (!value) {
    return 'Date unavailable';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function BillCard({
  bill,
  onAddItems,
}: {
  bill: HistoryBill;
  onAddItems: (entry: BillHistoryEntry) => void;
}) {
  return (
    <View className="mb-3 rounded-2xl border border-[#E5EAF0] bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8F0]">
            <ReceiptIcon color={colors.primary} size={21} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#111827]">
              Table {bill.tableNumber}
            </Text>
            <Text className="mt-0.5 text-xs text-[#64748B]">
              #{bill.billNumber}
            </Text>
          </View>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            bill.completed ? 'bg-[#F1F5F9]' : 'bg-[#ECFDF5]'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              bill.completed ? 'text-[#475569]' : 'text-[#047857]'
            }`}
          >
            {bill.completed ? 'Completed' : bill.status}
          </Text>
        </View>
      </View>
      <View className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
        <View className="flex-row justify-between">
          <Text className="text-xs text-[#64748B]">Created</Text>
          <Text className="ml-3 flex-1 text-right text-xs font-medium text-[#334155]">
            {formatCreatedAt(bill.createdAt)}
          </Text>
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-xs text-[#64748B]">Assigned server</Text>
          <Text className="ml-3 flex-1 text-right text-xs font-semibold text-[#334155]">
            {bill.server}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-between border-t border-[#E2E8F0] pt-2">
          <Text className="text-xs font-semibold text-[#64748B]">Grand Total</Text>
          <Text className="text-base font-bold text-[#065F46]">
            {formatCurrency(bill.total)}
          </Text>
        </View>
      </View>
      {!bill.completed ? (
        <Pressable
          accessibilityLabel={`Add items to bill for table ${bill.tableNumber}`}
          accessibilityRole="button"
          disabled={!bill.tableId || !bill.billId}
          onPress={() =>
            onAddItems({
              billId: bill.billId,
              tableId: bill.tableId,
              tableNumber: bill.tableNumber,
            })
          }
          className={`mt-3 items-center rounded-xl px-4 py-3 ${
            bill.tableId ? 'bg-[#064E3B]' : 'bg-[#94A3B8]'
          }`}
        >
          <Text className="text-sm font-bold text-white">
            {bill.tableId && bill.billId
              ? 'Add Items'
              : 'Bill or table details unavailable'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BillHistory({ onAddItems }: BillHistoryProps) {
  const [bills, setBills] = useState<HistoryBill[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setErrorMessage('');

    api
      .get('/table-bills', {
        params: { _refresh: Date.now() },
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        signal: controller.signal,
      })
      .then(response => {
        if (
          isRecord(response.data) &&
          response.data.success === false
        ) {
          throw new Error(
            readText(response.data.message) || 'Bill history could not be loaded.',
          );
        }
        if (active) {
          setBills(
            readBills(response.data)
              .map(normalizeBill)
              .sort((left, right) => {
                const leftTime = Date.parse(left.createdAt);
                const rightTime = Date.parse(right.createdAt);
                if (!Number.isFinite(leftTime)) {
                  return Number.isFinite(rightTime) ? 1 : 0;
                }
                if (!Number.isFinite(rightTime)) {
                  return -1;
                }
                return rightTime - leftTime;
              }),
          );
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Bill history could not be loaded. Check your connection and try again.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshCount]);

  const occupiedBills = useMemo(
    () => bills.filter(bill => !bill.completed),
    [bills],
  );
  const completedBills = useMemo(
    () => bills.filter(bill => bill.completed),
    [bills],
  );

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={isLoading && bills.length > 0}
            onRefresh={() => setRefreshCount(count => count + 1)}
            tintColor={colors.primary}
          />
        }
      >
        <Text className="text-2xl font-bold text-[#012711]">Bill History</Text>
        <Text className="mt-1 text-sm text-[#64748B]">
          View occupied bills and completed bills in one place.
        </Text>
        <View className="mt-4 flex-row rounded-xl bg-[#E9EEF2] p-1">
          {(['All', 'Occupied', 'Completed'] as const).map(option => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option }}
              key={option}
              onPress={() => setFilter(option)}
              className={`flex-1 items-center rounded-lg px-2 py-2.5 ${
                filter === option ? 'bg-white' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === option ? 'text-[#064E3B]' : 'text-[#64748B]'
                }`}
              >
                {option}
                {option === 'Occupied'
                  ? ` (${occupiedBills.length})`
                  : option === 'Completed'
                    ? ` (${completedBills.length})`
                    : ` (${bills.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading && bills.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-[#64748B]">
              Loading bill history…
            </Text>
          </View>
        ) : errorMessage ? (
          <View className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
              {errorMessage}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRefreshCount(count => count + 1)}
              className="mt-3 self-start rounded-lg bg-white px-3 py-2"
            >
              <Text className="text-sm font-semibold text-[#064E3B]">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filter !== 'Completed' ? (
              <View className="mt-5">
                <Text className="mb-3 text-base font-bold text-[#012711]">
                  Occupied / Active
                </Text>
                {occupiedBills.length ? (
                  occupiedBills.map(bill => (
                    <BillCard
                      key={bill.id}
                      bill={bill}
                      onAddItems={onAddItems}
                    />
                  ))
                ) : (
                  <Text className="rounded-xl bg-white px-4 py-5 text-sm text-[#64748B]">
                    No occupied bills.
                  </Text>
                )}
              </View>
            ) : null}
            {filter !== 'Occupied' ? (
              <View className="mt-5">
                <Text className="mb-3 text-base font-bold text-[#012711]">
                  Completed
                </Text>
                {completedBills.length ? (
                  completedBills.map(bill => (
                    <BillCard
                      key={bill.id}
                      bill={bill}
                      onAddItems={onAddItems}
                    />
                  ))
                ) : (
                  <Text className="rounded-xl bg-white px-4 py-5 text-sm text-[#64748B]">
                    No completed bills.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default BillHistory;
