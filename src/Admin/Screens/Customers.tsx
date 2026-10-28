import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../api';
import { CustomersIcon } from '../Navigation/NavigationIcons';
import colors from '../../theme/colors';

type Customer = {
  id?: string | number;
  user_id?: string | number;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string | number;
  phone_number?: string | number;
  mobile_number?: string | number;
  role?: string;
  status?: string;
  created_at?: string;
};

type CustomersProps = {
  onBack: () => void;
  showBackButton?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCustomers(payload: unknown): Customer[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current.filter(isRecord) as Customer[];
    }
    if (!isRecord(current)) {
      return [];
    }
    if (Array.isArray(current.users)) {
      return current.users.filter(isRecord) as Customer[];
    }
    if (!('data' in current)) {
      return [];
    }
    current = current.data;
  }
  return [];
}

function getErrorMessage(error: unknown) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : 'Unable to load customers. Please try again.';
}

function getCustomerName(customer: Customer) {
  return (
    customer.full_name?.trim() ||
    customer.name?.trim() ||
    customer.username?.trim() ||
    'Unnamed customer'
  );
}

function getCustomerRole(customer: Customer) {
  return customer.role?.trim().toLocaleLowerCase() || '';
}

function getCustomerPhone(customer: Customer) {
  return (
    customer.phone_number ??
    customer.mobile_number ??
    customer.phone ??
    ''
  );
}

function Customers({ onBack, showBackButton = true }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setErrorMessage('');

    api
      .get('/users', { signal: controller.signal })
      .then(response => {
        if (active) {
          setCustomers(readCustomers(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setErrorMessage(getErrorMessage(error));
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
  }, [refreshKey]);

  const customerRows = useMemo(
    () =>
      customers.filter(customer => {
        const role = getCustomerRole(customer);
        return !role || role === 'user' || role === 'customer';
      }),
    [customers],
  );

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return customerRows.filter(customer => {
      return (
        !query ||
        `${getCustomerName(customer)} ${customer.email ?? ''} ${getCustomerPhone(customer)}`
          .toLocaleLowerCase()
          .includes(query)
      );
    });
  }, [customerRows, search]);

  return (
    <View className="flex-1 bg-[#F8FAF8]">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => setRefreshKey(current => current + 1)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerClassName="mx-auto w-full max-w-[1000px] gap-4 px-[18px] pb-7 pt-[18px]"
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          {showBackButton ? (
            <Pressable
              accessibilityLabel="Back to More"
              accessibilityRole="button"
              onPress={onBack}
              className="self-start rounded-lg py-1"
            >
              <Text className="text-sm font-semibold text-[#116C0B]">
                ‹ Back to More
              </Text>
            </Pressable>
          ) : null}
          <Text className="mt-3 text-2xl font-extrabold text-[#012711]">
            Customers
          </Text>
          <Text className="mt-1 text-sm text-[#6B7280]">
            {customerRows.length}{' '}
            {customerRows.length === 1 ? 'customer' : 'customers'}
          </Text>
        </View>

        <TextInput
          accessibilityLabel="Search customers"
          className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#012711]"
          onChangeText={setSearch}
          placeholder="Search name, email, or phone"
          placeholderTextColor={colors.textSecondary}
          value={search}
        />

        {isLoading ? (
          <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-[#6B7280]">Loading customers...</Text>
          </View>
        ) : errorMessage ? (
          <View className="items-center gap-3 rounded-2xl border border-[#FECACA] bg-white p-6">
            <Text
              accessibilityRole="alert"
              className="text-center text-sm text-[#DC2626]"
            >
              {errorMessage}
            </Text>
            <Pressable
              accessibilityLabel="Retry loading customers"
              accessibilityRole="button"
              onPress={() => setRefreshKey(current => current + 1)}
              className="rounded-xl bg-[#116C0B] px-4 py-2.5"
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : visibleCustomers.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-8">
            <CustomersIcon color={colors.textSecondary} size={30} />
            <Text className="text-base font-bold text-[#012711]">
              {search.trim() ? 'No matching customers' : 'No customers yet'}
            </Text>
            <Text className="text-center text-sm text-[#6B7280]">
              {search.trim()
                ? 'Try another search.'
                : 'Customers returned by the API will appear here.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {visibleCustomers.map((customer, index) => {
              const phone = getCustomerPhone(customer);
              const status = customer.status?.trim();
              return (
                <View
                  key={String(
                    customer.user_id ??
                      customer.id ??
                      customer.email ??
                      `${getCustomerName(customer)}-${index}`,
                  )}
                  className="flex-row items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F0F7EE]">
                    <CustomersIcon color={colors.primary} size={22} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-[#012711]">
                      {getCustomerName(customer)}
                    </Text>
                    {customer.email ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {customer.email}
                      </Text>
                    ) : null}
                    {phone ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {phone}
                      </Text>
                    ) : null}
                  </View>
                  {status ? (
                    <Text className="rounded-full bg-[#F0F7EE] px-2.5 py-1 text-[10px] font-semibold text-[#116C0B]">
                      {status}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default Customers;
