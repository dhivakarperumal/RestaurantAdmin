import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../../api';
import colors from '../../theme/colors';
import { MenuIcon, PlusIcon } from '../Navigation/NavigationIcons';
import { BaseModal } from '../../components/popups';
import MoreInnerHeader from '../Navigation/MoreInnerHeader';
import type { NewOrderType } from '../Navigation/DashboardTypes';

type RecordValue = Record<string, unknown>;

type FoodAddon = {
  id: string;
  name: string;
  price: number;
};

type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

type FoodCustomization = {
  id: string;
  name: string;
  selectionType: 'Single' | 'Multiple';
  required: boolean;
  options: CustomizationOption[];
};

type MenuFood = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  image?: string;
  raw: RecordValue;
  addons: FoodAddon[];
  customizations: FoodCustomization[];
};

type CartLine = {
  key: string;
  food: MenuFood;
  quantity: number;
  addonIds: string[];
  customizations: Record<string, string[]>;
};

type TableRecord = {
  id?: string | number;
  table_id?: string | number;
  table_number?: string | number;
  no_of_seats?: number | string;
  status?: string;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRows(value: unknown): RecordValue[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function readRows(payload: unknown, keys: string[], depth = 0): RecordValue[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  for (const key of keys) {
    if (key in payload) {
      const rows = readRows(payload[key], keys, depth + 1);
      if (rows.length || Array.isArray(payload[key])) {
        return rows;
      }
    }
  }
  return [];
}

function readTables(payload: unknown): TableRecord[] {
  return readRows(payload, ['server_tables', 'tables', 'data']).map(row => ({
    id:
      typeof row.id === 'string' || typeof row.id === 'number'
        ? row.id
        : undefined,
    table_id:
      typeof row.table_id === 'string' || typeof row.table_id === 'number'
        ? row.table_id
        : undefined,
    table_number:
      typeof row.table_number === 'string' ||
      typeof row.table_number === 'number'
        ? row.table_number
        : undefined,
    no_of_seats:
      typeof row.no_of_seats === 'string' || typeof row.no_of_seats === 'number'
        ? row.no_of_seats
        : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
  }));
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim() || fallback
    : fallback;
}

function amount(value: unknown, fallback = 0) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return fallback;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function nullableAmount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function imageUri(value: unknown) {
  const image = Array.isArray(value)
    ? value.find(item => typeof item === 'string')
    : value;
  if (typeof image !== 'string' || !image.trim()) {
    return undefined;
  }
  const uri = image.trim();
  if (/^(https?:|data:image\/|file:|content:)/i.test(uri)) {
    return uri;
  }
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${apiRoot}/${uri.replace(/^\/+/, '')}`;
}

function flag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    if (/^(false|0|no|inactive)$/i.test(value.trim())) return false;
    if (/^(true|1|yes|active)$/i.test(value.trim())) return true;
  }
  return fallback;
}

function readFoods(payload: unknown): MenuFood[] {
  return readRows(payload, ['foods', 'products', 'items', 'data']).flatMap(
    (row, index) => {
      const id = text(row.food_id ?? row.product_id ?? row.id);
      const name = text(
        row.food_name ?? row.product_name ?? row.name,
        `Food ${index + 1}`,
      );
      if (!id) {
        return [];
      }
      const addons = asRows(row.addons)
        .filter(
          addon => text(addon.status, 'Active').toLowerCase() !== 'inactive',
        )
        .map((addon, addonIndex) => ({
          id: text(addon.addon_id ?? addon.id, `addon-${addonIndex}`),
          name: text(addon.addon_name ?? addon.name),
          price: amount(addon.price),
        }))
        .filter(addon => addon.name);
      const customizations = asRows(row.customizations).map(
        (customization, groupIndex) => ({
          id: text(customization.id, `customization-${groupIndex}`),
          name: text(customization.name, `Customization ${groupIndex + 1}`),
          selectionType:
            text(customization.selection_type).toLowerCase() === 'multiple'
              ? ('Multiple' as const)
              : ('Single' as const),
          required: flag(customization.required, false),
          options: asRows(customization.options).map((option, optionIndex) => ({
            id: text(option.id, `option-${groupIndex}-${optionIndex}`),
            name: text(option.name, `Option ${optionIndex + 1}`),
            price: amount(option.price),
          })),
        }),
      );
      const rawPrice =
        row.final_price ??
        row.finalPrice ??
        row.selling_price ??
        row.sellingPrice ??
        row.price ??
        row.food_price ??
        row.unit_price ??
        row.mrp;
      return [
        {
          id,
          name,
          category: text(row.category_name ?? row.category, 'Food'),
          price: nullableAmount(rawPrice),
          image: imageUri(
            row.food_images ?? row.food_image ?? row.image_url ?? row.image,
          ),
          raw: row,
          addons,
          customizations,
        },
      ];
    },
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return isRecord(error) && typeof error.message === 'string'
    ? error.message
    : fallback;
}

function tableStatus(table: TableRecord) {
  const status = text(table.status, 'Available').toLowerCase();
  if (status.includes('reserv')) return 'Reserved';
  if (status.includes('occup')) return 'Occupied';
  if (status.includes('avail')) return 'Available';
  return text(table.status, 'Available');
}

function containsActiveBill(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  if ('bill' in payload) {
    return containsActiveBill(payload.bill);
  }
  if ('data' in payload && isRecord(payload.data)) {
    return containsActiveBill(payload.data);
  }
  return (
    payload.bill_id !== undefined ||
    payload.id !== undefined ||
    (Array.isArray(payload.rounds) && payload.rounds.length > 0)
  );
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getLinePrice(line: CartLine) {
  const addons = line.food.addons
    .filter(addon => line.addonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  const customizations = line.food.customizations.reduce(
    (sum, group) =>
      sum +
      group.options
        .filter(option => line.customizations[group.id]?.includes(option.id))
        .reduce((optionSum, option) => optionSum + option.price, 0),
    0,
  );
  return (line.food.price ?? 0) + addons + customizations;
}

export default function NewOrderFlow({
  orderType,
  onBack,
  onOrderSubmitted,
}: {
  orderType: NewOrderType;
  onBack: () => void;
  onOrderSubmitted: () => void;
}) {
  const { width } = useWindowDimensions();
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(
    orderType === 'DINE_IN',
  );
  const [tablesError, setTablesError] = useState('');
  const [foods, setFoods] = useState<MenuFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [foodsError, setFoodsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [selectedFood, setSelectedFood] = useState<MenuFood | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string[]>
  >({});
  const [customizationError, setCustomizationError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submissionLock = useRef(false);
  const isDineIn = orderType === 'DINE_IN';
  const isDelivery = orderType === 'HOME_DELIVERY';
  const orderLabel = isDineIn
    ? 'Dine-In / Table'
    : isDelivery
    ? 'Home Delivery'
    : 'Pick Up';
  const horizontalPadding = width >= 768 ? 24 : 16;
  const cardGap = 12;
  const cardWidth =
    (Math.min(width, 1100) - horizontalPadding * 2 - cardGap) / 2;
  const availableFoods = useMemo(
    () =>
      foods.filter(food => {
        const availabilityKey = isDineIn
          ? 'dining_available'
          : isDelivery
          ? 'delivery_available'
          : 'takeaway_available';
        const status = text(food.raw.status, 'Active').toLowerCase();
        return (
          status !== 'inactive' &&
          status !== 'deleted' &&
          flag(food.raw.is_available) &&
          flag(food.raw.is_menu_visible) &&
          flag(food.raw[availabilityKey])
        );
      }),
    [foods, isDelivery, isDineIn],
  );
  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableFoods.filter(
      food =>
        !query || `${food.name} ${food.category}`.toLowerCase().includes(query),
    );
  }, [availableFoods, search]);
  const subtotal = cart.reduce(
    (sum, line) => sum + getLinePrice(line) * line.quantity,
    0,
  );
  const discount = Math.min(
    subtotal,
    Math.max(0, Number(discountInput.replace(/,/g, '')) || 0),
  );
  const taxableAmount = subtotal - discount;
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const tax = cgst + sgst;
  const total = taxableAmount + tax;
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const hasCustomerDetails =
    customerName.trim().length > 0 &&
    phoneDigits.length >= 7 &&
    phoneDigits.length <= 15 &&
    (!isDelivery || deliveryAddress.trim().length > 0);
  const canSubmit =
    cart.length > 0 &&
    !cart.some(line => !line.food.id || line.food.price === null) &&
    (!isDineIn || selectedTable !== null) &&
    (isDineIn || hasCustomerDetails) &&
    !isSubmitting &&
    !hasSubmitted;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoadingFoods(true);
    setFoodsError('');
    api
      .get('/foods', { signal: controller.signal })
      .then(response => {
        if (active) {
          setFoods(readFoods(response.data));
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setFoodsError(
            getErrorMessage(
              error,
              'Unable to load food menu. Please try again.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingFoods(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  useEffect(() => {
    if (!isDineIn) {
      setIsLoadingTables(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setIsLoadingTables(true);
    setTablesError('');
    api
      .get('/server-tables', { signal: controller.signal })
      .then(response => {
        if (active) setTables(readTables(response.data));
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setTablesError(
            getErrorMessage(error, 'Unable to load tables. Please try again.'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingTables(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [isDineIn, retry]);

  const chooseTable = async (table: TableRecord) => {
    if (tableStatus(table) !== 'Available') {
      return;
    }
    const identifier = table.table_id ?? table.id;
    if (identifier === undefined || identifier === null) {
      Alert.alert('Cannot select table', 'This table is missing its ID.');
      return;
    }
    try {
      const response = await api.get(
        `/table-bills/active/${encodeURIComponent(String(identifier))}`,
      );
      const payload = response.data;
      const bill =
        isRecord(payload) && isRecord(payload.bill)
          ? payload.bill
          : isRecord(payload) && isRecord(payload.data)
          ? payload.data
          : payload;
      const hasActiveBill =
        isRecord(bill) &&
        (bill.bill_id !== undefined ||
          bill.id !== undefined ||
          (Array.isArray(bill.rounds) && bill.rounds.length > 0));
      if (hasActiveBill) {
        Alert.alert(
          'Table already has an active bill',
          `Table ${text(
            table.table_number,
          )} cannot start a new order until its current bill is settled.`,
        );
        setRetry(value => value + 1);
        return;
      }
      setSelectedTable(table);
    } catch (error) {
      if (isRecord(error) && Number(error.status) === 404) {
        setSelectedTable(table);
        return;
      }
      Alert.alert(
        'Unable to verify table',
        getErrorMessage(error, 'Please refresh tables and try again.'),
      );
    }
  };

  const selectionKey = (
    food: MenuFood,
    addonIds: string[],
    customizations: Record<string, string[]>,
  ) =>
    `${food.id}:${JSON.stringify({
      addons: [...addonIds].sort(),
      customizations: Object.fromEntries(
        Object.entries(customizations).map(([key, values]) => [
          key,
          [...values].sort(),
        ]),
      ),
    })}`;

  const addConfiguredFood = (
    food: MenuFood,
    addonIds: string[],
    customizations: Record<string, string[]>,
  ) => {
    const key = selectionKey(food, addonIds, customizations);
    setCart(current => {
      const existing = current.find(line => line.key === key);
      if (existing) {
        return current.map(line =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          food,
          quantity: 1,
          addonIds,
          customizations,
        },
      ];
    });
  };

  const addFood = (food: MenuFood) => {
    if (food.price === null) {
      Alert.alert(
        'Price unavailable',
        `${food.name} cannot be added until a price is set in the menu.`,
      );
      return;
    }
    if (food.addons.length || food.customizations.length) {
      setSelectedFood(food);
      setSelectedAddonIds([]);
      setSelectedCustomizations({});
      setCustomizationError('');
      return;
    }
    addConfiguredFood(food, [], {});
  };

  const addCustomizedFood = () => {
    if (!selectedFood) return;
    const missingRequired = selectedFood.customizations.find(
      group => group.required && !selectedCustomizations[group.id]?.length,
    );
    if (missingRequired) {
      setCustomizationError(`Choose ${missingRequired.name}.`);
      return;
    }
    addConfiguredFood(selectedFood, selectedAddonIds, selectedCustomizations);
    setSelectedFood(null);
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart(current =>
      current
        .map(line =>
          line.key === key
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter(line => line.quantity > 0),
    );
  };

  const sendOrder = async () => {
    if (!canSubmit || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        order_type: orderType,
        items: cart.map(line => ({
          food_id:
            Number.isFinite(Number(line.food.id)) && line.food.id.trim()
              ? Number(line.food.id)
              : line.food.id,
          food_name: line.food.name,
          quantity: line.quantity,
          unit_price: getLinePrice(line),
          selected_addons: line.food.addons
            .filter(addon => line.addonIds.includes(addon.id))
            .map(addon => ({
              addon_id: addon.id,
              addon_name: addon.name,
              price: addon.price,
            })),
          selected_customizations: Object.fromEntries(
            line.food.customizations.flatMap(group => {
              const choices = group.options.filter(option =>
                line.customizations[group.id]?.includes(option.id),
              );
              return choices.length
                ? [[group.name, choices.map(option => option.name)]]
                : [];
            }),
          ),
        })),
        subtotal,
        tax,
        discount,
        total_amount: total,
        status: 'pending',
      };

      if (isDineIn && selectedTable) {
        const tableId = selectedTable.table_id ?? selectedTable.id;
        if (
          tableId === undefined ||
          tableId === null ||
          !String(tableId).trim()
        ) {
          throw new Error('The selected table does not have a valid table ID.');
        }
        const latestTables = readTables((await api.get('/server-tables')).data);
        const latestTable = latestTables.find(
          table => String(table.table_id ?? table.id) === String(tableId),
        );
        if (!latestTable || tableStatus(latestTable) !== 'Available') {
          throw new Error(
            `Table ${text(
              selectedTable.table_number,
            )} is no longer available. Refresh tables and choose another table.`,
          );
        }
        try {
          const activeBillResponse = await api.get(
            `/table-bills/active/${encodeURIComponent(String(tableId))}`,
          );
          if (containsActiveBill(activeBillResponse.data)) {
            throw new Error(
              `Table ${text(
                selectedTable.table_number,
              )} already has an active bill.`,
            );
          }
        } catch (error) {
          if (!(isRecord(error) && Number(error.status) === 404)) {
            throw error;
          }
        }
        payload.table_id =
          Number.isFinite(Number(tableId)) && String(tableId).trim()
            ? Number(tableId)
            : tableId;
        payload.table_number = selectedTable.table_number;
      } else {
        payload.customer_name = customerName.trim();
        payload.customer_phone = customerPhone.trim();
        if (isDelivery) {
          payload.delivery_address = deliveryAddress.trim();
        }
      }

      const response = await api.post('/kitchen-orders', payload);
      if (isRecord(response.data) && response.data.success === false) {
        throw new Error(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'The kitchen rejected this order.',
        );
      }
      setHasSubmitted(true);

      if (isDineIn && selectedTable) {
        const tableId = selectedTable.table_id ?? selectedTable.id;
        if (
          tableId === undefined ||
          tableId === null ||
          !String(tableId).trim()
        ) {
          throw new Error('The selected table does not have a valid table ID.');
        }
        try {
          await api
            .put(`/server-tables/${encodeURIComponent(String(tableId))}`, {
              status: 'Occupied',
            })
            .catch(() =>
              api.patch(
                `/server-tables/${encodeURIComponent(String(tableId))}`,
                { status: 'Occupied' },
              ),
            );
        } catch (error) {
          Alert.alert(
            'Order sent; table update failed',
            `The order reached the kitchen, but Table ${text(
              selectedTable.table_number,
            )} could not be marked occupied. ${getErrorMessage(
              error,
              'Refresh the table list and update its status.',
            )}`,
            [{ text: 'View Orders', onPress: onOrderSubmitted }],
          );
          return;
        }
      }

      Alert.alert(
        'Order sent to kitchen',
        `${orderLabel}${
          selectedTable ? ` · Table ${text(selectedTable.table_number)}` : ''
        } · ${cart.reduce(
          (count, line) => count + line.quantity,
          0,
        )} items · ${formatCurrency(total)}`,
        [{ text: 'View Orders', onPress: onOrderSubmitted }],
      );
    } catch (error) {
      Alert.alert(
        'Unable to send order',
        getErrorMessage(error, 'Please check the connection and try again.'),
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  if (isDineIn && !selectedTable) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F9FAFB]">
        <MoreInnerHeader
          title="Choose a Table"
          destination="Select Order Type"
          subtitle="Only available tables can start a new order."
          onBack={onBack}
        />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignSelf: 'center',
            gap: 12,
            maxWidth: 1000,
            padding: 16,
            width: '100%',
          }}
        >
          {isLoadingTables ? (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-[#6B7280]">
                Loading tables...
              </Text>
            </View>
          ) : tablesError ? (
            <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm text-[#DC2626]"
              >
                {tablesError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetry(value => value + 1)}
                className="rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                <Text className="font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : tables.length ? (
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {tables.map((table, index) => {
                const status = tableStatus(table);
                const available = status === 'Available';
                return (
                  <Pressable
                    accessibilityLabel={`Table ${text(
                      table.table_number,
                      String(index + 1),
                    )}, ${status}${
                      available ? ', available for selection' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !available }}
                    disabled={!available}
                    key={String(
                      table.table_id ?? table.id ?? table.table_number ?? index,
                    )}
                    onPress={() => void chooseTable(table)}
                    className={`rounded-2xl border bg-white p-4 ${
                      available
                        ? 'border-[#DCE8D8]'
                        : 'border-[#E5E7EB] opacity-70'
                    }`}
                    style={{ width: cardWidth }}
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7EE]">
                        <MenuIcon color={colors.primary} size={21} />
                      </View>
                      <Text
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          available
                            ? 'bg-green-50 text-green-700'
                            : status === 'Occupied'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {status}
                      </Text>
                    </View>
                    <Text className="mt-3 text-base font-bold text-[#012711]">
                      Table {text(table.table_number, String(index + 1))}
                    </Text>
                    {table.no_of_seats ? (
                      <Text className="mt-1 text-xs text-[#6B7280]">
                        {table.no_of_seats} seats
                      </Text>
                    ) : null}
                    {available ? (
                      <Text className="mt-2 text-xs font-semibold text-[#116C0B]">
                        Tap to select
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text className="text-base font-bold text-[#012711]">
                No tables found
              </Text>
              <Text className="mt-2 text-center text-sm text-[#6B7280]">
                Add tables in Table Management before starting a dine-in order.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F9FAFB]">
      <View className="flex-1">
        <MoreInnerHeader
          title={orderLabel}
          destination={isDineIn ? 'Table selection' : 'Dashboard'}
          subtitle={
            isDineIn
              ? `Table ${text(selectedTable?.table_number)}`
              : 'New order'
          }
          onBack={isDineIn ? () => setSelectedTable(null) : onBack}
        />
        {!isDineIn ? (
          <View className="gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3">
            <Text className="text-xs font-bold text-[#012711]">
              Customer details
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                accessibilityLabel="Customer name"
                className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#111827]"
                onChangeText={setCustomerName}
                placeholder="Customer name"
                value={customerName}
              />
              <TextInput
                accessibilityLabel="Customer phone"
                className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#111827]"
                keyboardType="phone-pad"
                onChangeText={setCustomerPhone}
                placeholder="Phone number"
                value={customerPhone}
              />
            </View>
            {isDelivery ? (
              <TextInput
                accessibilityLabel="Delivery address"
                className="min-h-11 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827]"
                multiline
                onChangeText={setDeliveryAddress}
                placeholder="Delivery address"
                value={deliveryAddress}
              />
            ) : null}
            {!hasCustomerDetails ? (
              <Text className="text-[11px] text-[#6B7280]">
                {isDelivery
                  ? 'Name, valid phone number, and delivery address are required.'
                  : 'Name and valid phone number are required.'}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center gap-2 px-4 py-3">
          <TextInput
            accessibilityLabel="Search menu"
            className="min-h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]"
            onChangeText={setSearch}
            placeholder="Search foods or categories..."
            placeholderTextColor="#6B7280"
            value={search}
          />
          <View className="rounded-xl bg-[#F0F7EE] px-3 py-2.5">
            <Text className="text-xs font-bold text-[#116C0B]">
              {cart.reduce((count, line) => count + line.quantity, 0)} items
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignSelf: 'center',
            maxWidth: 1100,
            paddingBottom: 16,
            paddingHorizontal: horizontalPadding,
            width: '100%',
          }}
        >
          {isLoadingFoods ? (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-[#6B7280]">
                Loading menu...
              </Text>
            </View>
          ) : foodsError ? (
            <View className="items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm text-[#DC2626]"
              >
                {foodsError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetry(value => value + 1)}
                className="rounded-xl bg-[#116C0B] px-4 py-2.5"
              >
                <Text className="font-semibold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : visibleFoods.length ? (
            <View className="flex-row flex-wrap" style={{ gap: cardGap }}>
              {visibleFoods.map(food => (
                <View
                  key={food.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-3"
                  style={{ width: cardWidth }}
                >
                  {food.image ? (
                    <Image
                      accessibilityLabel={`${food.name} image`}
                      className="h-28 w-full rounded-xl bg-[#F3F4F6]"
                      resizeMode="cover"
                      source={{ uri: food.image }}
                    />
                  ) : (
                    <View className="h-28 w-full items-center justify-center rounded-xl bg-[#F0F7EE]">
                      <MenuIcon color={colors.primary} size={28} />
                    </View>
                  )}
                  <Text
                    numberOfLines={1}
                    className="mt-2 text-sm font-bold text-[#012711]"
                  >
                    {food.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-xs text-[#6B7280]"
                  >
                    {food.category}
                  </Text>
                  <View className="mt-3 flex-row items-center justify-between gap-2">
                    <Text className="min-w-0 flex-1 text-sm font-extrabold text-[#012711]">
                      {food.price === null
                        ? 'Price unavailable'
                        : formatCurrency(food.price)}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Add ${food.name} to order`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: food.price === null }}
                      disabled={food.price === null}
                      onPress={() => addFood(food)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#116C0B]"
                    >
                      <PlusIcon color="#FFFFFF" size={18} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-[#E5E7EB] bg-white p-8">
              <Text className="text-base font-bold text-[#012711]">
                {search ? 'No foods match your search' : 'No foods available'}
              </Text>
            </View>
          )}

          {cart.length ? (
            <View className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <Text className="mb-2 text-sm font-bold text-[#012711]">
                Order items
              </Text>
              {cart.map(line => (
                <View
                  key={line.key}
                  className="flex-row items-center justify-between gap-2 border-b border-[#F3F4F6] py-2"
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-xs font-semibold text-[#111827]"
                    >
                      {line.food.name}
                    </Text>
                    <Text className="text-[10px] text-[#6B7280]">
                      {formatCurrency(getLinePrice(line))} each
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityLabel={`Decrease ${line.food.name} quantity`}
                      accessibilityRole="button"
                      onPress={() => changeQuantity(line.key, -1)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-[#DCE8D8]"
                    >
                      <Text className="text-base font-bold text-[#116C0B]">
                        −
                      </Text>
                    </Pressable>
                    <Text className="min-w-4 text-center text-xs font-bold text-[#111827]">
                      {line.quantity}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Increase ${line.food.name} quantity`}
                      accessibilityRole="button"
                      onPress={() => changeQuantity(line.key, 1)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-[#DCE8D8]"
                    >
                      <PlusIcon color={colors.primary} size={14} />
                    </Pressable>
                    <Text className="w-20 text-right text-xs font-bold text-[#111827]">
                      {formatCurrency(getLinePrice(line) * line.quantity)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-[#E5E7EB] bg-white px-4 py-3">
          <View className="mb-2 gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280]">Subtotal</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280]">Discount</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-[#6B7280]">₹</Text>
                <TextInput
                  accessibilityLabel="Order discount"
                  className="w-20 rounded-lg border border-[#E5E7EB] px-2 py-1 text-right text-xs text-[#111827]"
                  keyboardType="decimal-pad"
                  onChangeText={setDiscountInput}
                  value={discountInput}
                />
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280]">CGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(cgst)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-[#6B7280]">SGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(sgst)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-[#012711]">
                Grand Total
              </Text>
              <Text className="text-sm font-extrabold text-[#012711]">
                {formatCurrency(total)}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="Preview order bill"
              accessibilityRole="button"
              accessibilityState={{ disabled: cart.length === 0 }}
              disabled={cart.length === 0}
              onPress={() => setIsPreviewOpen(true)}
              className={`h-12 flex-1 items-center justify-center rounded-xl border ${
                cart.length
                  ? 'border-[#116C0B] bg-white'
                  : 'border-[#D1D5DB] bg-[#F3F4F6]'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  cart.length ? 'text-[#116C0B]' : 'text-[#9CA3AF]'
                }`}
              >
                Preview
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Send ${orderLabel} order to kitchen`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={sendOrder}
              className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
                canSubmit ? 'bg-[#0B4D1A]' : 'bg-[#9CA3AF]'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text className="text-sm font-bold text-white">
                {isSubmitting ? 'Sending...' : 'Send to Kitchen'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <BaseModal
        accessibilityLabel="Order bill preview"
        visible={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Bill Preview"
        subtitle={`${orderLabel}${
          isDineIn ? ` · Table ${text(selectedTable?.table_number)}` : ''
        }`}
        variant="bottom-sheet"
        scrollable
        footer={
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPreviewOpen(false)}
            className="min-h-12 items-center justify-center rounded-xl bg-[#116C0B]"
          >
            <Text className="text-sm font-bold text-white">Close Preview</Text>
          </Pressable>
        }
      >
        <View className="gap-3 p-4">
          {cart.length ? (
            <View className="gap-2">
              {cart.map(line => (
                <View
                  key={line.key}
                  className="flex-row items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-[#111827]">
                      {line.food.name}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      {line.quantity} × {formatCurrency(getLinePrice(line))}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-[#111827]">
                    {formatCurrency(getLinePrice(line) * line.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="py-4 text-center text-sm text-[#6B7280]">
              Add food items to preview this bill.
            </Text>
          )}
          <View className="gap-2 rounded-xl bg-[#F9FAFB] p-3">
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">Subtotal</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">Discount</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                − {formatCurrency(discount)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">CGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(cgst)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#6B7280]">SGST (2.5%)</Text>
              <Text className="text-xs font-semibold text-[#111827]">
                {formatCurrency(sgst)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-[#E5E7EB] pt-2">
              <Text className="text-sm font-bold text-[#012711]">Total</Text>
              <Text className="text-sm font-extrabold text-[#012711]">
                {formatCurrency(total)}
              </Text>
            </View>
          </View>
        </View>
      </BaseModal>

      <BaseModal
        visible={selectedFood !== null}
        onClose={() => setSelectedFood(null)}
        title={selectedFood?.name ?? 'Customize item'}
        subtitle="Choose add-ons and customizations."
        variant="bottom-sheet"
        scrollable
        footer={
          <Pressable
            accessibilityRole="button"
            onPress={addCustomizedFood}
            className="min-h-12 items-center justify-center rounded-xl bg-[#116C0B]"
          >
            <Text className="text-sm font-bold text-white">
              Add to Order
              {selectedFood
                ? ` · ${formatCurrency(
                    (selectedFood.price ?? 0) +
                      selectedFood.addons
                        .filter(addon => selectedAddonIds.includes(addon.id))
                        .reduce((sum, addon) => sum + addon.price, 0) +
                      selectedFood.customizations.reduce(
                        (sum, group) =>
                          sum +
                          group.options
                            .filter(option =>
                              selectedCustomizations[group.id]?.includes(
                                option.id,
                              ),
                            )
                            .reduce(
                              (optionSum, option) => optionSum + option.price,
                              0,
                            ),
                        0,
                      ),
                  )}`
                : ''}
            </Text>
          </Pressable>
        }
      >
        {selectedFood ? (
          <View className="gap-4 p-4">
            {selectedFood.addons.length ? (
              <View className="gap-2">
                <Text className="text-sm font-bold text-[#012711]">
                  Add-ons
                </Text>
                {selectedFood.addons.map(addon => {
                  const selected = selectedAddonIds.includes(addon.id);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={addon.id}
                      onPress={() =>
                        setSelectedAddonIds(current =>
                          selected
                            ? current.filter(id => id !== addon.id)
                            : [...current, addon.id],
                        )
                      }
                      className={`flex-row items-center justify-between rounded-xl border p-3 ${
                        selected
                          ? 'border-[#116C0B] bg-[#F0F7EE]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text className="text-xs font-semibold text-[#111827]">
                        {addon.name}
                      </Text>
                      <Text className="text-xs font-bold text-[#116C0B]">
                        + {formatCurrency(addon.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {selectedFood.customizations.map(group => (
              <View key={group.id} className="gap-2">
                <Text className="text-sm font-bold text-[#012711]">
                  {group.name}
                  {group.required ? ' *' : ''}
                </Text>
                {group.options.map(option => {
                  const selection = selectedCustomizations[group.id] ?? [];
                  const selected = selection.includes(option.id);
                  return (
                    <Pressable
                      accessibilityRole={
                        group.selectionType === 'Multiple'
                          ? 'checkbox'
                          : 'radio'
                      }
                      accessibilityState={{ checked: selected }}
                      key={option.id}
                      onPress={() =>
                        setSelectedCustomizations(current => ({
                          ...current,
                          [group.id]:
                            group.selectionType === 'Multiple'
                              ? selected
                                ? selection.filter(id => id !== option.id)
                                : [...selection, option.id]
                              : selected
                              ? []
                              : [option.id],
                        }))
                      }
                      className={`flex-row items-center justify-between rounded-xl border p-3 ${
                        selected
                          ? 'border-[#116C0B] bg-[#F0F7EE]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text className="text-xs font-semibold text-[#111827]">
                        {option.name}
                      </Text>
                      <Text className="text-xs font-bold text-[#116C0B]">
                        {option.price
                          ? `+ ${formatCurrency(option.price)}`
                          : 'Included'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {customizationError ? (
              <Text
                accessibilityRole="alert"
                className="text-xs text-[#DC2626]"
              >
                {customizationError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </BaseModal>
    </SafeAreaView>
  );
}
