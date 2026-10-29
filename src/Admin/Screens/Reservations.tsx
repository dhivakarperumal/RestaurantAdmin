import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import colors from '../../theme/colors';
import api from '../../../api';
import AdminStatCard from '../../components/AdminStatCard';
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  UserIcon,
} from '../../components/popups';
import { SearchIcon } from '../Navigation/NavigationIcons';

type ReservationStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Cancelled';

type ReservationApiRecord = {
  reservation_id: string;
  user_id?: string;
  table_id?: string;
  table_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  reservation_date?: string;
  start_time?: string;
  end_time?: string;
  guests?: number;
  notes?: string;
  status?: ReservationStatus;
  created_at?: string;
};

const reservationStatusStyles: Record<
  ReservationStatus,
  {
    className: string;
    style?: { backgroundColor: string; borderColor: string; color: string };
  }
> = {
  Pending: {
    className: 'border',
    style: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.borderLight,
      color: colors.primary,
    },
  },
  Confirmed: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  Declined: { className: 'border-rose-200 bg-rose-50 text-rose-700' },
  Cancelled: { className: 'border-slate-200 bg-slate-100 text-slate-600' },
};

function ReservationsScreen({ onBack }: { onBack: () => void }) {
  const [reservations, setReservations] = useState<ReservationApiRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<
    'All' | ReservationStatus
  >('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/reservations', {
        params: { status: 'All' },
      });
      setReservations(
        Array.isArray(data?.reservations) ? data.reservations : [],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not load reservation data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  const visibleReservations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...reservations]
      .filter(reservation =>
        selectedStatus === 'All' ? true : reservation.status === selectedStatus,
      )
      .filter(
        reservation =>
          !query ||
          [
            reservation.reservation_id,
            reservation.customer_name,
            reservation.customer_email,
            reservation.customer_phone,
            reservation.table_number,
            reservation.table_id,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(query),
      )
      .sort((left, right) => {
        const leftValue = new Date(
          `${left.reservation_date || '1970-01-01'}T${
            left.start_time || '00:00'
          }`,
        ).getTime();
        const rightValue = new Date(
          `${right.reservation_date || '1970-01-01'}T${
            right.start_time || '00:00'
          }`,
        ).getTime();
        return leftValue - rightValue;
      });
  }, [reservations, search, selectedStatus]);

  const pendingCount = reservations.filter(
    item => item.status === 'Pending',
  ).length;
  const confirmedCount = reservations.filter(
    item => item.status === 'Confirmed',
  ).length;
  const todayCount = reservations.filter(
    item => item.reservation_date === new Date().toISOString().slice(0, 10),
  ).length;

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setErrorMessage('');
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      await fetchReservations();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Reservation status could not be updated.';
      setErrorMessage(message);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            void fetchReservations();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerClassName="mx-auto w-full max-w-[1100px] gap-4 px-5 pb-7 pt-5"
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-4">
        <Pressable
          accessibilityLabel="Back to More"
          onPress={onBack}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            ‹ More
          </Text>
        </Pressable>
      </View>

      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        TABLE BOOKING
      </Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
        Reservations
      </Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Review guest requests, confirm table bookings, and manage the dining
        flow.
      </Text>

      {errorMessage ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-xs font-medium text-red-700">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap justify-between gap-y-3">
        <AdminStatCard
          label="Total"
          value={reservations.length}
          tint="#166534"
          iconBackground="#DCFCE7"
          decorColor="#DCFCE7"
          icon={<CalendarIcon size={22} color="#166534" />}
        />
        <AdminStatCard
          label="Pending"
          value={pendingCount}
          tint="#9A3412"
          iconBackground="#FED7AA"
          decorColor="#FED7AA"
          icon={<ClockIcon size={22} color="#9A3412" />}
        />
        <AdminStatCard
          label="Confirmed"
          value={confirmedCount}
          tint="#1D4ED8"
          iconBackground="#BFDBFE"
          decorColor="#BFDBFE"
          icon={<CheckCircle2Icon size={22} color="#1D4ED8" />}
        />
        <AdminStatCard
          label="Today"
          value={todayCount}
          tint="#6D28D9"
          iconBackground="#DDD6FE"
          decorColor="#DDD6FE"
          icon={<UserIcon size={22} color="#6D28D9" />}
        />
      </View>

      <View className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
        <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
          <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
            <SearchIcon color="#9CA3AF" size={17} />
            <TextInput
              accessibilityLabel="Search reservations"
              className="ml-2 flex-1 py-2 text-sm text-[#012711]"
              onChangeText={setSearch}
              placeholder="Search guest, table, or reservation ID..."
              placeholderTextColor={colors.textSecondary}
              value={search}
            />
          </View>
          <View className="flex-row items-end gap-2">
            <View className="relative min-w-[145px] flex-1">
              <Text className="mb-1 text-[10px] font-bold text-[#475569]">
                Status
              </Text>
              <Pressable
                accessibilityLabel={`Status: ${selectedStatus}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: isStatusMenuOpen }}
                onPress={() => setIsStatusMenuOpen(value => !value)}
                className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-3"
              >
                <Text className="text-xs text-[#334155]">
                  {selectedStatus === 'All' ? 'All statuses' : selectedStatus}
                </Text>
                <Text className="text-xs text-[#64748B]">
                  {isStatusMenuOpen ? '⌃' : '⌄'}
                </Text>
              </Pressable>
              {isStatusMenuOpen ? (
                <View
                  className="absolute left-0 right-0 top-[62px] z-10 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
                  style={{ elevation: 8 }}
                >
                  {(
                    [
                      'All',
                      'Pending',
                      'Confirmed',
                      'Declined',
                      'Cancelled',
                    ] as const
                  ).map(status => (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selectedStatus === status,
                      }}
                      onPress={() => {
                        setSelectedStatus(status);
                        setIsStatusMenuOpen(false);
                      }}
                      className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                        selectedStatus === status ? 'bg-[#F0FDF4]' : ''
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          selectedStatus === status
                            ? 'font-bold text-[#116C0B]'
                            : 'text-[#334155]'
                        }`}
                      >
                        {status === 'All' ? 'All statuses' : status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <View className="h-10 flex-row items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
              {(['grid', 'list'] as const).map(mode => {
                const selected = viewMode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityLabel={`Show reservations as ${mode}`}
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
        <Text className="text-xs text-[#64748B]">
          {visibleReservations.length} reservations
        </Text>
      </View>

      <View className="gap-3">
        {isLoading ? (
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <Text className="text-center text-sm text-[#6B7280]">
              Loading reservations...
            </Text>
          </View>
        ) : visibleReservations.length ? (
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
                  <Text className="w-12 text-xs font-bold text-[#64748B]">
                    #
                  </Text>
                  <Text className="flex-1 text-xs font-bold text-[#64748B]">
                    Guest
                  </Text>
                  <Text className="w-32 text-xs font-bold text-[#64748B]">
                    Date / time
                  </Text>
                  <Text className="w-24 text-xs font-bold text-[#64748B]">
                    Table
                  </Text>
                  <Text className="w-28 text-xs font-bold text-[#64748B]">
                    Status
                  </Text>
                  <Text className="w-40 text-xs font-bold text-[#64748B]">
                    Actions
                  </Text>
                </View>
                {visibleReservations.map((reservation, index) => (
                  <View
                    key={reservation.reservation_id}
                    className={`min-h-[58px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'
                    }`}
                  >
                    <Text className="w-12 text-xs text-[#64748B]">
                      {index + 1}
                    </Text>
                    <View className="flex-1 pr-3">
                      <Text
                        numberOfLines={1}
                        className="text-xs font-semibold text-[#334155]"
                      >
                        {reservation.customer_name || 'Guest'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[10px] text-[#64748B]"
                      >
                        {reservation.customer_phone ||
                          reservation.customer_email ||
                          'No contact'}
                      </Text>
                    </View>
                    <Text className="w-32 text-xs text-[#334155]">
                      {reservation.reservation_date || 'Date'} ·{' '}
                      {reservation.start_time || 'Time'}
                    </Text>
                    <Text className="w-24 text-xs text-[#334155]">
                      {reservation.table_number || reservation.table_id || '—'}
                    </Text>
                    <View className="w-28">
                      <ReservationBadge
                        status={reservation.status || 'Pending'}
                      />
                    </View>
                    <View className="w-40 flex-row gap-2">
                      {reservation.status === 'Pending' ? (
                        <>
                          <Pressable
                            onPress={() => {
                              void updateStatus(
                                reservation.reservation_id,
                                'Confirmed',
                              );
                            }}
                            className="rounded-lg bg-[#116C0B] px-2.5 py-2"
                          >
                            <Text className="text-[10px] font-semibold text-white">
                              Confirm
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              void updateStatus(
                                reservation.reservation_id,
                                'Declined',
                              );
                            }}
                            className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-2"
                          >
                            <Text className="text-[10px] font-semibold text-[#B91C1C]">
                              Decline
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {visibleReservations.map(reservation => (
                <View
                  key={reservation.reservation_id}
                  className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-4"
                  style={{ width: isWide ? '48%' : '100%' }}
                >
                  <View className="mb-3 flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-bold text-[#012711]">
                        {reservation.customer_name || 'Guest'}
                      </Text>
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {reservation.table_number ||
                          reservation.table_id ||
                          'Table'}{' '}
                        • {reservation.guests || 1} guests
                      </Text>
                    </View>
                    <ReservationBadge
                      status={reservation.status || 'Pending'}
                    />
                  </View>

                  <View className="gap-1 text-sm text-[#374151]">
                    <Text>
                      {reservation.reservation_date || 'Date'} at{' '}
                      {reservation.start_time || 'Time'}
                    </Text>
                    <Text>
                      {reservation.customer_phone ||
                        reservation.customer_email ||
                        'No contact provided'}
                    </Text>
                    {reservation.notes ? (
                      <Text>{reservation.notes}</Text>
                    ) : null}
                  </View>

                  {reservation.status === 'Pending' ? (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() => {
                          void updateStatus(
                            reservation.reservation_id,
                            'Confirmed',
                          );
                        }}
                        className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-xs font-semibold text-white">
                          Confirm
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          void updateStatus(
                            reservation.reservation_id,
                            'Declined',
                          );
                        }}
                        className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2"
                      >
                        <Text className="text-xs font-semibold text-[#B91C1C]">
                          Decline
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )
        ) : (
          <View className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-6">
            <Text className="text-center text-sm text-[#6B7280]">
              No reservations match this filter.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReservationBadge({ status }: { status: ReservationStatus }) {
  const statusStyle = reservationStatusStyles[status];
  return (
    <View
      className={`self-start rounded-full border px-2.5 py-1 ${statusStyle.className}`}
      style={statusStyle.style}
    >
      <Text
        className="text-[10px] font-bold uppercase"
        style={status === 'Pending' ? { color: colors.primary } : undefined}
      >
        {status}
      </Text>
    </View>
  );
}

export default ReservationsScreen;
