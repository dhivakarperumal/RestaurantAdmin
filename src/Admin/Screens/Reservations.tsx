import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import api from '../../../api';

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

const reservationStatusStyles: Record<ReservationStatus, string> = {
  Pending: 'border-green-200 bg-green-50 text-green-700',
  Confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Declined: 'border-rose-200 bg-rose-50 text-rose-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

function ReservationsScreen({ onBack }: { onBack: () => void }) {
  const [reservations, setReservations] = useState<ReservationApiRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | ReservationStatus>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/reservations', {
        params: { status: selectedStatus === 'All' ? 'All' : selectedStatus },
      });
      setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not load reservation data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  const visibleReservations = useMemo(() => {
    return [...reservations]
      .filter(reservation =>
        selectedStatus === 'All' ? true : reservation.status === selectedStatus,
      )
      .sort((left, right) => {
        const leftValue = new Date(`${left.reservation_date || '1970-01-01'}T${left.start_time || '00:00'}`).getTime();
        const rightValue = new Date(`${right.reservation_date || '1970-01-01'}T${right.start_time || '00:00'}`).getTime();
        return leftValue - rightValue;
      });
  }, [reservations, selectedStatus]);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setErrorMessage('');
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      await fetchReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reservation status could not be updated.';
      setErrorMessage(message);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { void fetchReservations(); }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerClassName="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-5"
    >
      <View className="mb-4">
        <Pressable
          accessibilityLabel="Back to More"
          onPress={onBack}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
        >
          <Text className="text-sm font-semibold text-[#116C0B]">‹ More</Text>
        </Pressable>
      </View>

      <Text className="text-[10px] font-bold tracking-[1.2px] text-[#6B7280]">
        TABLE BOOKING
      </Text>
      <Text className="mt-[5px] text-2xl font-bold text-[#012711]">
        Reservations
      </Text>
      <Text className="mt-1 text-sm leading-[21px] text-[#6B7280]">
        Review guest requests, confirm table bookings, and manage the dining flow.
      </Text>

      {errorMessage ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-xs font-medium text-red-700">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row flex-wrap gap-2">
        {(['All', 'Pending', 'Confirmed', 'Declined', 'Cancelled'] as const).map(status => (
          <Pressable
            key={status}
            accessibilityRole="button"
            onPress={() => setSelectedStatus(status)}
            className={`rounded-full border px-3 py-1.5 ${
              selectedStatus === status
                ? 'border-[#116C0B] bg-[#E8F5E9] text-[#116C0B]'
                : 'border-[#E5E7EB] bg-white text-[#374151]'
            }`}
          >
            <Text className="text-xs font-semibold">{status}</Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-5 gap-3">
        {isLoading ? (
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <Text className="text-center text-sm text-[#6B7280]">Loading reservations...</Text>
          </View>
        ) : visibleReservations.length ? (
          visibleReservations.map(reservation => (
            <View
              key={reservation.reservation_id}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
            >
              <View className="mb-3 flex-row items-start justify-between gap-3">
                <View>
                  <Text className="text-base font-bold text-[#012711]">
                    {reservation.customer_name || 'Guest'}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7280]">
                    {reservation.table_number || reservation.table_id || 'Table'} • {reservation.guests || 1} guests
                  </Text>
                </View>
                <View
                  className={`rounded-full border px-2.5 py-1 ${reservationStatusStyles[reservation.status || 'Pending']}`}
                >
                  <Text className="text-[10px] font-bold uppercase">
                    {reservation.status || 'Pending'}
                  </Text>
                </View>
              </View>

              <View className="gap-1 text-sm text-[#374151]">
                <Text>
                  {reservation.reservation_date || 'Date'} at {reservation.start_time || 'Time'}
                </Text>
                <Text>{reservation.customer_phone || reservation.customer_email || 'No contact provided'}</Text>
                {reservation.notes ? <Text>{reservation.notes}</Text> : null}
              </View>

              {reservation.status === 'Pending' ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => { void updateStatus(reservation.reservation_id, 'Confirmed'); }}
                    className="rounded-lg bg-[#116C0B] px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-white">Confirm</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { void updateStatus(reservation.reservation_id, 'Declined'); }}
                    className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-[#B91C1C]">Decline</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
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

export default ReservationsScreen;
