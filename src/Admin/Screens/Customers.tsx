import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import api from '../../../api';
import AdminStatCard from '../../components/AdminStatCard';
import { CheckCircle2Icon } from '../../components/popups';
import { CustomersIcon, SearchIcon } from '../Navigation/NavigationIcons';
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
    customer.phone_number ?? customer.mobile_number ?? customer.phone ?? ''
  );
}

function Customers({ onBack, showBackButton = true }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active' | 'Inactive'
  >('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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
      const active = customer.status?.trim().toLowerCase() !== 'inactive';
      return (
        (statusFilter === 'All' ||
          (statusFilter === 'Active' ? active : !active)) &&
        (!query ||
          `${getCustomerName(customer)} ${
            customer.email ?? ''
          } ${getCustomerPhone(customer)}`
            .toLocaleLowerCase()
            .includes(query))
      );
    });
  }, [customerRows, search, statusFilter]);

  const activeCount = customerRows.filter(
    customer => customer.status?.trim().toLowerCase() !== 'inactive',
  ).length;
  const inactiveCount = customerRows.length - activeCount;
  const contactCount = customerRows.filter(customer =>
    Boolean(customer.email || getCustomerPhone(customer)),
  ).length;

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
            Customer Management
          </Text>
          <Text className="mt-1 text-sm text-[#6B7280]">
            Manage customer profiles and contact details.
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          <AdminStatCard
            label="Total customers"
            value={customerRows.length}
            tint="#166534"
            iconBackground="#DCFCE7"
            decorColor="#DCFCE7"
            icon={<CustomersIcon color="#166534" size={22} />}
          />
          <AdminStatCard
            label="Active"
            value={activeCount}
            tint="#1D4ED8"
            iconBackground="#BFDBFE"
            decorColor="#BFDBFE"
            icon={<CheckCircle2Icon color="#1D4ED8" size={22} />}
          />
          <AdminStatCard
            label="Inactive"
            value={inactiveCount}
            tint="#9A3412"
            iconBackground="#FED7AA"
            decorColor="#FED7AA"
            icon={<CustomersIcon color="#9A3412" size={22} />}
          />
          <AdminStatCard
            label="With contact"
            value={contactCount}
            tint="#6D28D9"
            iconBackground="#DDD6FE"
            decorColor="#DDD6FE"
            icon={<CustomersIcon color="#6D28D9" size={22} />}
          />
        </View>

        <View
          className="gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
          style={{
            zIndex: isStatusMenuOpen ? 10 : 1,
            elevation: isStatusMenuOpen ? 10 : 0,
          }}
        >
          <View className={isWide ? 'flex-row items-end gap-3' : 'gap-3'}>
            <View className="min-h-11 flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3">
              <SearchIcon color="#9CA3AF" size={17} />
              <TextInput
                accessibilityLabel="Search customers"
                className="ml-2 flex-1 py-2 text-sm text-[#012711]"
                onChangeText={setSearch}
                placeholder="Search by name, email, or phone..."
                placeholderTextColor={colors.textSecondary}
                value={search}
              />
            </View>
            <View className="flex-row items-end gap-2">
              <View
                className="relative min-w-[140px] flex-1"
                style={{ zIndex: isStatusMenuOpen ? 20 : 1 }}
              >
                <Text className="mb-1 text-[10px] font-bold text-[#475569]">
                  Status
                </Text>
                <Pressable
                  accessibilityLabel={`Status: ${statusFilter}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isStatusMenuOpen }}
                  onPress={() => setIsStatusMenuOpen(open => !open)}
                  className="min-h-10 flex-row items-center justify-between rounded-lg border border-[#CBD5E1] bg-white px-3"
                >
                  <Text className="text-xs text-[#334155]">
                    {statusFilter === 'All' ? 'All statuses' : statusFilter}
                  </Text>
                  <Text className="text-xs text-[#64748B]">
                    {isStatusMenuOpen ? '⌃' : '⌄'}
                  </Text>
                </Pressable>
                {isStatusMenuOpen ? (
                  <View
                    className="absolute left-0 right-0 top-[62px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
                    style={{ zIndex: 30, elevation: 30 }}
                  >
                    {(['All', 'Active', 'Inactive'] as const).map(status => (
                      <Pressable
                        key={status}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: statusFilter === status,
                        }}
                        onPress={() => {
                          setStatusFilter(status);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`min-h-10 justify-center border-b border-[#F1F5F9] px-3 ${
                          statusFilter === status ? 'bg-[#F0FDF4]' : ''
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            statusFilter === status
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
                      accessibilityLabel={`Show customers as ${mode}`}
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
            {visibleCustomers.length} customers
          </Text>
        </View>

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
        ) : viewMode === 'list' ? (
          <ScrollView
            horizontal={!isWide}
            showsHorizontalScrollIndicator={!isWide}
          >
            <View
              className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
              style={{ width: isWide ? '100%' : 680 }}
            >
              <View className="flex-row items-center bg-[#EAF5EE] px-4 py-3">
                <Text className="flex-1 text-xs font-bold text-[#64748B]">
                  Customer
                </Text>
                <Text className="w-52 text-xs font-bold text-[#64748B]">
                  Email
                </Text>
                <Text className="w-36 text-xs font-bold text-[#64748B]">
                  Phone
                </Text>
                <Text className="w-24 text-xs font-bold text-[#64748B]">
                  Status
                </Text>
              </View>
              {visibleCustomers.map((customer, index) => {
                const phone = getCustomerPhone(customer);
                const active =
                  customer.status?.trim().toLowerCase() !== 'inactive';
                return (
                  <View
                    key={String(
                      customer.user_id ??
                        customer.id ??
                        customer.email ??
                        `${getCustomerName(customer)}-${index}`,
                    )}
                    className={`min-h-[58px] flex-row items-center border-t border-[#E8F1EB] px-4 py-2 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFA]'
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className="flex-1 pr-3 text-xs font-semibold text-[#334155]"
                    >
                      {getCustomerName(customer)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="w-52 pr-2 text-xs text-[#64748B]"
                    >
                      {customer.email || '—'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="w-36 pr-2 text-xs text-[#64748B]"
                    >
                      {phone || '—'}
                    </Text>
                    <Text
                      className={`w-24 text-xs font-semibold ${
                        active ? 'text-[#166534]' : 'text-[#64748B]'
                      }`}
                    >
                      {customer.status || (active ? 'Active' : 'Inactive')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {visibleCustomers.map((customer, index) => {
              const phone = getCustomerPhone(customer);
              const status = customer.status?.trim();
              const active = status?.toLowerCase() !== 'inactive';
              return (
                <View
                  key={String(
                    customer.user_id ??
                      customer.id ??
                      customer.email ??
                      `${getCustomerName(customer)}-${index}`,
                  )}
                  className="w-full gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                  style={{ width: isWide ? '48%' : '100%' }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#F0F7EE]">
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
                    <Text
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        active
                          ? 'bg-[#F0FDF4] text-[#15803D]'
                          : 'bg-[#F3F4F6] text-[#64748B]'
                      }`}
                    >
                      {status || (active ? 'Active' : 'Inactive')}
                    </Text>
                  </View>
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
