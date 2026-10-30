import { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';
import { CustomAlert as Alert, DetailsModal } from '../../components/popups';

/* ==========================================================================
   Types & Utilities
   ========================================================================== */

export type ServerTablesRow = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: string | number;
  status?: string;
  assigned_server_id?: string | number | null;
  assigned_employee_id?: string | number | null;
  server_id?: string | number | null;
  assigned_server_name?: string | null;
  server_name?: string | null;
};

type TableStatus = 'available' | 'occupied' | 'reserved';

function billItemKey(item: Record<string, unknown>): string {
  const id = item.food_id ?? item.foodId ?? item.product_id ?? item.id;
  const variant = JSON.stringify({
    addons: item.selected_addons ?? [],
    customizations: item.selected_customizations ?? {},
  });
  if (id !== undefined && id !== null && String(id).trim() !== '') {
    return `id:${String(id).trim().toLowerCase()}|variant:${variant}`;
  }
  return `name:${String(item.food_name || item.name || item.item_name || '')
    .trim()
    .toLowerCase()}|variant:${variant}`;
}

function billItemNumber(item: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = Number(item[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function formatBillAmount(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  const amount = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '—';
}

const apiStatus: Record<TableStatus, 'Available' | 'Occupied' | 'Reserved'> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
};

function normalizedStatus(status: unknown): TableStatus {
  const value = String(status || '').toLowerCase().trim();
  if (value === 'occupied' || value === 'busy' || value === 'seated') return 'occupied';
  if (value === 'reserved' || value === 'booked') return 'reserved';
  return 'available';
}

/* ==========================================================================
   Crisp Modern SVG Icons
   ========================================================================== */

function TableSvg({ color = '#116C0B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6.5" width="16" height="5.5" rx="1.8" stroke={color} strokeWidth="2" />
      <Path d="M7 12v7M17 12v7M3 5v3.5M21 5v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function UsersSvg({ color = '#64748B', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path d="M2 20a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SearchSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CloseSvg({ color = '#64748B', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CheckCircleSvg({ color = '#15803D', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="m8.5 12 2.5 2.5 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReceiptSvg({ color = '#EA580C', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Zm4 7h8m-8 4h8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ==========================================================================
   Table Status Configuration
   ========================================================================== */

const statusConfig: Record<
  TableStatus,
  {
    label: string;
    text: string;
    bg: string;
    border: string;
    badgeBg: string;
    dot: string;
  }
> = {
  available: {
    label: 'Available',
    text: '#15803D',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    badgeBg: '#DCFCE7',
    dot: '#16A34A',
  },
  occupied: {
    label: 'Occupied',
    text: '#C2410C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    badgeBg: '#FFEDD5',
    dot: '#EA580C',
  },
  reserved: {
    label: 'Reserved',
    text: '#4338CA',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    badgeBg: '#E0E7FF',
    dot: '#4F46E5',
  },
};

/* ==========================================================================
   Main ServerTables Component
   ========================================================================== */

export type ServerTablesProps = {
  tables?: ServerTablesRow[];
  user?: HeaderUser;
  serverEmployeeId?: string | number | null;
  orders?: Record<string, unknown>[];
  onRefresh?: () => void;
  onSelectTable?: (tableNum: string) => void;
};

export default function ServerTables({
  tables = [],
  user = {},
  serverEmployeeId,
  orders = [],
  onRefresh,
  onSelectTable,
}: ServerTablesProps) {
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTableDetails, setSelectedTableDetails] = useState<ServerTablesRow | null>(null);
  const [settlingTable, setSettlingTable] = useState<string | null>(null);
  const [billPreview, setBillPreview] = useState<Record<string, unknown> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const insets = useSafeAreaInsets();

  const employeeId = serverEmployeeId ?? user.employee_id ?? user.employeeId;

  // Active orders mapped by table number
  const occupiedOrderMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    orders.forEach(o => {
      const status = String(o.status || o.order_status || '').toLowerCase();
      if (
        [
          'pending',
          'preparing',
          'cooking',
          'ready',
          'ready to serve',
          'confirmed',
          'in progress',
        ].includes(status)
      ) {
        const tableValues = [o.table_number, o.table_id, o.table]
          .map(value => String(value ?? '').trim())
          .filter(value => value && value !== '—');
        tableValues.forEach(value => map.set(value.toLowerCase(), o));
      }
    });
    return map;
  }, [orders]);

  // Normalized list of tables (fallback to 12 standard dining tables if none)
  const normalizedTableList: ServerTablesRow[] = useMemo(() => {
    if (tables.length > 0) {
      return tables.map((t, idx): ServerTablesRow => {
        const num = String(t.table_number ?? t.id ?? t.table_id ?? idx + 1);
        const hasOrder = occupiedOrderMap.has(num.toLowerCase());
        return {
          ...t,
          id: t.id ?? t.table_id ?? num,
          table_number: num,
          no_of_seats: t.no_of_seats ?? 4,
          status: hasOrder ? 'Occupied' : t.status || 'Available',
        };
      });
    }

    // Default 12 floor tables
    return Array.from({ length: 12 }, (_, i): ServerTablesRow => {
      const num = String(i + 1);
      const hasOrder = occupiedOrderMap.has(num.toLowerCase());
      return {
        id: num,
        table_id: num,
        table_number: num,
        no_of_seats: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
        status: hasOrder ? 'Occupied' : 'Available',
        assigned_server_id: i < 4 ? employeeId : undefined,
        assigned_employee_id: undefined,
        server_id: undefined,
      };
    });
  }, [tables, occupiedOrderMap, employeeId]);

  const userIds = useMemo(() => {
    return [
      serverEmployeeId,
      user.employee_id,
      user.employeeId,
      user.id,
      user.user_id,
      (user as Record<string, unknown>)?.emp_id,
    ]
      .filter(val => val !== undefined && val !== null && String(val).trim() !== '')
      .map(val => String(val).trim());
  }, [serverEmployeeId, user]);

  const userNames = useMemo(() => {
    return [
      user.name,
      user.username,
      (user as Record<string, unknown>)?.full_name,
    ]
      .filter(val => typeof val === 'string' && val.trim() !== '')
      .map(val => (val as string).toLowerCase().trim());
  }, [user]);

  // Only show tables assigned to this server
  const assignedTables = useMemo(() => {
    const list = normalizedTableList.filter(table => {
      const aId =
        table.assigned_server_id ??
        table.assigned_employee_id ??
        table.server_id ??
        (table as Record<string, unknown>).employee_id ??
        (table as Record<string, unknown>).user_id;

      if (aId !== null && aId !== undefined && String(aId).trim() !== '') {
        if (userIds.includes(String(aId).trim())) return true;
      }

      const sName = String(
        table.assigned_server_name ??
        (table as Record<string, unknown>).server_name ??
        '',
      )
        .toLowerCase()
        .trim();

      if (sName && userNames.includes(sName)) return true;

      return false;
    });

    if (list.length > 0) return list;

    // Fallback: If no tables specifically assigned, allow working with restaurant floor tables
    return normalizedTableList;
  }, [normalizedTableList, userIds, userNames]);

  // Filter by status & search
  const displayedTables = useMemo(() => {
    let list = assignedTables;
    if (filter !== 'all') {
      list = list.filter(t => {
        const key = String(t.id ?? t.table_number);
        const currentStatus = statuses[key] ?? normalizedStatus(t.status);
        return currentStatus === filter;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => {
        const num = String(t.table_number || '').toLowerCase();
        return num.includes(q) || `table ${num}`.includes(q);
      });
    }

    return list;
  }, [assignedTables, filter, search, statuses]);

  // Assigned Tables Floor Counts
  const totalCount = assignedTables.length;
  const availableCount = assignedTables.filter(t => {
    const key = String(t.id ?? t.table_number);
    return (statuses[key] ?? normalizedStatus(t.status)) === 'available';
  }).length;
  const occupiedCount = assignedTables.filter(t => {
    const key = String(t.id ?? t.table_number);
    return (statuses[key] ?? normalizedStatus(t.status)) === 'occupied';
  }).length;
  const reservedCount = assignedTables.filter(t => {
    const key = String(t.id ?? t.table_number);
    return (statuses[key] ?? normalizedStatus(t.status)) === 'reserved';
  }).length;

  // Handle status update
  const updateStatus = async (table: ServerTablesRow, newStatus: TableStatus) => {
    const tableId = table.id ?? table.table_id ?? table.table_number;
    if (tableId === undefined || tableId === null) {
      Alert.alert('Table unavailable', 'This table does not have a valid ID.');
      return;
    }
    const key = String(tableId);
    if (updating === key) return;

    // Optimistic local update
    setStatuses(current => ({ ...current, [key]: newStatus }));
    setUpdating(key);

    try {
      await api
        .put(`/server-tables/${tableId}`, {
          status: apiStatus[newStatus],
        })
        .catch(async () => {
          return await api.patch(`/server-tables/${tableId}`, {
            status: apiStatus[newStatus],
          });
        });
    } catch (error) {
      // Revert if API fails
      const prevStatus = normalizedStatus(table.status);
      setStatuses(current => ({ ...current, [key]: prevStatus }));
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Unable to update the table status.';
      Alert.alert('Status update failed', message);
    } finally {
      setUpdating(null);
    }
  };

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  }, [onRefresh]);

  const completeBill = async (table: ServerTablesRow) => {
    const tableIdentifiers = Array.from(
      new Set(
        [table.table_id, table.id, table.table_number]
          .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
          .map(value => String(value)),
      ),
    );
    const tableKey = tableIdentifiers[0] || '';
    if (tableIdentifiers.length === 0 || settlingTable) return;

    setSettlingTable(tableKey);
    try {
      let bill: Record<string, unknown> | null = null;
      let lastLookupError: unknown = null;
      for (const tableIdentifier of tableIdentifiers) {
        try {
          const billResponse = await api.get(`/table-bills/active/${encodeURIComponent(tableIdentifier)}`);
          const payload =
            billResponse.data && typeof billResponse.data === 'object'
              ? (billResponse.data as Record<string, unknown>)
              : {};
          const candidate =
            payload.bill && typeof payload.bill === 'object'
              ? (payload.bill as Record<string, unknown>)
              : payload.data && typeof payload.data === 'object'
              ? (payload.data as Record<string, unknown>)
              : payload;
          const candidateId = candidate.bill_id ?? candidate.id;
          if (candidateId) {
            bill = candidate;
            break;
          }
        } catch (lookupError) {
          lastLookupError = lookupError;
        }
      }

      if (!bill && lastLookupError && tableIdentifiers.length === 1) {
        throw lastLookupError;
      }

      const activeBill = bill;
      const billId = activeBill?.bill_id ?? activeBill?.id;

      if (!billId) {
        Alert.alert('Bill unavailable', 'No active bill was found for this table.');
        return;
      }

      const detailsResponse = await api.get(`/table-bills/${billId}`);
      const detailsPayload =
        detailsResponse.data && typeof detailsResponse.data === 'object'
          ? (detailsResponse.data as Record<string, unknown>)
          : {};
      const detailedBill =
        detailsPayload.bill && typeof detailsPayload.bill === 'object'
          ? (detailsPayload.bill as Record<string, unknown>)
          : detailsPayload.data && typeof detailsPayload.data === 'object'
          ? (detailsPayload.data as Record<string, unknown>)
          : detailsPayload;
      setBillPreview({
        ...activeBill,
        ...detailedBill,
        table_number: table.table_number ?? detailedBill.table_number,
        bill_id: billId,
      });
      setPaymentMethod(
        String(detailedBill.payment_method || activeBill?.payment_method || 'Cash'),
      );
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Unable to complete this bill.';
      Alert.alert('Bill completion failed', message);
    } finally {
      setSettlingTable(null);
    }
  };

  const billItems = useMemo(() => {
    if (!billPreview) return [];
    const rounds = Array.isArray(billPreview.rounds)
      ? billPreview.rounds.flatMap(round =>
          round && typeof round === 'object' && Array.isArray((round as Record<string, unknown>).items)
            ? ((round as Record<string, unknown>).items as unknown[])
            : [],
        )
      : [];
    const rawItems =
      rounds.length > 0
        ? rounds
        : (billPreview.consolidated_items || billPreview.items || billPreview.order_items);
    if (!Array.isArray(rawItems)) return [];
    const merged = new Map<string, Record<string, unknown>>();
    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      const key = billItemKey(item);
      const quantity = billItemNumber(item, ['quantity'], 1);
      const unitPrice = billItemNumber(item, ['unit_price', 'price'], 0);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, {
          ...item,
          quantity,
          total_price:
            billItemNumber(item, ['total_price'], unitPrice * quantity) ||
            unitPrice * quantity,
        });
        continue;
      }

      const nextQuantity = billItemNumber(existing, ['quantity'], 0) + quantity;
      const existingUnitPrice = billItemNumber(existing, ['unit_price', 'price'], unitPrice);
      merged.set(key, {
        ...existing,
        quantity: nextQuantity,
        unit_price: existingUnitPrice,
        total_price: existingUnitPrice * nextQuantity,
      });
    }
    return Array.from(merged.values());
  }, [billPreview]);

  const settleBill = async () => {
    if (!billPreview?.bill_id || settlingTable) return;
    setSettlingTable(String(billPreview.table_id || billPreview.table_number || billPreview.bill_id));
    try {
      const settleResponse = await api.post(`/table-bills/${billPreview.bill_id}/settle`, {
        payment_method: paymentMethod,
        discount: 0,
      });
      if (settleResponse.data?.success === false) {
        throw new Error(settleResponse.data?.message || 'The bill could not be settled.');
      }
      setBillPreview(null);
      Alert.alert(
        'Bill Completed',
        `Table ${billPreview.table_number || ''} bill has been completed.`,
      );
      await onRefresh?.();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Unable to complete this bill.';
      Alert.alert('Bill completion failed', message);
    } finally {
      setSettlingTable(null);
    }
  };

  return (
    <>
      <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handlePullRefresh}
          colors={['#FF7800', '#116C0B']}
          tintColor="#FF7800"
        />
      }
      contentContainerClassName="px-4 pb-16 pt-3"
    >
      {/* ====================================================================
          Hero Floor Map & Metrics Card
          ==================================================================== */}
      <View
        style={{
          backgroundColor: '#062D16',
          borderRadius: 24,
          elevation: 6,
          overflow: 'hidden',
          padding: 20,
          shadowColor: '#012711',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}
      >
        {/* Glow circle */}
        <View
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 120, 0, 0.12)',
            borderRadius: 90,
            height: 180,
            position: 'absolute',
            right: -30,
            top: -40,
            width: 180,
          }}
        />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#86EFAC]" />
            <Text className="text-[11px] font-bold tracking-widest text-[#B8D7BE]">
              MY ASSIGNED STATION
            </Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-[11px] font-bold text-[#86EFAC]">
              {totalCount} ASSIGNED TABLES
            </Text>
          </View>
        </View>

        <Text className="mt-3 text-2xl font-black text-white">
          My Assigned Tables
        </Text>
        <Text className="mt-1 text-xs text-[#CBD5E1]">
          Live occupancy, order status, and turnaround for your station
        </Text>

        {/* 3 Metric Summary Boxes */}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#86EFAC]">AVAILABLE</Text>
            <Text className="text-xl font-extrabold text-white">{availableCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#FDBA74]">OCCUPIED</Text>
            <Text className="text-xl font-extrabold text-white">{occupiedCount}</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white/10 p-2.5">
            <Text className="text-[10px] font-bold text-[#A5B4FC]">RESERVED</Text>
            <Text className="text-xl font-extrabold text-white">{reservedCount}</Text>
          </View>
        </View>
      </View>

      {/* ====================================================================
          Full-Width Search Bar
          ==================================================================== */}
      <View className="mt-4 w-full flex-row items-center rounded-2xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 shadow-sm">
        <SearchSvg size={18} color="#64748B" />
        <TextInput
          placeholder="Search assigned table number..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          className="ml-2.5 flex-1 text-sm font-medium text-[#0F172A]"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} className="p-1">
            <CloseSvg size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* ====================================================================
          Status Filter Chips
          ==================================================================== */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 py-1">
        <View className="flex-row gap-2">
          {[
            { id: 'all', label: `All Assigned (${assignedTables.length})` },
            { id: 'available', label: `Available (${availableCount})`, color: '#15803D' },
            { id: 'occupied', label: `Occupied (${occupiedCount})`, color: '#C2410C' },
            { id: 'reserved', label: `Reserved (${reservedCount})`, color: '#4338CA' },
          ].map(f => {
            const isSelected = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id as typeof filter)}
                style={{
                  backgroundColor: isSelected ? '#116C0B' : '#FFFFFF',
                  borderColor: isSelected ? '#116C0B' : '#E2E8F0',
                  borderRadius: 9999,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : '#475569',
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ====================================================================
          Table Cards List
          ==================================================================== */}
      <View className="mt-4 gap-3.5">
        {displayedTables.length > 0 ? (
          displayedTables.map(table => {
            const key = String(table.id ?? table.table_number);
            const currentStatus = statuses[key] ?? normalizedStatus(table.status);
            const cfg = statusConfig[currentStatus];
            const isUpdating = updating === key;
            const activeOrder = occupiedOrderMap.get(
              String(table.table_number ?? '').trim().toLowerCase(),
            );

            return (
              <View
                key={key}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: cfg.border,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  elevation: 2,
                  overflow: 'hidden',
                  padding: 16,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                }}
              >
                {/* Top Row: Table Name, Seats Capacity & Status Badge */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: cfg.bg,
                        borderRadius: 14,
                        height: 44,
                        justifyContent: 'center',
                        width: 44,
                      }}
                    >
                      <TableSvg color={cfg.text} size={22} />
                    </View>

                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-black text-[#0F172A]">
                          Table {table.table_number}
                        </Text>
                        <View className="flex-row items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                          <UsersSvg size={13} />
                          <Text className="text-[11px] font-bold text-[#64748B]">
                            {table.no_of_seats ?? 4} Seats
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-0.5 text-xs text-[#64748B]">
                        Dining Station A • Main Floor
                      </Text>
                    </View>
                  </View>

                  {/* Status Pill Badge */}
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: cfg.badgeBg,
                      borderRadius: 9999,
                      flexDirection: 'row',
                      gap: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={cfg.text} />
                    ) : (
                      <View
                        style={{
                          backgroundColor: cfg.dot,
                          borderRadius: 9999,
                          height: 7,
                          width: 7,
                        }}
                      />
                    )}
                    <Text
                      style={{
                        color: cfg.text,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                </View>

                {/* Occupied Dining Info (if any) */}
                {currentStatus === 'occupied' ? (
                  <View className="mt-3.5 rounded-xl border border-[#FED7AA] bg-[#FFFBF7] p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <ReceiptSvg color="#EA580C" size={15} />
                        <Text className="text-xs font-bold text-[#EA580C]">
                          {activeOrder
                            ? String(activeOrder.order_number || activeOrder.id || 'Active Order')
                            : 'Guests Seated'}
                        </Text>
                      </View>
                      {activeOrder?.customer_name ? (
                        <Text className="text-xs font-semibold text-[#64748B]">
                          Guest: {String(activeOrder.customer_name)}
                        </Text>
                      ) : (
                        <Text className="text-[11px] font-semibold text-[#15803D]">
                          ● Dining In Progress
                        </Text>
                      )}
                    </View>
                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        accessibilityLabel={`Add round for Table ${table.table_number}`}
                        onPress={() => onSelectTable?.(String(table.table_number))}
                        className="h-10 flex-1 flex-row items-center justify-center rounded-lg bg-[#116C0B] px-2 active:bg-[#0F5A09]"
                      >
                        <Text className="text-xs font-extrabold text-white">
                          Add Round
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Complete bill for Table ${table.table_number}`}
                        disabled={settlingTable === key}
                        onPress={() => void completeBill(table)}
                        className="h-10 flex-1 flex-row items-center justify-center rounded-lg border border-[#EA580C] bg-white px-2 active:bg-[#FFF7ED]"
                      >
                        {settlingTable === key ? (
                          <ActivityIndicator size="small" color="#EA580C" />
                        ) : (
                          <Text className="text-xs font-extrabold text-[#EA580C]">
                            Bill Completed
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : currentStatus === 'reserved' ? (
                  <View className="mt-3.5 rounded-xl border border-[#C7D2FE] bg-[#F5F7FF] p-3">
                    <Text className="text-xs font-semibold text-[#4338CA]">
                      📌 Reserved for upcoming dining booking
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3.5">
                    <Pressable
                      accessibilityLabel={`Take order for Table ${table.table_number}`}
                      onPress={() => onSelectTable?.(String(table.table_number))}
                      className="h-10 flex-row items-center justify-center rounded-lg bg-[#116C0B] px-3 active:bg-[#0F5A09]"
                    >
                      <Text className="text-xs font-extrabold text-white">
                        Take Order ›
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* 1-Tap Status Switcher Strip */}
                <View className="mt-4 border-t border-[#F1F5F9] pt-3">
                  <Text className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Set Table Status
                  </Text>

                  <View className="flex-row gap-2">
                    {(['available', 'occupied', 'reserved'] as const).map(option => {
                      const isSelected = currentStatus === option;
                      const optCfg = statusConfig[option];

                      return (
                        <Pressable
                          key={option}
                          disabled={isUpdating}
                          onPress={() => void updateStatus(table, option)}
                          style={{
                            alignItems: 'center',
                            backgroundColor: isSelected ? optCfg.text : optCfg.bg,
                            borderColor: isSelected ? optCfg.text : optCfg.border,
                            borderRadius: 12,
                            borderWidth: 1,
                            flex: 1,
                            justifyContent: 'center',
                            paddingVertical: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: isSelected ? '#FFFFFF' : optCfg.text,
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {optCfg.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5]">
              <TableSvg color="#116C0B" size={28} />
            </View>
            <Text className="mt-3 text-base font-bold text-[#0F172A]">
              No tables found
            </Text>
            <Text className="mt-1 text-center text-xs text-[#64748B]">
              {search
                ? `No tables matched "${search}".`
                : 'No tables in this status filter.'}
            </Text>
            {search || filter !== 'all' ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="mt-4 rounded-xl bg-[#116C0B] px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">Reset Filters</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
      </ScrollView>
      {billPreview ? (
        <DetailsModal
          visible={Boolean(billPreview)}
          onClose={() => {
            if (!settlingTable) setBillPreview(null);
          }}
          title="Bill Preview"
          subtitle={`Table ${String(billPreview?.table_number || '—')}`}
          footer={
            <View className="w-full flex-row gap-3">
              <Pressable
                disabled={Boolean(settlingTable)}
                onPress={() => setBillPreview(null)}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white active:bg-gray-100"
              >
                <Text className="text-sm font-semibold text-[#334155]">Close</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(settlingTable)}
                onPress={() => void settleBill()}
                className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#116C0B] active:bg-[#0e5809]"
              >
                {settlingTable ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Complete • {paymentMethod}
                  </Text>
                )}
              </Pressable>
            </View>
          }
        >
          <View className="gap-3">
            {/* Bill Items List */}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Billed Items ({billItems.length})
              </Text>
              {billItems.length > 0 ? (
                <View className="rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden">
                  {billItems.map((item, index) => (
                    <View
                      key={index}
                      className={`flex-row items-center justify-between p-3.5 ${
                        index > 0 ? 'border-t border-[#F1F5F9]' : ''
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-[#0F172A]">
                          {String(item.food_name || item.name || item.item_name || 'Food item')}
                        </Text>
                        <Text className="mt-0.5 text-xs text-[#64748B]">
                          Qty: {String(item.quantity || 1)}
                        </Text>
                      </View>
                      <Text className="text-sm font-extrabold text-[#116C0B]">
                        {formatBillAmount(item.total_price ?? item.price ?? item.unit_price)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="py-6 text-center text-sm text-[#64748B]">
                  No food items found for this bill.
                </Text>
              )}
            </View>

            {/* Total Breakdown */}
            <View className="rounded-2xl bg-[#F8FAFC] p-4 border border-[#CBD5E1]">
              <View className="flex-row justify-between">
                <Text className="text-sm text-[#64748B]">Subtotal</Text>
                <Text className="text-sm font-bold text-[#0F172A]">
                  {formatBillAmount(billPreview?.subtotal ?? billPreview?.total_amount)}
                </Text>
              </View>
              <View className="mt-2.5 flex-row justify-between pt-2 border-t border-[#E2E8F0]">
                <Text className="text-base font-extrabold text-[#0F172A]">Grand Total</Text>
                <Text className="text-xl font-black text-[#116C0B]">
                  {formatBillAmount(
                    billPreview?.grand_total ??
                      billPreview?.total ??
                      billPreview?.total_amount,
                  )}
                </Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Select Payment Method
              </Text>
              <View className="flex-row gap-2">
                {['Cash', 'Card', 'UPI'].map(method => {
                  const isSelected = paymentMethod === method;
                  return (
                    <Pressable
                      key={method}
                      disabled={Boolean(settlingTable)}
                      onPress={() => setPaymentMethod(method)}
                      className={`min-h-12 flex-1 items-center justify-center rounded-2xl border ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#116C0B]'
                          : 'border-[#CBD5E1] bg-white active:bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-[#475569]'
                        }`}
                      >
                        {method}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </DetailsModal>
      ) : null}
    </>
  );
}
