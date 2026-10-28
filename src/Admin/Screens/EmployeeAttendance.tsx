import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../api';

type AttendanceRecord = {
  employee_id: string | number;
  full_name?: string;
  employee_type?: string;
  attendance_record_id?: number | string | null;
  attendance_id?: string;
  attendance_date?: string;
  check_in?: string | null;
  check_out?: string | null;
  total_hours?: number | string | null;
  duration_seconds?: number | string | null;
  attendance_status?: string;
  notes?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type AttendanceSummary = {
  total_active_staff?: number | string;
  present_count?: number | string;
  working_now_count?: number | string;
  completed_count?: number | string;
  late_count?: number | string;
  absent_count?: number | string;
};

type AttendanceStatus =
  | 'All'
  | 'Present'
  | 'Working'
  | 'Completed'
  | 'Late'
  | 'Absent';

type AttendanceForm = {
  employee_id: string;
  employee_name: string;
  attendance_record_id?: number | string | null;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  notes: string;
};

const employeeRoles = [
  'All',
  'Chef',
  'Server',
  'Delivery Partner',
  'Cashier',
  'Manager',
  'Cleaner',
];
const attendanceStatuses: AttendanceStatus[] = [
  'All',
  'Present',
  'Working',
  'Completed',
  'Late',
  'Absent',
];
const recordStatuses = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateTimeInput(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${localDateString(date)}T${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function toIsoDateTime(value: string) {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Enter a valid local date and time (YYYY-MM-DDTHH:MM).');
  }
  return date.toISOString();
}

function formatTime(value?: string | null) {
  if (!value) {
    return '--:--';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds?: number | string | null) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function isSuccessfulResponse(payload: unknown): payload is Record<string, unknown> {
  return isRecord(payload) && payload.success === true;
}

function EmployeeAttendance() {
  const today = useMemo(() => localDateString(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('All');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState<AttendanceForm | null>(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<AttendanceRecord | null>(
    null,
  );
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const debounce = setTimeout(() => {
      setIsLoading(true);
      setError('');
      const params = {
        date: selectedDate,
        ...(selectedRole !== 'All' ? { employeeType: selectedRole } : {}),
        ...(selectedStatus !== 'All' ? { status: selectedStatus } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      Promise.all([
        api.get('/attendance/admin/records', {
          params,
          signal: controller.signal,
        }),
        api.get('/attendance/admin/summary', {
          params: { date: selectedDate },
          signal: controller.signal,
        }),
      ])
        .then(([recordsResponse, summaryResponse]) => {
          if (!active) {
            return;
          }
          if (!isSuccessfulResponse(recordsResponse.data)) {
            throw new Error(
              isRecord(recordsResponse.data) &&
                typeof recordsResponse.data.message === 'string'
                ? recordsResponse.data.message
                : 'The attendance records response was invalid.',
            );
          }
          if (!isSuccessfulResponse(summaryResponse.data)) {
            throw new Error(
              isRecord(summaryResponse.data) &&
                typeof summaryResponse.data.message === 'string'
                ? summaryResponse.data.message
                : 'The attendance summary response was invalid.',
            );
          }
          const recordRows = recordsResponse.data.data;
          if (!Array.isArray(recordRows) || !isRecord(summaryResponse.data.data)) {
            throw new Error('The attendance response did not contain valid data.');
          }
          setRecords(recordRows.filter(isRecord) as AttendanceRecord[]);
          setSummary(summaryResponse.data.data as AttendanceSummary);
        })
        .catch(loadError => {
          if (active && !controller.signal.aborted) {
            setError(
              getErrorMessage(
                loadError,
                'Failed to load attendance records. Please try again.',
              ),
            );
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, search.trim() ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(debounce);
      controller.abort();
    };
  }, [selectedDate, selectedRole, selectedStatus, search, refreshKey]);

  const openRecordForm = (record: AttendanceRecord) => {
    setFormError('');
    setForm({
      employee_id: String(record.employee_id),
      employee_name: record.full_name || 'Employee',
      attendance_record_id: record.attendance_record_id,
      date: record.attendance_date?.slice(0, 10) || selectedDate,
      check_in: localDateTimeInput(record.check_in),
      check_out: localDateTimeInput(record.check_out),
      status: record.attendance_status || 'Present',
      notes: record.notes || '',
    });
  };

  const saveRecord = async () => {
    if (!form) {
      return;
    }
    if (!form.employee_id || !form.date.trim()) {
      setFormError('Employee and date are required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const checkIn = toIsoDateTime(form.check_in);
      const checkOut = toIsoDateTime(form.check_out);
      if (checkIn && checkOut && new Date(checkOut) < new Date(checkIn)) {
        throw new Error('Clock-out time must be after clock-in time.');
      }
      const payload = {
        employeeId: form.employee_id,
        date: form.date,
        checkIn,
        checkOut,
        status: form.status,
        notes: form.notes.trim(),
      };
      const response = form.attendance_record_id
        ? await api.put(
            `/attendance/admin/${encodeURIComponent(String(form.attendance_record_id))}`,
            payload,
          )
        : await api.post('/attendance/admin/mark', payload);
      if (!isSuccessfulResponse(response.data)) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The server did not confirm the attendance update.',
        );
      }
      setForm(null);
      setRefreshKey(current => current + 1);
    } catch (saveError) {
      setFormError(getErrorMessage(saveError, 'Failed to save attendance.'));
    } finally {
      setIsSaving(false);
    }
  };

  const loadHistory = async (record: AttendanceRecord) => {
    setHistoryEmployee(record);
    setHistoryRecords([]);
    setHistoryError('');
    setIsLoadingHistory(true);
    try {
      const response = await api.get(
        `/attendance/admin/employees/${encodeURIComponent(String(record.employee_id))}/history`,
      );
      if (!isSuccessfulResponse(response.data) || !Array.isArray(response.data.data)) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The attendance history response was invalid.',
        );
      }
      setHistoryRecords(response.data.data.filter(isRecord) as AttendanceRecord[]);
    } catch (historyLoadError) {
      setHistoryError(
        getErrorMessage(historyLoadError, 'Unable to load attendance history.'),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteRecord = (record: AttendanceRecord) => {
    if (!record.attendance_record_id) {
      return;
    }
    Alert.alert(
      'Delete attendance record',
      `Remove the attendance record for ${record.full_name || 'this employee'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(
                `/attendance/admin/${encodeURIComponent(String(record.attendance_record_id))}`,
              );
              if (!isSuccessfulResponse(response.data)) {
                throw new Error(
                  isRecord(response.data) &&
                    typeof response.data.message === 'string'
                    ? response.data.message
                    : 'The server did not confirm the deletion.',
                );
              }
              setRefreshKey(current => current + 1);
            } catch (deleteError) {
              Alert.alert(
                'Could not delete record',
                getErrorMessage(deleteError, 'Failed to delete attendance.'),
              );
            }
          },
        },
      ],
    );
  };

  const exportCsv = async () => {
    if (!records.length) {
      Alert.alert('Nothing to export', 'No attendance records are available for this date.');
      return;
    }

    const csvValue = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Employee ID',
      'Full Name',
      'Department / Role',
      'Date',
      'Scheduled Shift',
      'Clock In',
      'Clock Out',
      'Duration',
      'Attendance Status',
      'Notes',
    ];
    const rows = records.map(record => [
      record.employee_id,
      record.full_name,
      record.employee_type,
      record.attendance_date || selectedDate,
      formatShift(record),
      record.check_in ? formatTime(record.check_in) : '--',
      record.check_out
        ? formatTime(record.check_out)
        : record.check_in
          ? 'Working'
          : '--',
      record.total_hours || formatDuration(record.duration_seconds),
      record.attendance_status || 'Absent',
      record.notes,
    ]);

    try {
      await Share.share({
        title: `Staff attendance ${selectedDate}`,
        message: [headers, ...rows]
          .map(row => row.map(csvValue).join(','))
          .join('\n'),
      });
    } catch (shareError) {
      Alert.alert(
        'Could not export attendance',
        getErrorMessage(shareError, 'Unable to share the attendance CSV.'),
      );
    }
  };

  return (
    <View className="mt-7 gap-4">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
            DAILY TRACKING
          </Text>
          <Text className="mt-1 text-base font-bold text-[#012711]">
            Employee attendance
          </Text>
          <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
            Review shifts, mark attendance, and view employee history.
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityLabel="Refresh attendance"
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => setRefreshKey(current => current + 1)}
            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5"
          >
            <Text className="text-xs font-semibold text-[#374151]">
              {isLoading ? 'Loading' : 'Refresh'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Export attendance CSV"
            accessibilityRole="button"
            onPress={exportCsv}
            className="rounded-xl bg-[#1F4E42] px-3 py-2.5"
          >
            <Text className="text-xs font-semibold text-white">Export</Text>
          </Pressable>
        </View>
      </View>

      <View accessibilityLabel="Attendance summary" className="flex-row flex-wrap gap-2">
        <SummaryCard label="Staff" value={summary?.total_active_staff} />
        <SummaryCard label="Present" value={summary?.present_count} />
        <SummaryCard label="Working" value={summary?.working_now_count} />
        <SummaryCard label="Completed" value={summary?.completed_count} />
        <SummaryCard label="Late" value={summary?.late_count} />
        <SummaryCard label="Absent" value={summary?.absent_count} />
      </View>

      <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <View className="flex-row items-center gap-2">
          <Text className="w-12 text-xs font-semibold text-[#4B5563]">Date</Text>
          <TextInput
            accessibilityLabel="Attendance date"
            className="flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#012711]"
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            value={selectedDate}
          />
          <Pressable
            accessibilityLabel="Show today's attendance"
            accessibilityRole="button"
            onPress={() => setSelectedDate(today)}
            className="rounded-xl bg-[#1F4E42] px-3 py-2.5"
          >
            <Text className="text-xs font-bold text-white">Today</Text>
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="Search attendance"
          className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search name, employee ID, phone, or email"
          placeholderTextColor="#6B7280"
          value={search}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {employeeRoles.map(role => (
              <FilterChip
                key={role}
                label={role === 'All' ? 'All roles' : role}
                selected={selectedRole === role}
                onPress={() => setSelectedRole(role)}
              />
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {attendanceStatuses.map(status => (
              <FilterChip
                key={status}
                label={
                  status === 'All'
                    ? 'All statuses'
                    : status === 'Working'
                      ? 'Working now'
                      : status === 'Completed'
                        ? 'Completed shift'
                        : status === 'Late'
                          ? 'Late arrival'
                          : status
                }
                selected={selectedStatus === status}
                onPress={() => setSelectedStatus(status)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {error ? (
        <View className="gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
          <Text accessibilityRole="alert" className="text-sm text-[#991B1B]">
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry attendance loading"
            accessibilityRole="button"
            onPress={() => setRefreshKey(current => current + 1)}
            className="self-start rounded-lg bg-[#991B1B] px-3 py-2"
          >
            <Text className="text-xs font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <ActivityIndicator color="#116C0B" />
          <Text className="text-xs text-[#6B7280]">Loading attendance...</Text>
        </View>
      ) : records.length ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-[#6B7280]">
            {records.length} employee record{records.length === 1 ? '' : 's'}
          </Text>
          {records.map((record, index) => {
            const isWorking = Boolean(record.check_in && !record.check_out);
            const status =
              record.attendance_status ||
              (record.check_in ? (record.check_out ? 'Completed' : 'Working') : 'Absent');
            const seconds =
              record.duration_seconds ??
              (Number(record.total_hours) ? Number(record.total_hours) * 3600 : 0);

            return (
              <View
                key={`${record.employee_id}-${record.attendance_record_id ?? index}`}
                className="gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#012711]">
                      {record.full_name || 'Employee'}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-[#6B7280]">
                      {record.employee_type || 'Staff'} · {record.employee_id}
                    </Text>
                  </View>
                  <Text
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      status === 'Late'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : status === 'Absent'
                          ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : isWorking
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#DBEAFE] text-[#1E40AF]'
                    }`}
                  >
                    {status}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                  <AttendanceValue label="Shift" value={formatShift(record)} />
                  <AttendanceValue
                    label="Clock in"
                    value={record.check_in ? formatTime(record.check_in) : '--'}
                  />
                  <AttendanceValue
                    label="Clock out"
                    value={record.check_out ? formatTime(record.check_out) : isWorking ? 'Working' : '--'}
                  />
                  <AttendanceValue label="Duration" value={formatDuration(seconds)} />
                </View>
                {record.notes ? (
                  <Text className="text-xs text-[#6B7280]">Note: {record.notes}</Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2 border-t border-[#F3F4F6] pt-2">
                  <SmallAction
                    label={record.attendance_record_id ? 'Edit' : 'Mark attendance'}
                    onPress={() => openRecordForm(record)}
                  />
                  <SmallAction
                    label="History"
                    onPress={() => loadHistory(record)}
                  />
                  {record.attendance_record_id ? (
                    <SmallAction
                      label="Delete"
                      destructive
                      onPress={() => deleteRecord(record)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-6">
          <Text className="text-sm font-semibold text-[#374151]">
            No attendance records found for this date.
          </Text>
          <Text className="mt-1 text-center text-xs text-[#6B7280]">
            Adjust the filters or choose another date.
          </Text>
        </View>
      )}

      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!isSaving) setForm(null);
        }}
        transparent
        visible={form !== null}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-3xl bg-white p-5">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="text-lg font-bold text-[#012711]">
                {form?.attendance_record_id ? 'Edit attendance' : 'Mark attendance'}
              </Text>
              <Text className="mt-1 text-xs text-[#6B7280]">
                {form?.employee_name} · {form?.employee_id}
              </Text>
              <FormField
                label="Date"
                accessibilityLabel="Attendance record date"
                value={form?.date || ''}
                placeholder="YYYY-MM-DD"
                onChangeText={value =>
                  setForm(current => (current ? { ...current, date: value } : current))
                }
              />
              <Text className="mt-4 text-xs font-semibold text-[#374151]">Status</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {recordStatuses.map(status => (
                  <FilterChip
                    key={status}
                    label={status}
                    accessibilityLabel={`Set attendance status ${status}`}
                    selected={form?.status === status}
                    onPress={() =>
                      setForm(current =>
                        current ? { ...current, status } : current,
                      )
                    }
                  />
                ))}
              </View>
              <FormField
                label="Clock-in date and time"
                accessibilityLabel="Attendance clock in"
                value={form?.check_in || ''}
                placeholder="YYYY-MM-DDTHH:MM"
                onChangeText={value =>
                  setForm(current =>
                    current ? { ...current, check_in: value } : current,
                  )
                }
              />
              <FormField
                label="Clock-out date and time"
                accessibilityLabel="Attendance clock out"
                value={form?.check_out || ''}
                placeholder="YYYY-MM-DDTHH:MM"
                onChangeText={value =>
                  setForm(current =>
                    current ? { ...current, check_out: value } : current,
                  )
                }
              />
              <Text className="mt-4 text-xs font-semibold text-[#374151]">Notes / remarks</Text>
              <TextInput
                accessibilityLabel="Attendance notes"
                className="mt-2 min-h-20 rounded-xl border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827]"
                multiline
                onChangeText={value =>
                  setForm(current =>
                    current ? { ...current, notes: value } : current,
                  )
                }
                placeholder="Optional notes"
                textAlignVertical="top"
                value={form?.notes || ''}
              />
              {formError ? (
                <Text accessibilityRole="alert" className="mt-3 text-sm text-[#B91C1C]">
                  {formError}
                </Text>
              ) : null}
              <View className="mt-5 flex-row justify-end gap-2">
                <SmallAction label="Cancel" onPress={() => setForm(null)} />
                <Pressable
                  accessibilityLabel="Save attendance record"
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={saveRecord}
                  className="min-w-[120px] flex-row items-center justify-center gap-2 rounded-xl bg-[#1F4E42] px-4 py-2.5"
                >
                  {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <Text className="text-xs font-bold text-white">
                    {isSaving ? 'Saving...' : 'Save record'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setHistoryEmployee(null)}
        transparent
        visible={historyEmployee !== null}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[85%] rounded-t-3xl bg-white">
            <View className="flex-row items-center justify-between border-b border-[#E5E7EB] p-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-[#012711]">Attendance history</Text>
                <Text className="mt-1 text-xs text-[#6B7280]">
                  {historyEmployee?.full_name} · {historyEmployee?.employee_id}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close attendance history"
                accessibilityRole="button"
                onPress={() => setHistoryEmployee(null)}
                className="rounded-lg bg-[#F3F4F6] px-3 py-2"
              >
                <Text className="font-bold text-[#374151]">×</Text>
              </Pressable>
            </View>
            {isLoadingHistory ? (
              <View className="items-center p-8">
                <ActivityIndicator color="#116C0B" />
              </View>
            ) : historyError ? (
              <Text accessibilityRole="alert" className="p-5 text-sm text-[#B91C1C]">
                {historyError}
              </Text>
            ) : historyRecords.length ? (
              <ScrollView contentContainerClassName="gap-2 p-4">
                {historyRecords.map((record, index) => (
                  <View
                    key={`${record.attendance_record_id ?? record.attendance_id ?? index}`}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                  >
                    <View className="flex-row justify-between gap-2">
                      <Text className="text-sm font-bold text-[#012711]">
                        {record.attendance_date?.slice(0, 10) || 'Unknown date'}
                      </Text>
                      <Text className="text-xs font-semibold text-[#4B5563]">
                        {record.attendance_status || 'Present'}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      In {record.check_in ? formatTime(record.check_in) : '--'} · Out{' '}
                      {record.check_out ? formatTime(record.check_out) : record.check_in ? 'Working' : '--'}
                      {record.total_hours ? ` · ${record.total_hours} hrs` : ''}
                    </Text>
                    {record.notes ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">{record.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text className="p-6 text-center text-sm text-[#6B7280]">
                No attendance history found for this employee.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <View className="min-w-[30%] flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
      </Text>
      <Text className="mt-1 text-lg font-black text-[#012711]">
        {value ?? '—'}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected ? 'border-[#116C0B] bg-[#116C0B]' : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-[#4B5563]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function AttendanceValue({ label, value }: { label: string; value: string }) {
  return (
    <Text className="text-[11px] text-[#6B7280]">
      {label}: <Text className="font-semibold text-[#374151]">{value}</Text>
    </Text>
  );
}

function SmallAction({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className={`rounded-lg border px-3 py-2 ${
        destructive
          ? 'border-[#FECACA] bg-[#FEF2F2]'
          : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <Text className={`text-xs font-semibold ${destructive ? 'text-[#B91C1C]' : 'text-[#374151]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function FormField({
  label,
  accessibilityLabel,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-xs font-semibold text-[#374151]">{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        className="rounded-xl border border-[#D1D5DB] px-3 py-2.5 text-sm text-[#111827]"
        onChangeText={onChangeText}
        placeholder={placeholder}
        value={value}
      />
    </View>
  );
}

function formatShift(record: AttendanceRecord) {
  if (!record.start_time) {
    return 'Regular';
  }
  return `${record.start_time.slice(0, 5)} - ${record.end_time?.slice(0, 5) || '--'}`;
}

export default EmployeeAttendance;
