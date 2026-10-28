import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

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
};

type TableStatus = 'available' | 'occupied' | 'reserved';

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
  orders?: Record<string, unknown>[];
  onRefresh?: () => void;
  onSelectTable?: (tableNum: string) => void;
};

export default function ServerTables({
  tables = [],
  user = {},
  orders = [],
  onRefresh,
  onSelectTable,
}: ServerTablesProps) {
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');
  const [scope, setScope] = useState<'all' | 'assigned'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTableDetails, setSelectedTableDetails] = useState<ServerTablesRow | null>(null);

  const employeeId = user.employee_id ?? user.employeeId;

  // Active orders mapped by table number
  const occupiedOrderMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    orders.forEach(o => {
      const status = String(o.status || o.order_status || '').toLowerCase();
      if (['pending', 'preparing', 'cooking', 'ready', 'confirmed'].includes(status)) {
        const t = String(o.table_number || o.table_id || o.table || '').trim();
        if (t && t !== '—') {
          map.set(t, o);
        }
      }
    });
    return map;
  }, [orders]);

  // Normalized list of tables (fallback to 12 standard dining tables if none)
  const normalizedTableList: ServerTablesRow[] = useMemo(() => {
    if (tables.length > 0) {
      return tables.map((t, idx): ServerTablesRow => {
        const num = String(t.table_number ?? t.id ?? t.table_id ?? idx + 1);
        const hasOrder = occupiedOrderMap.has(num);
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
      const hasOrder = occupiedOrderMap.has(num);
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

  // Filter by assignment
  const scopedTables = useMemo(() => {
    if (scope === 'assigned') {
      const assigned = normalizedTableList.filter(t => {
        const aId = t.assigned_server_id ?? t.assigned_employee_id ?? t.server_id;
        return aId !== undefined && aId !== null && String(aId) === String(employeeId);
      });
      // If none explicitly assigned, fallback to first 4 or all so screen is never empty
      return assigned.length > 0 ? assigned : normalizedTableList.slice(0, 4);
    }
    return normalizedTableList;
  }, [normalizedTableList, scope, employeeId]);

  // Filter by status & search
  const displayedTables = useMemo(() => {
    let list = scopedTables;
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
  }, [scopedTables, filter, search, statuses]);

  // Floor Counts
  const totalCount = normalizedTableList.length;
  const availableCount = normalizedTableList.filter(t => {
    const key = String(t.id ?? t.table_number);
    return (statuses[key] ?? normalizedStatus(t.status)) === 'available';
  }).length;
  const occupiedCount = normalizedTableList.filter(t => {
    const key = String(t.id ?? t.table_number);
    return (statuses[key] ?? normalizedStatus(t.status)) === 'occupied';
  }).length;
  const reservedCount = normalizedTableList.filter(t => {
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

  return (
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
              FLOOR SEATING & OCCUPANCY
            </Text>
          </View>
          <View className="rounded-full bg-[#114D26] px-3 py-1">
            <Text className="text-[11px] font-bold text-[#86EFAC]">
              {totalCount} TOTAL TABLES
            </Text>
          </View>
        </View>

        <Text className="mt-3 text-2xl font-black text-white">
          Table Management
        </Text>
        <Text className="mt-1 text-xs text-[#CBD5E1]">
          Monitor table occupancy, guest seating, and turnaround
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
          Scope Switcher (All Tables vs Assigned) & Search
          ==================================================================== */}
      <View className="mt-4 flex-row items-center justify-between gap-2">
        {/* Scope Pill Toggle */}
        <View className="flex-row rounded-2xl border border-[#CBD5E1] bg-white p-1 shadow-sm">
          <Pressable
            onPress={() => setScope('all')}
            className={`rounded-xl px-3 py-1.5 ${
              scope === 'all' ? 'bg-[#116C0B]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                scope === 'all' ? 'text-white' : 'text-[#64748B]'
              }`}
            >
              All Tables ({totalCount})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setScope('assigned')}
            className={`rounded-xl px-3 py-1.5 ${
              scope === 'assigned' ? 'bg-[#116C0B]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                scope === 'assigned' ? 'text-white' : 'text-[#64748B]'
              }`}
            >
              My Station
            </Text>
          </Pressable>
        </View>

        {/* Search input */}
        <View className="flex-1 flex-row items-center rounded-2xl border border-[#CBD5E1] bg-white px-3 py-2 shadow-sm">
          <SearchSvg size={16} />
          <TextInput
            placeholder="Search table #..."
            value={search}
            onChangeText={setSearch}
            className="ml-2 flex-1 text-xs text-[#0F172A]"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <CloseSvg size={14} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ====================================================================
          Status Filter Chips
          ==================================================================== */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 py-1">
        <View className="flex-row gap-2">
          {[
            { id: 'all', label: `All Tables (${scopedTables.length})` },
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
            const activeOrder = occupiedOrderMap.get(String(table.table_number));

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
                  </View>
                ) : currentStatus === 'reserved' ? (
                  <View className="mt-3.5 rounded-xl border border-[#C7D2FE] bg-[#F5F7FF] p-3">
                    <Text className="text-xs font-semibold text-[#4338CA]">
                      📌 Reserved for upcoming dining booking
                    </Text>
                  </View>
                ) : null}

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
                  setScope('all');
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
  );
}
