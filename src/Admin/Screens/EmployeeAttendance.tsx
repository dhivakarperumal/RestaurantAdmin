import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import api from '../../../api';
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DetailsModal,
  FilterSelect,
  FormModal,
  UserIcon,
} from '../../components/popups';
import AdminStatCard from '../../components/AdminStatCard';
import colors from '../../theme/colors';

type AttendanceRecord = {
  employee_id: string | number;
  full_name?: string;
  employee_type?: string;
  id?: number | string | null;
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
  attendance_record_id: number | string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  notes: string;
};

type ActivePicker = {
  field: 'date' | 'check_in' | 'check_out';
  mode: 'date' | 'time';
};

type EmployeeAttendanceProps = {
  onBack: () => void;
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
  const databaseDateTime = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/,
  );
  if (databaseDateTime) {
    return `${databaseDateTime[1]}T${databaseDateTime[2]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${localDateString(date)}T${String(date.getHours()).padStart(
    2,
    '0',
  )}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseLocalDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
  );
}

function localDateTimeValue(date: Date) {
  return `${localDateString(date)}T${String(date.getHours()).padStart(
    2,
    '0',
  )}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function displayDate(value: string) {
  const date = parseLocalDateTime(value);
  return date ? date.toLocaleDateString() : 'Select date';
}

function displayTime(value: string) {
  const date = parseLocalDateTime(value);
  return date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Select time';
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
  const databaseDateTime = value.match(
    /^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/,
  );
  if (databaseDateTime) {
    const date = new Date();
    date.setHours(
      Number(databaseDateTime[1]),
      Number(databaseDateTime[2]),
      0,
      0,
    );
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAttendanceDate(value?: string | null) {
  if (!value) {
    return '—';
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return value;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).toLocaleDateString();
}

function formatHistoryDuration(record: AttendanceRecord) {
  const hours = Number(record.total_hours);
  if (
    record.total_hours !== null &&
    record.total_hours !== undefined &&
    String(record.total_hours).trim() !== '' &&
    Number.isFinite(hours)
  ) {
    return `${hours.toFixed(2)} hrs`;
  }
  return `${(Math.max(0, Number(record.duration_seconds) || 0) / 3600).toFixed(
    2,
  )} hrs`;
}

function formatDuration(seconds?: number | string | null) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function isSuccessfulResponse(
  payload: unknown,
): payload is Record<string, unknown> {
  return isRecord(payload) && payload.success === true;
}

function getAttendanceRecordId(record: AttendanceRecord) {
  const id = record.attendance_record_id ?? record.id;
  return id === null || id === undefined || String(id).trim() === ''
    ? null
    : id;
}

function EmployeeAttendance({ onBack }: EmployeeAttendanceProps) {
  const today = useMemo(() => localDateString(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState<AttendanceForm | null>(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [historyEmployee, setHistoryEmployee] =
    useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const debounce = setTimeout(
      () => {
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
            if (
              !Array.isArray(recordRows) ||
              !isRecord(summaryResponse.data.data)
            ) {
              throw new Error(
                'The attendance response did not contain valid data.',
              );
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
      },
      search.trim() ? 300 : 0,
    );

    return () => {
      active = false;
      clearTimeout(debounce);
      controller.abort();
    };
  }, [selectedDate, selectedRole, selectedStatus, search, refreshKey]);

  const openRecordForm = (record: AttendanceRecord) => {
    const recordId = getAttendanceRecordId(record);
    if (recordId === null) {
      Alert.alert(
        'Cannot edit attendance',
        'The attendance record ID was not returned by the API.',
      );
      return;
    }
    setFormError('');
    setActivePicker(null);
    setForm({
      employee_id: String(record.employee_id),
      employee_name: record.full_name || 'Employee',
      attendance_record_id: recordId,
      date: record.attendance_date?.slice(0, 10) || selectedDate,
      check_in: localDateTimeInput(record.check_in),
      check_out: localDateTimeInput(record.check_out),
      status: record.attendance_status || 'Present',
      notes: record.notes || '',
    });
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    pickedValue?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (event.type === 'dismissed' || !pickedValue || !activePicker) {
      return;
    }

    setForm(current => {
      if (!current) {
        return current;
      }
      if (activePicker.field === 'date') {
        return { ...current, date: localDateString(pickedValue) };
      }

      const currentValue = current[activePicker.field];
      const date =
        parseLocalDateTime(currentValue) ||
        parseLocalDateTime(current.date) ||
        new Date();
      if (activePicker.mode === 'date') {
        date.setFullYear(
          pickedValue.getFullYear(),
          pickedValue.getMonth(),
          pickedValue.getDate(),
        );
      } else {
        date.setHours(pickedValue.getHours(), pickedValue.getMinutes(), 0, 0);
      }
      return { ...current, [activePicker.field]: localDateTimeValue(date) };
    });
  };

  const saveRecord = async () => {
    if (!form) {
      return;
    }
    if (
      form.attendance_record_id === null ||
      String(form.attendance_record_id).trim() === ''
    ) {
      setFormError('This attendance record cannot be edited.');
      return;
    }
    if (!form.employee_id || !form.date.trim()) {
      setFormError('Employee and date are required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    setActivePicker(null);
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
      const response = await api.put(
        `/attendance/admin/${encodeURIComponent(
          String(form.attendance_record_id),
        )}`,
        payload,
      );
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
        `/attendance/admin/employees/${encodeURIComponent(
          String(record.employee_id),
        )}/history`,
      );
      if (
        !isSuccessfulResponse(response.data) ||
        !Array.isArray(response.data.data)
      ) {
        throw new Error(
          isRecord(response.data) && typeof response.data.message === 'string'
            ? response.data.message
            : 'The attendance history response was invalid.',
        );
      }
      setHistoryRecords(
        response.data.data.filter(isRecord) as AttendanceRecord[],
      );
    } catch (historyLoadError) {
      setHistoryError(
        getErrorMessage(historyLoadError, 'Unable to load attendance history.'),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const exportCsv = async () => {
    if (!records.length) {
      Alert.alert(
        'Nothing to export',
        'No attendance records are available for this date.',
      );
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
    <ScrollView
      contentContainerClassName="mx-auto w-full max-w-[1100px] gap-4 px-5 pb-7 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="mt-1 text-2xl font-bold text-[#012711]">
          Employee attendance
        </Text>
        <Text className="mt-1 text-sm leading-5 text-[#6B7280]">
          Review daily shifts, edit attendance records, and view employee
          history.
        </Text>
      </View>

      <View className="gap-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
              DAILY TRACKING
            </Text>
            <Text className="mt-1 text-base font-bold text-[#012711]">
              Attendance records
            </Text>
            <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
              Attendance overview for your restaurant team.
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

        <View
          accessibilityLabel="Attendance summary"
          className="flex-row flex-wrap justify-between gap-y-3"
        >
          <SummaryCard
            label="Staff"
            value={summary?.total_active_staff}
            tint="#166534"
            iconBackground="#DCFCE7"
            icon={<UserIcon size={22} color="#166534" />}
          />
          <SummaryCard
            label="Present"
            value={summary?.present_count}
            tint="#1D4ED8"
            iconBackground="#BFDBFE"
            icon={<CheckCircle2Icon size={22} color="#1D4ED8" />}
          />
          <SummaryCard
            label="Working"
            value={summary?.working_now_count}
            tint="#0F766E"
            iconBackground="#CCFBF1"
            icon={<ClockIcon size={22} color="#0F766E" />}
          />
          <SummaryCard
            label="Completed"
            value={summary?.completed_count}
            tint="#6D28D9"
            iconBackground="#DDD6FE"
            icon={<CheckCircle2Icon size={22} color="#6D28D9" />}
          />
          <SummaryCard
            label="Late"
            value={summary?.late_count}
            tint="#9A3412"
            iconBackground="#FED7AA"
            icon={<ClockIcon size={22} color="#9A3412" />}
          />
          <SummaryCard
            label="Absent"
            value={summary?.absent_count}
            tint="#B91C1C"
            iconBackground="#FECACA"
            icon={<CalendarIcon size={22} color="#B91C1C" />}
          />
        </View>

        <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
          <View className="flex-row items-center gap-2">
            <Text className="w-12 text-xs font-semibold text-[#4B5563]">
              Date
            </Text>
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

          <View className="flex-row items-end gap-3">
            <FilterSelect
              label="Role"
              value={selectedRole}
              onChange={setSelectedRole}
              options={employeeRoles.map(role => ({
                value: role,
                label: role === 'All' ? 'All roles' : role,
              }))}
            />
            <FilterSelect
              label="Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={attendanceStatuses.map(status => ({
                value: status,
                label:
                  status === 'All'
                    ? 'All statuses'
                    : status === 'Working'
                    ? 'Working now'
                    : status === 'Completed'
                    ? 'Completed shift'
                    : status === 'Late'
                    ? 'Late arrival'
                    : status,
              }))}
            />
          </View>

          <View className="flex-row justify-end">
            <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
              {(['grid', 'list'] as const).map(mode => {
                const selected = viewMode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityLabel={`Show attendance as ${mode}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setViewMode(mode)}
                    className={`h-9 w-9 items-center justify-center rounded-md ${
                      selected ? 'bg-[#116C0B]' : 'bg-[#F3F4F6]'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        selected ? 'text-white' : 'text-[#64748B]'
                      }`}
                    >
                      {mode === 'grid' ? '▦' : '☷'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
              <Text className="text-xs font-semibold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text className="text-xs font-semibold text-[#64748B]">
          {records.length} employee record{records.length === 1 ? '' : 's'}
        </Text>

        {isLoading ? (
          <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <ActivityIndicator color="#116C0B" />
            <Text className="text-xs text-[#6B7280]">
              Loading attendance...
            </Text>
          </View>
        ) : records.length ? (
          viewMode === 'list' ? (
            <ScrollView
              horizontal={!isWide}
              showsHorizontalScrollIndicator={!isWide}
            >
              <View
                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
                style={{ width: isWide ? '100%' : 760 }}
              >
                <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                  <Text className="flex-1 text-xs font-bold text-[#64748B]">
                    Employee
                  </Text>
                  <Text className="w-28 text-xs font-bold text-[#64748B]">
                    Shift
                  </Text>
                  <Text className="w-24 text-xs font-bold text-[#64748B]">
                    Clock in
                  </Text>
                  <Text className="w-24 text-xs font-bold text-[#64748B]">
                    Clock out
                  </Text>
                  <Text className="w-28 text-xs font-bold text-[#64748B]">
                    Status
                  </Text>
                  <Text className="w-24 text-xs font-bold text-[#64748B]">
                    Actions
                  </Text>
                </View>
                {records.map((record, index) => {
                  const isWorking = Boolean(
                    record.check_in && !record.check_out,
                  );
                  const status =
                    record.attendance_status ||
                    (record.check_in
                      ? record.check_out
                        ? 'Completed'
                        : 'Working'
                      : 'Absent');
                  return (
                    <View
                      key={`${record.employee_id}-${
                        record.attendance_record_id ?? index
                      }`}
                      className={`min-h-[58px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          numberOfLines={1}
                          className="text-xs font-semibold text-[#334155]"
                        >
                          {record.full_name || 'Employee'}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="mt-1 text-[10px] text-[#64748B]"
                        >
                          {record.employee_type || 'Staff'} ·{' '}
                          {record.employee_id}
                        </Text>
                      </View>
                      <Text className="w-28 text-xs text-[#334155]">
                        {formatShift(record)}
                      </Text>
                      <Text className="w-24 text-xs text-[#334155]">
                        {record.check_in ? formatTime(record.check_in) : '—'}
                      </Text>
                      <Text className="w-24 text-xs text-[#334155]">
                        {record.check_out
                          ? formatTime(record.check_out)
                          : isWorking
                          ? 'Working'
                          : '—'}
                      </Text>
                      <Text
                        className={`w-28 text-xs font-semibold ${
                          status === 'Absent'
                            ? 'text-[#B91C1C]'
                            : 'text-[#166534]'
                        }`}
                      >
                        {status}
                      </Text>
                      <View className="w-24 flex-row gap-2">
                        <AttendanceIconAction
                          accessibilityLabel={`View attendance history for ${
                            record.full_name || record.employee_id
                          }`}
                          icon="history"
                          onPress={() => loadHistory(record)}
                        />
                        <AttendanceIconAction
                          accessibilityLabel={`Edit attendance for ${
                            record.full_name || record.employee_id
                          }`}
                          icon="edit"
                          onPress={() => openRecordForm(record)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {records.map((record, index) => {
                const isWorking = Boolean(record.check_in && !record.check_out);
                const status =
                  record.attendance_status ||
                  (record.check_in
                    ? record.check_out
                      ? 'Completed'
                      : 'Working'
                    : 'Absent');
                const seconds =
                  record.duration_seconds ??
                  (Number(record.total_hours)
                    ? Number(record.total_hours) * 3600
                    : 0);

                return (
                  <View
                    key={`${record.employee_id}-${
                      record.attendance_record_id ?? index
                    }`}
                    className="w-full gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                    style={{ width: isWide ? '48%' : '100%' }}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-[#012711]">
                          {record.full_name || 'Employee'}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#6B7280]">
                          {record.employee_type || 'Staff'} ·{' '}
                          {record.employee_id}
                        </Text>
                      </View>
                      <Text
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          status === 'Late'
                            ? 'bg-[#F0F7EE] text-[#116C0B]'
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
                      <AttendanceValue
                        label="Shift"
                        value={formatShift(record)}
                      />
                      <AttendanceValue
                        label="Clock in"
                        value={
                          record.check_in ? formatTime(record.check_in) : '--'
                        }
                      />
                      <AttendanceValue
                        label="Clock out"
                        value={
                          record.check_out
                            ? formatTime(record.check_out)
                            : isWorking
                            ? 'Working'
                            : '--'
                        }
                      />
                      <AttendanceValue
                        label="Duration"
                        value={formatDuration(seconds)}
                      />
                    </View>
                    {record.notes ? (
                      <Text className="text-xs text-[#6B7280]">
                        Note: {record.notes}
                      </Text>
                    ) : null}
                    <View className="flex-row flex-wrap gap-2 border-t border-[#F3F4F6] pt-2">
                      <AttendanceIconAction
                        accessibilityLabel={`View attendance history for ${
                          record.full_name || record.employee_id
                        }`}
                        icon="history"
                        onPress={() => loadHistory(record)}
                      />
                      <AttendanceIconAction
                        accessibilityLabel={`Edit attendance for ${
                          record.full_name || record.employee_id
                        }`}
                        icon="edit"
                        onPress={() => openRecordForm(record)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )
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

        <FormModal
          visible={form !== null}
          onClose={() => {
            if (!isSaving) {
              setActivePicker(null);
              setForm(null);
            }
          }}
          title="Edit Attendance"
          subtitle={`${form?.employee_name || 'Staff'} · ${
            form?.employee_id || ''
          }`}
          cancelLabel=""
          isSaving={isSaving}
          errorMessage={formError}
          maxWidth={520}
          maxHeightPercent={94}
          contentContainerStyle={{ gap: 12, padding: 14 }}
          footerExtra={
            <View className="flex-row gap-3">
              <Pressable
                accessibilityLabel="Cancel attendance changes"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => {
                  setActivePicker(null);
                  setForm(null);
                }}
                className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-3"
              >
                <Text className="text-sm font-bold text-[#334155]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Save attendance record"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => void saveRecord()}
                className="min-h-12 flex-1 items-center justify-center rounded-xl bg-[#064E3B] px-4 py-3"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Save Record
                  </Text>
                )}
              </Pressable>
            </View>
          }
        >
          <View className="gap-3">
            <AttendanceFormSection number="1" title="Attendance details">
              <PickerButton
                accessibilityLabel="Select attendance date"
                label="Attendance date"
                value={displayDate(form?.date || '')}
                onPress={() => setActivePicker({ field: 'date', mode: 'date' })}
              />
              <Text className="mt-2 text-xs font-semibold text-[#374151]">
                Status
              </Text>
              <View className="flex-row flex-wrap gap-2">
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
            </AttendanceFormSection>
            <AttendanceFormSection number="2" title="Shift and notes">
              {(['check_in', 'check_out'] as const).map(field => {
                const label = field === 'check_in' ? 'Clock-in' : 'Clock-out';
                const value = form?.[field] || '';
                return (
                  <View key={field} className="mt-2">
                    <Text className="mb-1 text-xs font-semibold text-[#374151]">
                      {label}
                    </Text>
                    <View className="flex-row gap-2">
                      <PickerButton
                        accessibilityLabel={`Select ${label.toLowerCase()} date`}
                        label="Date"
                        value={displayDate(value)}
                        onPress={() => setActivePicker({ field, mode: 'date' })}
                      />
                      <PickerButton
                        accessibilityLabel={`Select ${label.toLowerCase()} time`}
                        label="Time"
                        value={displayTime(value)}
                        onPress={() => setActivePicker({ field, mode: 'time' })}
                      />
                    </View>
                  </View>
                );
              })}
              {activePicker && form ? (
                <View className="mt-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <Text className="mb-2 text-xs font-semibold text-[#374151]">
                    Select {activePicker.mode === 'date' ? 'date' : 'time'}
                  </Text>
                  <DateTimePicker
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    mode={activePicker.mode}
                    onChange={handlePickerChange}
                    value={
                      activePicker.field === 'date'
                        ? parseLocalDateTime(form.date) || new Date()
                        : parseLocalDateTime(form[activePicker.field]) ||
                          parseLocalDateTime(form.date) ||
                          new Date()
                    }
                  />
                  {Platform.OS === 'ios' ? (
                    <Pressable
                      accessibilityLabel="Done selecting date or time"
                      accessibilityRole="button"
                      onPress={() => setActivePicker(null)}
                      className="mt-2 self-end rounded-lg bg-[#116C0B] px-4 py-2"
                    >
                      <Text className="text-xs font-bold text-white">Done</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <Text className="mt-2 text-xs font-semibold text-[#374151]">
                Notes / remarks
              </Text>
              <TextInput
                accessibilityLabel="Attendance notes"
                className="min-h-[80px] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A]"
                multiline
                numberOfLines={3}
                onChangeText={value =>
                  setForm(current =>
                    current ? { ...current, notes: value } : current,
                  )
                }
                placeholder="Optional notes"
                textAlignVertical="top"
                value={form?.notes || ''}
              />
            </AttendanceFormSection>
          </View>
        </FormModal>

        <DetailsModal
          visible={historyEmployee !== null}
          onClose={() => setHistoryEmployee(null)}
          title="Attendance History"
          subtitle={`${historyEmployee?.full_name || 'Staff'} · ${
            historyEmployee?.employee_id || ''
          }`}
          maxWidth={720}
        >
          {isLoadingHistory ? (
            <View className="items-center justify-center p-10">
              <ActivityIndicator color="#116C0B" />
              <Text className="mt-3 text-xs text-[#667085]">
                Loading attendance history...
              </Text>
            </View>
          ) : historyError ? (
            <Text
              accessibilityRole="alert"
              className="p-5 text-center text-sm text-[#B91C1C]"
            >
              {historyError}
            </Text>
          ) : historyRecords.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="overflow-hidden rounded-2xl border border-[#DDE5E1]">
                <View className="flex-row border-b border-[#1F4E42] bg-[#E8F3EE]">
                  <HistoryTableHeader label="Date" width={112} />
                  <HistoryTableHeader label="Clock in" width={108} />
                  <HistoryTableHeader label="Clock out" width={108} />
                  <HistoryTableHeader label="Duration" width={104} />
                  <HistoryTableHeader label="Status" width={102} />
                  <HistoryTableHeader label="Notes" width={136} />
                  <View className="w-12" />
                </View>
                {historyRecords.map((record, index) => {
                  const status = record.attendance_status || 'Present';
                  const statusClass =
                    status === 'Absent' || status === 'On Leave'
                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                      : status === 'Late'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#D1FAE5] text-[#047857]';

                  return (
                    <View
                      key={`${
                        record.attendance_record_id ??
                        record.attendance_id ??
                        index
                      }`}
                      className={`min-h-[54px] flex-row items-center border-b border-[#EEF1F4] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFC]'
                      }`}
                    >
                      <Text className="w-[112px] px-3 text-xs font-bold text-[#172033]">
                        {formatAttendanceDate(record.attendance_date)}
                      </Text>
                      <Text className="w-[108px] px-3 text-xs text-[#475467]">
                        {record.check_in ? formatTime(record.check_in) : '—'}
                      </Text>
                      <Text className="w-[108px] px-3 text-xs text-[#475467]">
                        {record.check_out
                          ? formatTime(record.check_out)
                          : record.check_in
                          ? 'Working'
                          : '—'}
                      </Text>
                      <Text className="w-[104px] px-3 font-mono text-xs text-[#344054]">
                        {formatHistoryDuration(record)}
                      </Text>
                      <View className="w-[102px] px-3">
                        <Text
                          className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}
                        >
                          {status}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        className="w-[136px] px-3 text-xs text-[#667085]"
                      >
                        {record.notes || '—'}
                      </Text>
                      <View className="w-12 items-center">
                        <AttendanceIconAction
                          accessibilityLabel={`Edit attendance for ${
                            historyEmployee?.full_name ||
                            historyEmployee?.employee_id
                          } on ${formatAttendanceDate(record.attendance_date)}`}
                          icon="edit"
                          onPress={() => {
                            setHistoryEmployee(null);
                            openRecordForm(record);
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View className="items-center px-6 py-10">
              <Text className="text-sm font-semibold text-[#344054]">
                No attendance history yet
              </Text>
              <Text className="mt-1 text-center text-xs text-[#667085]">
                Attendance records for this employee will appear here.
              </Text>
            </View>
          )}
        </DetailsModal>
      </View>
    </ScrollView>
  );
}

function AttendanceFormSection({
  children,
  number,
  title,
}: {
  children: ReactNode;
  number: string;
  title: string;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-[#15803D]">
          <Text className="text-[11px] font-extrabold text-white">
            {number}
          </Text>
        </View>
        <Text className="text-sm font-extrabold text-[#0F172A]">{title}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  tint,
  iconBackground,
  icon,
}: {
  label: string;
  value?: string | number;
  tint: string;
  iconBackground: string;
  icon: React.ReactNode;
}) {
  return (
    <AdminStatCard
      label={label}
      value={value ?? '—'}
      tint={tint}
      iconBackground={iconBackground}
      decorColor={iconBackground}
      icon={icon}
    />
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
      <Text
        className={`text-xs font-semibold ${
          selected ? 'text-white' : 'text-[#4B5563]'
        }`}
      >
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

function HistoryTableHeader({
  label,
  width,
}: {
  label: string;
  width: number;
}) {
  return (
    <Text
      className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#1F4E42]"
      style={{ width }}
    >
      {label}
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
      <Text
        className={`text-xs font-semibold ${
          destructive ? 'text-[#B91C1C]' : 'text-[#374151]'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AttendanceIconAction({
  accessibilityLabel,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  icon: 'edit' | 'history';
  onPress: () => void;
}) {
  const label = icon === 'edit' ? 'Edit' : 'History';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        {icon === 'edit' ? (
          <Path
            d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
            stroke="#374151"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : (
          <Path
            d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5m4-1v5l3 2"
            stroke="#374151"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        )}
      </Svg>
      <Text className="text-xs font-semibold text-[#374151]">{label}</Text>
    </Pressable>
  );
}

function PickerButton({
  label,
  accessibilityLabel,
  value,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
        {label}
      </Text>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-11 justify-center rounded-xl border border-[#D1D5DB] bg-white px-3 py-2.5"
      >
        <Text className="text-sm text-[#111827]">{value}</Text>
      </Pressable>
    </View>
  );
}

function formatShift(record: AttendanceRecord) {
  if (!record.start_time) {
    return 'Regular';
  }
  return `${record.start_time.slice(0, 5)} - ${
    record.end_time?.slice(0, 5) || '--'
  }`;
}

export default EmployeeAttendance;
