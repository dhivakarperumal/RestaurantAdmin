import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import api from '../../../api';
import type { AdminTableRecord } from '../Navigation/DashboardTypes';
import TableMergeModal from './TableMergeModal';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTables(payload: unknown): AdminTableRecord[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as AdminTableRecord[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.server_tables)) {
      return current.server_tables.filter(isRecord) as AdminTableRecord[];
    }
    if (Array.isArray(current.tables)) {
      return current.tables.filter(isRecord) as AdminTableRecord[];
    }
    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }
  return [];
}

export default function TableMergeScreen({
  onBack,
  onMerged,
  primaryTableId,
}: {
  onBack: () => void;
  onMerged: () => void;
  primaryTableId?: string;
}) {
  const [tables, setTables] = useState<AdminTableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setErrorMessage('');

    api
      .get('/server-tables', { signal: controller.signal })
      .then(response => {
        if (isRecord(response.data) && response.data.success === false) {
          throw new Error(
            typeof response.data.message === 'string'
              ? response.data.message
              : 'Unable to load restaurant tables.',
          );
        }
        if (active) {
          setTables(readTables(response.data));
        }
      })
      .catch(error => {
        if (!active || controller.signal.aborted) {
          return;
        }
        setErrorMessage(
          isRecord(error) && typeof error.message === 'string'
            ? error.message
            : 'Unable to load restaurant tables.',
        );
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
  }, [retry]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#116C0B" />
        <Text className="text-sm text-[#64748B]">Loading tables...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-5">
        <Text
          accessibilityRole="alert"
          className="text-center text-sm text-[#DC2626]"
        >
          {errorMessage}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRetry(value => value + 1)}
          className="rounded-xl bg-[#116C0B] px-4 py-2.5"
        >
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <TableMergeModal
      visible
      tables={tables}
      primaryTableId={primaryTableId}
      onClose={onBack}
      onMerged={onMerged}
    />
  );
}
