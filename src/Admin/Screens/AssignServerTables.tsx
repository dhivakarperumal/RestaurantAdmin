import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../api';
import colors from '../../theme/colors';

type ServerEmployee = {
  employee_id: string | number;
  full_name?: string;
};

type ServerTable = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: number | string;
  status?: string;
  assigned_server_id?: string | number | null;
  assigned_server_name?: string | null;
};

type AssignServerTablesProps = {
  server: ServerEmployee | null;
  onClose: () => void;
  onSaved: () => void;
};

type TableCapacity = {
  selectedTables: ServerTable[];
  count2Seats: number;
  count4Seats: number;
  countLargeSeats: number;
  pointsUsed: number;
  hasLarge: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readTables(payload: unknown): ServerTable[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as ServerTable[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.tables)) {
      return current.tables.filter(isRecord) as ServerTable[];
    }
    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }
  return [];
}

function getTableId(table: ServerTable) {
  const id = table.table_id ?? table.id;
  return id === undefined || id === null ? '' : String(id);
}

function getSeats(table: ServerTable) {
  const seats = Number(table.no_of_seats || 0);
  return Number.isFinite(seats) ? seats : 0;
}

function getCapacity(tables: ServerTable[], selectedIds: string[]): TableCapacity {
  const selectedTables = tables.filter(table =>
    selectedIds.includes(getTableId(table)),
  );
  let count2Seats = 0;
  let count4Seats = 0;
  let countLargeSeats = 0;
  let pointsUsed = 0;

  selectedTables.forEach(table => {
    const seats = getSeats(table);
    if (seats <= 2) {
      count2Seats += 1;
      pointsUsed += 2;
    } else if (seats <= 4) {
      count4Seats += 1;
      pointsUsed += 3;
    } else {
      countLargeSeats += 1;
      pointsUsed += 6;
    }
  });

  return {
    selectedTables,
    count2Seats,
    count4Seats,
    countLargeSeats,
    pointsUsed,
    hasLarge: countLargeSeats > 0,
  };
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unable to assign tables. Please try again.';
}

function AssignServerTables({
  server,
  onClose,
  onSaved,
}: AssignServerTablesProps) {
  const [tables, setTables] = useState<ServerTable[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [seatFilter, setSeatFilter] = useState<'all' | '2' | '4' | '6+'>('all');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!server) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    setTables([]);
    setSelectedIds([]);
    setLoadError('');
    setSaveError('');
    setIsLoading(true);

    api
      .get('/server-tables', { signal: controller.signal })
      .then(response => {
        if (!active) {
          return;
        }
        if (isRecord(response.data) && response.data.success === false) {
          throw new Error(
            typeof response.data.message === 'string'
              ? response.data.message
              : 'Unable to load dining tables.',
          );
        }
        const allTables = readTables(response.data);
        setTables(allTables);
        setSelectedIds(
          allTables
            .filter(
              table =>
                String(table.assigned_server_id ?? '') ===
                String(server.employee_id),
            )
            .map(getTableId)
            .filter(Boolean),
        );
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
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
  }, [server, refreshKey]);

  const capacity = useMemo(
    () => getCapacity(tables, selectedIds),
    [tables, selectedIds],
  );

  const filteredTables = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return tables.filter(table => {
      const matchesSearch =
        !query ||
        `${table.table_number ?? ''} ${table.assigned_server_name ?? ''}`
          .toLocaleLowerCase()
          .includes(query);
      const seats = getSeats(table);
      const matchesSeatFilter =
        seatFilter === 'all' ||
        (seatFilter === '2' && seats <= 2) ||
        (seatFilter === '4' && seats >= 3 && seats <= 4) ||
        (seatFilter === '6+' && seats >= 5);
      return matchesSearch && matchesSeatFilter;
    });
  }, [tables, search, seatFilter]);

  const getSelectionReason = (table: ServerTable) => {
    const id = getTableId(table);
    if (!id) {
      return 'This table has no ID and cannot be assigned.';
    }
    const assignedServerId = String(table.assigned_server_id ?? '');
    if (assignedServerId && assignedServerId !== String(server?.employee_id)) {
      return `Assigned to ${table.assigned_server_name || 'another server'}`;
    }

    const seats = getSeats(table);
    if (capacity.hasLarge) {
      return 'Large tables must be assigned alone.';
    }
    if (seats >= 5) {
      return selectedIds.length
        ? 'Tables with 5 or more seats must be assigned alone.'
        : '';
    }
    if (seats >= 3 && seats <= 4) {
      if (capacity.count4Seats >= 2) {
        return 'A server can have at most 2 tables with 3-4 seats.';
      }
      if (capacity.pointsUsed + 3 > 6) {
        return 'This would exceed the 6-point workload limit.';
      }
    } else if (seats <= 2) {
      if (capacity.count2Seats >= 3) {
        return 'A server can have at most 3 tables with 2 seats.';
      }
      if (capacity.pointsUsed + 2 > 6) {
        return 'This would exceed the 6-point workload limit.';
      }
    }
    return '';
  };

  const toggleTable = (table: ServerTable) => {
    const id = getTableId(table);
    if (selectedIds.includes(id)) {
      setSelectedIds(current => current.filter(selectedId => selectedId !== id));
      setSaveError('');
      return;
    }
    if (getSelectionReason(table)) {
      return;
    }
    setSelectedIds(current => [...current, id]);
    setSaveError('');
  };

  const saveAssignments = async () => {
    if (!server) {
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const response = await api.post('/server-tables/assign', {
        employee_id: server.employee_id,
        table_ids: selectedIds,
      });
      if (!isRecord(response.data) || response.data.success !== true) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The server did not confirm the table assignment.',
        );
      }
      onSaved();
      onClose();
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((capacity.pointsUsed / 6) * 100),
  );

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={server !== null}
    >
      <View className="flex-1 justify-end bg-black/50">
        <SafeAreaView
          edges={['top', 'bottom']}
          className="max-h-[94%] flex-1 rounded-t-3xl bg-[#F9FAFB]"
        >
          <View className="flex-row items-center justify-between rounded-t-3xl bg-[#1F3228] px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-white">Assign Tables</Text>
              <Text className="mt-1 text-xs text-[#D1D5DB]">
                Server: {server?.full_name || 'Employee'} ({server?.employee_id})
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close table assignment"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <Text className="text-xl font-bold text-white">×</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-4 p-4 pb-8"
          >
            <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <View className="flex-row gap-2">
                <CapacityCard label="2-seat" count={capacity.count2Seats} limit={3} />
                <CapacityCard label="3-4 seat" count={capacity.count4Seats} limit={2} />
                <CapacityCard label="5+ seat" count={capacity.countLargeSeats} limit={1} />
              </View>
              <View>
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-xs font-semibold text-[#374151]">
                    Server workload
                  </Text>
                  <Text className="text-xs font-bold text-[#1F3228]">
                    {capacity.pointsUsed} / 6 points ({progressPercent}%)
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <View
                    className="h-full rounded-full bg-[#116C0B]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
                <Text className="mt-1 text-[11px] text-[#6B7280]">
                  {selectedIds.length} table(s) selected
                  {capacity.hasLarge ? ' · large tables must be assigned alone' : ''}
                </Text>
              </View>
            </View>

            <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
              <TextInput
                accessibilityLabel="Search tables for assignment"
                className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search table or assigned server"
                placeholderTextColor="#6B7280"
                value={search}
              />
              <View className="flex-row flex-wrap gap-2">
                {([
                  ['all', 'All seats'],
                  ['2', '2 seats'],
                  ['4', '3-4 seats'],
                  ['6+', '5+ seats'],
                ] as const).map(([filter, label]) => (
                  <Pressable
                    accessibilityRole="button"
                    key={filter}
                    onPress={() => setSeatFilter(filter)}
                    className={`rounded-full border px-3 py-1.5 ${
                      seatFilter === filter
                        ? 'border-[#116C0B] bg-[#116C0B]'
                        : 'border-[#E5E7EB] bg-[#F9FAFB]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        seatFilter === filter ? 'text-white' : 'text-[#4B5563]'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {isLoading ? (
              <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
                <ActivityIndicator color="#116C0B" />
                <Text className="text-sm text-[#6B7280]">Loading dining tables...</Text>
              </View>
            ) : loadError ? (
              <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-6">
                <Text accessibilityRole="alert" className="text-center text-sm text-[#B91C1C]">
                  {loadError}
                </Text>
                <Pressable
                  accessibilityLabel="Retry loading tables"
                  accessibilityRole="button"
                  onPress={() => setRefreshKey(current => current + 1)}
                  className="rounded-xl bg-[#116C0B] px-4 py-2.5"
                >
                  <Text className="font-semibold text-white">Try again</Text>
                </Pressable>
              </View>
            ) : filteredTables.length ? (
              <View className="gap-2">
                {filteredTables.map((table, index) => {
                  const id = getTableId(table);
                  const isSelected = selectedIds.includes(id);
                  const assignedToOther =
                    Boolean(table.assigned_server_id) &&
                    String(table.assigned_server_id) !== String(server?.employee_id);
                  const reason = isSelected ? '' : getSelectionReason(table);
                  const disabled = !isSelected && Boolean(reason);

                  return (
                    <Pressable
                      accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} table ${table.table_number ?? id}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected, disabled }}
                      disabled={disabled}
                      key={id || `table-${index}`}
                      onPress={() => toggleTable(table)}
                      className={`rounded-2xl border p-3 ${
                        isSelected
                          ? 'border-[#116C0B] bg-[#F0F7EE]'
                          : disabled
                            ? 'border-[#E5E7EB] bg-[#F3F4F6]'
                            : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-[#012711]">
                            Table {table.table_number ?? id ?? 'Unknown'}
                          </Text>
                          <Text className="mt-1 text-xs text-[#6B7280]">
                            {getSeats(table)} seats · {table.status || 'Status unknown'}
                          </Text>
                          <Text
                            className={`mt-1 text-[11px] ${
                              assignedToOther
                                ? 'font-semibold text-[#B91C1C]'
                                : isSelected
                                  ? 'font-semibold text-[#116C0B]'
                                  : disabled
                                    ? ''
                                    : 'text-[#6B7280]'
                            }`}
                            style={
                              isSelected || disabled
                                ? { color: colors.primary }
                                : undefined
                            }
                          >
                            {assignedToOther
                              ? reason
                              : isSelected
                                ? 'Assigned to this server'
                                : disabled
                                  ? reason
                                  : 'Tap to assign'}
                          </Text>
                        </View>
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-md border ${
                            isSelected
                              ? 'border-[#116C0B] bg-[#116C0B]'
                              : disabled
                                ? 'border-[#D1D5DB] bg-[#E5E7EB]'
                                : 'border-[#D1D5DB] bg-white'
                          }`}
                        >
                          <Text className="font-bold text-white">
                            {isSelected ? '✓' : assignedToOther ? '×' : ''}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-6">
                <Text className="text-sm font-semibold text-[#374151]">
                  {tables.length ? 'No tables match your filters.' : 'No dining tables found.'}
                </Text>
              </View>
            )}

            {saveError ? (
              <Text accessibilityRole="alert" className="text-sm text-[#B91C1C]">
                {saveError}
              </Text>
            ) : null}
          </ScrollView>

          <View className="flex-row items-center justify-between gap-3 border-t border-[#E5E7EB] bg-white px-4 py-3">
            <Pressable
              accessibilityLabel="Clear table assignments"
              accessibilityRole="button"
              disabled={selectedIds.length === 0 || isSaving}
              onPress={() => {
                setSelectedIds([]);
                setSaveError('');
              }}
              className="px-1 py-2"
            >
              <Text className="text-xs font-semibold text-[#4B5563]">
                Clear all ({selectedIds.length})
              </Text>
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onClose}
                className="rounded-xl border border-[#D1D5DB] px-4 py-2.5"
              >
                <Text className="text-xs font-semibold text-[#374151]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Save table assignments"
                accessibilityRole="button"
                disabled={isLoading || Boolean(loadError) || isSaving}
                onPress={() => saveAssignments()}
                className="min-w-[110px] flex-row items-center justify-center gap-2 rounded-xl bg-[#1F3228] px-4 py-2.5"
              >
                {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text className="text-xs font-semibold text-white">
                  {isSaving ? 'Saving...' : 'Save assignments'}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CapacityCard({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number;
}) {
  return (
    <View className="flex-1 items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-2">
      <Text className="text-[10px] font-semibold text-[#6B7280]">{label}</Text>
      <Text className="mt-1 text-sm font-bold text-[#012711]">
        {count} / {limit}
      </Text>
    </View>
  );
}

export default AssignServerTables;
