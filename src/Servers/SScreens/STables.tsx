import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import api from '../../../api';
import type { HeaderUser } from '../../Admin/Navigation/TopHeader';

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
  const value = String(status || '').toLowerCase();
  return value === 'occupied' || value === 'reserved' ? value : 'available';
}

export default function ServerTables({
  tables,
  user,
}: {
  tables: ServerTablesRow[];
  user: HeaderUser;
}) {
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  const assignedTables = useMemo(() => {
    const employeeId = user.employee_id ?? user.employeeId;
    return tables.filter(table => {
      const assignedId =
        table.assigned_server_id ??
        table.assigned_employee_id ??
        table.server_id;
      if (assignedId === null || assignedId === undefined || assignedId === '') {
        return false;
      }
      return employeeId === undefined || String(assignedId) === String(employeeId);
    });
  }, [tables, user]);

  const updateStatus = async (table: ServerTablesRow, status: TableStatus) => {
    const tableId = table.id ?? table.table_id;
    if (tableId === undefined || tableId === null) {
      Alert.alert('Table unavailable', 'This table does not have a valid ID.');
      return;
    }
    const key = String(tableId);
    if (updating === key) return;
    setUpdating(key);
    try {
      await api.put(`/server-tables/${tableId}`, {
        status: apiStatus[status],
      });
      setStatuses(current => ({ ...current, [key]: status }));
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Unable to update the table status.';
      Alert.alert('Status update failed', message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <View className="px-4 pb-12 pt-4">
      <Text className="text-2xl font-extrabold text-[#012711]">
        Table Management
      </Text>
      <Text className="mt-1 text-xs font-semibold text-[#64748B]">
        Update each assigned table status
      </Text>

      {assignedTables.length ? (
        assignedTables.map((table, index) => {
          const key = String(table.id ?? table.table_id ?? index);
          const status = statuses[key] ?? normalizedStatus(table.status);
          const isUpdating = updating === key;
          return (
            <View
              key={key}
              className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-extrabold text-[#0F172A]">
                    Table {table.table_number ?? table.id ?? table.table_id}
                  </Text>
                  <Text className="mt-1 text-xs text-[#64748B]">
                    {table.no_of_seats ?? 4} seats
                  </Text>
                </View>
                {isUpdating ? <ActivityIndicator size="small" color="#FF7800" /> : null}
              </View>
              <View className="flex-row items-center">
                {(['available', 'occupied', 'reserved'] as const).map(option => {
                  const selected = status === option;
                  return (
                    <Pressable
                      key={option}
                      disabled={isUpdating}
                      onPress={() => void updateStatus(table, option)}
                      className={`mr-2 rounded-xl px-3 py-2 ${
                        selected ? 'bg-[#FF7800]' : 'bg-[#F1F5F9]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold capitalize ${
                          selected ? 'text-white' : 'text-[#475569]'
                        }`}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <Text className="py-16 text-center text-sm text-[#64748B]">
          No tables are assigned to you.
        </Text>
      )}
    </View>
  );
}