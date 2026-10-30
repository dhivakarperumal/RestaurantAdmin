import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  CustomersIcon,
  ReceiptIcon,
} from '../../Admin/Navigation/NavigationIcons';
import { CalendarIcon, ClockIcon } from '../../components/popups';
import colors from '../../theme/colors';
import ChefListControls from './ChefListControls';
import ChefStatCards from './ChefStatCards';

type AttendanceRecord = Record<string, unknown>;
type StatusFilter = 'All' | 'Present' | 'Late' | 'Working' | 'Completed';
type MonthFilter = 'All' | 'Current' | 'Previous';

type ChefAttendanceScreenProps = {
  attendance: AttendanceRecord | null;
  history: AttendanceRecord[];
  shiftInfo: AttendanceRecord | null;
  isLoading: boolean;
  isBusy: boolean;
  onClockAction: () => void;
};

function valueOf(value: unknown, fallback = '') {
  return value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);
}

function formatTime(value: unknown) {
  if (!value) {
    return '—';
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShiftTime(value: unknown) {
  if (!value) {
    return '—';
  }
  const [hours, minutes] = String(value).split(':');
  if (!hours || !minutes) {
    return String(value);
  }
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function durationInSeconds(record: AttendanceRecord) {
  if (record.duration_seconds !== undefined && record.duration_seconds !== null) {
    return Number(record.duration_seconds) || 0;
  }
  if (record.total_hours !== undefined && record.total_hours !== null) {
    return (Number(record.total_hours) || 0) * 3600;
  }
  if (record.check_in && !record.check_out) {
    const checkInTime = new Date(String(record.check_in)).getTime();
    return Number.isNaN(checkInTime)
      ? 0
      : Math.max(0, Math.floor((Date.now() - checkInTime) / 1000));
  }
  return 0;
}

function dateKey(record: AttendanceRecord) {
  return valueOf(record.date ?? record.attendance_date).slice(0, 10);
}

function dateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { weekday: '—', day: value || '—', monthYear: '' };
  }
  return {
    weekday: date.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
    day: String(date.getDate()),
    monthYear: date
      .toLocaleDateString([], { month: 'short', year: 'numeric' })
      .toUpperCase(),
  };
}

function AttendanceHistorySkeleton({ tableView }: { tableView: boolean }) {
  const renderRow = (index: number) => (
    <View
      key={index}
      className={`flex-row items-center rounded-xl border border-[#E5E7EB] bg-white ${
        tableView
          ? 'mb-2 h-[76px] w-[550px]'
          : 'mb-2 min-h-[76px] w-full gap-2 p-2'
      }`}
    >
      <View
        className={`h-[58px] rounded-lg bg-slate-100 ${
          tableView ? 'mx-[9px] w-[54px] shrink-0' : 'w-[54px]'
        }`}
      />
      <View
        className={
          tableView
            ? 'w-[150px] shrink-0 gap-2 border-l border-[#E5E7EB] px-2'
            : 'w-[82px] gap-2'
        }
      >
        <View className="h-5 w-16 rounded-full bg-slate-100" />
        <View className="h-3 w-20 rounded-md bg-slate-100" />
        <View className="h-3 w-16 rounded-md bg-slate-100" />
      </View>
      <View
        className={`gap-2 border-l border-[#E5E7EB] ${
          tableView
            ? 'w-[218px] shrink-0 px-3'
            : 'min-w-0 flex-1 pl-2'
        }`}
      >
        <View className="h-3 w-20 rounded-md bg-slate-100" />
        <View className="h-3 w-20 rounded-md bg-slate-100" />
      </View>
      <View
        className={`h-[58px] items-center justify-center gap-2 rounded-lg bg-[#F0F8F1] ${
          tableView
            ? 'mx-[10px] w-[90px] shrink-0'
            : 'w-[68px]'
        }`}
      >
        <View className="h-4 w-12 rounded-md bg-slate-100" />
        <View className="h-2 w-14 rounded-md bg-slate-100" />
      </View>
    </View>
  );

  if (!tableView) {
    return (
      <View accessibilityLabel="Loading attendance history">
        {[0, 1, 2, 3].map(renderRow)}
      </View>
    );
  }

  return (
    <View accessibilityLabel="Loading attendance history">
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="w-[550px]">
          <View className="mb-2 h-9 w-[550px] flex-row items-center rounded-lg border border-[#E5E7EB] bg-white">
            {[72, 150, 218, 110].map((width, index) => (
              <View key={index} className="px-2" style={{ width }}>
                <View className="h-2.5 w-3/4 rounded-md bg-slate-200" />
              </View>
            ))}
          </View>
          {[0, 1, 2, 3, 4].map(renderRow)}
        </View>
      </ScrollView>
    </View>
  );
}

function ChefAttendanceScreen({
  attendance,
  history,
  shiftInfo,
  isLoading,
  isBusy,
  onClockAction,
}: ChefAttendanceScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [liveSeconds, setLiveSeconds] = useState(() =>
    durationInSeconds(attendance ?? {}),
  );

  const isWorking = Boolean(attendance?.check_in && !attendance?.check_out);
  const isCompleted = Boolean(attendance?.check_in && attendance?.check_out);
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const totalSeconds = history.reduce(
    (total, record) => total + durationInSeconds(record),
    0,
  );
  const daysPresent = new Set(history.map(dateKey).filter(Boolean)).size;
  const lateCount = history.filter(record => record.status === 'Late').length;
  const onTimeRate = history.length
    ? Math.round(((history.length - lateCount) / history.length) * 100)
    : 100;
  const averageHours = history.length
    ? (totalSeconds / history.length / 3600).toFixed(1)
    : '0.0';

  const filteredHistory = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, '0')}`;
    const previousDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const previousMonth = `${previousDate.getFullYear()}-${String(
      previousDate.getMonth() + 1,
    ).padStart(2, '0')}`;
    const normalizedSearch = search.trim().toLowerCase();

    return history.filter(record => {
      const currentRecordIsWorking = Boolean(
        record.check_in && !record.check_out,
      );
      if (
        normalizedSearch &&
        ![
          dateKey(record),
          valueOf(record.notes),
          valueOf(record.status),
        ].some(item => item.toLowerCase().includes(normalizedSearch))
      ) {
        return false;
      }

      if (
        statusFilter === 'Working' &&
        !currentRecordIsWorking
      ) {
        return false;
      }
      if (
        statusFilter === 'Completed' &&
        !(record.check_in && record.check_out)
      ) {
        return false;
      }
      if (statusFilter === 'Late' && record.status !== 'Late') {
        return false;
      }
      if (
        statusFilter === 'Present' &&
        (!record.check_in || record.status === 'Late')
      ) {
        return false;
      }

      const recordMonth = dateKey(record).slice(0, 7);
      if (monthFilter === 'Current' && recordMonth !== currentMonth) {
        return false;
      }
      if (monthFilter === 'Previous' && recordMonth !== previousMonth) {
        return false;
      }
      return true;
    });
  }, [history, monthFilter, search, statusFilter]);

  const scheduledStart = shiftInfo?.start_time ?? attendance?.start_time;
  const scheduledEnd = shiftInfo?.end_time ?? attendance?.end_time;

  const renderHistoryRow = (
    record: AttendanceRecord,
    index: number,
    tableView: boolean,
  ) => {
    const recordIsWorking = Boolean(record.check_in && !record.check_out);
    const date = dateKey(record);
    const parts = dateParts(date);
    const status = recordIsWorking
      ? 'Working'
      : record.status === 'Late'
        ? 'Late'
        : record.check_in && record.check_out
          ? 'Completed'
          : valueOf(record.status, 'Present');
    const statusClass =
      status === 'Working'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'Late'
          ? 'bg-rose-100 text-rose-800'
          : status === 'Present'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-slate-100 text-slate-700';
    const duration = formatDuration(
      recordIsWorking && date === today
        ? liveSeconds
        : durationInSeconds(record),
    );

    return (
      <View
        key={valueOf(record.id ?? record.attendance_id, `${date}-${index}`)}
        className={`${
          tableView
            ? 'mb-2 h-[76px] w-[550px] flex-row items-center rounded-xl border border-[#E5E7EB] bg-white'
            : 'mb-2 min-h-[76px] w-full flex-row items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-2'
        }`}
      >
        <View
          className={
            tableView
              ? 'w-[72px] shrink-0 items-center px-2'
              : 'w-[54px] shrink-0'
          }
        >
          <View className="h-[58px] w-full items-center justify-center rounded-lg bg-[#F7FAFC]">
            <Text className="text-[8px] font-bold text-[#64748B]">
              {parts.weekday}
            </Text>
            <Text className="text-xl font-extrabold leading-6 text-[#1F2937]">
              {parts.day}
            </Text>
            <Text className="text-[7px] font-semibold text-[#64748B]">
              {parts.monthYear}
            </Text>
            {date === today ? (
              <Text className="mt-0.5 rounded-full bg-emerald-100 px-1.5 text-[7px] font-bold text-emerald-800">
                Today
              </Text>
            ) : null}
          </View>
        </View>

        <View
          className={`justify-center ${
            tableView
              ? 'w-[150px] shrink-0 border-l border-[#E5E7EB] px-2'
              : 'w-[82px] shrink-0'
          }`}
        >
          <Text
            numberOfLines={1}
            className={`self-start rounded-full px-2 py-1 text-[8px] font-extrabold ${statusClass}`}
          >
            {status}
          </Text>
          <Text className="mt-1 text-[8px] text-[#64748B]">Shift Time</Text>
          <Text numberOfLines={1} className="text-[9px] font-semibold text-[#334155]">
            {record.start_time
              ? `${formatShiftTime(record.start_time)} – ${formatShiftTime(record.end_time)}`
              : '—'}
          </Text>
          {record.notes ? (
            <Text numberOfLines={1} className="mt-0.5 text-[7px] text-[#64748B]">
              {valueOf(record.notes)}
            </Text>
          ) : null}
        </View>

        <View
          className={`justify-center border-l border-[#E5E7EB] pl-2 ${
            tableView
              ? 'w-[218px] shrink-0 px-3'
              : 'min-w-0 flex-1'
          }`}
        >
          <View className="flex-row items-center gap-1.5">
            <ClockIcon color="#16804A" size={12} />
            <View className="min-w-0 flex-1">
              <Text className="text-[8px] text-[#64748B]">Check in</Text>
              <Text numberOfLines={1} className="text-[9px] font-semibold text-[#334155]">
                {formatTime(record.check_in)}
              </Text>
            </View>
          </View>
          <View className="mt-1 flex-row items-center gap-1.5">
            <ClockIcon color="#D97706" size={12} />
            <View className="min-w-0 flex-1">
              <Text className="text-[8px] text-[#64748B]">Check out</Text>
              <Text numberOfLines={1} className="text-[9px] font-semibold text-[#334155]">
                {recordIsWorking ? '—' : formatTime(record.check_out)}
              </Text>
            </View>
          </View>
        </View>

        <View
          className={`items-center justify-center rounded-lg bg-[#F0F8F1] ${
            tableView
              ? 'mx-[10px] h-[58px] w-[90px] shrink-0'
              : 'h-[58px] w-[68px] shrink-0'
          }`}
        >
          <View className="flex-row items-center gap-1">
            <ClockIcon
              color={recordIsWorking ? '#16804A' : '#64748B'}
              size={13}
            />
            <Text className="text-[10px] font-extrabold text-[#17633D]">
              {duration}
            </Text>
          </View>
          <Text className="mt-1 text-[7px] font-semibold text-[#64748B]">
            {recordIsWorking ? 'Working time' : 'Total time'}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (!attendance?.check_in || attendance.check_out) {
      setLiveSeconds(durationInSeconds(attendance ?? {}));
      return;
    }

    const updateLiveDuration = () => {
      const checkInTime = new Date(String(attendance.check_in)).getTime();
      setLiveSeconds(
        Number.isNaN(checkInTime)
          ? 0
          : Math.max(0, Math.floor((Date.now() - checkInTime) / 1000)),
      );
    };
    updateLiveDuration();
    const interval = setInterval(updateLiveDuration, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  return (
    <View className="gap-5">
      <View>
        <Text className="text-[23px] font-extrabold text-[#012711]">
          Chef Attendance & Shift Log
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-[#6B7280]">
          Mark your daily check-in, track working hours, and review your shift history.
        </Text>
      </View>

      <View className="overflow-hidden rounded-2xl border border-[#D1E9D5] bg-white p-4">
        <View className="mb-4 h-1 self-stretch rounded-full bg-[#116C0B]" />
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#116C0B]">
          {todayLabel}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <Text className="text-lg font-extrabold text-[#012711]">
            {isWorking
              ? 'You are on duty'
              : isCompleted
                ? 'Shift completed for today'
                : 'Shift not yet started'}
          </Text>
          <Text
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isWorking
                ? 'bg-emerald-100 text-emerald-800'
                : isCompleted
                  ? 'bg-blue-100 text-blue-800'
                  : ''
            }`}
            style={
              !isWorking && !isCompleted
                ? {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.primary,
                  }
                : undefined
            }
          >
            {isWorking ? 'ACTIVE DUTY' : isCompleted ? 'COMPLETED' : 'NOT STARTED'}
          </Text>
          {attendance?.status ? (
            <Text className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#4B5563]">
              {valueOf(attendance.status)}
            </Text>
          ) : null}
        </View>
        <Text className="mt-2 text-xs leading-[18px] text-[#6B7280]">
          {isWorking
            ? `Clocked in at ${formatTime(attendance?.check_in)}. Your work time is being recorded.`
            : isCompleted
              ? `Worked from ${formatTime(attendance?.check_in)} to ${formatTime(attendance?.check_out)} (${valueOf(attendance?.total_hours, '0')} hrs).`
              : scheduledStart
                ? `Your scheduled shift is ${formatShiftTime(scheduledStart)} – ${formatShiftTime(scheduledEnd)}. Clock in to start your shift.`
                : 'Clock in to start recording your shift.'}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="min-w-[45%] flex-1 rounded-xl bg-[#F9FAFB] p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Clock in
            </Text>
            <Text className="mt-1 text-sm font-bold text-[#012711]">
              {formatTime(attendance?.check_in)}
            </Text>
          </View>
          <View className="min-w-[45%] flex-1 rounded-xl bg-[#F9FAFB] p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Clock out
            </Text>
            <Text className="mt-1 text-sm font-bold text-[#012711]">
              {formatTime(attendance?.check_out)}
            </Text>
          </View>
          {isWorking ? (
            <View className="min-w-[45%] flex-1 rounded-xl bg-emerald-50 p-3">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Active duration
              </Text>
              <Text className="mt-1 text-sm font-extrabold text-[#012711]">
                {formatDuration(liveSeconds)}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onClockAction}
          className={`mt-4 min-h-[48px] items-center justify-center rounded-xl px-4 ${
            isWorking ? 'bg-rose-600' : 'bg-[#116C0B]'
          } ${isBusy ? 'opacity-60' : 'opacity-100'}`}
        >
          <Text className="text-sm font-bold text-white">
            {isBusy
              ? 'Updating attendance...'
              : isWorking
                ? 'Clock Out'
                : isCompleted
                  ? 'Resume Shift'
                  : 'Clock In Now'}
          </Text>
        </Pressable>
      </View>

      <ChefStatCards
        stats={[
          {
            label: 'Days present',
            value: daysPresent,
            hint: 'Recorded shifts',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Total hours',
            value: `${(totalSeconds / 3600).toFixed(1)} hrs`,
            hint: 'Logged on duty',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Average shift',
            value: `${averageHours} hrs`,
            hint: 'Per recorded shift',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'On-time rate',
            value: `${onTimeRate}%`,
            hint: 'Attendance punctuality',
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Late arrivals',
            value: lateCount,
            hint: 'Past scheduled shift',
            icon: <ReceiptIcon color="#F6D36A" size={22} />,
          },
          {
            label: 'Shift status',
            value: isWorking ? 'Active' : isCompleted ? 'Done' : 'Not started',
            hint: todayLabel,
            icon: <CustomersIcon color="#F6D36A" size={22} />,
          },
        ]}
      />

      <View>
        <View className="mb-3">
          <Text className="text-[17px] font-bold text-[#012711]">
            My Attendance History
          </Text>
          <Text className="mt-1 text-xs text-[#6B7280]">
            {isLoading
              ? 'Loading attendance history...'
              : `Showing ${filteredHistory.length} of ${history.length} shifts`}
          </Text>
        </View>

        <ChefListControls
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { value: 'All', label: 'All statuses' },
                { value: 'Present', label: 'Present' },
                { value: 'Late', label: 'Late' },
                { value: 'Working', label: 'Active duty' },
                { value: 'Completed', label: 'Completed' },
              ],
              onChange: value => {
                const next = [
                  'All',
                  'Present',
                  'Late',
                  'Working',
                  'Completed',
                ].find(option => option === value);
                if (next) setStatusFilter(next as StatusFilter);
              },
            },
            {
              label: 'Month',
              value: monthFilter,
              options: [
                { value: 'All', label: 'All months' },
                { value: 'Current', label: 'Current month' },
                { value: 'Previous', label: 'Previous month' },
              ],
              onChange: value => {
                const next = ['All', 'Current', 'Previous'].find(
                  option => option === value,
                );
                if (next) setMonthFilter(next as MonthFilter);
              },
            },
          ]}
          onSearchChange={setSearch}
          onViewModeChange={setViewMode}
          placeholder="Search date, status, or note..."
          search={search}
          searchLabel="Search attendance history"
          viewMode={viewMode}
        />

        {isLoading ? (
          <View className="mt-3">
            <AttendanceHistorySkeleton tableView={viewMode === 'table'} />
          </View>
        ) : filteredHistory.length ? (
          viewMode === 'table' ? (
            <View className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2">
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View className="w-[550px]">
                  <View className="mb-2 h-9 w-[550px] flex-row items-center rounded-lg border border-[#E5E7EB] bg-white">
                    <View className="w-[72px] flex-row items-center justify-center gap-1">
                      <CalendarIcon color="#64748B" size={12} />
                      <Text className="text-[8px] font-bold uppercase text-[#64748B]">
                        Date
                      </Text>
                    </View>
                    <Text className="w-[150px] border-l border-[#E5E7EB] px-2 text-[8px] font-bold uppercase text-[#64748B]">
                      Status / Shift
                    </Text>
                    <Text className="w-[218px] border-l border-[#E5E7EB] px-3 text-[8px] font-bold uppercase text-[#64748B]">
                      Clock times
                    </Text>
                    <Text className="w-[110px] text-center text-[8px] font-bold uppercase text-[#64748B]">
                      Total
                    </Text>
                  </View>
                  {filteredHistory.map((record, index) =>
                    renderHistoryRow(record, index, true),
                  )}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View
              accessibilityLabel="Attendance history"
              className="mt-3"
            >
              {filteredHistory.map((record, index) =>
                renderHistoryRow(record, index, false),
              )}
            </View>
          )
        ) : (
          <View className="mt-3 items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-8">
            <Text className="text-sm font-semibold text-[#374151]">
              {history.length
                ? 'No attendance records match these filters.'
                : 'No attendance history yet.'}
            </Text>
            <Text className="mt-1 text-center text-xs leading-5 text-[#6B7280]">
              {history.length
                ? 'Try another search or filter.'
                : 'Clock in today to create your first attendance record.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default ChefAttendanceScreen;
